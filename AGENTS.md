# AGENTS.md

本文档给后续在本项目中工作的 Codex 或其他代码代理使用。项目已经完成 MVP，准备进入 MVP 后的功能阶段。

## 项目目标

本项目是一个 Chrome 标签页管理扩展，目标是帮助用户理解、整理和减少过多标签页，并处理重复标签页与休眠标签页带来的管理和性能问题。

## 当前阶段

当前阶段维护已完成的 MVP 代码，并推进 MVP 后置能力：

- 领域术语：[CONTEXT.md](./CONTEXT.md)
- MVP 范围：[docs/mvp-scope.md](./docs/mvp-scope.md)
- UI 原型：[docs/ui-prototype.md](./docs/ui-prototype.md)
- UI 组件规格：[docs/ui-component-spec.md](./docs/ui-component-spec.md)
- shadcn/ui 组件计划：[docs/shadcn-component-plan.md](./docs/shadcn-component-plan.md)
- 产品设计：[docs/product-design.md](./docs/product-design.md)
- 技术方案：[docs/technical-plan.md](./docs/technical-plan.md)
- Storage Schema：[docs/storage-schema.md](./docs/storage-schema.md)
- Runtime State Model：[docs/runtime-state-model.md](./docs/runtime-state-model.md)
- Service Worker Flow：[docs/service-worker-flow.md](./docs/service-worker-flow.md)
- Chrome 权限最小集：[docs/permissions-plan.md](./docs/permissions-plan.md)
- 项目结构方案：[docs/project-structure.md](./docs/project-structure.md)
- 构建与开发工具方案：[docs/build-tooling-plan.md](./docs/build-tooling-plan.md)
- 风险清单：[docs/risk-register.md](./docs/risk-register.md)
- 隐私与商店说明草案：[docs/privacy-and-store-copy.md](./docs/privacy-and-store-copy.md)
- MVP 工作拆分：[docs/mvp-work-breakdown.md](./docs/mvp-work-breakdown.md)
- 实施计划：[docs/implementation-plan.md](./docs/implementation-plan.md)
- 测试计划：[docs/test-plan.md](./docs/test-plan.md)
- MVP 完成检查：[docs/mvp-completion.md](./docs/mvp-completion.md)
- ADRs：[docs/adr/](./docs/adr/)

MVP 范围已经冻结且当前实现已完成 MVP 验收。后续新增能力默认进入下一阶段，不再回填到 MVP，除非用户明确要求重开 MVP 范围。

## 工作规则

- 所有项目文档优先使用中文。
- 修改产品概念前，先检查 [CONTEXT.md](./CONTEXT.md) 中已有术语，避免同一概念出现多个名字。
- `CONTEXT.md` 只记录领域语言，不记录实现细节、待办事项或技术决策。
- 产品行为和边界记录到 [docs/product-design.md](./docs/product-design.md)。
- 做 MVP 回归或修复时，优先以 [docs/mvp-scope.md](./docs/mvp-scope.md) 控制最小可用版本范围。
- UI 设计和侧边栏原型记录到 [docs/ui-prototype.md](./docs/ui-prototype.md)，组件级行为记录到 [docs/ui-component-spec.md](./docs/ui-component-spec.md)，shadcn/ui 组件映射记录到 [docs/shadcn-component-plan.md](./docs/shadcn-component-plan.md)。
- 技术选型、架构、状态模型和 Chrome API 相关方案记录到 [docs/technical-plan.md](./docs/technical-plan.md)。
- MVP 持久化数据结构记录到 [docs/storage-schema.md](./docs/storage-schema.md)。
- MVP 运行时状态和派生流程记录到 [docs/runtime-state-model.md](./docs/runtime-state-model.md)。
- MVP service worker 事件流和消息协议记录到 [docs/service-worker-flow.md](./docs/service-worker-flow.md)。
- MVP Chrome 权限策略记录到 [docs/permissions-plan.md](./docs/permissions-plan.md)。
- 实现阶段项目目录和模块边界记录到 [docs/project-structure.md](./docs/project-structure.md)。
- 构建、脚本、测试工具和本地验证方案记录到 [docs/build-tooling-plan.md](./docs/build-tooling-plan.md)。
- 实现风险和缓解措施记录到 [docs/risk-register.md](./docs/risk-register.md)。
- 隐私、权限说明和未来商店文案记录到 [docs/privacy-and-store-copy.md](./docs/privacy-and-store-copy.md)。
- MVP 工单级实现拆分记录到 [docs/mvp-work-breakdown.md](./docs/mvp-work-breakdown.md)。
- 分阶段执行计划和验收标准记录到 [docs/implementation-plan.md](./docs/implementation-plan.md)。
- MVP 测试场景和单元测试重点记录到 [docs/test-plan.md](./docs/test-plan.md)。
- MVP 完成状态、已验证项和下一阶段入口记录到 [docs/mvp-completion.md](./docs/mvp-completion.md)。
- 难以反转、未来读者会疑惑、且来自真实取舍的技术或产品边界决策记录到 [docs/adr/](./docs/adr/)。
- 如果发现产品设计、技术方案和实施计划之间冲突，先修正文档一致性，再进入后续工作。

## Tailwind CSS 规则

- 侧边栏组件级样式优先写 Tailwind utility class，包括布局、间距、字号、状态、hover/focus、响应式和 data attribute 状态。
- `src/side-panel/styles.css` 只保留 Tailwind、shadcn、字体 import，theme token 和 base reset。
- 不再为 side panel 组件新增大段全局 CSS class；如果确实需要全局 CSS，先确认 Tailwind arbitrary value 或组件拆分不能合理解决。
- 继续使用 shadcn/ui 组件 variants 和语义 token；不要为了局部视觉效果修改 `src/components/ui/` 生成组件源码。
- 复杂状态样式可以使用 Tailwind arbitrary values，例如 `color-mix(...)`、自定义 grid track、状态轨道 gradient，但要保留在对应组件附近，避免散落到全局样式表。
- 新增或调整样式后，至少运行 `npm run typecheck` 和 `npm run build`；涉及视觉变化时用本地 side panel 页面做窄宽度回归。

## 已确认的核心边界

- 第一版只管理单个 Chrome profile 中的普通窗口。
- 不管理隐身窗口。
- 不做跨设备同步。
- 不记录完整浏览历史。
- 归档是 URL 级状态切换，不是收藏库，也不是浏览器会话恢复。
- 关闭和归档是两个不同动作。
- 侧边栏主列表按标签实例展示，归档项按标签记录展示。
- 侧边栏置顶是扩展自己的 URL 级置顶，不改变 Chrome 原生 pinned tab。
- 休眠自动归档默认关闭，用户主动开启后才执行。

## 当前实现状态

- MVP 已完成：标签清单、重复识别、跳转、关闭、归档、恢复、删除归档、搜索过滤、分组折叠、基础状态反馈和基础无障碍均已落地。
- 当前页会在列表中高亮，并在 active tab 变化时自动锚定到可视区域。
- 完整 URL 使用底部固定 URL inspector 展示，不再依赖 tooltip。
- favicon 当前放在分组标题中展示，同 host 共用组级 icon。
- 组内打开项按稳定窗口和 tab index 排序，不使用最近激活时间排序，避免点击后列表跳变。

## 进入下一阶段前

开始实现 MVP 后置能力前，先确认：

1. 已阅读 [docs/mvp-completion.md](./docs/mvp-completion.md)，不要重复实现已经完成的 MVP 能力。
2. 新功能属于 [docs/implementation-plan.md](./docs/implementation-plan.md) 中的下一阶段，或用户明确调整优先级。
3. 如果新增权限、设置页、content script、options page 或后台周期任务，先更新相关方案文档和风险清单。
4. 每个阶段完成后补充对应验证记录。
