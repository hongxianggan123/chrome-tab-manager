# AGENTS.md

本文档给后续在本项目中工作的 Codex 或其他代码代理使用。项目已经进入 MVP 实现阶段。

## 项目目标

本项目是一个 Chrome 标签页管理扩展，目标是帮助用户理解、整理和减少过多标签页，并处理重复标签页与休眠标签页带来的管理和性能问题。

## 当前阶段

当前阶段维护文档和 MVP 代码：

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
- 实现阶段启动清单：[docs/implementation-readiness.md](./docs/implementation-readiness.md)
- 测试计划：[docs/test-plan.md](./docs/test-plan.md)
- ADRs：[docs/adr/](./docs/adr/)

MVP 范围已经冻结。进入实现阶段时，以 [docs/mvp-scope.md](./docs/mvp-scope.md) 为边界；新增能力默认排到 MVP 之后，除非用户明确要求解冻 MVP。

## 工作规则

- 所有项目文档优先使用中文。
- 修改产品概念前，先检查 [CONTEXT.md](./CONTEXT.md) 中已有术语，避免同一概念出现多个名字。
- `CONTEXT.md` 只记录领域语言，不记录实现细节、待办事项或技术决策。
- 产品行为和边界记录到 [docs/product-design.md](./docs/product-design.md)。
- 进入实现阶段时，优先以 [docs/mvp-scope.md](./docs/mvp-scope.md) 控制最小可用版本范围。
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
- 从文档阶段切换到代码阶段前，先按 [docs/implementation-readiness.md](./docs/implementation-readiness.md) 检查。
- MVP 测试场景和单元测试重点记录到 [docs/test-plan.md](./docs/test-plan.md)。
- 难以反转、未来读者会疑惑、且来自真实取舍的技术或产品边界决策记录到 [docs/adr/](./docs/adr/)。
- 如果发现产品设计、技术方案和实施计划之间冲突，先修正文档一致性，再进入后续工作。

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

## 进入实现阶段前

开始写代码前，先确认：

1. 用户已经明确要求进入实现阶段。
2. 技术方案仍采用 Manifest V3、TypeScript、React、Vite 和 Chrome Side Panel API。
3. 实施计划中的阶段 0 是当前目标。
4. 没有新的产品边界需要先补充到文档。
