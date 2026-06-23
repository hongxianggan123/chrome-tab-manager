import type {
  DuplicatePromptFocusRequest,
  DuplicatePromptRuntime,
} from "@/domain/types"

export const DUPLICATE_PROMPT_SESSION_KEY = "tabManagerSession"

export type DuplicatePromptSessionState = {
  duplicatePrompt?: DuplicatePromptRuntime
  duplicatePromptFocus?: DuplicatePromptFocusRequest
  handledDuplicatePromptTabIds: number[]
}

export function createDefaultDuplicatePromptSession(): DuplicatePromptSessionState {
  return {
    handledDuplicatePromptTabIds: [],
  }
}

export async function readDuplicatePromptSession(): Promise<DuplicatePromptSessionState> {
  const result = await chrome.storage.session.get(DUPLICATE_PROMPT_SESSION_KEY)
  return normalizeDuplicatePromptSession(result[DUPLICATE_PROMPT_SESSION_KEY])
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

export async function writeDuplicatePromptFocus(
  duplicatePromptFocus: DuplicatePromptFocusRequest
) {
  const current = await readDuplicatePromptSession()
  await writeDuplicatePromptSession({ ...current, duplicatePromptFocus })
}

export async function clearDuplicatePromptFocus() {
  const current = await readDuplicatePromptSession()
  const { duplicatePromptFocus: _removed, ...next } = current
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

async function writeDuplicatePromptSession(state: DuplicatePromptSessionState) {
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
    duplicatePromptFocus: candidate.duplicatePromptFocus,
    handledDuplicatePromptTabIds: Array.isArray(
      candidate.handledDuplicatePromptTabIds
    )
      ? candidate.handledDuplicatePromptTabIds.filter(
          (tabId): tabId is number => typeof tabId === "number"
        )
      : [],
  }
}
