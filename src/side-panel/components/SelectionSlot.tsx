import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type SelectionSlotProps = {
  label: string
  selected: boolean
  mixed?: boolean
  onToggle: () => void
}

export function SelectionSlot({
  label,
  selected,
  mixed,
  onToggle,
}: SelectionSlotProps) {
  const active = selected || mixed
  const Icon = mixed ? MinusIcon : selected ? CheckIcon : PlusIcon

  return (
    <button
      type="button"
      data-slot="selection-hitarea"
      aria-label={label}
      aria-pressed={mixed ? "mixed" : selected}
      className={cn(
        "group/select absolute inset-y-0 left-0 z-20 w-7 cursor-pointer border-0 bg-transparent p-0 text-muted-foreground outline-none",
        "focus-visible:ring-0"
      )}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
      }}
    >
      <span
        data-slot="selection-mask"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 -left-3 w-9 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--background),transparent_4%),color-mix(in_srgb,var(--background),transparent_28%)_58%,transparent)] opacity-0 transition-[left,opacity] duration-[260ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover/select:left-0 group-hover/select:opacity-100 group-focus-visible/select:left-0 group-focus-visible/select:opacity-100",
          active && "opacity-0 group-hover/select:opacity-0 group-focus-visible/select:opacity-0"
        )}
      />
      <span
        data-slot="selection-control"
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 -left-2.5 grid size-4 -translate-y-1/2 place-items-center rounded-full border border-[color-mix(in_srgb,var(--border),transparent_10%)] bg-background text-foreground opacity-0 shadow-[0_1px_4px_color-mix(in_srgb,#000,transparent_88%)] transition-[left,opacity,background-color,border-color,color,box-shadow] duration-[260ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover/select:left-2.5 group-hover/select:opacity-100 group-focus-visible/select:left-2.5 group-focus-visible/select:opacity-100 [&_svg]:size-2.5",
          active &&
            "left-2.5 border-primary bg-primary text-primary-foreground opacity-100 shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary),transparent_84%),0_2px_6px_color-mix(in_srgb,var(--primary),transparent_75%)]",
          !active &&
            "group-hover/select:border-primary group-hover/select:text-primary group-focus-visible/select:border-primary group-focus-visible/select:text-primary"
        )}
      >
        <Icon data-icon="inline-start" />
      </span>
    </button>
  )
}
