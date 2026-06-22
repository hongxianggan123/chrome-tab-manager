# Storage Schema

本文档定义当前写入 `chrome.storage.local` 的长期数据结构，以及 MVP 后置功能使用的 `chrome.storage.session` 会话状态边界。

## 原则

- 只持久化扩展必须保留的状态。
- 不持久化完整浏览历史。
- 不持久化搜索词。
- 不使用 `chrome.storage.sync`。
- Chrome tab id 只作为运行时身份，不作为长期身份键。
- 长期身份键使用规范化 URL。
- 会话内提示状态使用 `chrome.storage.session`，不写入 `chrome.storage.local`。

## Namespace

MVP 使用单一顶层对象：

```ts
type StorageRoot = {
  version: 1
  archivedTabs: Record<NormalizedUrl, ArchivedTabRecord>
  groupViewState: Record<GroupKey, GroupViewState>
  duplicatePromptSettings?: DuplicatePromptSettings
}
```

说明：

- `version` 用于未来 schema migration。
- `archivedTabs` 保存归档状态。
- `groupViewState` 保存普通分组折叠状态。
- `duplicatePromptSettings` 保存重复提示展示方式；MVP 之后新增，旧 storage 缺失时使用默认值。

## 类型定义

```ts
type NormalizedUrl = string
type OriginalUrl = string
type Hostname = string
type GroupKey = string
```

### ArchivedTabRecord

```ts
type ArchivedTabRecord = {
  normalizedUrl: NormalizedUrl
  originalUrl: OriginalUrl
  title: string
  faviconUrl?: string
  hostname: Hostname
  archivedAt: string
  archiveCount: number
  sourceWindow?: SourceWindowSnapshot
}
```

字段说明：

- `normalizedUrl`：归档记录身份键。
- `originalUrl`：恢复时打开的 URL，保留 hash 等原始信息。
- `title`：最后归档实例的标题。
- `faviconUrl`：最后归档实例的 favicon URL。
- `hostname`：用于完整 host 分组。
- `archivedAt`：最近归档时间，ISO 8601 字符串。
- `archiveCount`：同一规范化 URL 被归档的次数。
- `sourceWindow`：最后来源窗口，仅作历史上下文展示，不作为恢复目标。

### SourceWindowSnapshot

```ts
type SourceWindowSnapshot = {
  windowId: number
  label: string
}
```

说明：

- `windowId` 是归档时的 Chrome window id，只用于展示历史来源。
- `label` 是 UI 展示用窗口标识，例如 `W2`。
- 恢复归档项时不强制使用该窗口。

### GroupViewState

```ts
type GroupViewState = {
  collapsed: boolean
  updatedAt: string
}
```

字段说明：

- `collapsed`：用户是否折叠该分组。
- `updatedAt`：最后更新时间，便于未来清理无效分组状态。

### DuplicatePromptSettings

```ts
type DuplicatePromptSettings = {
  displayMode: "sidePanel" | "pageOverlay"
  updatedAt: string
}
```

字段说明：

- `displayMode`：重复提示展示方式。默认是 `sidePanel`；`pageOverlay` 只有在用户开启并完成页面注入授权后才实际展示页面浮层。
- `updatedAt`：最后更新时间，便于未来排查设置迁移。

## GroupKey

MVP 只支持完整 host 分组，因此 `GroupKey` 使用：

```text
host:{hostname}
```

示例：

```text
host:docs.google.com
host:github.com
host:chrome
```

特殊 URL 需要稳定的分组 key。建议按 URL scheme 或内部页面类型映射，例如：

```text
host:chrome
host:file
host:extension
```

## 写入时机

### 归档标签页

归档普通网页标签实例时：

1. 计算规范化 URL。
2. 检查同一规范化 URL 是否还有其他打开实例。
3. 如果还有其他打开实例，只关闭当前实例，不写入 `archivedTabs`。
4. 如果没有其他打开实例，写入或更新 `archivedTabs[normalizedUrl]`。

更新规则：

- `originalUrl` 使用最后被归档实例的原始 URL。
- `title` 和 `faviconUrl` 使用最后被归档实例的显示信息。
- `archivedAt` 更新为当前时间。
- `archiveCount` 在已有记录上递增；新记录从 `1` 开始。
- `sourceWindow` 使用最后被归档实例所在窗口。

### 恢复归档项

打开归档项成功后：

1. 使用 `originalUrl` 在当前普通窗口打开。
2. 删除 `archivedTabs[normalizedUrl]`。

如果打开失败，不删除归档记录，并在 UI 中显示非阻塞错误提示。

### 删除归档记录

删除归档记录时：

1. 删除 `archivedTabs[normalizedUrl]`。
2. 不影响浏览器历史、书签或网页数据。

### 折叠分组

用户手动折叠或展开分组时：

1. 写入 `groupViewState[groupKey].collapsed`。
2. 更新 `updatedAt`。

搜索或过滤导致的临时展开不写入 storage。

### 重复提示展示方式

用户切换重复提示展示方式时：

1. 写入 `duplicatePromptSettings.displayMode`。
2. 更新 `updatedAt`。
3. 页面浮层所需的可选页面授权由 Chrome 权限系统管理，不复制保存到 storage。

如果用户选择页面浮层但授权被拒绝或当前页面不可注入，运行时降级为侧边栏待处理提示，不改写用户的展示方式偏好。如果用户之后关闭或撤销页面浮层授权，扩展把 `displayMode` 自动切回 `sidePanel`，并显示一次非阻塞提示。

## Session State

MVP 后置重复提示使用 `chrome.storage.session` 保存当前浏览器会话内的临时提示状态：

```ts
type SessionState = {
  duplicatePrompt?: DuplicatePromptSessionState
  handledDuplicatePromptTabIds?: number[]
}

type DuplicatePromptSessionState = {
  newTabId: number
  normalizedUrl: NormalizedUrl
  originalUrl: OriginalUrl
  title: string
  hostname: Hostname
  defaultTargetTabId: number
  defaultTargetWindowId: number
  createdAt: string
  displaySurface: "sidePanel" | "pageOverlay" | "pending"
}
```

说明：

- `duplicatePrompt` 最多保存最近一条待处理重复提示。
- `handledDuplicatePromptTabIds` 保存当前会话内已处理或自动关闭的重复提示 tabId，避免 service worker 挂起恢复后对同一个标签实例重复提示。
- `chrome.storage.session` 随浏览器会话结束而清理，不跨浏览器重启保存。
- 这些字段不进入 `chrome.storage.local`，也不参与长期数据导出或隐私承诺中的长期保存范围。

## 不持久化的数据

MVP 不持久化：

- 搜索词。
- 当前状态过滤。
- loading/error 状态。
- toast 或非阻塞错误提示。
- 待处理重复提示的长期记录。
- 页面浮层运行时挂载状态。
- 当前打开标签实例列表。
- Chrome tab id 到标签记录的长期映射。
- favicon 图片内容。
- 页面内容、滚动位置、表单状态、登录态。

## Migration

MVP 初始版本为 `version: 1`。

读取 storage 时：

1. 如果没有 root 对象，使用默认空状态。
2. 如果 `version` 不是支持版本，进入 migration 流程。
3. migration 失败时，不应破坏当前浏览器标签页；UI 应显示可恢复错误。
