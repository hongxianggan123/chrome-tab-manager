import {
  ArchiveIcon,
  CheckIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  batchPlanTargetCount,
  createBatchActionPlan,
  summarizeBatchSelection,
  type BatchAction,
  type BatchActionPlan,
} from "@/domain/batch"
import type { InventoryItem } from "@/domain/types"
import { cn } from "@/lib/utils"

type BatchActionBarProps = {
  selectedItems: InventoryItem[]
  pendingPlan: BatchActionPlan | null
  onPrepareAction: (plan: BatchActionPlan) => void
  onCancelAction: () => void
  onConfirmAction: (plan: BatchActionPlan) => void
  onClearSelection: () => void
}

const actionLabels: Record<BatchAction, string> = {
  close: "关闭打开项",
  archive: "归档打开项",
  deleteArchive: "删除归档",
}

export function BatchActionBar({
  selectedItems,
  pendingPlan,
  onPrepareAction,
  onCancelAction,
  onConfirmAction,
  onClearSelection,
}: BatchActionBarProps) {
  if (selectedItems.length === 0) {
    return null
  }

  const summary = summarizeBatchSelection(selectedItems)

  if (pendingPlan) {
    const targetCount = batchPlanTargetCount(pendingPlan)

    return (
      <section
        className="border-t border-[color-mix(in_srgb,var(--background),transparent_82%)] bg-foreground px-3 py-2 text-background"
        aria-label="批量操作确认"
      >
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] leading-4 font-[700]">
                确认{actionLabels[pendingPlan.action]} {targetCount} 项
              </p>
              <p className="text-[10.5px] leading-[15px] text-background/72">
                执行前核对摘要；跳过项会保持原样。
              </p>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-background hover:bg-background/12 hover:text-background"
              aria-label="取消批量操作"
              onClick={onCancelAction}
            >
              <XIcon data-icon="inline-start" />
            </Button>
          </div>

          <BatchPlanChips plan={pendingPlan} />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-background/22 bg-transparent text-background hover:bg-background/10 hover:text-background"
              onClick={onCancelAction}
            >
              继续选择
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                pendingPlan.action === "close" ||
                pendingPlan.action === "deleteArchive"
                  ? "destructive"
                  : "default"
              }
              disabled={targetCount === 0}
              onClick={() => onConfirmAction(pendingPlan)}
            >
              <CheckIcon data-icon="inline-start" />
              确认执行
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="border-t border-[color-mix(in_srgb,var(--background),transparent_82%)] bg-foreground px-3 py-2 text-background"
      aria-label="批量操作"
    >
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] leading-4 font-[700]">
              已选 {summary.total} 项
            </p>
            <p className="text-[10.5px] leading-[15px] text-background/72">
              打开 {summary.active} · 归档 {summary.archived}
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-background hover:bg-background/12 hover:text-background"
            onClick={onClearSelection}
          >
            清空
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <BatchActionButton
            action="archive"
            disabled={summary.archivableActive === 0}
            selectedItems={selectedItems}
            onPrepareAction={onPrepareAction}
          />
          <BatchActionButton
            action="close"
            disabled={summary.active === 0}
            selectedItems={selectedItems}
            onPrepareAction={onPrepareAction}
          />
          <BatchActionButton
            action="deleteArchive"
            disabled={summary.archived === 0}
            selectedItems={selectedItems}
            onPrepareAction={onPrepareAction}
          />
        </div>
      </div>
    </section>
  )
}

function BatchActionButton({
  action,
  disabled,
  selectedItems,
  onPrepareAction,
}: {
  action: BatchAction
  disabled: boolean
  selectedItems: InventoryItem[]
  onPrepareAction: (plan: BatchActionPlan) => void
}) {
  const Icon =
    action === "archive"
      ? ArchiveIcon
      : action === "deleteArchive"
        ? Trash2Icon
        : XIcon

  return (
    <Button
      type="button"
      size="sm"
      variant={action === "archive" ? "secondary" : "outline"}
      className={cn(
        "min-w-0 px-1.5 text-[11px]",
        action !== "archive" &&
          "border-background/22 bg-transparent text-background hover:bg-background/10 hover:text-background"
      )}
      disabled={disabled}
      onClick={() =>
        onPrepareAction(createBatchActionPlan(action, selectedItems))
      }
    >
      <Icon data-icon="inline-start" />
      <span className="truncate">
        {actionLabels[action].replace("打开项", "")}
      </span>
    </Button>
  )
}

function BatchPlanChips({ plan }: { plan: BatchActionPlan }) {
  const risks = [
    { label: "特殊 URL", value: plan.risk.special },
    { label: "播放中", value: plan.risk.audible },
    { label: "原生置顶", value: plan.risk.pinned },
    { label: "近 5 分钟用过", value: plan.risk.recent },
  ].filter((item) => item.value > 0)
  const skipped = [
    { label: "跳过打开项", value: plan.skipped.active },
    { label: "跳过归档项", value: plan.skipped.archived },
    { label: "跳过特殊 URL", value: plan.skipped.special },
  ].filter((item) => item.value > 0)

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      <Badge variant="secondary">执行 {batchPlanTargetCount(plan)}</Badge>
      {skipped.map((item) => (
        <Badge
          key={item.label}
          variant="outline"
          className="border-background/22 text-background"
        >
          {item.label} {item.value}
        </Badge>
      ))}
      {risks.map((item) => (
        <Badge
          key={item.label}
          variant="outline"
          className="border-background/22 text-background"
        >
          {item.label} {item.value}
        </Badge>
      ))}
    </div>
  )
}
