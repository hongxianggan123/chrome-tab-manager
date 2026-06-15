import { ChevronRightIcon, GlobeIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { InventoryItem, VisibleGroup } from "@/domain/types"
import { cn } from "@/lib/utils"
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
      <section
        className="border-b border-[color-mix(in_srgb,var(--border),transparent_35%)]"
        data-current-group={hasCurrentItem}
      >
        <CollapsibleTrigger
          className={cn(
            "grid w-full grid-cols-[14px_20px_minmax(0,1fr)_auto] gap-x-1.5 gap-y-0.5 border-0 bg-transparent px-3 py-[9px] text-left text-inherit hover:[&_[data-slot=disclosure]]:text-foreground data-[state=open]:[&_[data-slot=chevron]]:rotate-90",
            hasCurrentItem &&
              "bg-[color-mix(in_srgb,var(--primary),transparent_94%)]"
          )}
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
          <span className="overflow-hidden text-[12px] leading-4 font-[650] text-ellipsis whitespace-nowrap">
            {group.label}
          </span>
          {hasCurrentItem ? (
            <span className="self-center rounded-full border border-[color-mix(in_srgb,var(--primary),transparent_64%)] px-1.5 text-[10px] leading-[15px] font-[650] text-primary">
              当前
            </span>
          ) : null}
          <span className="[grid-column:3/-1] overflow-hidden font-mono text-[10px] leading-[13px] text-ellipsis whitespace-nowrap text-muted-foreground">
            {group.counts.total} 项 · 打开 {group.counts.active} · 归档{" "}
            {group.counts.archived} · 重复 {group.counts.duplicate}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col">
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
