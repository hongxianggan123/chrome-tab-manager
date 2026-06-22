# 风险清单

本文档记录 MVP 实现阶段需要主动管理的风险。风险不是阻塞项，但需要在实现和测试中被验证。

## R1: `tabs` 权限带来较强隐私提示

风险：

`tabs` 权限可能让用户看到“读取浏览历史”相关提示。虽然产品不记录完整浏览历史，但用户可能误解。

影响：

- 安装转化下降。
- Chrome Web Store 审核时需要清晰解释。

缓解：

- README、商店说明和权限说明明确：只读取当前打开标签页用于本地管理。
- 不申请 `history`。
- `host_permissions` 和 `scripting` 只在用户开启页面浮层后作为可选能力使用，不作为默认侧边栏模式的必需权限。
- 不上传数据。

相关文档：

- [Chrome 权限最小集](./permissions-plan.md)

## R2: Chrome tabs/windows 事件顺序复杂

风险：

连续打开、关闭、移动、归档标签页时，tabs/windows 事件可能密集且顺序复杂。

影响：

- UI 短暂显示过期状态。
- 归档和关闭操作可能遇到 tab 已不存在。

缓解：

- 使用 snapshot refresh，而不是复杂增量状态。
- 操作失败时重新读取状态。
- 对 Chrome 事件做 debounce。

相关文档：

- [Service Worker Flow](./service-worker-flow.md)
- [Runtime State Model](./runtime-state-model.md)

## R3: service worker 被挂起导致运行时状态丢失

风险：

MV3 service worker 会被 Chrome 挂起，不能依赖长期内存状态。

影响：

- side panel 重新打开时状态可能需要重建。
- 待处理重复提示可能在 service worker 挂起后重复弹出或丢失。
- debounce/dirty flag 丢失。

缓解：

- 所有长期状态来自 Chrome snapshot 和 `chrome.storage.local`。
- 待处理重复提示和已处理 tabId 集合保存在 `chrome.storage.session`，只保留当前浏览器会话。
- service worker 内存只保存 debounce、端口连接等可丢弃的临时状态。

相关文档：

- [Service Worker Flow](./service-worker-flow.md)

## R4: 归档写入与 tab 关闭之间出现失败

风险：

归档操作包含关闭 tab 和写 storage 两步。中间失败可能导致用户预期不一致。

影响：

- tab 已关闭但归档记录未写入。
- 用户认为页面丢失。

缓解：

- 关闭失败时不写归档。
- storage 写入失败时显示明确错误。
- 实现时优先考虑先准备归档 payload，再关闭 tab，再写 storage。
- 该场景必须加入手动测试。

相关文档：

- [Runtime State Model](./runtime-state-model.md)
- [测试计划](./test-plan.md)

## R5: 同一规范化 URL 的 active/archived 冲突

风险：

事件延迟或恢复流程可能导致同一规范化 URL 同时存在打开实例和归档记录。

影响：

- UI 重复显示同一 URL。
- 归档状态语义被破坏。

缓解：

- 派生 inventory 时 active 优先，归档项不进入可见列表。
- 恢复归档成功后删除归档记录。
- 后续可增加冲突清理任务，但 MVP 不在读取时激进删除。

相关文档：

- [Runtime State Model](./runtime-state-model.md)

## R6: 特殊 URL 操作能力不一致

风险：

`chrome://`、扩展页面、本地文件等特殊 URL 的 title、favicon、关闭、跳转行为可能不完全一致。

影响：

- 某些行无法归档或显示异常。
- 用户误以为功能坏了。

缓解：

- 特殊 URL 可展示、可跳转、可关闭，不允许归档。
- 特殊 URL 需要文字徽标。
- favicon 缺失时显示通用占位图标。

相关文档：

- [MVP 范围](./mvp-scope.md)
- [UI 组件规格](./ui-component-spec.md)

## R7: 侧边栏宽度导致动作按钮拥挤

风险：

Chrome side panel 宽度有限，行内标题、URL、窗口标识、徽标和操作按钮可能拥挤。

影响：

- 文本截断过多。
- 操作按钮误触。
- 可访问性下降。

缓解：

- 标题优先，URL 紧凑展示。
- 行内按钮默认常显，但点击区域至少 28px。
- 完整 URL 查看入口已从当前侧边栏 UI 暂时移除，后续需要单独设计，避免 tooltip 或固定底栏占用窄侧边栏空间。
- 实现后用 320px 宽度做视觉检查。

相关文档：

- [UI 原型](./ui-prototype.md)
- [UI 组件规格](./ui-component-spec.md)

## R8: shadcn 组件与高密度列表需求不完全匹配

风险：

shadcn 默认组件偏通用，直接套用可能导致列表过高、间距过大。

影响：

- 侧边栏一屏显示标签过少。
- 工具型体验变慢。

缓解：

- 使用 shadcn 基础组件拼装，不使用 Card 包裹每行。
- className 只做布局密度调整，不硬覆盖组件颜色和字体。
- 状态轨道作为项目自定义结构。

相关文档：

- [shadcn/ui 组件计划](./shadcn-component-plan.md)

## R9: 搜索和过滤空状态误导用户

风险：

搜索词或过滤状态保留时，用户可能以为标签页消失。

影响：

- 用户不信任侧边栏列表。

缓解：

- 搜索词不持久化。
- 状态过滤最多会话内保留。
- 空状态文案说明可清空搜索或过滤。

相关文档：

- [MVP 范围](./mvp-scope.md)
- [UI 组件规格](./ui-component-spec.md)

## R10: 后置功能无意进入 MVP

风险：

自定义分组、置顶、批量操作、重复提示、休眠自动归档、内存指标都很容易在实现时顺手加入。

影响：

- MVP 变大。
- 权限和 UI 复杂度上升。
- 第一轮验证被拖慢。

缓解：

- MVP 范围已冻结。
- AGENTS.md 明确新增能力默认进入 MVP 之后。
- 任何范围变更先更新文档。

相关文档：

- [MVP 范围](./mvp-scope.md)
- [AGENTS.md](../AGENTS.md)

## R11: 页面浮层扩大权限和页面兼容面

风险：

重复提示页面浮层需要向普通网页注入 UI，可能引入 `scripting` 和 host access 授权，也可能与网页布局、样式、SPA 导航或受限页面发生兼容问题。

影响：

- 用户看到更敏感的 `<all_urls>` 可选站点访问授权提示。
- Chrome Web Store 审核需要解释页面注入用途。
- 浮层可能遮挡网页内容或被网页样式影响。
- `chrome://`、Chrome Web Store、扩展页面、本地文件等页面无法稳定注入。

缓解：

- 侧边栏展示作为默认模式，不需要页面注入权限。
- 页面浮层必须由用户主动开启，并通过 `<all_urls>` 可选站点访问授权。
- 页面浮层不读取网页正文、不扫描 DOM、不保存页面内容、不上传数据。
- 页面浮层使用独立命名空间和 Shadow DOM，避免污染网页样式。
- 注入失败、未授权或页面不可注入时降级为侧边栏待处理提示和 action badge/title。
- 测试计划覆盖授权拒绝、授权撤销、受限页面和普通网页展示。

相关文档：

- [产品设计](./product-design.md)
- [Chrome 权限最小集](./permissions-plan.md)
- [UI 组件规格](./ui-component-spec.md)
