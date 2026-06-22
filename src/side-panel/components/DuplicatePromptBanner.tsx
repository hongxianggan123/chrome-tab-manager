import { ExternalLinkIcon, ListFilterIcon } from "lucide-react"
import type { DuplicatePromptRuntime } from "@/domain/types"
import { Button } from "@/components/ui/button"

type DuplicatePromptBannerProps = {
  prompt: DuplicatePromptRuntime
  secondsRemaining: number
  onJump: () => void
  onKeep: () => void
  onViewDuplicates: () => void
}

export function DuplicatePromptBanner({
  prompt,
  secondsRemaining,
  onJump,
  onKeep,
  onViewDuplicates,
}: DuplicatePromptBannerProps) {
  const keepLabel =
    secondsRemaining <= 5 ? `保留 ${secondsRemaining}` : "保留"

  return (
    <section className="border-b border-border bg-background px-3 py-2">
      <div className="rounded-md border border-[color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_58%)] bg-background p-2 shadow-sm">
        <div className="mb-2 border-l-[3px] border-[var(--color-tab-rail-duplicate)] pl-2">
          <p className="text-sm leading-5 font-medium">已打开重复页面</p>
          <p className="truncate text-xs leading-[17px] text-muted-foreground">
            {prompt.title} · {prompt.hostname}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" onClick={onJump}>
            <ExternalLinkIcon data-icon="inline-start" />
            跳转
          </Button>
          <Button size="sm" variant="secondary" onClick={onKeep}>
            {keepLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={onViewDuplicates}>
            <ListFilterIcon data-icon="inline-start" />
            查看重复
          </Button>
        </div>
      </div>
    </section>
  )
}
