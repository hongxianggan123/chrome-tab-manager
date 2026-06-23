import { SettingsIcon } from "lucide-react"
import type { InventoryCounts } from "@/domain/types"
import { Button } from "@/components/ui/button"

type PanelHeaderProps = {
  counts?: InventoryCounts
  onOpenSettings: () => void
}

export function PanelHeader({ counts, onOpenSettings }: PanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-[15px] leading-5 font-[650]">Tabs</h1>
        <p className="mt-0.5 mb-0 text-[11px] leading-[15px] text-muted-foreground">
          普通窗口 · 归档已包含
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="font-mono text-lg leading-[22px] font-[650]"
          aria-label="标签清单总数"
        >
          {counts ? counts.total : "--"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="打开设置"
          onClick={onOpenSettings}
        >
          <SettingsIcon data-icon="inline-start" />
        </Button>
      </div>
    </header>
  )
}
