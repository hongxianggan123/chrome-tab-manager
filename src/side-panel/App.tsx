import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import {
  batchPlanTargetCount,
  inventoryItemKey,
  type BatchActionPlan,
  type InventoryItemKey,
} from "@/domain/batch"
import { filterGroups } from "@/domain/filters"
import type { InventoryItem, StatusFilter } from "@/domain/types"
import { cn } from "@/lib/utils"
import type {
  DomainStatePayload,
  WorkerPushMessage,
  WorkerRequest,
} from "@/worker/messages"
import { sendWorkerMessage } from "./api"
import { BatchActionBar } from "./components/BatchActionBar"
import { GroupSection } from "./components/GroupSection"
import { PanelHeader } from "./components/PanelHeader"
import { SearchBox } from "./components/SearchBox"
import {
  EmptyState,
  ErrorView,
  InlineFeedback,
  LoadingRows,
} from "./components/StateViews"
import { StatusFilter as StatusFilterControl } from "./components/StatusFilter"

export function App() {
  const groupListRef = useRef<HTMLElement | null>(null)
  const lastAnchoredItemKeyRef = useRef<string | null>(null)
  const [state, setState] = useState<DomainStatePayload | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success"
    message: string
  } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lockedUrl, setLockedUrl] = useState<string | null>(null)
  const [isUrlInspectorExpanded, setIsUrlInspectorExpanded] = useState(false)
  const [selectedItemKeys, setSelectedItemKeys] = useState<
    Set<InventoryItemKey>
  >(() => new Set())
  const [pendingBatchPlan, setPendingBatchPlan] =
    useState<BatchActionPlan | null>(null)
  const [isPending, startTransition] = useTransition()
  const inspectedUrl = lockedUrl ?? previewUrl

  const loadState = useCallback(async () => {
    try {
      setError(null)
      setState(await sendWorkerMessage({ type: "state:get" }))
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.connect) {
      return
    }

    const port = chrome.runtime.connect({ name: "side-panel" })
    const handleMessage = (message: WorkerPushMessage) => {
      if (message.type === "state:changed") {
        startTransition(() => {
          setState(message.state)
        })
      }
    }

    port.onMessage.addListener(handleMessage)

    return () => {
      port.onMessage.removeListener(handleMessage)
      port.disconnect()
    }
  }, [])

  const viewState = useMemo(() => {
    if (!state) {
      return null
    }
    return filterGroups(state.groups, query, statusFilter)
  }, [query, state, statusFilter])

  const currentItemKey = useMemo(() => {
    for (const group of viewState?.visibleGroups ?? []) {
      const currentItem = group.items.find(
        (item) => item.kind === "active" && item.active
      )

      if (currentItem?.kind === "active") {
        return inventoryItemKey(currentItem)
      }
    }

    return null
  }, [viewState])

  const visibleItemsByKey = useMemo(() => {
    const itemsByKey = new Map<InventoryItemKey, InventoryItem>()
    for (const group of viewState?.visibleGroups ?? []) {
      for (const item of group.items) {
        itemsByKey.set(inventoryItemKey(item), item)
      }
    }
    return itemsByKey
  }, [viewState])

  const selectedItems = useMemo(
    () =>
      [...selectedItemKeys].flatMap((key) => {
        const item = visibleItemsByKey.get(key)
        return item ? [item] : []
      }),
    [selectedItemKeys, visibleItemsByKey]
  )

  useEffect(() => {
    setSelectedItemKeys((current) => {
      const next = new Set(
        [...current].filter((key) => visibleItemsByKey.has(key))
      )
      return next.size === current.size ? current : next
    })
    setPendingBatchPlan(null)
  }, [visibleItemsByKey])

  useEffect(() => {
    if (!currentItemKey || lastAnchoredItemKeyRef.current === currentItemKey) {
      return
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const frameId = window.requestAnimationFrame(() => {
      const listElement = groupListRef.current
      const currentRow = listElement?.querySelector<HTMLElement>(
        '[data-current="true"]'
      )
      const currentGroup = listElement?.querySelector<HTMLElement>(
        '[data-current-group="true"]'
      )
      const anchorElement = currentRow ?? currentGroup

      if (!anchorElement) {
        return
      }

      anchorElement.scrollIntoView({
        block: currentRow ? "center" : "nearest",
        inline: "nearest",
        behavior: motionQuery.matches ? "auto" : "smooth",
      })
      lastAnchoredItemKeyRef.current = currentItemKey
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [currentItemKey])

  const runCommand = useCallback(async (message: WorkerRequest) => {
    try {
      setFeedback(null)
      const nextState = await sendWorkerMessage(message)
      startTransition(() => {
        setState(nextState)
      })
    } catch (caught) {
      setFeedback({ kind: "error", message: getErrorMessage(caught) })
    }
  }, [])

  const runBatchCommand = useCallback(
    async (plan: BatchActionPlan) => {
      const targetCount = batchPlanTargetCount(plan)
      if (targetCount === 0) {
        return
      }

      const message = getBatchWorkerMessage(plan)
      try {
        setFeedback(null)
        const nextState = await sendWorkerMessage(message)
        startTransition(() => {
          setState(nextState)
        })
        setSelectedItemKeys(new Set())
        setPendingBatchPlan(null)
        setFeedback({
          kind: "success",
          message: getBatchSuccessMessage(plan),
        })
      } catch (caught) {
        setFeedback({ kind: "error", message: getErrorMessage(caught) })
      }
    },
    []
  )

  const handleJump = useCallback(
    (item: InventoryItem) => {
      if (item.kind === "active") {
        void runCommand({
          type: "tab:jump",
          tabId: item.tabId,
          windowId: item.windowId,
        })
      } else {
        void runCommand({
          type: "archive:restore",
          normalizedUrl: item.normalizedUrl,
        })
      }
    },
    [runCommand]
  )

  return (
    <main
      className={cn(
        "flex h-screen w-screen max-w-screen flex-col overflow-hidden bg-background",
        getMainBottomPadding(
          Boolean(selectedItems.length),
          Boolean(inspectedUrl && isUrlInspectorExpanded)
        )
      )}
      aria-busy={isPending}
      data-url-inspector-expanded={Boolean(inspectedUrl && isUrlInspectorExpanded)}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <PanelHeader counts={state?.counts} />
        <SearchBox value={query} onChange={setQuery} />
        <StatusFilterControl
          value={statusFilter}
          counts={
            viewState?.totalCounts ?? {
              total: 0,
              active: 0,
              archived: 0,
              duplicate: 0,
            }
          }
          onChange={setStatusFilter}
        />
      </div>

      <div className="shrink-0 px-3 empty:hidden">
        {feedback ? (
          <InlineFeedback kind={feedback.kind} message={feedback.message} />
        ) : null}
      </div>

      <section
        ref={groupListRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-2 pb-3"
        aria-label="标签清单"
      >
        {error ? <ErrorView message={error} /> : null}
        {!state && !error ? <LoadingRows /> : null}
        {viewState?.emptyReason ? <EmptyState reason={viewState.emptyReason} /> : null}
        {viewState?.visibleGroups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            currentItemKey={currentItemKey}
            selectedItemKeys={selectedItemKeys}
            onCollapsedChange={(groupKey, collapsed) => {
              if (query.trim() || statusFilter !== "all") {
                return
              }

              void runCommand({
                type: "group:setCollapsed",
                groupKey,
                collapsed,
              })
            }}
            onSelectGroupItems={(items, selected) => {
              setSelectedItemKeys((current) => {
                const next = new Set(current)
                for (const item of items) {
                  const key = inventoryItemKey(item)
                  if (selected) {
                    next.add(key)
                  } else {
                    next.delete(key)
                  }
                }
                return next
              })
              setPendingBatchPlan(null)
            }}
            onSelectItem={(item, selected) => {
              setSelectedItemKeys((current) => {
                const next = new Set(current)
                const key = inventoryItemKey(item)
                if (selected) {
                  next.add(key)
                } else {
                  next.delete(key)
                }
                return next
              })
              setPendingBatchPlan(null)
            }}
            onJump={handleJump}
            onArchive={(tabId) => {
              void runCommand({ type: "tab:archive", tabId })
            }}
            onClose={(tabId) => {
              void runCommand({ type: "tab:close", tabId })
            }}
            onDeleteArchive={(normalizedUrl) => {
              void runCommand({ type: "archive:delete", normalizedUrl })
            }}
            onPreviewUrlChange={(url) => {
              if (!lockedUrl) {
                setPreviewUrl(url)
              }
            }}
            onInspectUrl={(url) => {
              setLockedUrl(url)
              setPreviewUrl(url)
              setIsUrlInspectorExpanded(true)
            }}
          />
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col">
        <BatchActionBar
          selectedItems={selectedItems}
          pendingPlan={pendingBatchPlan}
          onPrepareAction={setPendingBatchPlan}
          onCancelAction={() => setPendingBatchPlan(null)}
          onConfirmAction={(plan) => {
            void runBatchCommand(plan)
          }}
          onClearSelection={() => {
            setSelectedItemKeys(new Set())
            setPendingBatchPlan(null)
          }}
        />

        <aside
          className="flex border-t border-[color-mix(in_srgb,var(--border),transparent_18%)] bg-[color-mix(in_srgb,var(--background),var(--card)_45%)] shadow-[0_-8px_18px_color-mix(in_srgb,var(--foreground),transparent_94%)]"
          data-expanded={Boolean(inspectedUrl && isUrlInspectorExpanded)}
          aria-label="完整 URL 预览"
        >
          <button
            type="button"
            className={cn(
              "grid min-h-[34px] w-full grid-cols-[auto_minmax(0,1fr)] gap-2 border-0 bg-transparent px-3 py-[7px] text-left text-inherit",
              inspectedUrl ? "cursor-pointer" : "cursor-default",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              inspectedUrl &&
                isUrlInspectorExpanded &&
                "max-h-28 min-h-[78px] grid-cols-[minmax(0,1fr)] gap-[3px] overflow-y-auto py-2 pb-[9px]"
            )}
            aria-expanded={isUrlInspectorExpanded}
            disabled={!inspectedUrl}
            onClick={() => {
              if (inspectedUrl) {
                setIsUrlInspectorExpanded((expanded) => !expanded)
              }
            }}
          >
            <span className="whitespace-nowrap text-[10.5px] leading-4 font-[560] text-muted-foreground">
              {lockedUrl ? "已锁定 URL" : inspectedUrl ? "完整 URL" : "URL 预览"}
            </span>
            <span
              className={cn(
                "min-w-0 overflow-hidden font-mono text-[10.5px] leading-4 text-ellipsis whitespace-nowrap text-foreground",
                !inspectedUrl && "font-sans text-muted-foreground",
                inspectedUrl &&
                  isUrlInspectorExpanded &&
                  "overflow-visible text-clip whitespace-normal break-words [overflow-wrap:anywhere]"
              )}
              data-empty={!inspectedUrl}
            >
              {inspectedUrl ?? "点击行内 URL 查看完整地址"}
            </span>
          </button>
        </aside>
      </div>
    </main>
  )
}

function getBatchWorkerMessage(plan: BatchActionPlan): WorkerRequest {
  switch (plan.action) {
    case "close":
      return { type: "tabs:close", tabIds: plan.targetTabIds }
    case "archive":
      return { type: "tabs:archive", tabIds: plan.targetTabIds }
    case "deleteArchive":
      return {
        type: "archives:delete",
        normalizedUrls: plan.targetNormalizedUrls,
      }
  }
}

function getBatchSuccessMessage(plan: BatchActionPlan): string {
  const targetCount = batchPlanTargetCount(plan)
  const skippedCount =
    plan.skipped.active + plan.skipped.archived + plan.skipped.special

  const skippedText = skippedCount > 0 ? `，已跳过 ${skippedCount} 项` : ""

  switch (plan.action) {
    case "close":
      return `已关闭 ${targetCount} 个标签页${skippedText}。`
    case "archive":
      return `已归档 ${targetCount} 个标签页${skippedText}。`
    case "deleteArchive":
      return `已删除 ${targetCount} 条归档记录${skippedText}。`
  }
}

function getMainBottomPadding(hasSelection: boolean, expandedInspector: boolean) {
  if (hasSelection && expandedInspector) {
    return "pb-52"
  }
  if (hasSelection) {
    return "pb-32"
  }
  if (expandedInspector) {
    return "pb-28"
  }
  return "pb-[42px]"
}

function getErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Chrome 没有返回当前标签页列表。"
}
