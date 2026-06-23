import type { DuplicatePromptRuntime, TabInstance } from "./types"

export function getDuplicatePromptDefaultTarget(
  instances: TabInstance[],
  newTabId: number
): TabInstance | null {
  const newTab = instances.find((item) => item.tabId === newTabId)
  if (!newTab || newTab.isSpecialUrl) {
    return null
  }

  const existingMatches = instances
    .filter(
      (item) =>
        item.tabId !== newTabId &&
        item.normalizedUrl === newTab.normalizedUrl &&
        !item.isSpecialUrl
    )
    .sort((a, b) => {
      const aAccessed = a.lastAccessed
      const bAccessed = b.lastAccessed
      if (typeof aAccessed === "number" && typeof bAccessed === "number") {
        return bAccessed - aAccessed
      }
      if (typeof aAccessed === "number") {
        return -1
      }
      if (typeof bAccessed === "number") {
        return 1
      }
      return a.windowId - b.windowId || a.index - b.index || a.tabId - b.tabId
    })

  return existingMatches[0] ?? null
}

export function createDuplicatePromptCandidate(
  instances: TabInstance[],
  newTabId: number,
  createdAt = new Date().toISOString()
): DuplicatePromptRuntime | null {
  const newTab = instances.find((item) => item.tabId === newTabId)
  const target = getDuplicatePromptDefaultTarget(instances, newTabId)

  if (!newTab || !target) {
    return null
  }

  return {
    newTabId: newTab.tabId,
    normalizedUrl: newTab.normalizedUrl,
    originalUrl: newTab.originalUrl,
    title: newTab.title,
    hostname: newTab.hostname,
    defaultTargetTabId: target.tabId,
    defaultTargetWindowId: target.windowId,
    createdAt,
    displaySurface: "pending",
  }
}
