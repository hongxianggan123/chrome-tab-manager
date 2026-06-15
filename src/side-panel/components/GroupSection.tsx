import { ChevronRightIcon, GlobeIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { InventoryItem, VisibleGroup } from "@/domain/types"
import { InventoryRow } from "./InventoryRow"

type GroupSectionProps = {
  group: VisibleGroup
  currentItemKey: string | null
  onCollapsedChange: (groupKey: string, collapsed: boolean) => void
  onJump: (item: InventoryItem) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
  onPreviewUrlChange: (url: string | null) => void
  onInspectUrl: (url: string) => void
}

export function GroupSection({
  group,
  currentItemKey,
  onCollapsedChange,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
  onPreviewUrlChange,
  onInspectUrl,
}: GroupSectionProps) {
  const faviconUrl = group.items.find((item) => item.faviconUrl)?.faviconUrl
  const hasCurrentItem = group.items.some(
    (item) => itemKeyFor(item) === currentItemKey
  )

  return (
    <Collapsible
      open={group.expanded}
      onOpenChange={(open) => onCollapsedChange(group.key, !open)}
    >
      <section className="group-section" data-current-group={hasCurrentItem}>
        <CollapsibleTrigger className="group-header">
          <span className="group-disclosure" aria-hidden="true">
            <ChevronRightIcon />
          </span>
          <span className="group-favicon" aria-hidden="true">
            {faviconUrl ? <img src={faviconUrl} alt="" /> : <GlobeIcon />}
          </span>
          <span className="group-title">{group.label}</span>
          {hasCurrentItem ? <span className="group-current">当前</span> : null}
          <span className="group-counts">
            {group.counts.total} 项 · 打开 {group.counts.active} · 归档{" "}
            {group.counts.archived} · 重复 {group.counts.duplicate}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="group-items">
            {group.items.map((item) => (
              <InventoryRow
                key={itemKeyFor(item)}
                item={item}
                isCurrent={itemKeyFor(item) === currentItemKey}
                onJump={onJump}
                onArchive={onArchive}
                onClose={onClose}
                onDeleteArchive={onDeleteArchive}
                onPreviewUrlChange={onPreviewUrlChange}
                onInspectUrl={onInspectUrl}
              />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

function itemKeyFor(item: InventoryItem): string {
  return item.kind === "active"
    ? `tab:${item.tabId}`
    : `archive:${item.normalizedUrl}`
}
