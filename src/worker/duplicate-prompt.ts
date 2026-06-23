import { createDuplicatePromptCandidate } from "@/domain/duplicate-prompt"
import type { DuplicatePromptRuntime } from "@/domain/types"
import {
  clearDuplicatePromptSession,
  markDuplicatePromptHandled,
  readDuplicatePromptSession,
  writeDuplicatePrompt,
  writeDuplicatePromptFocus,
} from "@/storage/session-storage"
import { buildDomainState } from "./refresh"

const BADGE_TEXT = "1"
const BADGE_COLOR = "#b7791f"
const DEFAULT_TITLE = "Chrome Tab Manager"
const PROMPT_TITLE = "Chrome Tab Manager - 有 1 个重复页面待处理"

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

  if (state.duplicatePromptSettings.displayMode === "pageOverlay") {
    const overlayPrompt: DuplicatePromptRuntime = {
      ...prompt,
      displaySurface: "pageOverlay",
    }
    const shown = await tryShowPageOverlay(overlayPrompt)
    if (shown) {
      await writeDuplicatePrompt(overlayPrompt)
      await clearDuplicatePromptBadge()
      return
    }
  }

  const nextPrompt: DuplicatePromptRuntime = {
    ...prompt,
    displaySurface: "pending",
  }

  await writeDuplicatePrompt(nextPrompt)
  await setDuplicatePromptBadge()
}

export async function setDuplicatePromptBadge() {
  await chrome.action.setBadgeText({ text: BADGE_TEXT })
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR })
  await chrome.action.setTitle({ title: PROMPT_TITLE })
}

export async function clearDuplicatePromptBadge() {
  await chrome.action.setBadgeText({ text: "" })
  await chrome.action.setTitle({ title: DEFAULT_TITLE })
}

export async function keepDuplicatePrompt(promptTabId: number) {
  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}

export async function dismissDuplicatePrompt(promptTabId: number) {
  await keepDuplicatePrompt(promptTabId)
}

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
    // The new duplicate tab may already be closed.
  }

  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}

export async function viewDuplicatePromptInstances({
  promptTabId,
  normalizedUrl,
  windowId,
}: {
  promptTabId: number
  normalizedUrl: string
  windowId?: number
}) {
  await openDuplicatePromptSidePanel(promptTabId, windowId)

  await writeDuplicatePromptFocus({
    promptTabId,
    normalizedUrl,
    createdAt: new Date().toISOString(),
  })

  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}

async function openDuplicatePromptSidePanel(
  promptTabId: number,
  windowId?: number
) {
  try {
    let targetWindowId = windowId
    if (typeof targetWindowId !== "number") {
      const tab = await chrome.tabs.get(promptTabId)
      targetWindowId = tab.windowId
    }

    if (typeof targetWindowId === "number") {
      await chrome.sidePanel.open({ windowId: targetWindowId })
    }
  } catch {
    // If Chrome does not preserve the user gesture, the side panel can still
    // consume the focus request when opened through the extension action.
  }
}

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
