import type { ArchivedTabRecord, GroupViewState } from "@/domain/types"

export const STORAGE_ROOT_KEY = "tabManager"

export type StorageRoot = {
  version: 1
  archivedTabs: Record<string, ArchivedTabRecord>
  groupViewState: Record<string, GroupViewState>
}

export function createDefaultStorageRoot(): StorageRoot {
  return {
    version: 1,
    archivedTabs: {},
    groupViewState: {},
  }
}

export function normalizeStorageRoot(value: unknown): StorageRoot {
  if (!isStorageRoot(value)) {
    return createDefaultStorageRoot()
  }

  return value
}

function isStorageRoot(value: unknown): value is StorageRoot {
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

