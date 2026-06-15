import type { TabInstanceSnapshot } from "@/domain/types"

export type ChromeSnapshot = {
  tabs: TabInstanceSnapshot[]
  capturedAt: string
}

export async function readChromeSnapshot(): Promise<ChromeSnapshot> {
  const windows = await chrome.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  })

  const normalWindows = windows
    .filter((window) => !window.incognito)
    .sort(
      (a, b) =>
        (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
    )
  const labels = new Map<number, string>()

  normalWindows.forEach((window, index) => {
    if (typeof window.id === "number") {
      labels.set(window.id, `W${index + 1}`)
    }
  })

  const tabs = normalWindows.flatMap((window) => {
    const windowId = window.id
    if (typeof windowId !== "number") {
      return []
    }

    const windowLabel = labels.get(windowId) ?? "W?"

    return (window.tabs ?? []).flatMap((tab) => {
      if (typeof tab.id !== "number") {
        return []
      }

      const originalUrl = tab.url || tab.pendingUrl || "about:blank"

      return {
        tabId: tab.id,
        windowId,
        windowLabel,
        originalUrl,
        title: tab.title || originalUrl,
        faviconUrl: tab.favIconUrl,
        active: Boolean(tab.active),
        index: tab.index,
        lastAccessed: tab.lastAccessed,
      } satisfies TabInstanceSnapshot
    })
  })

  return {
    tabs,
    capturedAt: new Date().toISOString(),
  }
}
