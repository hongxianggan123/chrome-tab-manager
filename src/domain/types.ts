export type NormalizedUrl = string
export type OriginalUrl = string
export type Hostname = string
export type GroupKey = string

export type SourceWindowSnapshot = {
  windowId: number
  label: string
}

export type ArchivedTabRecord = {
  normalizedUrl: NormalizedUrl
  originalUrl: OriginalUrl
  title: string
  faviconUrl?: string
  hostname: Hostname
  archivedAt: string
  archiveCount: number
  sourceWindow?: SourceWindowSnapshot
}

export type GroupViewState = {
  collapsed: boolean
  updatedAt: string
}

export type DuplicatePromptDisplayMode = "sidePanel" | "pageOverlay"

export type DuplicatePromptSettings = {
  displayMode: DuplicatePromptDisplayMode
  updatedAt: string
}

export type DuplicatePromptRuntime = {
  newTabId: number
  normalizedUrl: NormalizedUrl
  originalUrl: string
  title: string
  hostname: Hostname
  defaultTargetTabId: number
  defaultTargetWindowId: number
  createdAt: string
  displaySurface: "sidePanel" | "pageOverlay" | "pending"
}

export type TabInstanceSnapshot = {
  tabId: number
  windowId: number
  windowLabel: string
  originalUrl: string
  title: string
  faviconUrl?: string
  audible?: boolean
  pinned?: boolean
  active: boolean
  index: number
  lastAccessed?: number
}

export type TabInstance = {
  kind: "active"
  tabId: number
  windowId: number
  windowLabel: string
  originalUrl: string
  normalizedUrl: NormalizedUrl
  hostname: Hostname
  title: string
  faviconUrl?: string
  audible?: boolean
  pinned?: boolean
  isSpecialUrl: boolean
  duplicateCount: number
  active: boolean
  index: number
  lastAccessed?: number
}

export type ArchivedInventoryItem = {
  kind: "archived"
  normalizedUrl: NormalizedUrl
  originalUrl: string
  hostname: Hostname
  title: string
  faviconUrl?: string
  archivedAt: string
  archiveCount: number
  sourceWindow?: SourceWindowSnapshot
}

export type InventoryItem = TabInstance | ArchivedInventoryItem

export type InventoryCounts = {
  total: number
  active: number
  archived: number
  duplicate: number
}

export type GroupRuntime = {
  key: GroupKey
  label: string
  hostname: Hostname
  items: InventoryItem[]
  counts: InventoryCounts
  collapsed: boolean
}

export type StatusFilter = "all" | "active" | "archived" | "duplicate"

export type VisibleGroup = {
  key: GroupKey
  label: string
  counts: InventoryCounts
  expanded: boolean
  items: InventoryItem[]
}

export type EmptyReason =
  | "no-normal-tabs"
  | "no-search-results"
  | "no-archived-tabs"
