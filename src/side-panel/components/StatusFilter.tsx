import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { InventoryCounts, StatusFilter as StatusFilterValue } from "@/domain/types"

type StatusFilterProps = {
  value: StatusFilterValue
  counts: InventoryCounts
  onChange: (value: StatusFilterValue) => void
}

const options: Array<{ value: StatusFilterValue; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "打开" },
  { value: "archived", label: "归档" },
  { value: "duplicate", label: "重复" },
]

export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  return (
    <ToggleGroup
      aria-label="状态过滤"
      type="single"
      value={value}
      spacing={1}
      className="status-filter !grid !w-full !max-w-full !grid-cols-4"
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as StatusFilterValue)
        }
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          size="sm"
          className="!w-full !min-w-0 !shrink"
        >
          {option.label} {counts[option.value === "all" ? "total" : option.value]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
