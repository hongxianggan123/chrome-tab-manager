import { isValidElement, type ReactElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { createBatchActionPlan } from "@/domain/batch"
import type { InventoryItem } from "@/domain/types"
import { BatchActionBar } from "./BatchActionBar"

describe("BatchActionBar", () => {
  it("keeps showing the pending confirmation when selected items are no longer visible", () => {
    const pendingPlan = createBatchActionPlan("archive", [activeItem()])

    const markup = renderToStaticMarkup(
      <BatchActionBar
        selectedItems={[]}
        pendingPlan={pendingPlan}
        onPrepareAction={vi.fn()}
        onCancelAction={vi.fn()}
        onConfirmAction={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )

    expect(markup).toContain("确认归档打开项 1 项")
    expect(markup).toContain("确认执行")
  })

  it("confirms the frozen pending plan instead of reading the current visible selection", () => {
    const pendingPlan = createBatchActionPlan("deleteArchive", [archivedItem()])
    const onConfirmAction = vi.fn()
    const element = (
      <BatchActionBar
        selectedItems={[]}
        pendingPlan={pendingPlan}
        onPrepareAction={vi.fn()}
        onCancelAction={vi.fn()}
        onConfirmAction={onConfirmAction}
        onClearSelection={vi.fn()}
      />
    )

    const confirmButton = findButtonByText(element, "确认执行")
    expect(confirmButton?.props.onClick).toBeTypeOf("function")
    confirmButton?.props.onClick?.()

    expect(onConfirmAction).toHaveBeenCalledWith(pendingPlan)
    expect(pendingPlan.targetNormalizedUrls).toEqual([
      "https://example.com/archive",
    ])
  })
})

function activeItem(): InventoryItem {
  return {
    kind: "active",
    tabId: 1,
    windowId: 10,
    windowLabel: "W1",
    originalUrl: "https://example.com/a",
    normalizedUrl: "https://example.com/a",
    hostname: "example.com",
    title: "Example",
    isSpecialUrl: false,
    duplicateCount: 1,
    active: false,
    index: 0,
  }
}

function archivedItem(): InventoryItem {
  return {
    kind: "archived",
    normalizedUrl: "https://example.com/archive",
    originalUrl: "https://example.com/archive",
    hostname: "example.com",
    title: "Archived example",
    archivedAt: "2026-06-22T00:00:00.000Z",
    archiveCount: 1,
  }
}

function findButtonByText(node: ReactNode, text: string): React.ReactElement<{
  children?: ReactNode
  onClick?: () => void
}> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const result = findButtonByText(child, text)
      if (result) {
        return result
      }
    }
    return null
  }

  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return null
  }

  if (node.type === BatchActionBar) {
    const element = node as ReactElement<
      Parameters<typeof BatchActionBar>[0],
      typeof BatchActionBar
    >
    return findButtonByText(BatchActionBar(element.props), text)
  }

  if (
    typeof node.type === "function" &&
    node.type.name === "Button" &&
    nodeContainsText(node.props.children, text)
  ) {
    return node as React.ReactElement<{
      children?: ReactNode
      onClick?: () => void
    }>
  }

  return findButtonByText(node.props.children, text)
}

function nodeContainsText(node: ReactNode, text: string): boolean {
  if (typeof node === "string") {
    return node.includes(text)
  }
  if (Array.isArray(node)) {
    return node.some((child) => nodeContainsText(child, text))
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeContainsText(node.props.children, text)
  }
  return false
}
