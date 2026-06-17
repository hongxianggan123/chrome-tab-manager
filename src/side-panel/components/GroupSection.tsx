import { ChevronRightIcon, GlobeIcon } from "lucide-react"
import type { CSSProperties } from "react"
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
  accentIndex: number
  currentItemKey: string | null
  selectedItemKeys: Set<InventoryItemKey>
  onCollapsedChange: (groupKey: string, collapsed: boolean) => void
  onSelectGroupItems: (items: InventoryItem[], selected: boolean) => void
  onSelectItem: (item: InventoryItem, selected: boolean) => void
  onJump: (item: InventoryItem) => void
  onArchive: (tabId: number) => void
  onClose: (tabId: number) => void
  onDeleteArchive: (normalizedUrl: string) => void
}

export function GroupSection({
  group,
  accentIndex,
  currentItemKey,
  selectedItemKeys,
  onCollapsedChange,
  onSelectGroupItems,
  onSelectItem,
  onJump,
  onArchive,
  onClose,
  onDeleteArchive,
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
  const hasGroupSelection = isGroupFullySelected || isGroupPartiallySelected
  const accentColor = getGroupAccentColor(accentIndex)

  return (
    <Collapsible
      open={group.expanded}
      onOpenChange={(open) => onCollapsedChange(group.key, !open)}
    >
      <section
        className="group/section mt-2 bg-background first:mt-0"
        data-current-group={hasCurrentItem}
        style={{ "--group-accent": accentColor } as CSSProperties}
      >
        <div
          className={cn(
            "group/header sticky top-0 z-30 grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-[color-mix(in_srgb,var(--border),transparent_32%)] bg-[color-mix(in_srgb,var(--background)_62%,var(--muted))] px-3 py-2 shadow-[inset_3px_0_0_var(--group-accent),inset_0_1px_0_color-mix(in_srgb,#fff,transparent_30%),0_6px_12px_color-mix(in_srgb,var(--background),transparent_22%)] transition-[padding,background-color,box-shadow] duration-200 ease-out",
            !hasGroupSelection &&
              "[&:has([data-slot=selection-hitarea]:focus-visible)_[data-slot=group-icon]]:opacity-0 [&:has([data-slot=selection-hitarea]:hover)_[data-slot=group-icon]]:opacity-0",
            hasGroupSelection && "pl-9"
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
            className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-x-1.5 gap-y-1 border-0 bg-transparent p-0 text-left text-inherit"
          >
            <span
              data-slot="group-icon"
              className="-mt-px row-span-2 flex size-5 items-center justify-center self-start text-muted-foreground transition-opacity duration-150 [&_img]:size-4 [&_img]:rounded-[3px] [&_svg]:size-[15px]"
              aria-hidden="true"
            >
              {faviconUrl ? <img src={faviconUrl} alt="" /> : <GlobeIcon />}
            </span>
            <span className="truncate text-[12px] leading-4 font-[700] tracking-[0.01em]">
              {group.label}
            </span>
            <span className="[grid-column:2/-1] flex min-w-0 flex-wrap gap-1 overflow-hidden text-[10px] leading-[13px] text-muted-foreground">
              <span className="rounded-[4px] bg-background/70 px-1.5 py-px">
                {group.counts.total} 项
              </span>
              <span className="rounded-[4px] bg-background/70 px-1.5 py-px">
                打开 {group.counts.active}
              </span>
              <span className="rounded-[4px] bg-background/70 px-1.5 py-px">
                归档 {group.counts.archived}
              </span>
              <span className="rounded-[4px] bg-background/70 px-1.5 py-px">
                重复 {group.counts.duplicate}
              </span>
              {selectedCount > 0 ? (
                <span className="rounded-[4px] bg-primary/12 px-1.5 py-px text-primary">
                  已选 {selectedCount}
                </span>
              ) : null}
            </span>
          </CollapsibleTrigger>
          <div className="flex items-start gap-1.5">
            {hasCurrentItem && !group.expanded ? (
              <span className="mt-0.5 rounded-full border border-[color-mix(in_srgb,var(--primary),transparent_64%)] px-1.5 text-[10px] leading-[15px] font-[650] text-primary">
                当前
              </span>
            ) : null}
            <CollapsibleTrigger
              aria-label={group.expanded ? `收起 ${group.label}` : `展开 ${group.label}`}
              className="mt-px grid size-5 shrink-0 place-items-center rounded-[5px] border border-transparent bg-transparent text-muted-foreground transition-[background-color,border-color,color] duration-150 hover:border-[color-mix(in_srgb,var(--border),transparent_24%)] hover:bg-background/80 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring data-[state=open]:[&_[data-slot=chevron]]:rotate-90"
            >
              <ChevronRightIcon
                data-slot="chevron"
                className="size-3.5 transition-transform duration-150"
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="flex flex-col bg-background shadow-[inset_3px_0_0_color-mix(in_srgb,var(--group-accent),transparent_88%)] [&>[role=button]:not(:last-child)]:border-b [&>[role=button]:not(:last-child)]:border-[color-mix(in_srgb,var(--border),transparent_70%)]">
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
              />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

const groupAccentColors = [
  "#3b82f6",
  "#f59e0b",
  "#14b8a6",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
]

function getGroupAccentColor(index: number) {
  return groupAccentColors[index % groupAccentColors.length]
}
