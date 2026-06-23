import { describe, expect, it } from "vitest"
import { createDefaultStorageRoot, normalizeStorageRoot } from "./schema"

describe("storage schema", () => {
  it("creates an empty versioned root", () => {
    expect(createDefaultStorageRoot()).toEqual({
      version: 1,
      archivedTabs: {},
      groupViewState: {},
      duplicatePromptSettings: {
        displayMode: "sidePanel",
        updatedAt: "1970-01-01T00:00:00.000Z",
      },
    })
  })

  it("falls back to defaults for invalid storage", () => {
    expect(normalizeStorageRoot({ version: 2 })).toEqual(
      createDefaultStorageRoot()
    )
  })

  it("defaults duplicate prompt settings to side panel", () => {
    expect(createDefaultStorageRoot().duplicatePromptSettings.displayMode).toBe(
      "sidePanel"
    )
  })

  it("normalizes older roots without duplicate prompt settings", () => {
    const root = normalizeStorageRoot({
      version: 1,
      archivedTabs: {},
      groupViewState: {},
    })

    expect(root.duplicatePromptSettings.displayMode).toBe("sidePanel")
  })
})
