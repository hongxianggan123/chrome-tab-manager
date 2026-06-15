import type { Hostname, NormalizedUrl } from "./types"

export function normalizeUrl(originalUrl: string): NormalizedUrl {
  try {
    const url = new URL(originalUrl)
    url.hash = ""
    return url.href
  } catch {
    return originalUrl.split("#", 1)[0] ?? originalUrl
  }
}

export function hostnameFromUrl(originalUrl: string): Hostname {
  try {
    const url = new URL(originalUrl)
    return url.hostname.toLowerCase() || url.protocol.replace(":", "")
  } catch {
    return "unknown"
  }
}

export function compactUrl(originalUrl: string): string {
  try {
    const url = new URL(originalUrl)
    const host = url.hostname || url.protocol.replace(":", "")
    return `${host}${url.pathname}${url.search}`
  } catch {
    return originalUrl
  }
}

