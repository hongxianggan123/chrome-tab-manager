import { describe, expect, it } from "vitest"
import { createDefaultStorageRoot, normalizeStorageRoot } from "./schema"

describe("storage schema", () => {
  it("creates an empty versioned root", () => {
    expect(createDefaultStorageRoot()).toEqual({
      version: 1,
      archivedTabs: {},
      groupViewState: {},
    })
  })

  it("falls back to defaults for invalid storage", () => {
    expect(normalizeStorageRoot({ version: 2 })).toEqual(
      createDefaultStorageRoot()
    )
  })
})

