import type { InventoryItem } from "./types"

export type InventoryItemKey = `tab:${number}` | `archive:${string}`

export type BatchAction = "close" | "archive" | "deleteArchive"

export type BatchActionPlan = {
  action: BatchAction
  targetTabIds: number[]
  targetNormalizedUrls: string[]
  summary: BatchSelectionSummary
  skipped: BatchSkippedSummary
  risk: BatchRiskSummary
}

export type BatchSelectionSummary = {
  total: number
  active: number
  archived: number
  archivableActive: number
}

export type BatchSkippedSummary = {
  active: number
  archived: number
  special: number
}

export type BatchRiskSummary = {
  special: number
  audible: number
  pinned: number
  recent: number
}

const RECENT_ACTIVE_WINDOW_MS = 5 * 60 * 1000

export function inventoryItemKey(item: InventoryItem): InventoryItemKey {
  return item.kind === "active"
    ? `tab:${item.tabId}`
    : `archive:${item.normalizedUrl}`
}

export function summarizeBatchSelection(
  items: InventoryItem[]
): BatchSelectionSummary {
  const activeItems = items.filter((item) => item.kind === "active")

  return {
    total: items.length,
    active: activeItems.length,
    archived: items.length - activeItems.length,
    archivableActive: activeItems.filter((item) => !item.isSpecialUrl).length,
  }
}

export function createBatchActionPlan(
  action: BatchAction,
  items: InventoryItem[],
  now = Date.now()
): BatchActionPlan {
  const activeItems = items.filter((item) => item.kind === "active")
  const archivedItems = items.filter((item) => item.kind === "archived")
  const archivableItems = activeItems.filter((item) => !item.isSpecialUrl)
  const targetActiveItems = action === "archive" ? archivableItems : activeItems
  const targetArchivedItems = action === "deleteArchive" ? archivedItems : []

  return {
    action,
    targetTabIds:
      action === "close" || action === "archive"
        ? targetActiveItems.map((item) => item.tabId)
        : [],
    targetNormalizedUrls:
      action === "deleteArchive"
        ? targetArchivedItems.map((item) => item.normalizedUrl)
        : [],
    summary: summarizeBatchSelection(items),
    skipped: {
      active: action === "deleteArchive" ? activeItems.length : 0,
      archived:
        action === "close" || action === "archive" ? archivedItems.length : 0,
      special:
        action === "archive"
          ? activeItems.filter((item) => item.isSpecialUrl).length
          : 0,
    },
    risk: summarizeRisk(targetActiveItems, now),
  }
}

export function batchPlanTargetCount(plan: BatchActionPlan): number {
  return plan.targetTabIds.length + plan.targetNormalizedUrls.length
}

function summarizeRisk(
  activeItems: Extract<InventoryItem, { kind: "active" }>[],
  now: number
): BatchRiskSummary {
  return activeItems.reduce<BatchRiskSummary>(
    (risk, item) => {
      if (item.isSpecialUrl) {
        risk.special += 1
      }
      if (item.audible) {
        risk.audible += 1
      }
      if (item.pinned) {
        risk.pinned += 1
      }
      if (
        typeof item.lastAccessed === "number" &&
        now - item.lastAccessed <= RECENT_ACTIVE_WINDOW_MS
      ) {
        risk.recent += 1
      }
      return risk
    },
    { special: 0, audible: 0, pinned: 0, recent: 0 }
  )
}
