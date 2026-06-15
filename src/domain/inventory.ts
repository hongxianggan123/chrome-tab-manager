import { applyDuplicateCounts } from "./duplicates"
import { hostnameFromUrl, normalizeUrl } from "./normalize-url"
import { isSpecialUrl, specialUrlGroupLabel } from "./special-url"
import type {
  ArchivedInventoryItem,
  ArchivedTabRecord,
  InventoryItem,
  TabInstance,
  TabInstanceSnapshot,
} from "./types"

export function toTabInstances(
  snapshots: TabInstanceSnapshot[]
): TabInstance[] {
  return applyDuplicateCounts(
    snapshots.map((snapshot) => {
      const special = isSpecialUrl(snapshot.originalUrl)
      const hostname = special
        ? specialUrlGroupLabel(snapshot.originalUrl)
        : hostnameFromUrl(snapshot.originalUrl)

      return {
        kind: "active",
        tabId: snapshot.tabId,
        windowId: snapshot.windowId,
        windowLabel: snapshot.windowLabel,
        originalUrl: snapshot.originalUrl,
        normalizedUrl: normalizeUrl(snapshot.originalUrl),
        hostname,
        title: snapshot.title || snapshot.originalUrl,
        faviconUrl: snapshot.faviconUrl,
        isSpecialUrl: special,
        duplicateCount: 1,
        active: snapshot.active,
        index: snapshot.index,
        lastAccessed: snapshot.lastAccessed,
      }
    })
  )
}

export function archivedRecordToItem(
  record: ArchivedTabRecord
): ArchivedInventoryItem {
  return {
    kind: "archived",
    normalizedUrl: record.normalizedUrl,
    originalUrl: record.originalUrl,
    hostname: record.hostname,
    title: record.title,
    faviconUrl: record.faviconUrl,
    archivedAt: record.archivedAt,
    archiveCount: record.archiveCount,
    sourceWindow: record.sourceWindow,
  }
}

export function mergeInventory(
  activeInstances: TabInstance[],
  archivedRecords: ArchivedTabRecord[]
): InventoryItem[] {
  const activeUrls = new Set(
    activeInstances.map((instance) => instance.normalizedUrl)
  )

  const visibleArchived = archivedRecords
    .filter((record) => !activeUrls.has(record.normalizedUrl))
    .map(archivedRecordToItem)

  return [...activeInstances, ...visibleArchived]
}

