# Service Worker Flow

本文档定义 MVP 阶段 service worker 的事件流和状态同步方式。当前只记录方案，不编写代码。

## 职责

service worker 负责：

- 监听 Chrome tabs/windows 事件。
- 读取当前普通窗口和标签页 snapshot。
- 读取和写入 `chrome.storage.local`。
- 处理 side panel 发来的命令。
- 向 side panel 返回最新派生状态。
- 在操作失败时返回明确错误。

service worker 不负责：

- 渲染 UI。
- 保存搜索词。
- 保存当前状态过滤。
- 持久化完整浏览历史。
- 管理隐身窗口。

## 通信模型

MVP 使用 request/response 为主，事件推送为辅。

```text
Side Panel
   │
   │  request state / command
   ▼
Service Worker
   │
   │  Chrome API + Storage
   ▼
Derived State
   │
   │  response
   ▼
Side Panel
```

side panel 打开后主动请求状态。Chrome 事件发生时，service worker 可以通知已连接的 side panel 刷新；如果 side panel 未连接，只记录运行时 dirty flag，不持久化 UI 状态。

## Side Panel Messages

### `state:get`

用途：side panel 首次打开或主动刷新时获取完整状态。

输入：

```ts
type GetStateMessage = {
  type: "state:get"
}
```

输出：

```ts
type GetStateResponse = {
  ok: true
  state: DomainStatePayload
} | {
  ok: false
  error: WorkerError
}
```

### `tab:jump`

用途：跳转到打开中的标签实例。

输入：

```ts
type JumpTabMessage = {
  type: "tab:jump"
  tabId: number
  windowId: number
}
```

成功后返回最新状态。

### `tab:close`

用途：关闭打开中的标签实例。

输入：

```ts
type CloseTabMessage = {
  type: "tab:close"
  tabId: number
}
```

约束：

- 不创建归档记录。
- 不提供撤销。
- MVP 不做二次确认。

### `tab:archive`

用途：归档普通网页标签实例。

输入：

```ts
type ArchiveTabMessage = {
  type: "tab:archive"
  tabId: number
}
```

约束：

- 特殊 URL 拒绝归档。
- 如果同一规范化 URL 仍有其他打开实例，不创建归档记录。
- 如果关闭 tab 失败，不写入归档记录。

### `archive:restore`

用途：打开归档记录，并移除归档状态。

输入：

```ts
type RestoreArchiveMessage = {
  type: "archive:restore"
  normalizedUrl: string
}
```

约束：

- 使用归档记录中的 `originalUrl` 打开。
- 当前有普通窗口时在当前普通窗口打开。
- 没有普通窗口时新建普通窗口。
- 打开成功后才删除归档记录。

### `archive:delete`

用途：删除扩展内归档记录。

输入：

```ts
type DeleteArchiveMessage = {
  type: "archive:delete"
  normalizedUrl: string
}
```

约束：

- 不影响浏览器历史或书签。

### `group:setCollapsed`

用途：保存用户手动展开/折叠分组状态。

输入：

```ts
type SetGroupCollapsedMessage = {
  type: "group:setCollapsed"
  groupKey: string
  collapsed: boolean
}
```

约束：

- 只保存用户手动操作。
- 搜索或过滤造成的临时展开不发送该消息。

## Chrome Events

MVP 监听以下事件：

- `chrome.tabs.onCreated`
- `chrome.tabs.onUpdated`
- `chrome.tabs.onRemoved`
- `chrome.tabs.onActivated`
- `chrome.tabs.onAttached`
- `chrome.tabs.onDetached`
- `chrome.tabs.onMoved`
- `chrome.windows.onCreated`
- `chrome.windows.onRemoved`
- `chrome.windows.onFocusChanged`
- `chrome.storage.onChanged`

## Event Handling Strategy

Chrome 事件不直接增量修改复杂 UI 状态。MVP 采用 snapshot refresh：

1. 收到相关 Chrome 事件。
2. 标记 runtime dirty。
3. 如果 side panel 已连接，安排一次 debounced refresh。
4. refresh 时重新读取 Chrome snapshot 和 storage snapshot。
5. 重新派生 DomainState。
6. 通知 side panel 更新。

理由：

- Chrome tabs/windows 事件顺序可能复杂。
- 增量维护容易出现 tab/window 不一致。
- MVP 数据量可控，snapshot refresh 更容易验证。

## Debounce

建议 refresh debounce：100ms 到 250ms。

规则：

- 连续 tabs 事件合并为一次刷新。
- 用户命令成功后立即刷新，不等待 debounce。
- 用户命令失败时返回错误，并按需要刷新当前状态。

## Side Panel Connection

side panel 打开时：

1. 建立 runtime port 或发送 `state:get`。
2. service worker 记录 panel connected。
3. service worker 返回当前派生状态。

side panel 关闭或断开时：

1. service worker 清理 connected panel 引用。
2. 不持久化搜索词、过滤状态、toast 状态。
3. Chrome 事件只标记 dirty，不主动做 UI 推送。

MVP 可先使用 `chrome.runtime.sendMessage` 请求/响应；如果刷新推送体验不足，再升级为 long-lived port。

## State Refresh Pipeline

每次刷新执行：

1. 读取普通窗口。
2. 读取普通窗口 tabs。
3. 生成窗口 label。
4. 转换 active tab instances。
5. 读取 storage root。
6. 合并归档记录。
7. 计算重复组。
8. 构建完整 host 分组。
9. 计算计数。
10. 返回可供 side panel 搜索/过滤的 domain payload。

搜索词和状态过滤留在 side panel 运行时处理，不进入 service worker 持久状态。

## Command Ordering

所有会修改浏览器或 storage 的命令应串行执行。

建议维护一个简单 command queue：

```text
command received
  -> enqueue
  -> execute one at a time
  -> refresh state
  -> respond
```

理由：

- 避免用户连续点击导致关闭和归档同一 tab 的竞态。
- 避免 storage 写入和 tab 关闭顺序交错。

MVP 可以先通过按钮 disabled/loading 防止重复点击；如果实现复杂度可控，再加 worker 内 command queue。

## Error Model

```ts
type WorkerError = {
  code:
    | "tabs_unavailable"
    | "tab_not_found"
    | "window_not_found"
    | "special_url_not_archivable"
    | "archive_not_found"
    | "chrome_api_failed"
    | "storage_failed"
  message: string
}
```

文案要求：

- `message` 可直接给 UI 展示。
- 不返回含糊的“出错了”。
- 内部调试信息可以另放 `debug` 字段，但 UI 不直接展示。

## Operation Flows

### Archive

```text
side panel -> tab:archive(tabId)
worker:
  read latest snapshot
  find tab
  reject if special URL
  compute normalized URL
  count other active instances
  close tab
  if no other active instance:
    write archivedTabs[normalizedUrl]
  refresh state
  return state
```

关键点：

- 关闭失败则不写归档。
- 写 storage 失败时，返回错误并刷新状态。

### Restore

```text
side panel -> archive:restore(normalizedUrl)
worker:
  read archivedTabs[normalizedUrl]
  find current normal window
  create tab with originalUrl
  if create succeeds:
    delete archivedTabs[normalizedUrl]
  refresh state
  return state
```

关键点：

- 打开失败不删除归档记录。
- 不强制回到来源窗口。

### Close

```text
side panel -> tab:close(tabId)
worker:
  close tab
  refresh state
  return state
```

关键点：

- 不写 storage。
- 不创建归档记录。

### Delete Archive

```text
side panel -> archive:delete(normalizedUrl)
worker:
  delete archivedTabs[normalizedUrl]
  refresh state
  return state
```

关键点：

- 只删除扩展状态。

## Recovery

service worker 可能被 Chrome 挂起。MVP 设计必须允许随时重建状态：

- Chrome snapshot 从 Chrome API 重读。
- storage snapshot 从 `chrome.storage.local` 重读。
- domain state 全部派生，不依赖 service worker 内存长期存在。

因此 service worker 内存只保存：

- 当前是否有 side panel 连接。
- debounce timer。
- 临时 dirty flag。
- 短期 command 执行状态。

这些状态丢失后不影响长期数据正确性。

## Open Questions

进入实现阶段前需要验证：

1. Side panel 在目标 Chrome 版本中使用 `sendMessage` 是否足够稳定，还是需要 long-lived port。
2. 连续 tabs 事件下 100ms debounce 是否足够顺滑。
3. `tabs.onUpdated` 对 favicon/title 变化的触发频率是否需要额外节流。
4. 创建新普通窗口恢复归档项时，用户体验是否可接受。

