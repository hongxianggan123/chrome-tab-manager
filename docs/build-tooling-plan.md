# 构建与开发工具方案

本文档定义进入实现阶段后的构建、脚本和本地验证方案。当前只记录方案，不创建 `package.json` 或配置文件。

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

实现阶段先检查用户环境和项目初始化工具，再确定 package manager。

推荐顺序：

1. 如果用户指定 package manager，按用户指定。
2. 如果项目初始化工具默认生成 npm 配置，则先使用 npm，减少额外前置依赖。
3. 如果用户希望更快安装和锁定依赖，再切换 pnpm。

确定后，所有 shadcn CLI 命令必须使用同一个 package runner。

## 构建产物

Vite 构建目标：

```text
dist/
├── manifest.json
├── side-panel.html
├── assets/
│   ├── side-panel-*.js
│   ├── side-panel-*.css
│   └── service-worker-*.js
└── icons/
```

实际文件名可以由 Vite hash 决定，但 manifest 必须引用正确的 service worker 和 side panel 入口。

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

实现阶段建议脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

说明：

- 如果初始阶段不引入 ESLint/Prettier，可以先保留 `typecheck`、`test`、`build`。
- `build` 必须先跑类型检查，再生成 extension 产物。
- Chrome 加载 unpacked extension 使用 `dist/`。

## TypeScript

建议：

- 开启 `strict`。
- Chrome API 类型使用官方类型包或浏览器扩展类型包，具体实现阶段根据工具链选择。
- `domain`、`storage`、`worker` 的类型应可在测试中直接导入。

边界：

- 不用 `any` 穿透 Chrome API 响应。
- 对 Chrome API 可能缺失的字段做显式 fallback。

## Testing

测试工具建议：

- `vitest`：单元测试 domain/storage/worker 纯逻辑。
- 不在 MVP 初始阶段引入浏览器 E2E，先用 [测试计划](./test-plan.md) 手动验证 Chrome 行为。

第一批自动化测试：

- URL 规范化。
- 特殊 URL 判断。
- 重复组计算。
- active/archived 互斥。
- 分组排序。
- 搜索与状态过滤。
- storage migration 默认值。

## shadcn/ui

进入实现阶段后：

1. 初始化 React/Vite 项目。
2. 初始化 shadcn/ui。
3. 运行 `shadcn info` 确认 alias、icon library、组件路径、Tailwind 版本。
4. 按 [shadcn/ui 组件计划](./shadcn-component-plan.md) 添加 MVP 首批组件。

不要在未初始化项目时运行 shadcn CLI。

## Tailwind 与主题

实现阶段应把 UI 原型里的状态颜色映射为 CSS 变量，而不是直接散落 raw color。

建议：

- shadcn 默认语义 token 用于普通背景、文本、边框。
- 项目自定义 token 只用于状态轨道和少量状态标识。
- 状态轨道 token 见 [shadcn/ui 组件计划](./shadcn-component-plan.md)。

## Local Verification

阶段 0 最小验证：

1. 运行 build。
2. 打开 Chrome `chrome://extensions`。
3. 开启 Developer mode。
4. Load unpacked。
5. 选择 `dist/`。
6. 打开扩展 side panel。
7. 确认 service worker active。
8. 确认 manifest 权限只有 MVP 权限。

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

MVP 初始工具链不做：

- 自动发布流程。
- Chrome Web Store 打包。
- E2E 浏览器自动化。
- 多浏览器构建。
- content script 热更新。
- 复杂 monorepo 构建。

