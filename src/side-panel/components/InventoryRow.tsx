import {
  ArchiveIcon,
  ExternalLinkIcon,
  FileIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { compactUrl } from "@/domain/normalize-url"
import type { InventoryItem } from "@/domain/types"

type InventoryRowProps = {
  item: InventoryItem
  onJump: (item: InventoryItem) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
}

export function InventoryRow({
  item,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
}: InventoryRowProps) {
  const status = getStatus(item)
  const urlLabel = compactUrl(item.originalUrl)

  return (
    <div className="inventory-row" data-status={status}>
      <div className="status-rail" aria-hidden="true" />
      <div className="favicon" aria-hidden="true">
        {item.faviconUrl ? <img src={item.faviconUrl} alt="" /> : <FileIcon />}
      </div>
      <div className="row-main">
        <div className="row-title-line">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="row-title">{item.title}</span>
            </TooltipTrigger>
            <TooltipContent>{item.title}</TooltipContent>
          </Tooltip>
          {item.kind === "active" ? (
            <span className="window-label">{item.windowLabel}</span>
          ) : null}
          <div className="row-actions">
            <IconButton
              label={item.kind === "active" ? "跳转到标签页" : "打开归档项"}
              onClick={() => onJump(item)}
            >
              <ExternalLinkIcon data-icon="inline-start" />
            </IconButton>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="row-url">{urlLabel}</span>
          </TooltipTrigger>
          <TooltipContent>{item.originalUrl}</TooltipContent>
        </Tooltip>
        <div className="row-meta">
          <StatusBadges item={item} />
        </div>
      </div>
    </div>
  )
}

function StatusBadges({ item }: { item: InventoryItem }) {
  if (item.kind === "archived") {
    return (
      <div className="badges">
        <Badge variant="secondary">已归档</Badge>
        {item.sourceWindow ? (
          <Badge variant="outline">来自 {item.sourceWindow.label}</Badge>
        ) : null}
      </div>
    )
  }

  return (
    <div className="badges">
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          size="icon-xs"
          variant={destructive ? "destructive" : "ghost"}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
