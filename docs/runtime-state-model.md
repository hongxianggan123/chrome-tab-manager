# Runtime State Model

本文档定义 MVP 阶段运行时内存状态。它描述 Chrome API 实时状态、storage 持久状态和 UI 派生状态如何组合，不包含代码。

## 目标

运行时状态需要支持：

- 展示所有普通窗口中的打开标签实例。
- 合并归档标签记录。
- 计算规范化 URL。
- 识别重复组。
- 按完整 host 分组和排序。
- 应用搜索和单一状态过滤。
- 执行跳转、关闭、归档、恢复、删除归档记录。

## 状态分层

```text
Chrome snapshot
        │
        ▼
Storage snapshot
        │
        ▼
Domain state
        │
        ▼
Derived view state
        │
        ▼
Side panel UI
```

### Chrome snapshot

来自 Chrome API 的当前普通窗口状态。

```ts
type ChromeSnapshot = {
  windows: WindowSnapshot[]
  tabs: TabInstanceSnapshot[]
  capturedAt: string
}
```

### Storage snapshot

来自 `chrome.storage.local` 的持久状态。

```ts
type StorageSnapshot = {
  version: 1
  archivedTabs: Record<NormalizedUrl, ArchivedTabRecord>
  groupViewState: Record<GroupKey, GroupViewState>
}
```

### Domain state

领域层把 Chrome snapshot 和 Storage snapshot 合并为产品模型。

```ts
type DomainState = {
  activeInstances: TabInstance[]
  archivedRecords: ArchivedTabRecord[]
  tabRecords: Record<NormalizedUrl, TabRecordRuntime>
  duplicateGroups: Record<NormalizedUrl, DuplicateGroupRuntime>
  groups: GroupRuntime[]
}
```

### Derived view state

UI 层根据搜索、过滤、折叠状态生成可渲染列表。

```ts
type DerivedViewState = {
  query: string
  statusFilter: StatusFilter
  totalCounts: InventoryCounts
  visibleGroups: VisibleGroup[]
  emptyReason?: EmptyReason
  feedback?: FeedbackMessage[]
}
```

## Runtime Types

### WindowSnapshot

```ts
type WindowSnapshot = {
  id: number
  label: string
  focused: boolean
}
```

说明：

- `label` 是 UI 窗口标识，例如 `W1`、`W2`。
- label 在当前 snapshot 内稳定即可，不要求跨重启稳定。

### TabInstanceSnapshot

```ts
type TabInstanceSnapshot = {
  tabId: number
  windowId: number
  windowLabel: string
  originalUrl: string
  title: string
  faviconUrl?: string
  active: boolean
  index: number
  lastAccessed?: number
  pinned: boolean
  audible: boolean
  discarded: boolean
  status?: "loading" | "complete"
}
```

MVP 使用字段：

- `tabId`
- `windowId`
- `windowLabel`
- `originalUrl`
- `title`
- `faviconUrl`
- `active`
- `index`

其他字段可以保留为后续阶段扩展，但 MVP UI 不依赖它们。

### TabInstance

```ts
type TabInstance = {
  kind: "active"
  tabId: number
  windowId: number
  windowLabel: string
  originalUrl: string
  normalizedUrl: NormalizedUrl
  hostname: Hostname
  title: string
  faviconUrl?: string
  isSpecialUrl: boolean
  duplicateCount: number
  active: boolean
  index: number
}
```

说明：

- `kind: "active"` 用于和归档记录统一渲染。
- `duplicateCount` 为同一规范化 URL 打开实例数量。大于 1 时显示重复徽标。

### ArchivedInventoryItem

```ts
type ArchivedInventoryItem = {
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
```

说明：

- 归档项只在同一规范化 URL 没有 active instance 时进入 inventory。
- 如果 Chrome snapshot 中已有同一规范化 URL 的打开实例，归档项应从 visible inventory 中排除，并在恢复流程中删除 storage 里的冲突归档状态。

### TabRecordRuntime

```ts
type TabRecordRuntime = {
  normalizedUrl: NormalizedUrl
  activeInstances: TabInstance[]
  archivedRecord?: ArchivedTabRecord
}
```

约束：

- `activeInstances.length > 0` 时，`archivedRecord` 不应参与可见列表。
- 同一规范化 URL 不允许在 UI 中同时显示 active 和 archived 状态。

### DuplicateGroupRuntime

```ts
type DuplicateGroupRuntime = {
  normalizedUrl: NormalizedUrl
  instances: TabInstance[]
  count: number
}
```

规则：

- 只包含打开中的标签实例。
- `count > 1` 才是有效重复组。
- 归档项不参与重复组。

### GroupRuntime

```ts
type GroupRuntime = {
  key: GroupKey
  label: string
  hostname: Hostname
  items: InventoryItem[]
  counts: InventoryCounts
  collapsed: boolean
}
```

MVP 分组：

- 默认按完整 hostname 分组。
- 特殊 URL 使用稳定 group key。
- 分组排序按总项数倒序，数量相同按 label 字母序。

### InventoryItem

```ts
type InventoryItem = TabInstance | ArchivedInventoryItem
```

排序：

1. 打开项在归档项前。
2. 打开项按稳定窗口 id、tab index 排序，不按最近激活时间排序，避免用户点击后列表跳变。
3. 归档项按 `archivedAt` 倒序。

## View State

### StatusFilter

```ts
type StatusFilter = "all" | "active" | "archived" | "duplicate"
```

规则：

- MVP 只支持单一状态过滤。
- 搜索词可以叠加当前状态过滤。
- 状态过滤最多保留在当前侧边栏会话内，不跨重启。

### InventoryCounts

```ts
type InventoryCounts = {
  total: number
  active: number
  archived: number
  duplicate: number
}
```

说明：

- `duplicate` 计数指属于有效重复组的打开实例数量，不是重复组数量。
- 分组标题和过滤器计数都使用该口径。

### VisibleGroup

```ts
type VisibleGroup = {
  key: GroupKey
  label: string
  counts: InventoryCounts
  expanded: boolean
  items: InventoryItem[]
}
```

规则：

- 搜索或过滤激活时，只保留命中项。
- 搜索或过滤激活时，命中分组临时展开。
- 未命中分组隐藏。
- 搜索和过滤退出后恢复 `groupViewState` 中的折叠状态。

### EmptyReason

```ts
type EmptyReason =
  | "no-normal-tabs"
  | "no-search-results"
  | "no-archived-tabs"
```

规则：

- 没有任何普通窗口标签页且没有归档项时，使用 `no-normal-tabs`。
- 搜索或过滤后无可见项，使用 `no-search-results`。
- 归档过滤下没有归档项，使用 `no-archived-tabs`。

## Derivation Pipeline

### 1. Capture Chrome snapshot

读取所有普通窗口和标签页：

1. 查询普通窗口。
2. 查询每个窗口的 tabs。
3. 排除隐身窗口。
4. 为窗口生成当前 snapshot 内的 `W1`、`W2` 标签。

### 2. Normalize active tabs

对每个 tab：

1. 判断是否特殊 URL。
2. 计算规范化 URL。
3. 提取 hostname 或特殊 URL 分组 key。
4. 转换为 `TabInstance`。

### 3. Merge storage archived records

把 `archivedTabs` 合并进 `TabRecordRuntime`：

1. 如果同一规范化 URL 有 active instances，归档记录不进入 visible inventory。
2. 如果没有 active instances，归档记录进入 inventory。
3. 如果发现 active 与 archived 冲突，后续可以清理 storage 中的归档记录。

MVP 推荐在读取时不立即写回清理，避免 snapshot 短暂不一致导致误删。可在明确打开恢复或归档操作后清理。

### 4. Compute duplicate groups

按规范化 URL 统计 active instances。

- `count > 1` 的 URL 形成重复组。
- 把 `duplicateCount` 回填到对应 `TabInstance`。

### 5. Build groups

把 active instances 和可见 archived records 放入分组。

分组 key：

- 普通网页：`host:{hostname}`
- 特殊 URL：`host:{specialLabel}`

分组排序：

1. 总项数倒序。
2. label 字母序。

组内排序：

1. active 在前。
2. archived 在后。
3. archived 按 `archivedAt` 倒序。

### 6. Apply search and status filter

先应用状态过滤，再应用搜索。

搜索字段：

- title
- hostname
- normalizedUrl

状态过滤：

- `all`：不过滤。
- `active`：只显示 active。
- `archived`：只显示 archived。
- `duplicate`：只显示 `duplicateCount > 1` 的 active。

### 7. Compute empty state

按优先级计算：

1. 如果基础 inventory 为空，`no-normal-tabs`。
2. 如果当前过滤是 archived 且没有归档项，`no-archived-tabs`。
3. 如果搜索或过滤后没有 visible items，`no-search-results`。

## Mutation Flow

### Jump active tab

输入：`tabId`, `windowId`

流程：

1. 激活 tab。
2. 聚焦 window。
3. 重新读取 Chrome snapshot。

失败：

- 显示非阻塞错误提示。
- 不修改 storage。

### Close active tab

输入：`tabId`

流程：

1. 调用 Chrome API 关闭 tab。
2. 重新读取 Chrome snapshot。

约束：

- 不创建归档记录。
- 不提供撤销。

### Archive active tab

输入：`tabId`

流程：

1. 根据当前 snapshot 找到 tab instance。
2. 如果是特殊 URL，拒绝归档并显示提示。
3. 计算同一规范化 URL 的其他 active instances。
4. 关闭 tab。
5. 如果没有其他 active instances，写入 `archivedTabs`。
6. 重新读取 Chrome snapshot 和 storage snapshot。

失败：

- 如果关闭失败，不写入归档记录。
- 如果写入 storage 失败，应显示错误并重新读取状态。

### Restore archived tab

输入：`normalizedUrl`

流程：

1. 从 storage 读取归档记录。
2. 在当前普通窗口打开 `originalUrl`；如果没有普通窗口，新建普通窗口。
3. 打开成功后删除 `archivedTabs[normalizedUrl]`。
4. 重新读取状态。

失败：

- 打开失败时不删除归档记录。

### Delete archived record

输入：`normalizedUrl`

流程：

1. 删除 `archivedTabs[normalizedUrl]`。
2. 重新读取 storage snapshot。

约束：

- 不影响浏览器历史或书签。

## Error and Feedback State

```ts
type FeedbackMessage = {
  id: string
  tone: "error" | "info"
  message: string
  createdAt: string
}
```

规则：

- 操作失败使用非阻塞 feedback。
- feedback 不持久化。
- 同类错误可以合并，避免重复刷屏。

## Open Questions

以下问题进入实现前需要验证 Chrome API 行为：

1. `lastAccessed` 在目标 Chrome 版本中是否可用且可靠。
2. Side panel 打开状态下，tabs/window 事件是否足以实时刷新，是否还需要手动刷新按钮。
3. 特殊 URL 的 favicon 和 title 是否稳定可读。
