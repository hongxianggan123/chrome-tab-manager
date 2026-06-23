import { countItems, buildGroups } from "@/domain/grouping"
import { mergeInventory, toTabInstances } from "@/domain/inventory"
import { readStorageRoot } from "@/storage/local-storage"
import { readDuplicatePromptSession } from "@/storage/session-storage"
import { readChromeSnapshot } from "./chrome-snapshot"
import type { DomainStatePayload } from "./messages"

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
    duplicatePromptFocus: duplicatePromptSession.duplicatePromptFocus,
    duplicatePromptSettings: storageRoot.duplicatePromptSettings,
  }
}
