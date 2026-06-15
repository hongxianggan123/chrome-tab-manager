import type { InventoryCounts } from "@/domain/types"

type PanelHeaderProps = {
  counts?: InventoryCounts
}

export function PanelHeader({ counts }: PanelHeaderProps) {
  return (
    <header className="panel-header">
      <div>
        <h1>Tabs</h1>
        <p>普通窗口 · 归档已包含</p>
      </div>
      <span className="panel-count" aria-label="标签清单总数">
        {counts ? counts.total : "--"}
      </span>
    </header>
  )
}

