import type {
  DuplicatePromptDisplayMode,
  DuplicatePromptRuntime,
  DuplicatePromptSettings,
  GroupRuntime,
  InventoryCounts,
  StatusFilter,
} from "@/domain/types"

export type DomainStatePayload = {
  generatedAt: string
  groups: GroupRuntime[]
  counts: InventoryCounts
  duplicatePrompt?: DuplicatePromptRuntime
  duplicatePromptSettings: DuplicatePromptSettings
  feedback?: { kind: "error" | "success"; message: string }
}

export type WorkerError = {
  code:
    | "tabs_unavailable"
    | "tab_not_found"
    | "window_not_found"
    | "special_url_not_archivable"
  | "archive_not_found"
  | "chrome_api_failed"
  | "storage_failed"
  message: string
}

export type WorkerRequest =
  | { type: "state:get" }
  | { type: "tab:jump"; tabId: number; windowId: number }
  | { type: "tab:close"; tabId: number }
  | { type: "tab:archive"; tabId: number }
  | { type: "tabs:close"; tabIds: number[] }
  | { type: "tabs:archive"; tabIds: number[] }
  | { type: "archive:restore"; normalizedUrl: string }
  | { type: "archive:delete"; normalizedUrl: string }
  | { type: "archives:delete"; normalizedUrls: string[] }
  | { type: "group:setCollapsed"; groupKey: string; collapsed: boolean }
  | {
      type: "duplicatePrompt:setDisplayMode"
      displayMode: DuplicatePromptDisplayMode
    }
  | {
      type: "duplicatePrompt:jump"
      promptTabId: number
      targetTabId: number
      targetWindowId: number
    }
  | { type: "duplicatePrompt:keep"; promptTabId: number }
  | {
      type: "duplicatePrompt:viewDuplicates"
      promptTabId: number
      normalizedUrl: string
    }
  | { type: "duplicatePrompt:dismiss"; promptTabId: number }

export type WorkerResponse =
  | { ok: true; state: DomainStatePayload }
  | { ok: false; error: WorkerError }

export type WorkerPushMessage = {
  type: "state:changed"
  state: DomainStatePayload
}

export const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "active",
  "archived",
  "duplicate",
]
