import { SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <InputGroup className="search-box">
      <InputGroupAddon align="inline-start">
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="搜索标签页"
        placeholder="搜索标题、域名或 URL"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="清空搜索"
            size="icon-xs"
            onClick={() => onChange("")}
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : (
        <InputGroupAddon align="inline-end">
          <Button aria-hidden="true" tabIndex={-1} size="icon-xs" variant="ghost" />
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

