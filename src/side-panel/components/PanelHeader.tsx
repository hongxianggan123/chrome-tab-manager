import type { InventoryCounts } from "@/domain/types"

type PanelHeaderProps = {
  counts?: InventoryCounts
}

export function PanelHeader({ counts }: PanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-[15px] leading-5 font-[650]">Tabs</h1>
        <p className="mt-0.5 mb-0 text-[11px] leading-[15px] text-muted-foreground">
          普通窗口 · 归档已包含
        </p>
      </div>
      <span
        className="font-mono text-lg leading-[22px] font-[650]"
        aria-label="标签清单总数"
      >
        {counts ? counts.total : "--"}
      </span>
    </header>
  )
}
