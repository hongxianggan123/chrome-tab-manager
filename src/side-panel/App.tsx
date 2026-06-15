import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { filterGroups } from "@/domain/filters"
import type { InventoryItem, StatusFilter } from "@/domain/types"
import { cn } from "@/lib/utils"
import type {
  DomainStatePayload,
  WorkerPushMessage,
  WorkerRequest,
} from "@/worker/messages"
import { sendWorkerMessage } from "./api"
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
  const [feedback, setFeedback] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lockedUrl, setLockedUrl] = useState<string | null>(null)
  const [isUrlInspectorExpanded, setIsUrlInspectorExpanded] = useState(false)
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
        return itemKeyFor(currentItem)
      }
    }

    return null
  }, [viewState])

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
      setFeedback(getErrorMessage(caught))
    }
  }, [])

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
        "flex h-screen w-screen max-w-screen flex-col overflow-hidden bg-background pb-[42px]",
        inspectedUrl && isUrlInspectorExpanded && "pb-28"
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
        {feedback ? <InlineFeedback message={feedback} /> : null}
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

      <aside
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[color-mix(in_srgb,var(--border),transparent_18%)] bg-[color-mix(in_srgb,var(--background),var(--card)_45%)] shadow-[0_-8px_18px_color-mix(in_srgb,var(--foreground),transparent_94%)]"
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
    </main>
  )
}

function itemKeyFor(item: InventoryItem): string {
  return item.kind === "active"
    ? `tab:${item.tabId}`
    : `archive:${item.normalizedUrl}`
}

function getErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Chrome 没有返回当前标签页列表。"
}
