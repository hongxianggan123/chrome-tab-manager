import { normalizeUrl } from "@/domain/normalize-url"
import { isSpecialUrl } from "@/domain/special-url"
import type { ArchivedTabRecord } from "@/domain/types"
import {
  deleteArchivedRecord,
  readStorageRoot,
  setGroupCollapsed,
  upsertArchivedRecord,
} from "@/storage/local-storage"
import { readChromeSnapshot } from "./chrome-snapshot"
import { buildDomainState } from "./refresh"
import type { DomainStatePayload, WorkerError } from "./messages"

type MutationResult =
  | { ok: true; state: DomainStatePayload }
  | { ok: false; error: WorkerError }

export async function jumpToTab(
  tabId: number,
  windowId: number
): Promise<MutationResult> {
  try {
    await chrome.tabs.update(tabId, { active: true })
    await chrome.windows.update(windowId, { focused: true })
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("chrome_api_failed", "无法跳转到这个标签页。它可能已经被关闭。")
  }
}

export async function closeTab(tabId: number): Promise<MutationResult> {
  try {
    await chrome.tabs.remove(tabId)
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("chrome_api_failed", "无法关闭这个标签页。它可能已经被关闭。")
  }
}

export async function archiveTab(tabId: number): Promise<MutationResult> {
  const [snapshot, storageRoot] = await Promise.all([
    readChromeSnapshot(),
    readStorageRoot(),
  ])
  const tab = snapshot.tabs.find((candidate) => candidate.tabId === tabId)

  if (!tab) {
    return failure("tab_not_found", "无法归档这个标签页。它已经不在当前窗口中。")
  }

  if (isSpecialUrl(tab.originalUrl)) {
    return failure(
      "special_url_not_archivable",
      `无法归档 ${tab.originalUrl}。特殊 URL 只能跳转或关闭。`
    )
  }

  const normalizedUrl = normalizeUrl(tab.originalUrl)
  const otherInstances = snapshot.tabs.filter(
    (candidate) =>
      candidate.tabId !== tabId &&
      normalizeUrl(candidate.originalUrl) === normalizedUrl
  )

  const existing = storageRoot.archivedTabs[normalizedUrl]
  const record: ArchivedTabRecord = {
    normalizedUrl,
    originalUrl: tab.originalUrl,
    title: tab.title || tab.originalUrl,
    faviconUrl: tab.faviconUrl,
    hostname: new URL(tab.originalUrl).hostname.toLowerCase(),
    archivedAt: new Date().toISOString(),
    archiveCount: (existing?.archiveCount ?? 0) + 1,
    sourceWindow: {
      windowId: tab.windowId,
      label: tab.windowLabel,
    },
  }

  try {
    await chrome.tabs.remove(tabId)
  } catch {
    return failure("chrome_api_failed", "无法归档这个标签页。关闭标签页失败。")
  }

  try {
    if (otherInstances.length === 0) {
      await upsertArchivedRecord(record)
    }
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("storage_failed", "标签页已关闭，但归档记录保存失败。")
  }
}

export async function restoreArchive(
  normalizedUrl: string
): Promise<MutationResult> {
  const storageRoot = await readStorageRoot()
  const record = storageRoot.archivedTabs[normalizedUrl]

  if (!record) {
    return failure("archive_not_found", "找不到这个归档记录。它可能已经被删除。")
  }

  try {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] })
    const focusedWindow = windows.find((window) => window.focused) ?? windows[0]

    if (focusedWindow?.id) {
      await chrome.tabs.create({
        windowId: focusedWindow.id,
        url: record.originalUrl,
        active: true,
      })
      await chrome.windows.update(focusedWindow.id, { focused: true })
    } else {
      await chrome.windows.create({
        url: record.originalUrl,
        focused: true,
      })
    }

    await deleteArchivedRecord(normalizedUrl)
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("chrome_api_failed", "无法打开这个归档项。归档记录已保留。")
  }
}

export async function deleteArchive(
  normalizedUrl: string
): Promise<MutationResult> {
  try {
    await deleteArchivedRecord(normalizedUrl)
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("storage_failed", "无法删除这个归档记录。")
  }
}

export async function updateGroupCollapsed(
  groupKey: string,
  collapsed: boolean
): Promise<MutationResult> {
  try {
    await setGroupCollapsed(groupKey, collapsed)
    return { ok: true, state: await buildDomainState() }
  } catch {
    return failure("storage_failed", "无法保存分组折叠状态。")
  }
}

function failure(code: WorkerError["code"], message: string): MutationResult {
  return {
    ok: false,
    error: { code, message },
  }
}

