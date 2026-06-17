import type { InventoryItem, TabInstance } from "./types"

type InventoryItemGroup = {
  items: InventoryItem[]
}

export function getDuplicateCleanupTargets(
  visibleGroups: InventoryItemGroup[]
): TabInstance[] {
  const visibleDuplicateGroups = new Map<string, TabInstance[]>()

  for (const group of visibleGroups) {
    for (const item of group.items) {
      if (item.kind !== "active" || item.duplicateCount <= 1) {
        continue
      }

      visibleDuplicateGroups.set(item.normalizedUrl, [
        ...(visibleDuplicateGroups.get(item.normalizedUrl) ?? []),
        item,
      ])
    }
  }

  return [...visibleDuplicateGroups.values()].flatMap((items) => {
    if (items.length < 2) {
      return []
    }

    const retainedItem = getRetainedDuplicateItem(items)
    return items.filter((item) => item.tabId !== retainedItem.tabId)
  })
}

function getRetainedDuplicateItem(items: TabInstance[]): TabInstance {
  const hasMissingLastAccessed = items.some(
    (item) => typeof item.lastAccessed !== "number"
  )

  if (hasMissingLastAccessed) {
    const activeItem = items.find((item) => item.active)
    if (activeItem) {
      return activeItem
    }
  }

  const itemsWithLastAccessed = items.filter(
    (item) => typeof item.lastAccessed === "number"
  )

  if (itemsWithLastAccessed.length > 0) {
    return itemsWithLastAccessed.reduce((retainedItem, item) =>
      item.lastAccessed! > retainedItem.lastAccessed! ? item : retainedItem
    )
  }

  return items[0]
}
