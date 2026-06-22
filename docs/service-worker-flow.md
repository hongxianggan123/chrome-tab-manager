# Service Worker Flow

本文档定义当前 service worker 的事件流和状态同步方式。

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

### `duplicatePrompt:jump`

用途：处理重复提示中的跳转动作。

输入：

```ts
type DuplicatePromptJumpMessage = {
  type: "duplicatePrompt:jump"
  promptTabId: number
  targetTabId: number
  targetWindowId: number
}
```

约束：

- 先激活目标既有标签页并聚焦窗口。
- 只关闭 `promptTabId` 对应的新重复标签页。
- 操作完成后清理当前重复提示。
- 如果 `promptTabId` 已不存在，只执行跳转和提示清理。

### `duplicatePrompt:keep`

用途：处理重复提示中的保留当前标签页动作。

输入：

```ts
type DuplicatePromptKeepMessage = {
  type: "duplicatePrompt:keep"
  promptTabId: number
}
```

约束：

- 不关闭任何标签页。
- 清理当前重复提示。
- 将 `promptTabId` 标记为当前会话内已处理，后续 refresh 不再为同一标签实例反复提示。

### `duplicatePrompt:viewDuplicates`

用途：处理重复提示中的查看重复动作。

输入：

```ts
type DuplicatePromptViewDuplicatesMessage = {
  type: "duplicatePrompt:viewDuplicates"
  promptTabId: number
  normalizedUrl: string
}
```

约束：

- 清理当前重复提示。
- 如果从页面浮层触发，先在用户手势链路中打开 side panel。
- side panel 打开后切换到重复过滤，清空搜索，并优先定位 `promptTabId` 所在行；如果新重复标签页已不存在，则定位默认目标所在行。
- 将 `promptTabId` 标记为当前会话内已处理，避免查看重复后同一标签实例再次弹出提示。

### `duplicatePrompt:dismiss`

用途：处理倒计时结束或用户关闭重复提示。

输入：

```ts
type DuplicatePromptDismissMessage = {
  type: "duplicatePrompt:dismiss"
  promptTabId: number
}
```

约束：

- 不关闭任何标签页。
- 清理当前重复提示。
- 将 `promptTabId` 标记为当前会话内已处理。

### `duplicatePrompt:setDisplayMode`

用途：保存重复提示展示方式。

输入：

```ts
type DuplicatePromptSetDisplayModeMessage = {
  type: "duplicatePrompt:setDisplayMode"
  displayMode: "sidePanel" | "pageOverlay"
}
```

约束：

- `sidePanel` 不需要页面注入授权。
- `pageOverlay` 需要用户授权页面注入能力；授权失败时保留或回退到 `sidePanel`，并返回非阻塞错误，不影响侧边栏提示。
- 如果检测到页面浮层授权被用户关闭或撤销，自动写回 `sidePanel`，并在下次 side panel 状态响应中带出一次非阻塞提示。

## Session State

重复提示会话状态使用 `chrome.storage.session`：

```ts
type DuplicatePromptSessionState = {
  duplicatePrompt?: DuplicatePromptRuntime
  handledDuplicatePromptTabIds: number[]
}
```

规则：

- `duplicatePrompt` 最多保存最近一条待处理重复提示。
- 新提示产生时覆盖旧提示。
- `handledDuplicatePromptTabIds` 保存用户选择保留、查看重复、倒计时自动关闭等已处理 tabId。
- service worker 重启后从 `chrome.storage.session` 恢复这些状态。
- 浏览器重启后这些状态允许丢失。
- 不写入 `chrome.storage.local`。

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
- 如果 Chrome 事件发生时没有 side panel port，service worker 仍保留 dirty 标记；后续 side panel port 连接时需要安排一次 debounced refresh，补发最新状态。

## Side Panel Connection

side panel 打开时：

1. 发送 `state:get` 获取初始快照。
2. 建立名为 `side-panel` 的 runtime port，接收 `state:changed` 推送。
3. service worker 记录 panel connected。
4. 如果连接前 runtime 已 dirty，service worker 安排一次 debounced refresh 并推送最新派生状态。

side panel 关闭或断开时：

1. service worker 清理 connected panel 引用。
2. side panel 端延迟重连 runtime port，并在重连后重新发送 `state:get`，补齐断开期间可能漏掉的 Chrome 事件。
3. 不持久化搜索词、过滤状态、toast 状态。
4. Chrome 事件在没有 connected panel 时只标记 dirty，不主动做 UI 推送。

MVP 使用 `sendMessage` 做请求/响应，使用 long-lived port 做 side panel 打开期间的推送。由于 Manifest V3 service worker 可能重启或断开 port，side panel 不能假设一次 `connect()` 永久有效。

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

## 当前结论和后续观察

MVP 实现结论：

1. Side panel 主动请求使用 `sendMessage`。
2. Chrome 事件推送使用 long-lived port。
3. 连续 tabs/windows/storage 事件使用 debounce snapshot refresh，当前 debounce 为 150ms。
4. 恢复归档项优先在当前普通窗口打开；没有普通窗口时创建普通窗口。

后续观察项：

- 大量标签页和频繁 favicon/title 更新时，是否需要额外节流。
- service worker 被 Chrome 挂起并恢复后，side panel 重连是否始终能正确刷新状态。
