import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { InventoryItem, VisibleGroup } from "@/domain/types"
import { InventoryRow } from "./InventoryRow"

type GroupSectionProps = {
  group: VisibleGroup
  onCollapsedChange: (groupKey: string, collapsed: boolean) => void
  onJump: (item: InventoryItem) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
}

export function GroupSection({
  group,
  onCollapsedChange,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
}: GroupSectionProps) {
  return (
    <Collapsible
      open={group.expanded}
      onOpenChange={(open) => onCollapsedChange(group.key, !open)}
    >
      <section className="group-section">
        <CollapsibleTrigger className="group-header">
          {group.expanded ? (
            <ChevronDownIcon aria-hidden="true" />
          ) : (
            <ChevronRightIcon aria-hidden="true" />
          )}
          <span className="group-title">{group.label}</span>
          <span className="group-counts">
            {group.counts.total} 项 · 打开 {group.counts.active} · 归档{" "}
            {group.counts.archived} · 重复 {group.counts.duplicate}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="group-items">
            {group.items.map((item) => (
              <InventoryRow
                key={item.kind === "active" ? `tab:${item.tabId}` : `archive:${item.normalizedUrl}`}
                item={item}
                onJump={onJump}
                onArchive={onArchive}
                onClose={onClose}
                onDeleteArchive={onDeleteArchive}
              />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

