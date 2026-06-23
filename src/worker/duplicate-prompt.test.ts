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
      permissions: {
        contains: vi.fn(),
      },
      scripting: {
        executeScript: vi.fn(),
      },
      tabs: {
        update: vi.fn(),
        remove: vi.fn(),
        sendMessage: vi.fn(),
        get: vi.fn(),
      },
      windows: {
        update: vi.fn(),
      },
      sidePanel: {
        open: vi.fn(),
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

  it("injects the page overlay when overlay mode has host permission", async () => {
    const chromeMock = globalThis.chrome as unknown as {
      action: { setBadgeText: ReturnType<typeof vi.fn> }
      permissions: { contains: ReturnType<typeof vi.fn> }
      scripting: { executeScript: ReturnType<typeof vi.fn> }
      tabs: { sendMessage: ReturnType<typeof vi.fn> }
    }
    chromeMock.permissions.contains.mockResolvedValue(true)
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
        displayMode: "pageOverlay",
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    })

    await handlePotentialDuplicatePrompt(123)

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 123 },
      files: ["duplicate-prompt-overlay.js"],
    })
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ type: "duplicatePromptOverlay:show" })
    )
    expect(session.writeDuplicatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ displaySurface: "pageOverlay" })
    )
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: "" })
  })

  it("jump action activates target and removes the prompt tab", async () => {
    const chromeMock = globalThis.chrome as unknown as {
      tabs: {
        update: ReturnType<typeof vi.fn>
        remove: ReturnType<typeof vi.fn>
      }
      windows: { update: ReturnType<typeof vi.fn> }
    }
    const { jumpToDuplicatePromptTarget } = await import("./duplicate-prompt")

    await jumpToDuplicatePromptTarget({
      promptTabId: 7,
      targetTabId: 3,
      targetWindowId: 1,
    })

    expect(chromeMock.windows.update).toHaveBeenCalledWith(1, {
      focused: true,
    })
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(3, { active: true })
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith(7)
  })

  it("view action opens the side panel and stores the duplicate focus request", async () => {
    const chromeMock = globalThis.chrome as unknown as {
      tabs: { get: ReturnType<typeof vi.fn> }
      sidePanel: { open: ReturnType<typeof vi.fn> }
    }
    chromeMock.tabs.get.mockResolvedValue({ windowId: 2 })
    const { viewDuplicatePromptInstances } = await import("./duplicate-prompt")

    await viewDuplicatePromptInstances({
      promptTabId: 7,
      normalizedUrl: "https://example.com/a",
    })

    expect(chromeMock.sidePanel.open).toHaveBeenCalledWith({ windowId: 2 })
    expect(
      (
        session as unknown as {
          writeDuplicatePromptFocus: ReturnType<typeof vi.fn>
        }
      ).writeDuplicatePromptFocus
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTabId: 7,
        normalizedUrl: "https://example.com/a",
      })
    )
  })

  it("clears the prompt when the duplicate tab is closed outside prompt actions", async () => {
    const { clearDuplicatePromptForClosedTab } = await import(
      "./duplicate-prompt"
    )
    vi.mocked(session.readDuplicatePromptSession).mockResolvedValue({
      duplicatePrompt: {
        newTabId: 7,
        normalizedUrl: "https://example.com/a",
        originalUrl: "https://example.com/a#new",
        title: "Example",
        hostname: "example.com",
        defaultTargetTabId: 3,
        defaultTargetWindowId: 1,
        createdAt: "2026-06-23T00:00:00.000Z",
        displaySurface: "pending",
      },
      handledDuplicatePromptTabIds: [],
    })

    await clearDuplicatePromptForClosedTab(7)

    expect(session.clearDuplicatePromptSession).toHaveBeenCalled()
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "" })
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
