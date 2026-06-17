import { ensureStorageRoot } from "@/storage/local-storage"
import type {
  WorkerPushMessage,
  WorkerRequest,
  WorkerResponse,
} from "@/worker/messages"
import {
  archiveTab,
  archiveTabs,
  closeTab,
  closeTabs,
  deleteArchive,
  deleteArchives,
  jumpToTab,
  restoreArchive,
  updateGroupCollapsed,
} from "@/worker/mutations"
import { buildDomainState } from "@/worker/refresh"

let runtimeDirty = false
const sidePanelPorts = new Set<chrome.runtime.Port>()
let refreshTimer: number | undefined

chrome.runtime.onInstalled.addListener(() => {
  void ensureStorageRoot()
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.action.onClicked.addListener((tab) => {
  if (typeof tab.windowId === "number") {
    void chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

chrome.runtime.onMessage.addListener(
  (
    message: WorkerRequest,
    _sender,
    sendResponse: (response: WorkerResponse) => void
  ) => {
    void handleMessage(message).then(sendResponse)
    return true
  }
)

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "side-panel") {
    return
  }

  sidePanelPorts.add(port)
  schedulePushRefresh()

  port.onDisconnect.addListener(() => {
    sidePanelPorts.delete(port)
  })
})

chrome.tabs.onCreated.addListener(markDirty)
chrome.tabs.onUpdated.addListener(markDirty)
chrome.tabs.onRemoved.addListener(markDirty)
chrome.tabs.onActivated.addListener(markDirty)
chrome.tabs.onAttached.addListener(markDirty)
chrome.tabs.onDetached.addListener(markDirty)
chrome.tabs.onMoved.addListener(markDirty)
chrome.windows.onCreated.addListener(markDirty)
chrome.windows.onRemoved.addListener(markDirty)
chrome.windows.onFocusChanged.addListener(markDirty)
chrome.storage.onChanged.addListener(markDirty)

async function handleMessage(message: WorkerRequest): Promise<WorkerResponse> {
  runtimeDirty = false

  switch (message.type) {
    case "state:get":
      return { ok: true, state: await buildDomainState() }
    case "tab:jump":
      return jumpToTab(message.tabId, message.windowId)
    case "tab:close":
      return closeTab(message.tabId)
    case "tab:archive":
      return archiveTab(message.tabId)
    case "tabs:close":
      return closeTabs(message.tabIds)
    case "tabs:archive":
      return archiveTabs(message.tabIds)
    case "archive:restore":
      return restoreArchive(message.normalizedUrl)
    case "archive:delete":
      return deleteArchive(message.normalizedUrl)
    case "archives:delete":
      return deleteArchives(message.normalizedUrls)
    case "group:setCollapsed":
      return updateGroupCollapsed(message.groupKey, message.collapsed)
  }
}

function markDirty() {
  runtimeDirty = true
  schedulePushRefresh()
}

export function isRuntimeDirtyForTest() {
  return runtimeDirty
}

function schedulePushRefresh() {
  if (sidePanelPorts.size === 0) {
    return
  }

  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  refreshTimer = setTimeout(() => {
    void pushStateToPanels()
  }, 150) as unknown as number
}

async function pushStateToPanels() {
  if (!runtimeDirty || sidePanelPorts.size === 0) {
    return
  }

  runtimeDirty = false
  const message: WorkerPushMessage = {
    type: "state:changed",
    state: await buildDomainState(),
  }

  for (const port of sidePanelPorts) {
    port.postMessage(message)
  }
}
