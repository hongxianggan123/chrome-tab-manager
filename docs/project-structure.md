# 项目结构方案

本文档定义当前项目目录组织和模块边界。

## 目标

项目结构需要支持：

- Chrome Extension Manifest V3。
- Vite + React + TypeScript。
- shadcn/ui 组件源码管理。
- side panel UI 与 service worker 分离。
- domain/storage/runtime 逻辑可测试。
- MVP 范围内不引入多应用或 monorepo 复杂度。

## 当前目录

```text
chrome-tab-manager/
├── AGENTS.md
├── CONTEXT.md
├── README.md
├── docs/
│   ├── implementation-plan.md
│   ├── mvp-completion.md
│   ├── mvp-scope.md
│   ├── permissions-plan.md
│   ├── product-design.md
│   ├── project-structure.md
│   ├── runtime-state-model.md
│   ├── service-worker-flow.md
│   ├── shadcn-component-plan.md
│   ├── storage-schema.md
│   ├── technical-plan.md
│   ├── test-plan.md
│   ├── ui-component-spec.md
│   └── ui-prototype.md
├── public/
│   └── icons/
├── src/
│   ├── extension/
│   │   └── service-worker.ts
│   ├── side-panel/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles.css
│   ├── domain/
│   │   ├── normalize-url.ts
│   │   ├── special-url.ts
│   │   ├── inventory.ts
│   │   ├── grouping.ts
│   │   ├── duplicates.ts
│   │   └── filters.ts
│   ├── storage/
│   │   ├── schema.ts
│   │   ├── local-storage.ts
│   │   └── migrations.ts
│   ├── worker/
│   │   ├── messages.ts
│   │   ├── chrome-snapshot.ts
│   │   ├── mutations.ts
│   │   └── refresh.ts
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   └── utils.ts
├── components.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

- `src/components/ui/` 由 shadcn/ui CLI 管理。
- 产品自定义组件放在 `src/side-panel/components/`，不要混入 shadcn 原始组件目录。
- 可测试纯逻辑放在 `src/domain/`、`src/storage/`、`src/worker/`。

## 目录职责

### `src/extension/`

Chrome extension 入口和 manifest 构建相关文件。

职责：

- 生成或导出 MV3 manifest。
- 指向 service worker 入口。
- 指向 side panel HTML。

不放：

- 领域逻辑。
- UI 组件。
- storage 读写细节。

### `src/side-panel/`

React side panel 应用。

职责：

- 渲染 MVP UI。
- 保存搜索词和当前状态过滤等会话 UI 状态。
- 通过 message API 调用 service worker。
- 展示 loading、empty、error、toast。

不放：

- Chrome API 直接调用逻辑，除非是 UI 必须的轻量 runtime 调用。
- storage schema 定义。
- URL 规范化核心逻辑。

### `src/side-panel/components/`

项目自定义 UI 组件。

当前组件：

- `PanelHeader`
- `SearchBox`
- `StatusFilter`
- `FeedbackRegion`
- `GroupList`
- `GroupSection`
- `GroupHeader`
- `InventoryRow`
- `StateViews`
- `LoadingRows`

这些组件可以组合 shadcn/ui 组件，但不应修改 shadcn 生成组件源码来满足业务需求。

### `src/components/ui/`

shadcn/ui 组件目录。

规则：

- 只放 shadcn CLI 添加的基础 UI 组件。
- 更新组件时使用 shadcn CLI，不手动从 GitHub 拉 raw 文件。
- 不把业务组件放进这里。

### `src/domain/`

纯领域逻辑，不依赖 Chrome API，不依赖 React。

职责：

- URL 规范化。
- 特殊 URL 判断。
- active/archived inventory 合并。
- 重复组计算。
- 完整 host 分组。
- 搜索和状态过滤。
- 计数计算。

这些文件应成为单元测试重点。

### `src/storage/`

`chrome.storage.local` 封装和 schema。

职责：

- 定义 storage 类型。
- 读写 storage root。
- 提供 migration。
- 提供归档记录和分组折叠状态的读写 helper。

不放：

- UI 状态。
- Chrome tabs mutation。

### `src/worker/`

service worker 的业务协调层。

职责：

- 定义 side panel message 类型。
- 读取 Chrome snapshot。
- 处理跳转、关闭、归档、恢复、删除归档。
- 调用 storage helper。
- 调用 domain 纯函数派生 state。
- 处理 refresh debounce。

### `src/lib/`

通用工具。

当前包含：

- `utils.ts`，用于 shadcn `cn()`。
- 非领域、非 Chrome 特定的小工具。

避免把业务规则塞到 `lib`，业务规则应放进 `domain`。

## 文件命名

建议：

- React 组件使用 PascalCase：`InventoryRow.tsx`。
- 非组件模块使用 kebab-case：`normalize-url.ts`。
- 类型可以和模块放在同文件，除非被多处共享。
- 不建立过早的 `types/` 大桶文件。

## Import 边界

允许：

```text
side-panel -> domain
side-panel -> worker/messages types
side-panel -> components/ui
worker -> domain
worker -> storage
storage -> domain types
```

避免：

```text
domain -> React
domain -> Chrome API
domain -> shadcn/ui
storage -> React
components/ui -> side-panel business components
```

核心原则：`domain` 必须是最容易测试、最少依赖的一层。

## 构建产物

Vite 构建需要产出：

- side panel HTML/JS/CSS。
- service worker JS。
- manifest JSON。
- icons。

Vite 配置需要保证：

- service worker 是 MV3 module worker。
- side panel 和 service worker 可以共享 TypeScript domain/storage 代码。
- shadcn CSS variables 进入 side panel 样式入口。

## shadcn 配置

当前结果：

- `components.json` 位于项目根目录。
- UI 组件输出到 `src/components/ui/`。
- `cn()` 位于 `src/lib/utils.ts`。
- 全局 CSS 入口与 Vite/React side panel 样式一致。

实际路径以 `components.json` 和 `shadcn info` 输出为准。不要在未检查项目配置前硬编码导入别名。

## MVP 首批 shadcn 组件

当前已添加或保留的基础组件：

- `button`
- `badge`
- `separator`
- `scroll-area`
- `collapsible`
- `toggle-group`
- `input-group`
- `empty`
- `skeleton`
- `alert`
- `sonner`

`tooltip` 不再作为 MVP 主交互依赖；如果后续确实需要 tooltip，先确认使用场景不会影响窄侧边栏可用性。

## 测试结构

当前测试目录：

```text
src/domain/*.test.ts
src/storage/*.test.ts
src/worker/*.test.ts
```

优先测试：

- URL 规范化。
- 重复组计算。
- active/archived 互斥。
- 分组排序。
- 搜索和状态过滤。
- storage migration。

## 不做

MVP 不做：

- monorepo。
- 多包 workspace。
- 单独设计系统包。
- 后端服务目录。
- content script 目录。
- options page 目录。
- popup page 目录。
