import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { filterGroups } from "@/domain/filters"
import type { InventoryItem, StatusFilter } from "@/domain/types"
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
  const [state, setState] = useState<DomainStatePayload | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
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
    <main className="side-panel-shell" aria-busy={isPending}>
      <div className="panel-top">
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

      <div className="feedback-region">
        {feedback ? <InlineFeedback message={feedback} /> : null}
      </div>

      <section className="group-list" aria-label="标签清单">
        {error ? <ErrorView message={error} /> : null}
        {!state && !error ? <LoadingRows /> : null}
        {viewState?.emptyReason ? <EmptyState reason={viewState.emptyReason} /> : null}
        {viewState?.visibleGroups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
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
          />
        ))}
      </section>
    </main>
  )
}

function getErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Chrome 没有返回当前标签页列表。"
}
