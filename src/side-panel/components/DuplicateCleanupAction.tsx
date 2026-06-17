import { CopyMinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DuplicateCleanupActionProps = {
  targetCount: number
  retainedCount: number
  onSelect: () => void
}

export function DuplicateCleanupAction({
  targetCount,
  retainedCount,
  onSelect,
}: DuplicateCleanupActionProps) {
  const hasTargets = targetCount > 0

  return (
    <button
      type="button"
      className={cn(
        "group/duplicate-action inline-grid min-h-6 max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 self-end rounded-full border px-2 py-0.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring",
        hasTargets
          ? "border-[color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_58%)] bg-transparent text-foreground hover:border-[color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_34%)] hover:bg-[color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_92%)] hover:shadow-[0_2px_8px_color-mix(in_srgb,var(--color-tab-rail-duplicate),transparent_90%)] active:translate-y-px"
          : "cursor-default border-[color-mix(in_srgb,var(--border),transparent_46%)] bg-transparent text-muted-foreground"
      )}
      disabled={!hasTargets}
      title={
        hasTargets
          ? `保留 ${retainedCount} 个最新标签页`
          : "当前没有可清理的重复项"
      }
      aria-label={
        hasTargets
          ? `选中 ${targetCount} 个重复标签页，保留 ${retainedCount} 个最新标签页`
          : "无重复可选"
      }
      onClick={onSelect}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-4 place-items-center",
          hasTargets ? "text-[var(--color-tab-rail-duplicate)]" : "text-muted-foreground"
        )}
      >
        <CopyMinusIcon className="size-3.5" />
      </span>
      <span className="min-w-0 truncate text-[11.5px] leading-5 font-[650]">
        {hasTargets ? `选中重复 ${targetCount}` : "无重复"}
      </span>
    </button>
  )
}
