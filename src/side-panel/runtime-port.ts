import type { WorkerPushMessage } from "@/worker/messages"

type SidePanelPortSessionOptions = {
  connect: () => chrome.runtime.Port
  onPushMessage: (message: WorkerPushMessage) => void
  onReconnect: () => void
  reconnectDelayMs?: number
}

export function createSidePanelPortSession({
  connect,
  onPushMessage,
  onReconnect,
  reconnectDelayMs = 1000,
}: SidePanelPortSessionOptions) {
  let stopped = false
  let port: chrome.runtime.Port | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const openPort = (isReconnect: boolean) => {
    if (stopped) {
      return
    }

    clearReconnectTimer()
    port = connect()
    port.onMessage.addListener(onPushMessage)
    port.onDisconnect.addListener(handleDisconnect)

    if (isReconnect) {
      onReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) {
      return
    }

    reconnectTimer = setTimeout(() => openPort(true), reconnectDelayMs)
  }

  function handleDisconnect() {
    if (port) {
      port.onMessage.removeListener(onPushMessage)
      port.onDisconnect.removeListener(handleDisconnect)
      port = null
    }

    scheduleReconnect()
  }

  openPort(false)

  return () => {
    stopped = true
    clearReconnectTimer()

    if (port) {
      port.onMessage.removeListener(onPushMessage)
      port.onDisconnect.removeListener(handleDisconnect)
      port.disconnect()
      port = null
    }
  }
}
