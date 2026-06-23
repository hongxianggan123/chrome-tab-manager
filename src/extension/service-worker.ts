import { ensureStorageRoot } from "@/storage/local-storage"
import { clearDuplicatePromptFocus } from "@/storage/session-storage"
import type {
  WorkerPushMessage,
  WorkerRequest,
  WorkerResponse,
} from "@/worker/messages"
import {
  dismissDuplicatePrompt,
  handlePotentialDuplicatePrompt,
  jumpToDuplicatePromptTarget,
  keepDuplicatePrompt,
  viewDuplicatePromptInstances,
} from "@/worker/duplicate-prompt"
import {
  archiveTab,
  archiveTabs,
  closeTab,
  closeTabs,
  deleteArchive,
  deleteArchives,
  handleDuplicatePromptPermissionRemoved,
  jumpToTab,
  restoreArchive,
  updateDuplicatePromptDisplayMode,
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
    sender,
    sendResponse: (response: WorkerResponse) => void
  ) => {
    void handleMessage(message, sender).then(sendResponse)
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

chrome.tabs.onCreated.addListener((tab) => {
  markDirty()
  if (typeof tab.id === "number") {
    void handlePotentialDuplicatePrompt(tab.id)
  }
})
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  markDirty()
  if (changeInfo.status === "complete") {
    void handlePotentialDuplicatePrompt(tabId)
  }
})
chrome.tabs.onRemoved.addListener(markDirty)
chrome.tabs.onActivated.addListener(markDirty)
chrome.tabs.onAttached.addListener(markDirty)
chrome.tabs.onDetached.addListener(markDirty)
chrome.tabs.onMoved.addListener(markDirty)
chrome.windows.onCreated.addListener(markDirty)
chrome.windows.onRemoved.addListener(markDirty)
chrome.windows.onFocusChanged.addListener(markDirty)
chrome.storage.onChanged.addListener(markDirty)
chrome.permissions.onRemoved.addListener((permissions) => {
  void handlePermissionsRemoved(permissions)
})

async function handleMessage(
  message: WorkerRequest,
  sender?: chrome.runtime.MessageSender
): Promise<WorkerResponse> {
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
    case "duplicatePrompt:setDisplayMode":
      return updateDuplicatePromptDisplayMode(message.displayMode)
    case "duplicatePrompt:jump":
      await jumpToDuplicatePromptTarget(message)
      return { ok: true, state: await buildDomainState() }
    case "duplicatePrompt:viewDuplicates":
      await viewDuplicatePromptInstances({
        ...message,
        windowId: sender?.tab?.windowId,
      })
      markDirty()
      return { ok: true, state: await buildDomainState() }
    case "duplicatePrompt:clearFocus":
      await clearDuplicatePromptFocus()
      return { ok: true, state: await buildDomainState() }
    case "duplicatePrompt:keep":
      await keepDuplicatePrompt(message.promptTabId)
      return { ok: true, state: await buildDomainState() }
    case "duplicatePrompt:dismiss":
      await dismissDuplicatePrompt(message.promptTabId)
      return { ok: true, state: await buildDomainState() }
  }
}

function markDirty() {
  runtimeDirty = true
  schedulePushRefresh()
}

export function isRuntimeDirtyForTest() {
  return runtimeDirty
}

export const handleWorkerMessageForTest = handleMessage
export const handlePermissionsRemovedForTest = handlePermissionsRemoved

async function handlePermissionsRemoved(
  permissions: chrome.permissions.Permissions
) {
  if (permissions.origins?.includes("<all_urls>")) {
    await handleDuplicatePromptPermissionRemoved()
    markDirty()
  }
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
