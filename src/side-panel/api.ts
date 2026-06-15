import type { DomainStatePayload, WorkerRequest } from "@/worker/messages"

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

  return structuredClone(demoState)
}

function createDemoState(): DomainStatePayload {
  return {
    generatedAt: new Date().toISOString(),
    counts: {
      total: 6,
      active: 5,
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
