const SPECIAL_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "file:",
  "view-source:",
])

export function isSpecialUrl(originalUrl: string): boolean {
  try {
    return SPECIAL_PROTOCOLS.has(new URL(originalUrl).protocol)
  } catch {
    return true
  }
}

export function specialUrlGroupLabel(originalUrl: string): string {
  try {
    const url = new URL(originalUrl)
    switch (url.protocol) {
      case "chrome:":
        return "chrome"
      case "chrome-extension:":
        return "extension"
      case "file:":
        return "file"
      case "edge:":
        return "edge"
      case "about:":
        return "about"
      case "devtools:":
        return "devtools"
      case "view-source:":
        return "view-source"
      default:
        return url.protocol.replace(":", "") || "special"
    }
  } catch {
    return "special"
  }
}

