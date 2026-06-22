import { beforeEach, describe, expect, it, vi } from "vitest"
import * as localStorage from "@/storage/local-storage"
import { updateDuplicatePromptDisplayMode } from "./mutations"

vi.mock("@/storage/local-storage", () => ({
  deleteArchivedRecord: vi.fn(),
  readStorageRoot: vi.fn(),
  setGroupCollapsed: vi.fn(),
  updateDuplicatePromptSettings: vi.fn(),
  upsertArchivedRecord: vi.fn(),
  writeStorageRoot: vi.fn(),
}))

vi.mock("./chrome-snapshot", () => ({
  readChromeSnapshot: vi.fn(),
}))

vi.mock("./refresh", () => ({
  buildDomainState: vi.fn(async () => ({
    generatedAt: "2026-06-23T00:00:00.000Z",
    groups: [],
    counts: { total: 0, active: 0, archived: 0, duplicate: 0 },
    duplicatePromptSettings: {
      displayMode: "sidePanel",
      updatedAt: "2026-06-23T00:00:00.000Z",
    },
  })),
}))

describe("worker mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.chrome = {
      permissions: {
        request: vi.fn(),
      },
    } as unknown as typeof chrome
  })

  it("requests optional host permission before enabling page overlay", async () => {
    const chromeMock = globalThis.chrome as unknown as {
      permissions: { request: ReturnType<typeof vi.fn> }
    }
    chromeMock.permissions.request.mockResolvedValue(true)

    const result = await updateDuplicatePromptDisplayMode("pageOverlay")

    expect(chromeMock.permissions.request).toHaveBeenCalledWith({
      origins: ["<all_urls>"],
    })
    expect(localStorage.updateDuplicatePromptSettings).toHaveBeenCalledWith(
      "pageOverlay"
    )
    expect(result.ok).toBe(true)
  })

  it("falls back to side panel when page overlay permission is denied", async () => {
    const chromeMock = globalThis.chrome as unknown as {
      permissions: { request: ReturnType<typeof vi.fn> }
    }
    chromeMock.permissions.request.mockResolvedValue(false)

    const result = await updateDuplicatePromptDisplayMode("pageOverlay")

    expect(localStorage.updateDuplicatePromptSettings).toHaveBeenCalledWith(
      "sidePanel"
    )
    expect(result).toEqual({
      ok: false,
      error: {
        code: "chrome_api_failed",
        message: "页面浮层需要授权。已继续使用侧边栏提示。",
      },
    })
  })
})
