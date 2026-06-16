import type {
  GroupRuntime,
  InventoryCounts,
  StatusFilter,
} from "@/domain/types"

export type DomainStatePayload = {
  generatedAt: string
  groups: GroupRuntime[]
  counts: InventoryCounts
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
