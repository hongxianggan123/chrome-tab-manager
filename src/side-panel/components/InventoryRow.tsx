import {
  ArchiveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { compactUrl } from "@/domain/normalize-url"
import type { InventoryItem } from "@/domain/types"
import { cn } from "@/lib/utils"

type InventoryRowProps = {
  item: InventoryItem
  isCurrent: boolean
  onJump: (item: InventoryItem) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
  onPreviewUrlChange: (url: string | null) => void
  onInspectUrl: (url: string) => void
}

export function InventoryRow({
  item,
  isCurrent,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
  onPreviewUrlChange,
  onInspectUrl,
}: InventoryRowProps) {
  const status = getStatus(item)
  const urlLabel = compactUrl(item.originalUrl)

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "grid min-h-16 w-full cursor-pointer grid-cols-[3px_minmax(0,1fr)] gap-2 border-0 bg-transparent py-2 pr-2.5 pl-3 text-left text-inherit hover:bg-[color-mix(in_srgb,var(--accent),transparent_45%)] focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
        isCurrent &&
          "bg-card bg-gradient-to-r from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/25 shadow-[inset_0_1px_0_color-mix(in_srgb,#ffffff,transparent_18%)] hover:from-primary/15 hover:via-primary/8"
      )}
      data-status={status}
      data-current={isCurrent}
      aria-current={isCurrent ? "page" : undefined}
      onMouseEnter={() => onPreviewUrlChange(item.originalUrl)}
      onFocus={() => onPreviewUrlChange(item.originalUrl)}
      onClick={() => onJump(item)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onJump(item)
        }
      }}
    >
      <div className={getRailClassName(status, isCurrent)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex min-w-0 items-center gap-[5px]">
          <span className="min-w-0 flex-1 overflow-hidden text-[13px] leading-[18px] font-[560] text-ellipsis whitespace-nowrap">
            {item.title}
          </span>
          <div className="ml-auto flex shrink-0 gap-0.5">
            {item.kind === "active" && !item.isSpecialUrl ? (
              <IconButton label="归档标签页" onClick={() => onArchive(item.tabId)}>
                <ArchiveIcon data-icon="inline-start" />
              </IconButton>
            ) : null}
            {item.kind === "active" ? (
              <IconButton label="关闭标签页" onClick={() => onClose(item.tabId)}>
                <XIcon data-icon="inline-start" />
              </IconButton>
            ) : (
              <IconButton
                label="删除归档记录"
                destructive
                onClick={() => onDeleteArchive(item.normalizedUrl)}
              >
                <Trash2Icon data-icon="inline-start" />
              </IconButton>
            )}
          </div>
        </div>
        <button
          type="button"
          className="block w-fit max-w-full cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0 font-mono text-[10.5px] leading-[15px] text-ellipsis whitespace-nowrap text-muted-foreground hover:bg-primary/10 hover:text-primary hover:underline hover:decoration-1 hover:underline-offset-2 focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:underline focus-visible:decoration-1 focus-visible:underline-offset-2 focus-visible:outline-0"
          onClick={(event) => {
            event.stopPropagation()
            onInspectUrl(item.originalUrl)
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
        >
          {urlLabel}
        </button>
        <div className="block min-w-0">
          <StatusBadges item={item} />
        </div>
      </div>
    </div>
  )
}

function StatusBadges({ item }: { item: InventoryItem }) {
  if (item.kind === "archived") {
  return (
      <div className="flex min-w-0 flex-wrap gap-1">
        <Badge variant="secondary">已归档</Badge>
        {item.sourceWindow ? (
          <Badge variant="outline">来自 {item.sourceWindow.label}</Badge>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {item.active ? <Badge variant="default">当前</Badge> : null}
      <Badge variant="outline">{item.windowLabel}</Badge>
      {item.duplicateCount > 1 ? (
        <Badge variant="secondary">重复 x{item.duplicateCount}</Badge>
      ) : null}
      {item.isSpecialUrl ? <Badge variant="outline">特殊 URL</Badge> : null}
    </div>
  )
}

function IconButton({
  label,
  destructive,
  children,
  onClick,
}: {
  label: string
  destructive?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      aria-label={label}
      size="icon-xs"
      variant={destructive ? "destructive" : "ghost"}
      className={cn(
        "cursor-pointer transition-[background-color,box-shadow,color,transform] duration-150 hover:-translate-y-px hover:scale-[1.06] hover:bg-primary/12 hover:text-primary hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary),transparent_58%),0_3px_8px_color-mix(in_srgb,var(--primary),transparent_82%)] active:translate-y-0 active:scale-[0.98] active:shadow-none focus-visible:shadow-[0_0_0_1px_var(--ring),0_0_0_3px_color-mix(in_srgb,var(--ring),transparent_78%)]",
        destructive &&
          "hover:bg-destructive/18 hover:text-destructive hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive),transparent_48%),0_3px_8px_color-mix(in_srgb,var(--destructive),transparent_78%)]"
      )}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {children}
    </Button>
  )
}

function getRailClassName(status: string, isCurrent: boolean) {
  return cn(
    "self-stretch rounded-full bg-tab-rail-active",
    !isCurrent && "w-[3px]",
    status === "archived" &&
      "bg-[repeating-linear-gradient(to_bottom,var(--color-tab-rail-archived),var(--color-tab-rail-archived)_4px,transparent_4px,transparent_7px)]",
    status === "duplicate" &&
      "bg-[linear-gradient(to_bottom,var(--color-tab-rail-duplicate)_0_45%,var(--color-tab-rail-active)_45%_100%)]",
    status === "special" &&
      "bg-[repeating-linear-gradient(to_bottom,var(--color-tab-rail-special),var(--color-tab-rail-special)_2px,transparent_2px,transparent_5px)]",
    isCurrent &&
      "w-1 bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary),transparent_86%)]"
  )
}

function getStatus(item: InventoryItem) {
  if (item.kind === "archived") {
    return "archived"
  }

  if (item.isSpecialUrl) {
    return "special"
  }

  if (item.duplicateCount > 1) {
    return "duplicate"
  }

  return "active"
}
