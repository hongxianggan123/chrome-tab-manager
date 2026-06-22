import type {
  ArchivedTabRecord,
  DuplicatePromptSettings,
  GroupViewState,
} from "@/domain/types"

export const STORAGE_ROOT_KEY = "tabManager"

export type StorageRoot = {
  version: 1
  archivedTabs: Record<string, ArchivedTabRecord>
  groupViewState: Record<string, GroupViewState>
  duplicatePromptSettings: DuplicatePromptSettings
}

export function createDefaultDuplicatePromptSettings(): DuplicatePromptSettings {
  return {
    displayMode: "sidePanel",
    updatedAt: new Date(0).toISOString(),
  }
}

export function createDefaultStorageRoot(): StorageRoot {
  return {
    version: 1,
    archivedTabs: {},
    groupViewState: {},
    duplicatePromptSettings: createDefaultDuplicatePromptSettings(),
  }
}

export function normalizeStorageRoot(value: unknown): StorageRoot {
  if (!isStorageRoot(value)) {
    return createDefaultStorageRoot()
  }

  return {
    ...value,
    duplicatePromptSettings: isDuplicatePromptSettings(
      value.duplicatePromptSettings
    )
      ? value.duplicatePromptSettings
      : createDefaultDuplicatePromptSettings(),
  }
}

function isStorageRoot(
  value: unknown
): value is Omit<StorageRoot, "duplicatePromptSettings"> &
  Partial<Pick<StorageRoot, "duplicatePromptSettings">> {
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

function isDuplicatePromptSettings(
  value: unknown
): value is DuplicatePromptSettings {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<DuplicatePromptSettings>
  return (
    (candidate.displayMode === "sidePanel" ||
      candidate.displayMode === "pageOverlay") &&
    typeof candidate.updatedAt === "string"
  )
}
