import { ArrowLeftIcon } from "lucide-react"
import type { DuplicatePromptDisplayMode } from "@/domain/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SettingsPanelProps = {
  displayMode: DuplicatePromptDisplayMode
  onDisplayModeChange: (displayMode: DuplicatePromptDisplayMode) => void
  onBack: () => void
}

const displayModeOptions: Array<{
  value: DuplicatePromptDisplayMode
  label: string
  description: string
}> = [
  {
    value: "sidePanel",
    label: "侧边栏",
    description: "默认方式，未打开时使用扩展图标提醒。",
  },
  {
    value: "pageOverlay",
    label: "页面浮层",
    description: "需要授权网页访问权限，只显示重复提示。",
  },
]

export function SettingsPanel({
  displayMode,
  onDisplayModeChange,
  onBack,
}: SettingsPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="返回标签清单"
          onClick={onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" />
        </Button>
        <h2 className="text-sm leading-5 font-semibold">设置</h2>
      </div>

      <section className="border-t border-border pt-3">
        <h3 className="text-xs leading-4 font-medium text-muted-foreground">
          重复提示
        </h3>
        <fieldset className="mt-3 grid gap-2">
          <legend className="mb-2 text-sm leading-5 font-medium">
            展示方式
          </legend>
          {displayModeOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-[background-color,border-color]",
                displayMode === option.value
                  ? "border-primary/45 bg-primary/6"
                  : "border-border hover:bg-muted/60"
              )}
            >
              <input
                type="radio"
                name="duplicate-prompt-display-mode"
                value={option.value}
                checked={displayMode === option.value}
                onChange={() => onDisplayModeChange(option.value)}
                className="mt-1 size-3.5 accent-primary"
              />
              <span className="grid gap-0.5">
                <span className="text-sm leading-5 font-medium">
                  {option.label}
                </span>
                <span className="text-xs leading-[17px] text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>
    </section>
  )
}
