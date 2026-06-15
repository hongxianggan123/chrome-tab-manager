# 构建与开发工具方案

本文档定义当前项目的构建、脚本和本地验证方案。

## 目标

构建方案需要支持：

- Chrome Extension Manifest V3。
- Vite + React + TypeScript。
- 一个 side panel 页面。
- 一个 MV3 module service worker。
- shadcn/ui 和 Tailwind 样式。
- 可加载到 Chrome 开发者模式的 `dist/` 产物。
- 纯逻辑单元测试。

## Package Manager

当前使用 npm 和 `package-lock.json`。后续 shadcn CLI、测试和构建命令默认使用 npm。

## 构建产物

Vite 构建目标：

```text
dist/
├── manifest.json
├── side-panel.html
├── assets/
│   ├── side-panel.js
│   ├── side-panel.css
│   └── normalize-url.js
└── service-worker.js
```

实际文件名以当前 Vite 配置输出为准，manifest 必须引用正确的 service worker 和 side panel 入口。

## Entry Points

MVP 需要两个主要入口：

### Side Panel

```text
src/side-panel/main.tsx
```

职责：

- 挂载 React App。
- 引入全局样式。
- 渲染 side panel UI。

### Service Worker

```text
src/extension/service-worker.ts
```

职责：

- 监听 Chrome 事件。
- 处理 side panel message。
- 调用 worker/domain/storage 模块。

service worker 必须以 MV3 module worker 形式输出。

## Manifest 生成

推荐实现方式：

- MVP 可以先使用静态 `manifest.json` 模板。
- 如果 Vite 输出文件名带 hash，再引入 manifest 生成脚本或 Vite 插件处理引用。

manifest 必须遵守 [Chrome 权限最小集](./permissions-plan.md)：

```json
{
  "permissions": ["tabs", "storage", "sidePanel"]
}
```

MVP 不添加：

- `host_permissions`
- `content_scripts`
- `action.default_popup`
- `options_page`
- `permissions` 中的 `history`、`scripting`、`alarms`、`processes`、`notifications`

## Scripts

当前脚本：

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

说明：

- `build` 必须先跑类型检查，再生成 extension 产物。
- Chrome 加载 unpacked extension 使用 `dist/`。

## TypeScript

当前约束：

- 开启 `strict`。
- Chrome API 类型使用官方类型包或浏览器扩展类型包，具体实现阶段根据工具链选择。
- `domain`、`storage`、`worker` 的类型应可在测试中直接导入。

边界：

- 不用 `any` 穿透 Chrome API 响应。
- 对 Chrome API 可能缺失的字段做显式 fallback。

## Testing

测试工具：

- `vitest`：单元测试 domain/storage/worker 纯逻辑。
- 不把浏览器 E2E 测试写入仓库。UI 行为可用本地 Playwright CLI 临时验证，真实扩展行为仍按 [测试计划](./test-plan.md) 手动验证。

第一批自动化测试：

- URL 规范化。
- 特殊 URL 判断。
- 重复组计算。
- active/archived 互斥。
- 分组排序。
- 搜索与状态过滤。
- storage migration 默认值。

## shadcn/ui

shadcn/ui 已初始化。新增组件前运行 `shadcn info` 或查看 `components.json`，确认 alias、icon library、组件路径和 Tailwind 版本。

## Tailwind 与主题

状态颜色映射为 CSS 变量，避免散落 raw color。

建议：

- shadcn 默认语义 token 用于普通背景、文本、边框。
- 项目自定义 token 只用于状态轨道和少量状态标识。
- 状态轨道 token 见 [shadcn/ui 组件计划](./shadcn-component-plan.md)。

## Local Verification

真实扩展本地验证：

1. 运行 build。
2. 打开 Chrome `chrome://extensions`。
3. 开启 Developer mode。
4. Load unpacked。
5. 选择 `dist/`。
6. 打开扩展 side panel。
7. 修改后点击扩展卡片上的 reload。
8. 打开 side panel。
9. 确认 service worker active。
10. 确认 manifest 权限只有当前功能需要的权限。

## Development Loop

建议开发循环：

1. 修改代码。
2. 运行 `typecheck`。
3. 运行相关 `test`。
4. 运行 `build`。
5. 在 Chrome 扩展页 reload unpacked extension。
6. 打开 side panel 手动验证。

如果后续需要更快反馈，再评估 extension dev server 或自动 reload。MVP 初始阶段先保持简单。

## 不做

当前工具链不做：

- 自动发布流程。
- Chrome Web Store 打包。
- E2E 浏览器自动化。
- 多浏览器构建。
- content script 热更新。
- 复杂 monorepo 构建。
