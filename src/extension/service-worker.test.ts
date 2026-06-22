import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DomainStatePayload } from "@/worker/messages"

type Listener<T extends unknown[] = []> = (...args: T) => void

const listeners = {
  actionClicked: [] as Listener<[chrome.tabs.Tab]>[],
  installed: [] as Listener[],
  message: [] as Listener[],
  connect: [] as Listener<[chrome.runtime.Port]>[],
  tabCreated: [] as Listener<[chrome.tabs.Tab]>[],
  tabUpdated: [] as Listener<[number, chrome.tabs.TabChangeInfo]>[],
  tabRemoved: [] as Listener[],
  tabActivated: [] as Listener[],
  tabAttached: [] as Listener[],
  tabDetached: [] as Listener[],
  tabMoved: [] as Listener[],
  windowCreated: [] as Listener[],
  windowRemoved: [] as Listener[],
  windowFocusChanged: [] as Listener[],
  storageChanged: [] as Listener[],
}

const state: DomainStatePayload = {
  generatedAt: "2026-06-18T00:00:00.000Z",
  groups: [],
  counts: {
    total: 0,
    active: 0,
    archived: 0,
    duplicate: 0,
  },
  duplicatePromptSettings: {
    displayMode: "sidePanel",
    updatedAt: "2026-06-18T00:00:00.000Z",
  },
}

vi.mock("@/storage/local-storage", () => ({
  ensureStorageRoot: vi.fn(),
}))

vi.mock("@/worker/refresh", () => ({
  buildDomainState: vi.fn(async () => state),
}))

vi.mock("@/worker/mutations", () => ({
  archiveTab: vi.fn(),
  archiveTabs: vi.fn(),
  closeTab: vi.fn(),
  closeTabs: vi.fn(),
  deleteArchive: vi.fn(),
  deleteArchives: vi.fn(),
  jumpToTab: vi.fn(),
  restoreArchive: vi.fn(),
  updateDuplicatePromptDisplayMode: vi.fn(),
  updateGroupCollapsed: vi.fn(),
}))

vi.mock("@/worker/duplicate-prompt", () => ({
  dismissDuplicatePrompt: vi.fn(),
  handlePotentialDuplicatePrompt: vi.fn(),
  keepDuplicatePrompt: vi.fn(),
}))

describe("service worker push refresh", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()

    for (const listenerList of Object.values(listeners)) {
      listenerList.length = 0
    }

    globalThis.chrome = createChromeMock()
  })

  it("pushes latest state when a side panel connects after runtime became dirty", async () => {
    await import("./service-worker")

    listeners.tabCreated[0](tabEvent({ id: 1 }))

    const postMessage = vi.fn()
    listeners.connect[0](createPortMock({ name: "side-panel", postMessage }))

    await vi.advanceTimersByTimeAsync(150)

    expect(postMessage).toHaveBeenCalledWith({
      type: "state:changed",
      state,
    })
  })

  it("debounces tab events and pushes latest state to connected side panels", async () => {
    await import("./service-worker")

    const postMessage = vi.fn()
    listeners.connect[0](createPortMock({ name: "side-panel", postMessage }))

    listeners.tabCreated[0](tabEvent({ id: 1 }))
    listeners.tabUpdated[0](1, {})

    await vi.advanceTimersByTimeAsync(149)
    expect(postMessage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage).toHaveBeenCalledWith({
      type: "state:changed",
      state,
    })
  })

  it("routes duplicate prompt settings updates", async () => {
    const serviceWorker = await import("./service-worker")
    const mutations = await import("@/worker/mutations")

    await serviceWorker.handleWorkerMessageForTest({
      type: "duplicatePrompt:setDisplayMode",
      displayMode: "pageOverlay",
    })

    expect(mutations.updateDuplicatePromptDisplayMode).toHaveBeenCalledWith(
      "pageOverlay"
    )
  })
})

function createChromeMock() {
  return {
    action: {
      onClicked: event(listeners.actionClicked),
    },
    runtime: {
      onInstalled: event(listeners.installed),
      onMessage: event(listeners.message),
      onConnect: event(listeners.connect),
    },
    sidePanel: {
      setPanelBehavior: vi.fn(),
      open: vi.fn(),
    },
    tabs: {
      onCreated: event(listeners.tabCreated),
      onUpdated: event(listeners.tabUpdated),
      onRemoved: event(listeners.tabRemoved),
      onActivated: event(listeners.tabActivated),
      onAttached: event(listeners.tabAttached),
      onDetached: event(listeners.tabDetached),
      onMoved: event(listeners.tabMoved),
    },
    windows: {
      onCreated: event(listeners.windowCreated),
      onRemoved: event(listeners.windowRemoved),
      onFocusChanged: event(listeners.windowFocusChanged),
    },
    storage: {
      onChanged: event(listeners.storageChanged),
    },
  } as unknown as typeof chrome
}

function createPortMock({
  name,
  postMessage,
}: {
  name: string
  postMessage: chrome.runtime.Port["postMessage"]
}) {
  return {
    name,
    postMessage,
    onDisconnect: event([]),
  } as unknown as chrome.runtime.Port
}

function tabEvent(overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
  return {
    active: false,
    highlighted: false,
    incognito: false,
    index: 0,
    pinned: false,
    selected: false,
    windowId: 1,
    ...overrides,
  } as chrome.tabs.Tab
}

function event<T extends unknown[]>(listenerList: Listener<T>[]) {
  return {
    addListener: (listener: Listener<T>) => {
      listenerList.push(listener)
    },
    removeListener: (listener: Listener<T>) => {
      const index = listenerList.indexOf(listener)
      if (index >= 0) {
        listenerList.splice(index, 1)
      }
    },
  }
}
