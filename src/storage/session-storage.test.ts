import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DuplicatePromptRuntime } from "@/domain/types"
import {
  DUPLICATE_PROMPT_SESSION_KEY,
  clearDuplicatePromptSession,
  clearDuplicatePromptFocus,
  markDuplicatePromptHandled,
  readDuplicatePromptSession,
  writeDuplicatePrompt,
  writeDuplicatePromptFocus,
} from "./session-storage"

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

  it("writes and clears the duplicate focus request", async () => {
    await writeDuplicatePromptFocus({
      promptTabId: 7,
      normalizedUrl: "https://example.com/a",
      createdAt: "2026-06-23T00:00:00.000Z",
    })

    await expect(readDuplicatePromptSession()).resolves.toMatchObject({
      duplicatePromptFocus: {
        promptTabId: 7,
        normalizedUrl: "https://example.com/a",
      },
    })

    await clearDuplicatePromptFocus()

    await expect(readDuplicatePromptSession()).resolves.toMatchObject({
      duplicatePromptFocus: undefined,
    })
  })
})
