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
import { getDuplicateCleanupTargets } from "@/domain/duplicate-cleanup"
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
import { DuplicateCleanupAction } from "./components/DuplicateCleanupAction"
import { DuplicatePromptBanner } from "./components/DuplicatePromptBanner"
import { GroupSection } from "./components/GroupSection"
import { PanelHeader } from "./components/PanelHeader"
import { SearchBox } from "./components/SearchBox"
import {
  EmptyState,
  ErrorView,
  InlineFeedback,
  LoadingRows,
} from "./components/StateViews"
import { createSidePanelPortSession } from "./runtime-port"
import { SettingsPanel } from "./settings/SettingsPanel"
import { StatusFilter as StatusFilterControl } from "./components/StatusFilter"

export function App() {
  const groupListRef = useRef<HTMLElement | null>(null)
  const lastAnchoredItemKeyRef = useRef<string | null>(null)
  const [state, setState] = useState<DomainStatePayload | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [activeView, setActiveView] = useState<"list" | "settings">("list")
  const [promptSecondsRemaining, setPromptSecondsRemaining] = useState(30)
  const [pendingDuplicateFocus, setPendingDuplicateFocus] = useState<{
    promptTabId: number
    normalizedUrl: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success"
    message: string
  } | null>(null)
  const [selectedItemKeys, setSelectedItemKeys] = useState<
    Set<InventoryItemKey>
  >(() => new Set())
  const [pendingBatchPlan, setPendingBatchPlan] =
    useState<BatchActionPlan | null>(null)
  const [isPending, startTransition] = useTransition()

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

    return createSidePanelPortSession({
      connect: () => chrome.runtime.connect({ name: "side-panel" }),
      onPushMessage: (message: WorkerPushMessage) => {
        if (message.type === "state:changed") {
          startTransition(() => {
            setState(message.state)
          })
        }
      },
      onReconnect: () => {
        void loadState()
      },
    })
  }, [loadState])

  const viewState = useMemo(() => {
    if (!state) {
      return null
    }
    return filterGroups(state.groups, query, statusFilter)
  }, [query, state, statusFilter])

  const duplicateCleanupTargets = useMemo(
    () => getDuplicateCleanupTargets(viewState?.visibleGroups ?? []),
    [viewState]
  )
  const retainedDuplicateCount = useMemo(
    () =>
      new Set(duplicateCleanupTargets.map((item) => item.normalizedUrl)).size,
    [duplicateCleanupTargets]
  )

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

  useEffect(() => {
    if (!pendingDuplicateFocus || statusFilter !== "duplicate") {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const listElement = groupListRef.current
      const promptRow = listElement?.querySelector<HTMLElement>(
        `[data-tab-id="${pendingDuplicateFocus.promptTabId}"]`
      )
      const fallbackRow = listElement?.querySelector<HTMLElement>(
        `[data-normalized-url="${CSS.escape(pendingDuplicateFocus.normalizedUrl)}"]`
      )

      ;(promptRow ?? fallbackRow)?.scrollIntoView({
        block: "center",
        inline: "nearest",
      })
      setPendingDuplicateFocus(null)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [pendingDuplicateFocus, state, statusFilter])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null)
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [feedback])

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

  useEffect(() => {
    const focus = state?.duplicatePromptFocus
    if (!focus) {
      return
    }

    setActiveView("list")
    setQuery("")
    setStatusFilter("duplicate")
    setPendingDuplicateFocus({
      promptTabId: focus.promptTabId,
      normalizedUrl: focus.normalizedUrl,
    })
    void runCommand({ type: "duplicatePrompt:clearFocus" })
  }, [
    runCommand,
    state?.duplicatePromptFocus?.createdAt,
    state?.duplicatePromptFocus?.normalizedUrl,
    state?.duplicatePromptFocus?.promptTabId,
  ])

  useEffect(() => {
    const prompt = state?.duplicatePrompt
    if (!prompt) {
      setPromptSecondsRemaining(30)
      return
    }

    setPromptSecondsRemaining(30)
    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, 30 - elapsed)
      setPromptSecondsRemaining(remaining)

      if (remaining === 0) {
        window.clearInterval(intervalId)
        void runCommand({
          type: "duplicatePrompt:dismiss",
          promptTabId: prompt.newTabId,
        })
      }
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [
    runCommand,
    state?.duplicatePrompt?.createdAt,
    state?.duplicatePrompt?.newTabId,
  ])

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

  const handleSelectDuplicateCleanupTargets = useCallback(() => {
    setSelectedItemKeys(
      new Set(duplicateCleanupTargets.map((item) => inventoryItemKey(item)))
    )
    setPendingBatchPlan(null)
  }, [duplicateCleanupTargets])

  return (
    <main
      className="flex h-screen w-screen max-w-screen flex-col overflow-hidden bg-background"
      aria-busy={isPending}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <PanelHeader
          counts={state?.counts}
          onOpenSettings={() => setActiveView("settings")}
        />
        {activeView === "list" ? (
          <>
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
            <DuplicateCleanupAction
              targetCount={duplicateCleanupTargets.length}
              retainedCount={retainedDuplicateCount}
              onSelect={handleSelectDuplicateCleanupTargets}
            />
          </>
        ) : null}
      </div>

      {state?.duplicatePrompt && activeView === "list" ? (
        <DuplicatePromptBanner
          prompt={state.duplicatePrompt}
          secondsRemaining={promptSecondsRemaining}
          onJump={() => {
            void runCommand({
              type: "duplicatePrompt:jump",
              promptTabId: state.duplicatePrompt!.newTabId,
              targetTabId: state.duplicatePrompt!.defaultTargetTabId,
              targetWindowId: state.duplicatePrompt!.defaultTargetWindowId,
            })
          }}
          onKeep={() => {
            void runCommand({
              type: "duplicatePrompt:keep",
              promptTabId: state.duplicatePrompt!.newTabId,
            })
          }}
          onViewDuplicates={() => {
            setQuery("")
            setStatusFilter("duplicate")
            setPendingDuplicateFocus({
              promptTabId: state.duplicatePrompt!.newTabId,
              normalizedUrl: state.duplicatePrompt!.normalizedUrl,
            })
            void runCommand({
              type: "duplicatePrompt:viewDuplicates",
              promptTabId: state.duplicatePrompt!.newTabId,
              normalizedUrl: state.duplicatePrompt!.normalizedUrl,
            })
          }}
        />
      ) : null}

      {activeView === "settings" && state ? (
        <SettingsPanel
          displayMode={state.duplicatePromptSettings.displayMode}
          onDisplayModeChange={(displayMode) => {
            void runCommand({
              type: "duplicatePrompt:setDisplayMode",
              displayMode,
            })
          }}
          onBack={() => setActiveView("list")}
        />
      ) : (
        <section
          ref={groupListRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto",
            getListBottomPadding(
              Boolean(selectedItems.length),
              Boolean(feedback)
            )
          )}
          aria-label="标签清单"
        >
          {error ? <ErrorView message={error} /> : null}
          {!state && !error ? <LoadingRows /> : null}
          {viewState?.emptyReason ? (
            <EmptyState reason={viewState.emptyReason} />
          ) : null}
          {viewState?.visibleGroups.map((group, groupIndex) => (
            <GroupSection
              key={group.key}
              group={group}
              accentIndex={groupIndex}
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
            />
          ))}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col">
        <div className="px-3 pb-2 empty:hidden">
          {feedback ? (
            <InlineFeedback
              kind={feedback.kind}
              message={feedback.message}
              className="mt-0 border-[color-mix(in_srgb,var(--border),transparent_26%)] bg-background/96 shadow-[0_4px_18px_color-mix(in_srgb,var(--foreground),transparent_90%)]"
            />
          ) : null}
        </div>
        {activeView === "list" ? (
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
        ) : null}
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

function getListBottomPadding(hasSelection: boolean, hasFeedback: boolean) {
  if (hasSelection && hasFeedback) {
    return "pb-44"
  }
  if (hasSelection) {
    return "pb-24"
  }
  if (hasFeedback) {
    return "pb-24"
  }
  return "pb-3"
}

function getErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Chrome 没有返回当前标签页列表。"
}
