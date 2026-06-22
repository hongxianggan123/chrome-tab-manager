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

export async function viewDuplicatePromptInstances(promptTabId: number) {
  await markDuplicatePromptHandled(promptTabId)
  await clearDuplicatePromptSession()
  await clearDuplicatePromptBadge()
}
