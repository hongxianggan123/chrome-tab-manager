import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DomainStatePayload } from "@/worker/messages"
import { sendWorkerMessage } from "./api"

const state: DomainStatePayload = {
  generatedAt: "2026-06-25T00:00:00.000Z",
  groups: [],
  counts: {
    total: 0,
    active: 0,
    archived: 0,
    duplicate: 0,
  },
  duplicatePromptSettings: {
    displayMode: "sidePanel",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
}

describe("side panel worker api", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  it("retries state requests when the service worker receiver is not ready yet", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Could not establish connection. Receiving end does not exist.")
      )
      .mockResolvedValueOnce({ ok: true, state })
    globalThis.chrome = {
      runtime: {
        sendMessage,
      },
    } as unknown as typeof chrome

    const resultPromise = sendWorkerMessage({ type: "state:get" })

    await vi.runOnlyPendingTimersAsync()

    await expect(resultPromise).resolves.toEqual(state)
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })
})
