import type {
  GroupRuntime,
  GroupViewState,
  InventoryCounts,
  InventoryItem,
} from "./types"

export function countItems(items: InventoryItem[]): InventoryCounts {
  return items.reduce<InventoryCounts>(
    (counts, item) => {
      counts.total += 1
      if (item.kind === "active") {
        counts.active += 1
        if (item.duplicateCount > 1) {
          counts.duplicate += 1
        }
      } else {
        counts.archived += 1
      }
      return counts
    },
    { total: 0, active: 0, archived: 0, duplicate: 0 }
  )
}

export function groupKeyForHostname(hostname: string): string {
  return `host:${hostname}`
}

export function buildGroups(
  items: InventoryItem[],
  groupViewState: Record<string, GroupViewState> = {}
): GroupRuntime[] {
  const grouped = new Map<string, InventoryItem[]>()

  for (const item of items) {
    const key = groupKeyForHostname(item.hostname)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  return [...grouped.entries()]
    .map(([key, groupItems]) => {
      const sortedItems = sortGroupItems(groupItems)
      const label = key.replace(/^host:/, "")

      return {
        key,
        label,
        hostname: label,
        items: sortedItems,
        counts: countItems(sortedItems),
        collapsed: groupViewState[key]?.collapsed ?? false,
      }
    })
    .sort((a, b) => {
      const countDelta = b.counts.total - a.counts.total
      return countDelta === 0 ? a.label.localeCompare(b.label) : countDelta
    })
}

function sortGroupItems(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "active" ? -1 : 1
    }

    if (a.kind === "archived" && b.kind === "archived") {
      return b.archivedAt.localeCompare(a.archivedAt)
    }

    if (a.kind === "active" && b.kind === "active") {
      const aTime = a.lastAccessed ?? 0
      const bTime = b.lastAccessed ?? 0
      if (aTime !== bTime) {
        return bTime - aTime
      }

      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId
      }

      return a.index - b.index
    }

    return 0
  })
}

