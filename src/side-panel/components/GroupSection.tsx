import { ChevronRightIcon, GlobeIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { inventoryItemKey, type InventoryItemKey } from "@/domain/batch"
import type { InventoryItem, VisibleGroup } from "@/domain/types"
import { cn } from "@/lib/utils"
import { InventoryRow } from "./InventoryRow"
import { SelectionSlot } from "./SelectionSlot"

type GroupSectionProps = {
  group: VisibleGroup
  currentItemKey: string | null
  selectedItemKeys: Set<InventoryItemKey>
  onCollapsedChange: (groupKey: string, collapsed: boolean) => void
  onSelectGroupItems: (items: InventoryItem[], selected: boolean) => void
  onSelectItem: (item: InventoryItem, selected: boolean) => void
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
  selectedItemKeys,
  onCollapsedChange,
  onSelectGroupItems,
  onSelectItem,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
  onPreviewUrlChange,
  onInspectUrl,
}: GroupSectionProps) {
  const faviconUrl = group.items.find((item) => item.faviconUrl)?.faviconUrl
  const hasCurrentItem = group.items.some(
    (item) => inventoryItemKey(item) === currentItemKey
  )
  const selectedCount = group.items.filter((item) =>
    selectedItemKeys.has(inventoryItemKey(item))
  ).length
  const isGroupFullySelected = selectedCount === group.items.length
  const isGroupPartiallySelected =
    selectedCount > 0 && selectedCount < group.items.length

  return (
    <Collapsible
      open={group.expanded}
      onOpenChange={(open) => onCollapsedChange(group.key, !open)}
    >
      <section
        className="group/section border-b border-[color-mix(in_srgb,var(--border),transparent_35%)]"
        data-current-group={hasCurrentItem}
      >
        <div
          className={cn(
            "group/header relative grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-3 py-[9px] transition-[padding,background-color] duration-200 ease-out",
            hasCurrentItem &&
              "bg-[color-mix(in_srgb,var(--primary),transparent_94%)]",
            (isGroupFullySelected || isGroupPartiallySelected) && "pl-9"
          )}
        >
          <SelectionSlot
            label={
              isGroupFullySelected
                ? `取消选择 ${group.label} 当前可见项`
                : `选择 ${group.label} 当前可见项`
            }
            selected={isGroupFullySelected}
            mixed={isGroupPartiallySelected}
            onToggle={() =>
              onSelectGroupItems(group.items, !isGroupFullySelected)
            }
          />
          <CollapsibleTrigger
            className="grid min-w-0 grid-cols-[14px_20px_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 border-0 bg-transparent p-0 text-left text-inherit hover:[&_[data-slot=disclosure]]:text-foreground data-[state=open]:[&_[data-slot=chevron]]:rotate-90"
          >
            <span
              data-slot="disclosure"
              className="row-span-2 flex h-5 w-3.5 items-center justify-center self-start text-[color-mix(in_srgb,var(--muted-foreground),transparent_18%)]"
              aria-hidden="true"
            >
              <ChevronRightIcon
                data-slot="chevron"
                className="size-3 transition-[color,transform] duration-150"
              />
            </span>
            <span
              className="-mt-px row-span-2 flex size-5 items-center justify-center self-start text-muted-foreground [&_img]:size-4 [&_img]:rounded-[3px] [&_svg]:size-[15px]"
              aria-hidden="true"
            >
              {faviconUrl ? <img src={faviconUrl} alt="" /> : <GlobeIcon />}
            </span>
            <span className="truncate text-[12px] leading-4 font-[650]">
              {group.label}
            </span>
            <span className="[grid-column:3/-1] truncate font-mono text-[10px] leading-[13px] text-muted-foreground">
              {group.counts.total} 项 · 打开 {group.counts.active} · 归档{" "}
              {group.counts.archived} · 重复 {group.counts.duplicate}
              {selectedCount > 0 ? ` · 已选 ${selectedCount}` : ""}
            </span>
          </CollapsibleTrigger>
          <div className="flex items-start gap-1 empty:hidden">
            {hasCurrentItem ? (
              <span className="mt-0.5 rounded-full border border-[color-mix(in_srgb,var(--primary),transparent_64%)] px-1.5 text-[10px] leading-[15px] font-[650] text-primary">
                当前
              </span>
            ) : null}
          </div>
        </div>
        <CollapsibleContent>
          <div className="flex flex-col">
            {group.items.map((item) => (
              <InventoryRow
                key={inventoryItemKey(item)}
                item={item}
                isCurrent={inventoryItemKey(item) === currentItemKey}
                selected={selectedItemKeys.has(inventoryItemKey(item))}
                onSelectedChange={(selected) => onSelectItem(item, selected)}
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
