import {
  ArchiveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { InventoryItem } from "@/domain/types"
import { cn } from "@/lib/utils"
import { SelectionSlot } from "./SelectionSlot"

type InventoryRowProps = {
  item: InventoryItem
  isCurrent: boolean
  selected: boolean
  onJump: (item: InventoryItem) => void
  onSelectedChange: (selected: boolean) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
}

export function InventoryRow({
  item,
  isCurrent,
  selected,
  onJump,
  onSelectedChange,
  onArchive,
  onClose,
  onDeleteArchive,
}: InventoryRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group/row relative isolate z-0 min-h-[52px] w-full cursor-pointer border-0 bg-transparent py-[7px] pr-2.5 pl-3 text-left text-inherit transition-[padding,background-color] duration-200 ease-out hover:bg-[color-mix(in_srgb,var(--accent),transparent_45%)] focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&:has([data-slot=selection-hitarea]:focus-visible)_[data-slot=active-marker]]:opacity-0 [&:has([data-slot=selection-hitarea]:hover)_[data-slot=active-marker]]:opacity-0",
        isCurrent &&
          "bg-[color-mix(in_srgb,var(--primary),transparent_97%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary),transparent_90%)] hover:bg-[color-mix(in_srgb,var(--primary),transparent_95%)]",
        selected &&
          "bg-[color-mix(in_srgb,var(--primary),transparent_91%)] pl-9"
      )}
      data-status={getStatus(item)}
      data-current={isCurrent}
      data-tab-id={item.kind === "active" ? item.tabId : undefined}
      data-normalized-url={item.normalizedUrl}
      aria-selected={selected}
      aria-current={isCurrent ? "page" : undefined}
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
      <SelectionSlot
        label={selected ? `取消选择 ${item.title}` : `选择 ${item.title}`}
        selected={selected}
        onToggle={() => onSelectedChange(!selected)}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-[5px]">
          {isCurrent ? (
            <span
              data-slot="active-marker"
              aria-hidden="true"
              className="h-3.5 w-0.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary),transparent_88%)] transition-opacity duration-150"
            />
          ) : null}
          <span className="min-w-0 flex-1 overflow-hidden text-[12.5px] leading-[17px] font-[560] text-ellipsis whitespace-nowrap">
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
        <div className="block min-w-0">
          <StatusBadges item={item} isCurrent={isCurrent} />
        </div>
      </div>
    </div>
  )
}

function StatusBadges({
  item,
  isCurrent,
}: {
  item: InventoryItem
  isCurrent: boolean
}) {
  if (item.kind === "archived") {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] leading-[15px] text-muted-foreground">
        <Badge variant="secondary" className="h-[18px] px-1.5 text-[10px]">
          已归档
        </Badge>
        {item.sourceWindow ? (
          <span>来自 {item.sourceWindow.label}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] leading-[15px] text-muted-foreground">
      {isCurrent ? (
        <Badge
          variant="outline"
          className="h-[17px] border-[color-mix(in_srgb,var(--primary),transparent_62%)] bg-[color-mix(in_srgb,var(--primary),transparent_92%)] px-1.5 text-[9.5px] font-[650] text-primary"
        >
          当前
        </Badge>
      ) : null}
      <span>{item.windowLabel}</span>
      {item.duplicateCount > 1 ? (
        <span>重复 x{item.duplicateCount}</span>
      ) : null}
      {item.isSpecialUrl ? (
        <Badge variant="outline" className="h-[18px] px-1.5 text-[10px]">
          特殊 URL
        </Badge>
      ) : null}
      {item.audible ? (
        <Badge variant="outline" className="h-[18px] px-1.5 text-[10px]">
          播放中
        </Badge>
      ) : null}
      {item.pinned ? (
        <Badge variant="outline" className="h-[18px] px-1.5 text-[10px]">
          原生置顶
        </Badge>
      ) : null}
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
