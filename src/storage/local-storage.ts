import type { ArchivedTabRecord, GroupViewState } from "@/domain/types"
import {
  createDefaultStorageRoot,
  normalizeStorageRoot,
  STORAGE_ROOT_KEY,
  type StorageRoot,
} from "./schema"

export async function readStorageRoot(): Promise<StorageRoot> {
  const result = await chrome.storage.local.get(STORAGE_ROOT_KEY)
  return normalizeStorageRoot(result[STORAGE_ROOT_KEY])
}

export async function writeStorageRoot(root: StorageRoot): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_ROOT_KEY]: root })
}

export async function upsertArchivedRecord(
  record: ArchivedTabRecord
): Promise<void> {
  const root = await readStorageRoot()
  await writeStorageRoot({
    ...root,
    archivedTabs: {
      ...root.archivedTabs,
      [record.normalizedUrl]: record,
    },
  })
}

export async function deleteArchivedRecord(
  normalizedUrl: string
): Promise<void> {
  const root = await readStorageRoot()
  const { [normalizedUrl]: _deleted, ...archivedTabs } = root.archivedTabs
  await writeStorageRoot({ ...root, archivedTabs })
}

export async function setGroupCollapsed(
  groupKey: string,
  collapsed: boolean
): Promise<void> {
  const root = await readStorageRoot()
  const state: GroupViewState = {
    collapsed,
    updatedAt: new Date().toISOString(),
  }

  await writeStorageRoot({
    ...root,
    groupViewState: {
      ...root.groupViewState,
      [groupKey]: state,
    },
  })
}

export async function ensureStorageRoot(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_ROOT_KEY)
  if (!result[STORAGE_ROOT_KEY]) {
    await writeStorageRoot(createDefaultStorageRoot())
  }
}

