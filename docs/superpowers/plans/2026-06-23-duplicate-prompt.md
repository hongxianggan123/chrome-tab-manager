# Duplicate Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build duplicate-page prompts with a default side panel banner, optional page overlay, settings, permissions, session state, and safe fallback behavior.

**Architecture:** Keep URL identity and target selection in pure domain modules, keep Chrome API effects in worker modules, keep side panel UI state in React components, and keep page overlay code isolated under `src/content-script/`. Duplicate prompt runtime state uses `chrome.storage.session`; long-lived user display preference uses `chrome.storage.local`.

**Tech Stack:** Chrome Extension MV3, TypeScript, React 19, Vite, Tailwind utilities, shadcn/ui primitives, Vitest.

---

## File Structure

- Create `src/domain/duplicate-prompt.ts`: pure duplicate prompt eligibility and default-target selection.
- Modify `src/domain/types.ts`: add duplicate prompt setting/runtime types.
- Modify `src/domain/domain.test.ts`: add pure logic tests for duplicate prompt target selection and safety boundaries.
- Modify `src/storage/schema.ts`: add `duplicatePromptSettings` with default `sidePanel`.
- Modify `src/storage/schema.test.ts`: cover default settings and normalization.
- Create `src/storage/session-storage.ts`: read/write/clear duplicate prompt session state.
- Create `src/storage/session-storage.test.ts`: mock `chrome.storage.session`.
- Modify `src/worker/messages.ts`: add prompt messages, settings message, and push payload shape.
- Modify `src/worker/refresh.ts`: include `duplicatePromptSettings` and current session prompt in `DomainStatePayload`.
- Create `src/worker/duplicate-prompt.ts`: detect prompts from tab events, inject overlay, update badge/title, and handle prompt actions.
- Modify `src/extension/service-worker.ts`: route tab events through duplicate prompt handling and route new messages.
- Modify `src/extension/service-worker.test.ts`: cover message routing and prompt action dispatch.
- Modify `vite.config.ts`: add content script build entry and optional permissions in manifest.
- Create `src/content-script/duplicate-prompt-overlay.ts`: Shadow DOM overlay mounted by dynamic injection.
- Create `src/side-panel/settings/SettingsPanel.tsx`: settings view with duplicate prompt display mode radio group.
- Create `src/side-panel/components/DuplicatePromptBanner.tsx`: side panel prompt banner.
- Modify `src/side-panel/App.tsx`: add main/settings view state, banner, prompt actions, duplicate filter navigation.
- Modify `src/side-panel/api.ts`: support demo prompt/settings messages.
- Modify or create focused side panel tests if the project gains a React test harness; otherwise verify via existing typecheck/build and manual Chrome plan.

---

### Task 1: Domain Duplicate Prompt Rules

**Files:**
- Create: `src/domain/duplicate-prompt.ts`
- Modify: `src/domain/types.ts`
- Test: `src/domain/domain.test.ts`

- [ ] **Step 1: Write failing tests for target selection**

Append to `src/domain/domain.test.ts`:

```ts
import {
  createDuplicatePromptCandidate,
  getDuplicatePromptDefaultTarget,
} from "./duplicate-prompt"

describe("duplicate prompt selection", () => {
  it("selects the most recently accessed existing duplicate and excludes the new tab", () => {
    const existingOlder = tabSnapshot({
      tabId: 1,
      originalUrl: "https://example.com/a#old",
      title: "Older",
      lastAccessed: 100,
    })
    const existingRecent = tabSnapshot({
      tabId: 2,
      originalUrl: "https://example.com/a#recent",
      title: "Recent",
      lastAccessed: 300,
    })
    const newTab = tabSnapshot({
      tabId: 3,
      originalUrl: "https://example.com/a#new",
      title: "New",
      lastAccessed: 500,
    })

    const instances = toTabInstances([existingOlder, existingRecent, newTab])
    const target = getDuplicatePromptDefaultTarget(instances, newTab.tabId)

    expect(target?.tabId).toBe(2)
  })

  it("falls back to stable order when existing duplicates have no lastAccessed", () => {
    const existingFirst = tabSnapshot({
      tabId: 10,
      windowId: 1,
      index: 0,
      originalUrl: "https://example.com/fallback",
      lastAccessed: undefined,
    })
    const existingSecond = tabSnapshot({
      tabId: 11,
      windowId: 1,
      index: 1,
      originalUrl: "https://example.com/fallback",
      lastAccessed: undefined,
    })
    const newTab = tabSnapshot({
      tabId: 12,
      windowId: 1,
      index: 2,
      originalUrl: "https://example.com/fallback",
      lastAccessed: undefined,
    })

    const instances = toTabInstances([existingFirst, existingSecond, newTab])
    const target = getDuplicatePromptDefaultTarget(instances, newTab.tabId)

    expect(target?.tabId).toBe(10)
  })

  it("creates a prompt candidate only for a new ordinary duplicate tab", () => {
    const existing = tabSnapshot({
      tabId: 20,
      originalUrl: "https://example.com/ordinary",
      lastAccessed: 100,
    })
    const newTab = tabSnapshot({
      tabId: 21,
      originalUrl: "https://example.com/ordinary#fragment",
      lastAccessed: 200,
    })
    const instances = toTabInstances([existing, newTab])

    const candidate = createDuplicatePromptCandidate(instances, newTab.tabId)

    expect(candidate).toMatchObject({
      newTabId: 21,
      normalizedUrl: "https://example.com/ordinary",
      defaultTargetTabId: 20,
    })
  })

  it("does not create a prompt candidate for special URLs", () => {
    const existing = tabSnapshot({
      tabId: 30,
      originalUrl: "chrome://extensions",
    })
    const newTab = tabSnapshot({
      tabId: 31,
      originalUrl: "chrome://extensions",
    })

    const candidate = createDuplicatePromptCandidate(
      toTabInstances([existing, newTab]),
      newTab.tabId
    )

    expect(candidate).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/domain/domain.test.ts`

Expected: FAIL with module or function not found for `./duplicate-prompt`.

- [ ] **Step 3: Add types and pure implementation**

Add to `src/domain/types.ts`:

```ts
export type DuplicatePromptDisplayMode = "sidePanel" | "pageOverlay"

export type DuplicatePromptSettings = {
  displayMode: DuplicatePromptDisplayMode
  updatedAt: string
}

export type DuplicatePromptRuntime = {
  newTabId: number
  normalizedUrl: NormalizedUrl
  originalUrl: string
  title: string
  hostname: Hostname
  defaultTargetTabId: number
  defaultTargetWindowId: number
  createdAt: string
  displaySurface: "sidePanel" | "pageOverlay" | "pending"
}
```

Create `src/domain/duplicate-prompt.ts`:

```ts
import type { DuplicatePromptRuntime, TabInstance } from "./types"

export function getDuplicatePromptDefaultTarget(
  instances: TabInstance[],
  newTabId: number
): TabInstance | null {
  const newTab = instances.find((item) => item.tabId === newTabId)
  if (!newTab || newTab.isSpecialUrl) {
    return null
  }

  const existingMatches = instances
    .filter(
      (item) =>
        item.tabId !== newTabId &&
        item.normalizedUrl === newTab.normalizedUrl &&
        !item.isSpecialUrl
    )
    .sort((a, b) => {
      const aAccessed = a.lastAccessed
      const bAccessed = b.lastAccessed
      if (typeof aAccessed === "number" && typeof bAccessed === "number") {
        return bAccessed - aAccessed
      }
      if (typeof aAccessed === "number") {
        return -1
      }
      if (typeof bAccessed === "number") {
        return 1
      }
      return a.windowId - b.windowId || a.index - b.index || a.tabId - b.tabId
    })

  return existingMatches[0] ?? null
}

export function createDuplicatePromptCandidate(
  instances: TabInstance[],
  newTabId: number,
  createdAt = new Date().toISOString()
): DuplicatePromptRuntime | null {
  const newTab = instances.find((item) => item.tabId === newTabId)
  const target = getDuplicatePromptDefaultTarget(instances, newTabId)

  if (!newTab || !target) {
    return null
  }

  return {
    newTabId: newTab.tabId,
    normalizedUrl: newTab.normalizedUrl,
    originalUrl: newTab.originalUrl,
    title: newTab.title,
    hostname: newTab.hostname,
    defaultTargetTabId: target.tabId,
    defaultTargetWindowId: target.windowId,
    createdAt,
    displaySurface: "pending",
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/domain/domain.test.ts`

Expected: PASS for duplicate prompt selection tests and existing domain tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/duplicate-prompt.ts src/domain/domain.test.ts
git commit -m "feat: add duplicate prompt domain rules"
```

---

### Task 2: Storage Settings And Session State

**Files:**
- Modify: `src/storage/schema.ts`
- Modify: `src/storage/schema.test.ts`
- Create: `src/storage/session-storage.ts`
- Create: `src/storage/session-storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Append to `src/storage/schema.test.ts`:

```ts
it("defaults duplicate prompt settings to side panel", () => {
  expect(createDefaultStorageRoot().duplicatePromptSettings.displayMode).toBe(
    "sidePanel"
  )
})

it("normalizes older roots without duplicate prompt settings", () => {
  const root = normalizeStorageRoot({
    version: 1,
    archivedTabs: {},
    groupViewState: {},
  })

  expect(root.duplicatePromptSettings.displayMode).toBe("sidePanel")
})
```

Create `src/storage/session-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DUPLICATE_PROMPT_SESSION_KEY,
  clearDuplicatePromptSession,
  markDuplicatePromptHandled,
  readDuplicatePromptSession,
  writeDuplicatePrompt,
} from "./session-storage"
import type { DuplicatePromptRuntime } from "@/domain/types"

const store = new Map<string, unknown>()

vi.stubGlobal("chrome", {
  storage: {
    session: {
      get: vi.fn(async (key: string) => ({ [key]: store.get(key) })),
      set: vi.fn(async (value: Record<string, unknown>) => {
        for (const [key, storedValue] of Object.entries(value)) {
          store.set(key, storedValue)
        }
      }),
    },
  },
})

function prompt(): DuplicatePromptRuntime {
  return {
    newTabId: 7,
    normalizedUrl: "https://example.com/a",
    originalUrl: "https://example.com/a#new",
    title: "Example",
    hostname: "example.com",
    defaultTargetTabId: 3,
    defaultTargetWindowId: 1,
    createdAt: "2026-06-23T00:00:00.000Z",
    displaySurface: "pending",
  }
}

describe("duplicate prompt session storage", () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it("writes and reads the current duplicate prompt", async () => {
    await writeDuplicatePrompt(prompt())

    await expect(readDuplicatePromptSession()).resolves.toMatchObject({
      duplicatePrompt: { newTabId: 7 },
      handledDuplicatePromptTabIds: [],
    })
  })

  it("marks a tab id as handled once", async () => {
    await markDuplicatePromptHandled(7)
    await markDuplicatePromptHandled(7)

    await expect(readDuplicatePromptSession()).resolves.toMatchObject({
      handledDuplicatePromptTabIds: [7],
    })
  })

  it("clears the current prompt without clearing handled tab ids", async () => {
    await writeDuplicatePrompt(prompt())
    await markDuplicatePromptHandled(7)
    await clearDuplicatePromptSession()

    const stored = store.get(DUPLICATE_PROMPT_SESSION_KEY)
    expect(stored).toEqual({ handledDuplicatePromptTabIds: [7] })
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/storage/schema.test.ts src/storage/session-storage.test.ts`

Expected: FAIL because schema and session helpers do not exist yet.

- [ ] **Step 3: Implement storage settings and session helpers**

Modify `src/storage/schema.ts`:

```ts
import type {
  ArchivedTabRecord,
  DuplicatePromptSettings,
  GroupViewState,
} from "@/domain/types"

export const STORAGE_ROOT_KEY = "tabManager"

export type StorageRoot = {
  version: 1
  archivedTabs: Record<string, ArchivedTabRecord>
  groupViewState: Record<string, GroupViewState>
  duplicatePromptSettings: DuplicatePromptSettings
}

export function createDefaultDuplicatePromptSettings(): DuplicatePromptSettings {
  return {
    displayMode: "sidePanel",
    updatedAt: new Date(0).toISOString(),
  }
}

export function createDefaultStorageRoot(): StorageRoot {
  return {
    version: 1,
    archivedTabs: {},
    groupViewState: {},
    duplicatePromptSettings: createDefaultDuplicatePromptSettings(),
  }
}

export function normalizeStorageRoot(value: unknown): StorageRoot {
  if (!isStorageRoot(value)) {
    return createDefaultStorageRoot()
  }

  return {
    ...value,
    duplicatePromptSettings: isDuplicatePromptSettings(
      value.duplicatePromptSettings
    )
      ? value.duplicatePromptSettings
      : createDefaultDuplicatePromptSettings(),
  }
}

function isStorageRoot(value: unknown): value is Omit<StorageRoot, "duplicatePromptSettings"> &
  Partial<Pick<StorageRoot, "duplicatePromptSettings">> {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<StorageRoot>
  return (
    candidate.version === 1 &&
    Boolean(candidate.archivedTabs) &&
    typeof candidate.archivedTabs === "object" &&
    Boolean(candidate.groupViewState) &&
    typeof candidate.groupViewState === "object"
  )
}

function isDuplicatePromptSettings(
  value: unknown
): value is DuplicatePromptSettings {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<DuplicatePromptSettings>
  return (
    (candidate.displayMode === "sidePanel" ||
      candidate.displayMode === "pageOverlay") &&
    typeof candidate.updatedAt === "string"
  )
}
```

Create `src/storage/session-storage.ts`:

```ts
import type { DuplicatePromptRuntime } from "@/domain/types"

export const DUPLICATE_PROMPT_SESSION_KEY = "tabManagerSession"

export type DuplicatePromptSessionState = {
  duplicatePrompt?: DuplicatePromptRuntime
  handledDuplicatePromptTabIds: number[]
}

export function createDefaultDuplicatePromptSession(): DuplicatePromptSessionState {
  return {
    handledDuplicatePromptTabIds: [],
  }
}

export async function readDuplicatePromptSession(): Promise<DuplicatePromptSessionState> {
  const result = await chrome.storage.session.get(DUPLICATE_PROMPT_SESSION_KEY)
  return normalizeDuplicatePromptSession(
    result[DUPLICATE_PROMPT_SESSION_KEY]
  )
}

export async function writeDuplicatePrompt(
  duplicatePrompt: DuplicatePromptRuntime
) {
  const current = await readDuplicatePromptSession()
  await writeDuplicatePromptSession({ ...current, duplicatePrompt })
}

export async function clearDuplicatePromptSession() {
  const current = await readDuplicatePromptSession()
  const { duplicatePrompt: _removed, ...next } = current
  await writeDuplicatePromptSession(next)
}

export async function markDuplicatePromptHandled(tabId: number) {
  const current = await readDuplicatePromptSession()
  const handled = new Set(current.handledDuplicatePromptTabIds)
  handled.add(tabId)
  await writeDuplicatePromptSession({
    ...current,
    handledDuplicatePromptTabIds: [...handled],
  })
}

async function writeDuplicatePromptSession(
  state: DuplicatePromptSessionState
) {
  await chrome.storage.session.set({
    [DUPLICATE_PROMPT_SESSION_KEY]: state,
  })
}

function normalizeDuplicatePromptSession(
  value: unknown
): DuplicatePromptSessionState {
  if (!value || typeof value !== "object") {
    return createDefaultDuplicatePromptSession()
  }

  const candidate = value as Partial<DuplicatePromptSessionState>
  return {
    duplicatePrompt: candidate.duplicatePrompt,
    handledDuplicatePromptTabIds: Array.isArray(
      candidate.handledDuplicatePromptTabIds
    )
      ? candidate.handledDuplicatePromptTabIds.filter(
          (tabId): tabId is number => typeof tabId === "number"
        )
      : [],
  }
}
```

- [ ] **Step 4: Run storage tests**

Run: `npm test -- src/storage/schema.test.ts src/storage/session-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/schema.ts src/storage/schema.test.ts src/storage/session-storage.ts src/storage/session-storage.test.ts
git commit -m "feat: add duplicate prompt storage state"
```

---

### Task 3: Worker Messages, Settings, And State Payload

**Files:**
- Modify: `src/worker/messages.ts`
- Modify: `src/worker/refresh.ts`
- Modify: `src/storage/local-storage.ts`
- Test: `src/extension/service-worker.test.ts`

- [ ] **Step 1: Write failing message routing tests**

Append to `src/extension/service-worker.test.ts`:

```ts
it("routes duplicate prompt settings updates", async () => {
  const { handleWorkerMessageForTest } = await import("./service-worker")
  const mutations = await import("@/worker/mutations")

  await handleWorkerMessageForTest({
    type: "duplicatePrompt:setDisplayMode",
    displayMode: "pageOverlay",
  })

  expect(mutations.updateDuplicatePromptDisplayMode).toHaveBeenCalledWith(
    "pageOverlay"
  )
})
```

Update the existing `vi.mock("@/worker/mutations", ...)` block to include:

```ts
updateDuplicatePromptDisplayMode: vi.fn(),
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/extension/service-worker.test.ts`

Expected: FAIL because the message type and mutation do not exist.

- [ ] **Step 3: Add message and payload types**

Modify `src/worker/messages.ts`:

```ts
import type {
  DuplicatePromptDisplayMode,
  DuplicatePromptRuntime,
  DuplicatePromptSettings,
  GroupRuntime,
  InventoryCounts,
  StatusFilter,
} from "@/domain/types"

export type DomainStatePayload = {
  generatedAt: string
  groups: GroupRuntime[]
  counts: InventoryCounts
  duplicatePrompt?: DuplicatePromptRuntime
  duplicatePromptSettings: DuplicatePromptSettings
  feedback?: { kind: "error" | "success"; message: string }
}

export type WorkerRequest =
  | { type: "state:get" }
  | { type: "tab:jump"; tabId: number; windowId: number }
  | { type: "tab:close"; tabId: number }
  | { type: "tab:archive"; tabId: number }
  | { type: "tabs:close"; tabIds: number[] }
  | { type: "tabs:archive"; tabIds: number[] }
  | { type: "archive:restore"; normalizedUrl: string }
  | { type: "archive:delete"; normalizedUrl: string }
  | { type: "archives:delete"; normalizedUrls: string[] }
  | { type: "group:setCollapsed"; groupKey: string; collapsed: boolean }
  | {
      type: "duplicatePrompt:setDisplayMode"
      displayMode: DuplicatePromptDisplayMode
    }
  | {
      type: "duplicatePrompt:jump"
      promptTabId: number
      targetTabId: number
      targetWindowId: number
    }
  | { type: "duplicatePrompt:keep"; promptTabId: number }
  | {
      type: "duplicatePrompt:viewDuplicates"
      promptTabId: number
      normalizedUrl: string
    }
  | { type: "duplicatePrompt:dismiss"; promptTabId: number }
```

Keep the existing other exported types in the file.

- [ ] **Step 4: Add storage mutation and state payload**

Modify `src/storage/local-storage.ts` with:

```ts
import type {
  ArchivedTabRecord,
  DuplicatePromptDisplayMode,
  GroupViewState,
} from "@/domain/types"

export async function updateDuplicatePromptSettings(
  displayMode: DuplicatePromptDisplayMode
) {
  const root = await readStorageRoot()
  await writeStorageRoot({
    ...root,
    duplicatePromptSettings: {
      displayMode,
      updatedAt: new Date().toISOString(),
    },
  })
}
```

Modify `src/worker/refresh.ts`:

```ts
import { readDuplicatePromptSession } from "@/storage/session-storage"

export async function buildDomainState(): Promise<DomainStatePayload> {
  const [chromeSnapshot, storageRoot, duplicatePromptSession] =
    await Promise.all([
      readChromeSnapshot(),
      readStorageRoot(),
      readDuplicatePromptSession(),
    ])

  const activeInstances = toTabInstances(chromeSnapshot.tabs)
  const inventory = mergeInventory(
    activeInstances,
    Object.values(storageRoot.archivedTabs)
  )
  const groups = buildGroups(inventory, storageRoot.groupViewState)

  return {
    generatedAt: new Date().toISOString(),
    groups,
    counts: countItems(inventory),
    duplicatePrompt: duplicatePromptSession.duplicatePrompt,
    duplicatePromptSettings: storageRoot.duplicatePromptSettings,
  }
}
```

- [ ] **Step 5: Add worker mutation**

Modify `src/worker/mutations.ts`:

```ts
import type { DuplicatePromptDisplayMode } from "@/domain/types"
import { updateDuplicatePromptSettings } from "@/storage/local-storage"

export async function updateDuplicatePromptDisplayMode(
  displayMode: DuplicatePromptDisplayMode
): Promise<MutationResult> {
  try {
    await updateDuplicatePromptSettings(displayMode)
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("storage_failed", "无法保存重复提示展示方式。")
  }
}
```

Use the existing `MutationResult`, `failure`, and `buildDomainState` imports/patterns already present in `src/worker/mutations.ts`.

- [ ] **Step 6: Route message in service worker**

Modify `src/extension/service-worker.ts` imports and switch:

```ts
import {
  archiveTab,
  archiveTabs,
  closeTab,
  closeTabs,
  deleteArchive,
  deleteArchives,
  jumpToTab,
  restoreArchive,
  updateDuplicatePromptDisplayMode,
  updateGroupCollapsed,
} from "@/worker/mutations"
```

Add case:

```ts
case "duplicatePrompt:setDisplayMode":
  return updateDuplicatePromptDisplayMode(message.displayMode)
```

Expose the handler for tests if not already exposed:

```ts
export const handleWorkerMessageForTest = handleMessage
```

- [ ] **Step 7: Run tests**

Run: `npm test -- src/extension/service-worker.test.ts src/storage/schema.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/worker/messages.ts src/worker/refresh.ts src/storage/local-storage.ts src/worker/mutations.ts src/extension/service-worker.ts src/extension/service-worker.test.ts
git commit -m "feat: add duplicate prompt worker state"
```

---

### Task 4: Prompt Detection, Badge, And Worker Actions

**Files:**
- Create: `src/worker/duplicate-prompt.ts`
- Modify: `src/extension/service-worker.ts`
- Test: add `src/worker/duplicate-prompt.test.ts`

- [ ] **Step 1: Write failing worker tests**

Create `src/worker/duplicate-prompt.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import { handlePotentialDuplicatePrompt } from "./duplicate-prompt"
import * as session from "@/storage/session-storage"
import * as refresh from "./refresh"

vi.mock("@/storage/session-storage")
vi.mock("./refresh")

describe("worker duplicate prompt handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores a pending prompt and sets badge when side panel and overlay are unavailable", async () => {
    vi.mocked(session.readDuplicatePromptSession).mockResolvedValue({
      handledDuplicatePromptTabIds: [],
    })
    vi.mocked(refresh.buildDomainState).mockResolvedValue({
      generatedAt: "2026-06-23T00:00:00.000Z",
      groups: [],
      counts: { total: 0, active: 0, archived: 0, duplicate: 0 },
      duplicatePromptSettings: {
        displayMode: "sidePanel",
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    })

    await handlePotentialDuplicatePrompt(123)

    expect(session.writeDuplicatePrompt).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/worker/duplicate-prompt.test.ts`

Expected: FAIL because `src/worker/duplicate-prompt.ts` does not exist.

- [ ] **Step 3: Implement prompt worker shell**

Create `src/worker/duplicate-prompt.ts`:

```ts
import { createDuplicatePromptCandidate } from "@/domain/duplicate-prompt"
import type { DuplicatePromptRuntime } from "@/domain/types"
import {
  clearDuplicatePromptSession,
  markDuplicatePromptHandled,
  readDuplicatePromptSession,
  writeDuplicatePrompt,
} from "@/storage/session-storage"
import { buildDomainState } from "./refresh"

const BADGE_TEXT = "1"
const BADGE_COLOR = "#b7791f"

export async function handlePotentialDuplicatePrompt(newTabId: number) {
  const session = await readDuplicatePromptSession()
  if (session.handledDuplicatePromptTabIds.includes(newTabId)) {
    return
  }

  const state = await buildDomainState()
  const instances = state.groups.flatMap((group) =>
    group.items.flatMap((item) => (item.kind === "active" ? [item] : []))
  )
  const prompt = createDuplicatePromptCandidate(instances, newTabId)
  if (!prompt) {
    return
  }

  const nextPrompt: DuplicatePromptRuntime = {
    ...prompt,
    displaySurface: "pending",
  }

  await writeDuplicatePrompt(nextPrompt)
  await setDuplicatePromptBadge()
}

export async function clearDuplicatePromptBadge() {
  await chrome.action.setBadgeText({ text: "" })
  await chrome.action.setTitle({ title: "Chrome Tab Manager" })
}

export async function setDuplicatePromptBadge() {
  await chrome.action.setBadgeText({ text: BADGE_TEXT })
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR })
  await chrome.action.setTitle({
    title: "Chrome Tab Manager - 有 1 个重复页面待处理",
  })
}

export async function keepDuplicatePrompt(promptTabId: number) {
  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}

export async function dismissDuplicatePrompt(promptTabId: number) {
  await keepDuplicatePrompt(promptTabId)
}
```

- [ ] **Step 4: Wire detection to tab events**

Modify `src/extension/service-worker.ts`:

```ts
import {
  dismissDuplicatePrompt,
  handlePotentialDuplicatePrompt,
  keepDuplicatePrompt,
} from "@/worker/duplicate-prompt"
```

Replace the current `chrome.tabs.onCreated.addListener(markDirty)` with:

```ts
chrome.tabs.onCreated.addListener((tab) => {
  markDirty()
  if (typeof tab.id === "number") {
    void handlePotentialDuplicatePrompt(tab.id)
  }
})
```

Replace `chrome.tabs.onUpdated.addListener(markDirty)` with:

```ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  markDirty()
  if (changeInfo.status === "complete") {
    void handlePotentialDuplicatePrompt(tabId)
  }
})
```

Add message cases:

```ts
case "duplicatePrompt:keep":
  await keepDuplicatePrompt(message.promptTabId)
  return { ok: true, state: await buildDomainState() }
case "duplicatePrompt:dismiss":
  await dismissDuplicatePrompt(message.promptTabId)
  return { ok: true, state: await buildDomainState() }
```

- [ ] **Step 5: Run worker tests**

Run: `npm test -- src/worker/duplicate-prompt.test.ts src/extension/service-worker.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/worker/duplicate-prompt.ts src/worker/duplicate-prompt.test.ts src/extension/service-worker.ts
git commit -m "feat: detect duplicate prompt candidates"
```

---

### Task 5: Side Panel Settings View

**Files:**
- Create: `src/side-panel/settings/SettingsPanel.tsx`
- Modify: `src/side-panel/App.tsx`
- Modify: `src/side-panel/api.ts`
- Modify: `src/worker/messages.ts` if final prop names differ.

- [ ] **Step 1: Add SettingsPanel component**

Create `src/side-panel/settings/SettingsPanel.tsx`:

```tsx
import { ArrowLeftIcon } from "lucide-react"
import type { DuplicatePromptDisplayMode } from "@/domain/types"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type SettingsPanelProps = {
  displayMode: DuplicatePromptDisplayMode
  onDisplayModeChange: (displayMode: DuplicatePromptDisplayMode) => void
  onBack: () => void
}

export function SettingsPanel({
  displayMode,
  onDisplayModeChange,
  onBack,
}: SettingsPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="返回标签清单"
          onClick={onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" />
        </Button>
        <h2 className="text-sm font-semibold">设置</h2>
      </div>

      <section className="border-t border-border pt-3">
        <h3 className="text-xs font-medium text-muted-foreground">重复提示</h3>
        <div className="mt-3">
          <Label className="text-sm">展示方式</Label>
          <RadioGroup
            className="mt-2 grid gap-2"
            value={displayMode}
            onValueChange={(value) =>
              onDisplayModeChange(value as DuplicatePromptDisplayMode)
            }
          >
            <label className="flex items-start gap-2 rounded-md border border-border p-2">
              <RadioGroupItem value="sidePanel" />
              <span className="grid gap-0.5">
                <span className="text-sm">侧边栏</span>
                <span className="text-xs text-muted-foreground">
                  不向网页注入提示，未打开时使用图标提醒。
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-2">
              <RadioGroupItem value="pageOverlay" />
              <span className="grid gap-0.5">
                <span className="text-sm">页面浮层</span>
                <span className="text-xs text-muted-foreground">
                  需要授权，只用于显示重复提示，不读取网页内容。
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>
      </section>
    </section>
  )
}
```

- [ ] **Step 2: Wire App view state**

Modify `src/side-panel/App.tsx`:

```tsx
import { SettingsPanel } from "./settings/SettingsPanel"
```

Add state:

```tsx
const [activeView, setActiveView] = useState<"list" | "settings">("list")
```

Pass an `onOpenSettings` prop to `PanelHeader` and render:

```tsx
{activeView === "settings" && state ? (
  <SettingsPanel
    displayMode={state.duplicatePromptSettings.displayMode}
    onDisplayModeChange={(displayMode) => {
      void runCommand({
        type: "duplicatePrompt:setDisplayMode",
        displayMode,
      })
    }}
    onBack={() => setActiveView("list")}
  />
) : (
  <section ref={groupListRef} className={cn(...)} aria-label="标签清单">
    {/* existing list */}
  </section>
)}
```

Keep search/filter/selection state outside this branch so returning preserves it.

- [ ] **Step 3: Add header button**

Modify `src/side-panel/components/PanelHeader.tsx` to accept:

```tsx
type PanelHeaderProps = {
  counts?: InventoryCounts
  onOpenSettings: () => void
}
```

Add a ghost icon button:

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  aria-label="打开设置"
  onClick={onOpenSettings}
>
  <SettingsIcon data-icon="inline-start" />
</Button>
```

- [ ] **Step 4: Add demo state support**

Modify `src/side-panel/api.ts` demo state to include:

```ts
duplicatePromptSettings: {
  displayMode: "sidePanel",
  updatedAt: new Date().toISOString(),
},
```

Handle:

```ts
if (message.type === "duplicatePrompt:setDisplayMode") {
  demoState = {
    ...demoState,
    duplicatePromptSettings: {
      displayMode: message.displayMode,
      updatedAt: new Date().toISOString(),
    },
  }
}
```

- [ ] **Step 5: Run typecheck/build**

Run: `npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/side-panel/App.tsx src/side-panel/api.ts src/side-panel/components/PanelHeader.tsx src/side-panel/settings/SettingsPanel.tsx
git commit -m "feat: add duplicate prompt settings view"
```

---

### Task 6: Side Panel Duplicate Prompt Banner

**Files:**
- Create: `src/side-panel/components/DuplicatePromptBanner.tsx`
- Modify: `src/side-panel/App.tsx`
- Modify: `src/side-panel/api.ts`

- [ ] **Step 1: Create banner component**

Create `src/side-panel/components/DuplicatePromptBanner.tsx`:

```tsx
import { ExternalLinkIcon, ListFilterIcon } from "lucide-react"
import type { DuplicatePromptRuntime } from "@/domain/types"
import { Button } from "@/components/ui/button"

type DuplicatePromptBannerProps = {
  prompt: DuplicatePromptRuntime
  secondsRemaining: number
  onJump: () => void
  onKeep: () => void
  onViewDuplicates: () => void
}

export function DuplicatePromptBanner({
  prompt,
  secondsRemaining,
  onJump,
  onKeep,
  onViewDuplicates,
}: DuplicatePromptBannerProps) {
  const keepLabel =
    secondsRemaining <= 5 ? `保留 ${secondsRemaining}` : "保留"

  return (
    <section className="border-b border-border bg-background px-3 py-2">
      <div className="rounded-md border border-[color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_58%)] bg-background p-2 shadow-sm">
        <div className="mb-2 border-l-[3px] border-[var(--color-tab-rail-duplicate)] pl-2">
          <p className="text-sm font-medium">已打开重复页面</p>
          <p className="truncate text-xs text-muted-foreground">
            {prompt.title} · {prompt.hostname}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" onClick={onJump}>
            <ExternalLinkIcon data-icon="inline-start" />
            跳转
          </Button>
          <Button size="sm" variant="secondary" onClick={onKeep}>
            {keepLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={onViewDuplicates}>
            <ListFilterIcon data-icon="inline-start" />
            查看重复
          </Button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add countdown hook in App**

In `src/side-panel/App.tsx`, add:

```tsx
const [promptSecondsRemaining, setPromptSecondsRemaining] = useState(30)

useEffect(() => {
  if (!state?.duplicatePrompt) {
    setPromptSecondsRemaining(30)
    return
  }

  setPromptSecondsRemaining(30)
  const startedAt = Date.now()
  const intervalId = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    const remaining = Math.max(0, 30 - elapsed)
    setPromptSecondsRemaining(remaining)
    if (remaining === 0) {
      window.clearInterval(intervalId)
      void runCommand({
        type: "duplicatePrompt:dismiss",
        promptTabId: state.duplicatePrompt!.newTabId,
      })
    }
  }, 250)

  return () => window.clearInterval(intervalId)
}, [runCommand, state?.duplicatePrompt])
```

- [ ] **Step 3: Render banner and actions**

Render below top controls:

```tsx
{state?.duplicatePrompt && activeView === "list" ? (
  <DuplicatePromptBanner
    prompt={state.duplicatePrompt}
    secondsRemaining={promptSecondsRemaining}
    onJump={() => {
      void runCommand({
        type: "duplicatePrompt:jump",
        promptTabId: state.duplicatePrompt!.newTabId,
        targetTabId: state.duplicatePrompt!.defaultTargetTabId,
        targetWindowId: state.duplicatePrompt!.defaultTargetWindowId,
      })
    }}
    onKeep={() => {
      void runCommand({
        type: "duplicatePrompt:keep",
        promptTabId: state.duplicatePrompt!.newTabId,
      })
    }}
    onViewDuplicates={() => {
      setQuery("")
      setStatusFilter("duplicate")
      void runCommand({
        type: "duplicatePrompt:viewDuplicates",
        promptTabId: state.duplicatePrompt!.newTabId,
        normalizedUrl: state.duplicatePrompt!.normalizedUrl,
      })
    }}
  />
) : null}
```

- [ ] **Step 4: Add demo support**

In `src/side-panel/api.ts`, clear demo prompt for `duplicatePrompt:keep`, `duplicatePrompt:dismiss`, `duplicatePrompt:viewDuplicates`, and remove new tab for `duplicatePrompt:jump`.

```ts
if (message.type === "duplicatePrompt:keep" || message.type === "duplicatePrompt:dismiss" || message.type === "duplicatePrompt:viewDuplicates") {
  demoState = { ...demoState, duplicatePrompt: undefined }
}
```

- [ ] **Step 5: Run typecheck/build**

Run: `npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/side-panel/App.tsx src/side-panel/api.ts src/side-panel/components/DuplicatePromptBanner.tsx
git commit -m "feat: show duplicate prompt banner"
```

---

### Task 7: Prompt Actions And View Duplicates Behavior

**Files:**
- Modify: `src/worker/duplicate-prompt.ts`
- Modify: `src/extension/service-worker.ts`
- Modify: `src/side-panel/App.tsx`
- Test: `src/worker/duplicate-prompt.test.ts`

- [ ] **Step 1: Add failing action tests**

Append to `src/worker/duplicate-prompt.test.ts`:

```ts
it("jump action activates target and removes the prompt tab", async () => {
  const chromeMock = globalThis.chrome as unknown as {
    tabs: { update: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
    windows: { update: ReturnType<typeof vi.fn> }
  }

  const { jumpToDuplicatePromptTarget } = await import("./duplicate-prompt")

  await jumpToDuplicatePromptTarget({
    promptTabId: 7,
    targetTabId: 3,
    targetWindowId: 1,
  })

  expect(chromeMock.windows.update).toHaveBeenCalledWith(1, { focused: true })
  expect(chromeMock.tabs.update).toHaveBeenCalledWith(3, { active: true })
  expect(chromeMock.tabs.remove).toHaveBeenCalledWith(7)
})
```

- [ ] **Step 2: Implement action helpers**

Add to `src/worker/duplicate-prompt.ts`:

```ts
export async function jumpToDuplicatePromptTarget({
  promptTabId,
  targetTabId,
  targetWindowId,
}: {
  promptTabId: number
  targetTabId: number
  targetWindowId: number
}) {
  await chrome.windows.update(targetWindowId, { focused: true })
  await chrome.tabs.update(targetTabId, { active: true })
  try {
    await chrome.tabs.remove(promptTabId)
  } catch {
    // The new duplicate tab may already be closed. The prompt should still clear.
  }
  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}

export async function viewDuplicatePromptInstances(promptTabId: number) {
  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}
```

- [ ] **Step 3: Route actions**

In `src/extension/service-worker.ts`, add imports and cases:

```ts
import {
  dismissDuplicatePrompt,
  handlePotentialDuplicatePrompt,
  jumpToDuplicatePromptTarget,
  keepDuplicatePrompt,
  viewDuplicatePromptInstances,
} from "@/worker/duplicate-prompt"
```

Cases:

```ts
case "duplicatePrompt:jump":
  await jumpToDuplicatePromptTarget(message)
  return { ok: true, state: await buildDomainState() }
case "duplicatePrompt:viewDuplicates":
  await viewDuplicatePromptInstances(message.promptTabId)
  return { ok: true, state: await buildDomainState() }
```

- [ ] **Step 4: Add side panel scroll target**

In `src/side-panel/App.tsx`, add:

```tsx
const [pendingDuplicateFocus, setPendingDuplicateFocus] = useState<{
  promptTabId: number
  normalizedUrl: string
} | null>(null)
```

In `onViewDuplicates`, before `runCommand`:

```tsx
setPendingDuplicateFocus({
  promptTabId: state.duplicatePrompt!.newTabId,
  normalizedUrl: state.duplicatePrompt!.normalizedUrl,
})
```

Add effect:

```tsx
useEffect(() => {
  if (!pendingDuplicateFocus || statusFilter !== "duplicate") {
    return
  }

  const frameId = window.requestAnimationFrame(() => {
    const listElement = groupListRef.current
    const promptRow = listElement?.querySelector<HTMLElement>(
      `[data-tab-id="${pendingDuplicateFocus.promptTabId}"]`
    )
    const fallbackRow = listElement?.querySelector<HTMLElement>(
      `[data-normalized-url="${CSS.escape(pendingDuplicateFocus.normalizedUrl)}"]`
    )
    ;(promptRow ?? fallbackRow)?.scrollIntoView({
      block: "center",
      inline: "nearest",
    })
    setPendingDuplicateFocus(null)
  })

  return () => window.cancelAnimationFrame(frameId)
}, [pendingDuplicateFocus, statusFilter, state])
```

Modify `InventoryRow` root element to include:

```tsx
data-tab-id={item.kind === "active" ? item.tabId : undefined}
data-normalized-url={item.normalizedUrl}
```

- [ ] **Step 5: Run tests/build**

Run: `npm test -- src/worker/duplicate-prompt.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/worker/duplicate-prompt.ts src/worker/duplicate-prompt.test.ts src/extension/service-worker.ts src/side-panel/App.tsx src/side-panel/components/InventoryRow.tsx
git commit -m "feat: handle duplicate prompt actions"
```

---

### Task 8: Optional Permission And Dynamic Page Overlay Injection

**Files:**
- Modify: `vite.config.ts`
- Create: `src/content-script/duplicate-prompt-overlay.ts`
- Modify: `src/worker/duplicate-prompt.ts`
- Modify: `src/worker/mutations.ts`

- [ ] **Step 1: Update manifest generation**

Modify `vite.config.ts` manifest source:

```ts
permissions: ["tabs", "storage", "sidePanel", "scripting"],
optional_host_permissions: ["<all_urls>"],
```

Add Rollup input:

```ts
"duplicate-prompt-overlay": resolve(
  __dirname,
  "src/content-script/duplicate-prompt-overlay.ts"
),
```

- [ ] **Step 2: Add overlay content script**

Create `src/content-script/duplicate-prompt-overlay.ts`:

```ts
type OverlayMessage = {
  type: "duplicatePromptOverlay:show"
  prompt: {
    newTabId: number
    title: string
    hostname: string
    defaultTargetTabId: number
    defaultTargetWindowId: number
    normalizedUrl: string
  }
}

const ROOT_ID = "chrome-tab-manager-duplicate-prompt-root"

chrome.runtime.onMessage.addListener((message: OverlayMessage) => {
  if (message.type !== "duplicatePromptOverlay:show") {
    return
  }

  mountOverlay(message.prompt)
})

function mountOverlay(prompt: OverlayMessage["prompt"]) {
  document.getElementById(ROOT_ID)?.remove()

  const host = document.createElement("div")
  host.id = ROOT_ID
  const shadow = host.attachShadow({ mode: "closed" })
  shadow.innerHTML = renderOverlay(prompt)
  document.documentElement.append(host)

  const jump = shadow.querySelector<HTMLButtonElement>("[data-action='jump']")
  const keep = shadow.querySelector<HTMLButtonElement>("[data-action='keep']")
  const view = shadow.querySelector<HTMLButtonElement>("[data-action='view']")

  jump?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:jump",
      promptTabId: prompt.newTabId,
      targetTabId: prompt.defaultTargetTabId,
      targetWindowId: prompt.defaultTargetWindowId,
    })
    host.remove()
  })

  keep?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:keep",
      promptTabId: prompt.newTabId,
    })
    host.remove()
  })

  view?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:viewDuplicates",
      promptTabId: prompt.newTabId,
      normalizedUrl: prompt.normalizedUrl,
    })
    host.remove()
  })

  startCountdown(host, keep, prompt.newTabId)
}

function startCountdown(
  host: HTMLElement,
  keep: HTMLButtonElement | null,
  promptTabId: number
) {
  const startedAt = Date.now()
  const timer = window.setInterval(() => {
    const remaining = Math.max(
      0,
      30 - Math.floor((Date.now() - startedAt) / 1000)
    )
    if (keep && remaining <= 5) {
      keep.textContent = `保留 ${remaining}`
    }
    if (remaining === 0) {
      window.clearInterval(timer)
      void chrome.runtime.sendMessage({
        type: "duplicatePrompt:dismiss",
        promptTabId,
      })
      host.remove()
    }
  }, 250)
}

function renderOverlay(prompt: OverlayMessage["prompt"]) {
  return `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        box-sizing: border-box;
        width: min(340px, calc(100vw - 32px));
        border: 1px solid #d7d7d7;
        border-top: 3px solid #b7791f;
        border-radius: 8px;
        background: #ffffff;
        color: #18181b;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
        font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 10px;
      }
      @media (prefers-reduced-motion: no-preference) {
        .panel { animation: ctm-enter 120ms ease-out; }
        @keyframes ctm-enter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      }
      .title { font-weight: 650; margin: 0 0 3px; }
      .meta {
        margin: 0 0 10px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
      button {
        border: 1px solid #d7d7d7;
        border-radius: 6px;
        background: #fff;
        color: #18181b;
        cursor: pointer;
        font: inherit;
        min-height: 30px;
        padding: 4px 8px;
      }
      button[data-action="jump"] {
        border-color: #b7791f;
        background: #b7791f;
        color: #fff;
      }
      button:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }
    </style>
    <section class="panel" role="dialog" aria-label="重复页面提示">
      <p class="title">已打开重复页面</p>
      <p class="meta">${escapeHtml(prompt.title)} · ${escapeHtml(prompt.hostname)}</p>
      <div class="actions">
        <button type="button" data-action="jump">跳转</button>
        <button type="button" data-action="keep">保留</button>
        <button type="button" data-action="view">查看重复</button>
      </div>
    </section>
  `
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return replacements[char] ?? char
  })
}
```

- [ ] **Step 3: Request optional permission from settings mutation**

In `src/worker/mutations.ts`, update `updateDuplicatePromptDisplayMode`:

```ts
if (displayMode === "pageOverlay") {
  const granted = await chrome.permissions.request({
    origins: ["<all_urls>"],
  })
  if (!granted) {
    await updateDuplicatePromptSettings("sidePanel")
    return failure(
      "chrome_api_failed",
      "页面浮层需要授权。已继续使用侧边栏提示。"
    )
  }
}
```

If TypeScript requires the `"scripting"` permission in the request, use:

```ts
permissions: ["scripting"],
origins: ["<all_urls>"],
```

based on Chrome typings available in this project.

- [ ] **Step 4: Inject overlay when configured**

In `src/worker/duplicate-prompt.ts`, add:

```ts
async function tryShowPageOverlay(prompt: DuplicatePromptRuntime) {
  try {
    const hasPermission = await chrome.permissions.contains({
      origins: ["<all_urls>"],
    })
    if (!hasPermission) {
      return false
    }

    await chrome.scripting.executeScript({
      target: { tabId: prompt.newTabId },
      files: ["duplicate-prompt-overlay.js"],
    })
    await chrome.tabs.sendMessage(prompt.newTabId, {
      type: "duplicatePromptOverlay:show",
      prompt,
    })
    return true
  } catch {
    return false
  }
}
```

In `handlePotentialDuplicatePrompt`, after creating `prompt`, branch:

```ts
if (state.duplicatePromptSettings.displayMode === "pageOverlay") {
  const shown = await tryShowPageOverlay({
    ...prompt,
    displaySurface: "pageOverlay",
  })
  if (shown) {
    await writeDuplicatePrompt({ ...prompt, displaySurface: "pageOverlay" })
    await clearDuplicatePromptBadge()
    return
  }
}
```

Then keep the existing pending fallback.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: `dist/duplicate-prompt-overlay.js` exists and build passes.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/content-script/duplicate-prompt-overlay.ts src/worker/duplicate-prompt.ts src/worker/mutations.ts
git commit -m "feat: add optional duplicate prompt page overlay"
```

---

### Task 9: Permission Revocation Fallback

**Files:**
- Modify: `src/extension/service-worker.ts`
- Modify: `src/worker/mutations.ts`
- Modify: `src/worker/refresh.ts`
- Test: `src/extension/service-worker.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/extension/service-worker.test.ts`:

```ts
it("falls back to side panel when page overlay permission is removed", async () => {
  const { handlePermissionsRemovedForTest } = await import("./service-worker")
  const mutations = await import("@/worker/mutations")

  await handlePermissionsRemovedForTest({
    origins: ["<all_urls>"],
    permissions: [],
  })

  expect(mutations.handleDuplicatePromptPermissionRemoved).toHaveBeenCalled()
})
```

Add mock:

```ts
handleDuplicatePromptPermissionRemoved: vi.fn(),
```

- [ ] **Step 2: Implement mutation**

In `src/worker/mutations.ts`:

```ts
export async function handleDuplicatePromptPermissionRemoved(): Promise<void> {
  const root = await readStorageRoot()
  if (root.duplicatePromptSettings.displayMode !== "pageOverlay") {
    return
  }

  await updateDuplicatePromptSettings("sidePanel")
}
```

- [ ] **Step 3: Wire permission event**

In `src/extension/service-worker.ts`:

```ts
import { handleDuplicatePromptPermissionRemoved } from "@/worker/mutations"

chrome.permissions.onRemoved.addListener((permissions) => {
  void handlePermissionsRemoved(permissions)
})

async function handlePermissionsRemoved(
  permissions: chrome.permissions.Permissions
) {
  if (permissions.origins?.includes("<all_urls>")) {
    await handleDuplicatePromptPermissionRemoved()
    markDirty()
  }
}

export const handlePermissionsRemovedForTest = handlePermissionsRemoved
```

- [ ] **Step 4: Add feedback on next state**

In `src/worker/refresh.ts`, if implementing one-shot feedback is too invasive, return the non-blocking message directly from `duplicatePrompt:setDisplayMode` failures and permission revocation does not need UI feedback until side panel next opens. If implementing feedback now, add `feedback?: { kind: "error"; message: string }` to session state and clear it after state read.

Use this exact message:

```ts
{
  kind: "error",
  message: "页面浮层权限已关闭，已改用侧边栏提示。",
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/extension/service-worker.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/extension/service-worker.ts src/worker/mutations.ts src/worker/refresh.ts src/extension/service-worker.test.ts
git commit -m "feat: fall back when overlay permission is removed"
```

---

### Task 10: Final Verification And Manual Chrome Checks

**Files:**
- Modify docs only if implementation changes a documented behavior.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected:

```text
tsc --noEmit exits 0
Test Files 4+ passed
vite build exits 0
```

- [ ] **Step 2: Inspect built manifest**

Run:

```bash
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('dist/manifest.json','utf8')); console.log(JSON.stringify({permissions:m.permissions, optional_host_permissions:m.optional_host_permissions, side_panel:m.side_panel}, null, 2))"
```

Expected:

```json
{
  "permissions": ["tabs", "storage", "sidePanel", "scripting"],
  "optional_host_permissions": ["<all_urls>"],
  "side_panel": {
    "default_path": "side-panel.html"
  }
}
```

- [ ] **Step 3: Manual Chrome side panel mode check**

Load `dist/` as an unpacked extension. With duplicate prompt display mode set to `侧边栏`:

1. Open `https://example.com/a?x=1`.
2. Open a new tab to `https://example.com/a?x=1#two`.
3. Confirm side panel banner appears if side panel is open.
4. Close side panel and repeat.
5. Confirm action badge/title indicates one pending duplicate.
6. Open side panel via extension action.
7. Confirm the pending banner appears.

- [ ] **Step 4: Manual Chrome page overlay mode check**

With duplicate prompt display mode set to `页面浮层` and permission granted:

1. Open `https://example.com/a?x=1`.
2. Open a new tab to `https://example.com/a?x=1#two`.
3. Confirm fixed right-top overlay appears.
4. Confirm `保留` closes overlay and leaves tab open.
5. Repeat and confirm `跳转` activates existing tab and closes new tab.
6. Repeat and confirm `查看重复` opens side panel, clears search, sets duplicate filter, and positions the duplicate row.

- [ ] **Step 5: Manual restricted page fallback check**

1. Try duplicate handling on `chrome://extensions` or another restricted URL.
2. Confirm no overlay is injected.
3. Confirm fallback is side panel pending prompt or action badge/title.

- [ ] **Step 6: Manual permission revocation check**

1. Enable page overlay and grant permission.
2. Revoke site access from Chrome extension controls.
3. Open side panel settings.
4. Confirm display mode is back to `侧边栏`.
5. Confirm non-blocking feedback appears if implemented in Task 9.

- [ ] **Step 7: Commit verification docs if updated**

If docs were updated during implementation:

```bash
git add docs
git commit -m "docs: record duplicate prompt verification"
```

If no docs changed, skip this commit.

---

## Self-Review

- Spec coverage: The plan covers side panel default prompt, optional page overlay, `<all_urls>` optional authorization, dynamic injection, settings view, `chrome.storage.session`, permission revocation fallback, action badge/title, prompt actions, countdown, and manual Chrome verification.
- Placeholder scan: Each code-changing task includes concrete file paths, code, commands, and expected outcomes.
- Type consistency: The shared names are `DuplicatePromptRuntime`, `DuplicatePromptSettings`, `DuplicatePromptDisplayMode`, `duplicatePromptSettings`, `duplicatePrompt`, `handledDuplicatePromptTabIds`, and `duplicatePrompt:*` messages.
