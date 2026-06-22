import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TabInstance } from "@/domain/types"
import * as session from "@/storage/session-storage"
import { handlePotentialDuplicatePrompt } from "./duplicate-prompt"
import * as refresh from "./refresh"

vi.mock("@/storage/session-storage")
vi.mock("./refresh")

describe("worker duplicate prompt handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.chrome = {
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
        setTitle: vi.fn(),
      },
    } as unknown as typeof chrome
  })

  it("stores a pending prompt and sets the badge for a new duplicate tab", async () => {
    vi.mocked(session.readDuplicatePromptSession).mockResolvedValue({
      handledDuplicatePromptTabIds: [],
    })
    vi.mocked(refresh.buildDomainState).mockResolvedValue({
      generatedAt: "2026-06-23T00:00:00.000Z",
      groups: [
        {
          key: "example.com",
          label: "example.com",
          hostname: "example.com",
          collapsed: false,
          counts: { total: 2, active: 2, archived: 0, duplicate: 2 },
          items: [
            activeTab({ tabId: 1, lastAccessed: 20 }),
            activeTab({ tabId: 123, lastAccessed: 10 }),
          ],
        },
      ],
      counts: { total: 2, active: 2, archived: 0, duplicate: 2 },
      duplicatePromptSettings: {
        displayMode: "sidePanel",
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    })

    await handlePotentialDuplicatePrompt(123)

    expect(session.writeDuplicatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        newTabId: 123,
        defaultTargetTabId: 1,
        defaultTargetWindowId: 1,
        displaySurface: "pending",
      })
    )
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "1" })
  })
})

function activeTab(overrides: Partial<TabInstance>): TabInstance {
  return {
    kind: "active",
    tabId: 1,
    windowId: 1,
    windowLabel: "Window 1",
    originalUrl: "https://example.com/docs",
    normalizedUrl: "https://example.com/docs",
    hostname: "example.com",
    title: "Example",
    isSpecialUrl: false,
    duplicateCount: 2,
    active: false,
    index: 0,
    ...overrides,
  }
}
