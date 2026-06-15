# MVP 工作拆分

本文档把冻结后的 MVP 范围拆成实现工单。MVP 已完成，本文档保留为实现追溯和回归检查参考；后续功能计划见 [实施计划](./implementation-plan.md)。

## 使用方式

- 每个条目都应能独立提交或独立验证。
- 不把后置功能塞进 MVP 工单。
- 如果某个工单需要新增权限、content script、设置页或批量操作，应先停下来更新范围文档。

## 0. 项目启动

### MVP-0001 创建项目骨架

目标：

创建 Vite + React + TypeScript + MV3 项目骨架。

交付：

- `package.json`
- TypeScript 配置
- Vite 配置
- 基础目录结构
- `dist/` 可构建

验收：

- `typecheck` 通过。
- `build` 通过。

### MVP-0002 初始化 shadcn/ui

目标：

初始化 shadcn/ui，并添加 MVP 首批组件。

交付：

- `components.json`
- `src/components/ui/`
- `src/lib/utils.ts`
- MVP 所需 shadcn 组件

验收：

- `shadcn info` 输出路径符合项目结构。
- 已添加组件可被 side panel 导入。

### MVP-0003 创建最小 MV3 扩展

目标：

创建可加载的 Chrome extension。

交付：

- manifest
- side panel 静态入口
- service worker 静态入口

验收：

- Chrome 可以 Load unpacked。
- side panel 可以打开。
- service worker 可以启动。
- manifest 权限只有 `tabs`、`storage`、`sidePanel`。

## 1. 领域纯函数

### MVP-0101 URL 规范化

目标：

实现规范化 URL：保留 origin、path、query，忽略 fragment。

验收：

- hash 不同视为同一规范化 URL。
- query 不同不视为同一规范化 URL。
- 非法或特殊 URL 有稳定 fallback。

### MVP-0102 特殊 URL 判断

目标：

识别 `chrome://`、扩展页面、本地文件等特殊 URL。

验收：

- 特殊 URL 可进入展示流。
- 特殊 URL 被标记为不可归档。

### MVP-0103 重复组计算

目标：

按规范化 URL 计算重复组。

验收：

- 只有打开中的标签实例参与重复组。
- 同一规范化 URL 打开实例数大于 1 时显示重复。
- 归档项不参与重复组。

### MVP-0104 分组与排序

目标：

按完整 host 分组，并按总项数倒序、host 字母序排序。

验收：

- 不同子域名分属不同组。
- 组内打开项在归档项前。
- 归档项按归档时间倒序。

### MVP-0105 搜索与状态过滤

目标：

实现搜索和单一状态过滤。

验收：

- 搜索匹配标题、完整域名、规范化 URL。
- 搜索覆盖打开项和归档项。
- 支持全部、打开、归档、重复。
- 搜索可叠加当前状态过滤。

## 2. Storage

### MVP-0201 Storage 默认状态和 migration

目标：

实现 `chrome.storage.local` root 读取、默认值和 `version: 1` migration。

验收：

- 空 storage 返回默认状态。
- 不支持版本时给出可恢复错误。

### MVP-0202 归档记录读写

目标：

实现归档记录写入、删除、读取。

验收：

- 以规范化 URL 作为 key。
- 保存原始 URL、标题、favicon、hostname、归档时间、归档次数、来源窗口。
- 删除只移除扩展状态。

### MVP-0203 分组折叠状态读写

目标：

实现 `groupViewState` 持久化。

验收：

- 用户手动折叠/展开可保存。
- 搜索或过滤导致的临时展开不保存。

## 3. Service Worker

### MVP-0301 Chrome snapshot 读取

目标：

读取普通窗口和标签页，排除隐身窗口。

验收：

- 多普通窗口标签页都能读取。
- 隐身窗口不进入 snapshot。
- 为窗口生成 `W1`、`W2` 标签。

### MVP-0302 `state:get`

目标：

side panel 可请求完整 domain state。

验收：

- 返回打开实例、归档项、重复组、分组、计数。
- 失败时返回明确错误。

### MVP-0303 tabs/windows/storage 事件刷新

目标：

监听 MVP 需要的 Chrome 事件，并触发 debounced snapshot refresh。

验收：

- 创建、关闭、激活、移动标签页后 side panel 可刷新。
- 连续事件被 debounce 合并。

### MVP-0304 跳转命令

目标：

实现 `tab:jump`。

验收：

- 激活目标 tab。
- 聚焦目标窗口。
- 失败时显示非阻塞错误。

### MVP-0305 关闭命令

目标：

实现 `tab:close`。

验收：

- 关闭对应 tab。
- 不创建归档记录。
- 不提供撤销。

### MVP-0306 归档命令

目标：

实现 `tab:archive`。

验收：

- 特殊 URL 拒绝归档。
- 关闭普通网页 tab。
- 同一规范化 URL 仍有其他打开实例时，不创建归档状态。
- 没有其他打开实例时，写入归档记录。

### MVP-0307 恢复和删除归档命令

目标：

实现 `archive:restore` 和 `archive:delete`。

验收：

- 恢复使用原始 URL。
- 恢复成功后删除归档状态。
- 打开失败不删除归档记录。
- 删除归档记录不影响浏览器历史或书签。

## 4. Side Panel UI

### MVP-0401 静态 UI shell

目标：

实现侧边栏布局 shell。

验收：

- 顶部 header、搜索、过滤、列表区域结构存在。
- 列表区域独立滚动。

### MVP-0402 标签行和分组展示

目标：

展示分组、数量摘要、标签实例行、归档行。

验收：

- 标题优先。
- 组级 favicon 显示。
- URL 紧凑显示。
- 窗口标识显示。
- 状态轨道显示。
- 当前 active tab 高亮并锚定到可视区域。

### MVP-0403 搜索和过滤 UI

目标：

实现搜索框和状态过滤。

验收：

- 搜索词不持久化。
- 状态过滤最多会话内保留。
- 搜索/过滤激活时命中分组临时展开。

### MVP-0404 行内操作

目标：

实现行点击跳转/恢复，以及关闭、归档、删除归档记录按钮。

验收：

- 按钮默认常显。
- 每个按钮有可读 label。
- 操作失败显示非阻塞错误。

### MVP-0405 loading、empty、error

目标：

实现最小加载、空状态和错误状态。

验收：

- 首次加载有 skeleton。
- 无普通窗口标签、搜索无结果、无归档项有空状态。
- API 失败和操作失败有清晰错误文案。

### MVP-0406 基础无障碍

目标：

保证 MVP 基础可访问。

验收：

- 主要操作可键盘聚焦。
- 操作按钮有可读标签。
- 重复、归档、错误、空状态不只依赖颜色表达。

## 5. 验证

### MVP-0501 单元测试覆盖

目标：

覆盖核心纯逻辑和 storage migration。

验收：

- URL 规范化测试。
- 特殊 URL 测试。
- 重复组测试。
- 分组排序测试。
- 搜索过滤测试。
- storage 默认值和 migration 测试。

### MVP-0502 手动验证清单

目标：

按 [测试计划](./test-plan.md) 完成 MVP 手动验证。

验收：

- 加载扩展。
- 普通窗口与隐身窗口。
- 默认完整 host 分组。
- 重复识别。
- 跳转。
- 单个关闭。
- 单个归档。
- 恢复归档。
- 删除归档记录。
- 搜索过滤。
- 空状态和错误状态。

## 后置 Backlog

以下不进入 MVP：

- 自定义分组配置。
- 侧边栏置顶。
- 批量操作。
- 新页面重复提示。
- 休眠标签页识别。
- 休眠自动归档。
- 内存指标。
- 设置页。
