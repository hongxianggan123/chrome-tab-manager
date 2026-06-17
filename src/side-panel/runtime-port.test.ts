import { describe, expect, it, vi } from "vitest"
import { createSidePanelPortSession } from "./runtime-port"
import type { WorkerPushMessage } from "@/worker/messages"

describe("side panel runtime port session", () => {
  it("reconnects and refreshes state after the runtime port disconnects", () => {
    vi.useFakeTimers()
    const ports: FakePort[] = []
    const onPushMessage = vi.fn()
    const onReconnect = vi.fn()

    createSidePanelPortSession({
      connect: () => {
        const port = createFakePort()
        ports.push(port)
        return port
      },
      onPushMessage,
      onReconnect,
      reconnectDelayMs: 250,
    })

    expect(ports).toHaveLength(1)

    ports[0].disconnect()
    vi.advanceTimersByTime(250)

    expect(ports).toHaveLength(2)
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })
})

type FakePort = chrome.runtime.Port & {
  disconnect: () => void
}

function createFakePort(): FakePort {
  const messageListeners: Array<(message: WorkerPushMessage) => void> = []
  const disconnectListeners: Array<() => void> = []

  return {
    name: "side-panel",
    postMessage: vi.fn(),
    disconnect: () => {
      for (const listener of disconnectListeners) {
        listener()
      }
    },
    onMessage: {
      addListener: (listener: (message: WorkerPushMessage) => void) => {
        messageListeners.push(listener)
      },
      removeListener: (listener: (message: WorkerPushMessage) => void) => {
        const index = messageListeners.indexOf(listener)
        if (index >= 0) {
          messageListeners.splice(index, 1)
        }
      },
    },
    onDisconnect: {
      addListener: (listener: () => void) => {
        disconnectListeners.push(listener)
      },
      removeListener: (listener: () => void) => {
        const index = disconnectListeners.indexOf(listener)
        if (index >= 0) {
          disconnectListeners.splice(index, 1)
        }
      },
    },
  } as unknown as FakePort
}
