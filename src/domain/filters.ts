import { countItems } from "./grouping"
import type {
  EmptyReason,
  GroupRuntime,
  InventoryCounts,
  InventoryItem,
  StatusFilter,
  VisibleGroup,
} from "./types"

export function filterGroups(
  groups: GroupRuntime[],
  query: string,
  statusFilter: StatusFilter
): {
  totalCounts: InventoryCounts
  visibleGroups: VisibleGroup[]
  emptyReason?: EmptyReason
} {
  const normalizedQuery = query.trim().toLowerCase()
  const allItems = groups.flatMap((group) => group.items)
  const totalCounts = countItems(allItems)

  const visibleGroups = groups
    .map((group) => {
      const items = group.items
        .filter((item) => matchesStatusFilter(item, statusFilter))
        .filter((item) => matchesQuery(item, normalizedQuery))

      return {
        key: group.key,
        label: group.label,
        counts: countItems(items),
        expanded:
          normalizedQuery.length > 0 || statusFilter !== "all"
            ? true
            : !group.collapsed,
        items,
      }
    })
    .filter((group) => group.items.length > 0)

  return {
    totalCounts,
    visibleGroups,
    emptyReason: getEmptyReason(totalCounts, visibleGroups, statusFilter, query),
  }
}

function matchesStatusFilter(
  item: InventoryItem,
  statusFilter: StatusFilter
): boolean {
  switch (statusFilter) {
    case "active":
      return item.kind === "active"
    case "archived":
      return item.kind === "archived"
    case "duplicate":
      return item.kind === "active" && item.duplicateCount > 1
    case "all":
      return true
  }
}

function matchesQuery(item: InventoryItem, query: string): boolean {
  if (query.length === 0) {
    return true
  }

  return [item.title, item.hostname, item.normalizedUrl].some((value) =>
    value.toLowerCase().includes(query)
  )
}

function getEmptyReason(
  totalCounts: InventoryCounts,
  visibleGroups: VisibleGroup[],
  statusFilter: StatusFilter,
  query: string
): EmptyReason | undefined {
  if (visibleGroups.length > 0) {
    return undefined
  }

  if (totalCounts.total === 0) {
    return "no-normal-tabs"
  }

  if (statusFilter === "archived" && totalCounts.archived === 0) {
    return "no-archived-tabs"
  }

  if (query.trim().length > 0 || statusFilter !== "all") {
    return "no-search-results"
  }

  return undefined
}

