import type { DomainStatePayload, WorkerRequest } from "@/worker/messages"
import { countItems } from "@/domain/grouping"
import type { InventoryItem } from "@/domain/types"

export async function sendWorkerMessage(
  message: WorkerRequest
): Promise<DomainStatePayload> {
  if (!isChromeRuntimeAvailable()) {
    return handleDemoMessage(message)
  }

  const response = await chrome.runtime.sendMessage(message)

  if (!response?.ok) {
    throw new Error(response?.error?.message ?? "无法读取标签页。")
  }

  return response.state
}

function isChromeRuntimeAvailable() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage)
}

let demoState: DomainStatePayload | null = null

function handleDemoMessage(message: WorkerRequest): DomainStatePayload {
  demoState ??= createDemoState()

  if (message.type === "group:setCollapsed") {
    demoState = {
      ...demoState,
      groups: demoState.groups.map((group) =>
        group.key === message.groupKey
          ? { ...group, collapsed: message.collapsed }
          : group
      ),
    }
  }

  if (message.type === "tab:jump") {
    demoState = {
      ...demoState,
      groups: demoState.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => {
          if (item.kind !== "active") {
            return item
          }

          const isActiveTab = item.tabId === message.tabId
          return {
            ...item,
            active: isActiveTab,
            lastAccessed: isActiveTab ? Date.now() : item.lastAccessed,
          }
        }),
      })),
    }
  }

  if (message.type === "tab:close") {
    applyDemoItemMutation((items) =>
      items.filter(
        (item) => item.kind !== "active" || item.tabId !== message.tabId
      )
    )
  }

  if (message.type === "tabs:close") {
    const tabIds = new Set(message.tabIds)
    applyDemoItemMutation((items) =>
      items.filter((item) => item.kind !== "active" || !tabIds.has(item.tabId))
    )
  }

  if (message.type === "tab:archive") {
    applyDemoItemMutation((items) =>
      items.flatMap((item) =>
        item.kind === "active" &&
        item.tabId === message.tabId &&
        !item.isSpecialUrl
          ? [demoArchiveItem(item)]
          : [item]
      )
    )
  }

  if (message.type === "tabs:archive") {
    const tabIds = new Set(message.tabIds)
    applyDemoItemMutation((items) =>
      items.flatMap((item) =>
        item.kind === "active" && tabIds.has(item.tabId) && !item.isSpecialUrl
          ? [demoArchiveItem(item)]
          : [item]
      )
    )
  }

  if (message.type === "archive:delete") {
    applyDemoItemMutation((items) =>
      items.filter(
        (item) =>
          item.kind !== "archived" ||
          item.normalizedUrl !== message.normalizedUrl
      )
    )
  }

  if (message.type === "archives:delete") {
    const normalizedUrls = new Set(message.normalizedUrls)
    applyDemoItemMutation((items) =>
      items.filter(
        (item) =>
          item.kind !== "archived" || !normalizedUrls.has(item.normalizedUrl)
      )
    )
  }

  if (message.type === "duplicatePrompt:setDisplayMode") {
    demoState = {
      ...demoState,
      duplicatePromptSettings: {
        displayMode: message.displayMode,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  return structuredClone(demoState)
}

function applyDemoItemMutation(
  mutateItems: (items: InventoryItem[]) => InventoryItem[]
) {
  if (!demoState) {
    return
  }

  const groups = demoState.groups
    .map((group) => {
      const items = normalizeDemoItems(mutateItems(group.items))
      return {
        ...group,
        items,
        counts: countItems(items),
      }
    })
    .filter((group) => group.items.length > 0)

  demoState = {
    ...demoState,
    counts: countItems(groups.flatMap((group) => group.items)),
    groups,
  }
}

function normalizeDemoItems(items: InventoryItem[]): InventoryItem[] {
  const activeItems = items.filter((item) => item.kind === "active")
  const archivedItems = new Map<
    string,
    Extract<InventoryItem, { kind: "archived" }>
  >()

  for (const item of items) {
    if (item.kind !== "archived") {
      continue
    }

    const existing = archivedItems.get(item.normalizedUrl)
    archivedItems.set(
      item.normalizedUrl,
      existing
        ? {
            ...item,
            archiveCount: existing.archiveCount + item.archiveCount,
          }
        : item
    )
  }

  return [...activeItems, ...archivedItems.values()]
}

function demoArchiveItem(
  item: Extract<InventoryItem, { kind: "active" }>
): Extract<InventoryItem, { kind: "archived" }> {
  return {
    kind: "archived",
    normalizedUrl: item.normalizedUrl,
    originalUrl: item.originalUrl,
    hostname: item.hostname,
    title: item.title,
    faviconUrl: item.faviconUrl,
    archivedAt: new Date().toISOString(),
    archiveCount: 1,
    sourceWindow: {
      windowId: item.windowId,
      label: item.windowLabel,
    },
  }
}

function createDemoState(): DomainStatePayload {
  return {
    generatedAt: new Date().toISOString(),
    duplicatePromptSettings: {
      displayMode: "sidePanel",
      updatedAt: new Date().toISOString(),
    },
    counts: {
      total: 5,
      active: 4,
      archived: 1,
      duplicate: 2,
    },
    groups: [
      {
        key: "host:docs.google.com",
        label: "docs.google.com",
        hostname: "docs.google.com",
        collapsed: false,
        counts: {
          total: 3,
          active: 2,
          archived: 1,
          duplicate: 2,
        },
        items: [
          {
            kind: "active",
            tabId: 101,
            windowId: 1,
            windowLabel: "W1",
            originalUrl:
              "https://docs.google.com/document/d/roadmap?tab=t#heading",
            normalizedUrl: "https://docs.google.com/document/d/roadmap?tab=t",
            hostname: "docs.google.com",
            title: "Quarterly roadmap",
            isSpecialUrl: false,
            duplicateCount: 2,
            active: true,
            index: 0,
            lastAccessed: Date.now(),
          },
          {
            kind: "active",
            tabId: 102,
            windowId: 2,
            windowLabel: "W2",
            originalUrl:
              "https://docs.google.com/document/d/roadmap?tab=t#comments",
            normalizedUrl: "https://docs.google.com/document/d/roadmap?tab=t",
            hostname: "docs.google.com",
            title: "Quarterly roadmap",
            isSpecialUrl: false,
            duplicateCount: 2,
            active: false,
            index: 1,
            lastAccessed: Date.now() - 1000,
          },
          {
            kind: "archived",
            normalizedUrl: "https://docs.google.com/document/d/api-notes",
            originalUrl: "https://docs.google.com/document/d/api-notes#last",
            hostname: "docs.google.com",
            title: "API notes",
            archivedAt: new Date().toISOString(),
            archiveCount: 1,
            sourceWindow: {
              windowId: 2,
              label: "W2",
            },
          },
        ],
      },
      {
        key: "host:github.com",
        label: "github.com",
        hostname: "github.com",
        collapsed: false,
        counts: {
          total: 2,
          active: 2,
          archived: 0,
          duplicate: 0,
        },
        items: [
          {
            kind: "active",
            tabId: 103,
            windowId: 1,
            windowLabel: "W1",
            originalUrl: "https://github.com/org/repo/pull/48",
            normalizedUrl: "https://github.com/org/repo/pull/48",
            hostname: "github.com",
            title: "Pull request #48",
            audible: true,
            isSpecialUrl: false,
            duplicateCount: 1,
            active: false,
            index: 2,
            lastAccessed: Date.now() - 2000,
          },
          {
            kind: "active",
            tabId: 104,
            windowId: 1,
            windowLabel: "W1",
            originalUrl: "chrome://extensions/",
            normalizedUrl: "chrome://extensions/",
            hostname: "chrome",
            title: "Chrome Extensions",
            pinned: true,
            isSpecialUrl: true,
            duplicateCount: 1,
            active: false,
            index: 3,
            lastAccessed: Date.now() - 3000,
          },
        ],
      },
    ],
  }
}
