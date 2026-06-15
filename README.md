# Chrome Tab Manager

一个 Chrome 扩展项目，用来管理过多标签页、减少重复标签页、归档暂时不用的页面，并在侧边栏中提供统一的标签页清单。

## 当前阶段

MVP 版本已完成并进入下一阶段准备。当前已有 Vite + React + TypeScript + shadcn/ui + MV3 扩展实现，`dist/` 可作为 unpacked extension 加载。

MVP 已覆盖：

- 侧边栏展示所有普通窗口中的打开标签页，并排除隐身窗口。
- 按完整 host 分组，展示数量摘要、折叠状态和当前标签页高亮。
- 识别规范化 URL 相同的重复标签页。
- 支持跳转、关闭、单个归档、恢复归档、删除归档记录。
- 支持搜索和全部、打开、归档、重复过滤。
- 使用 `chrome.storage.local` 保存归档记录和分组折叠状态。
- 提供 loading、empty、error 和非阻塞操作错误反馈。

下一阶段从 MVP 后置 Backlog 开始，优先处理自定义分组、侧边栏置顶、重复新开页处理和休眠自动归档等能力。

## 常用命令

```bash
npm run dev
npm run test
npm run typecheck
npm run build
```

## 文档

- [领域术语](./CONTEXT.md)
- [MVP 范围](./docs/mvp-scope.md)
- [UI 原型](./docs/ui-prototype.md)
- [UI 组件规格](./docs/ui-component-spec.md)
- [shadcn/ui 组件计划](./docs/shadcn-component-plan.md)
- [产品设计](./docs/product-design.md)
- [技术方案](./docs/technical-plan.md)
- [Storage Schema](./docs/storage-schema.md)
- [Runtime State Model](./docs/runtime-state-model.md)
- [Service Worker Flow](./docs/service-worker-flow.md)
- [Chrome 权限最小集](./docs/permissions-plan.md)
- [项目结构方案](./docs/project-structure.md)
- [构建与开发工具方案](./docs/build-tooling-plan.md)
- [风险清单](./docs/risk-register.md)
- [隐私与商店说明草案](./docs/privacy-and-store-copy.md)
- [MVP 工作拆分](./docs/mvp-work-breakdown.md)
- [实施计划](./docs/implementation-plan.md)
- [测试计划](./docs/test-plan.md)
- [MVP 完成检查](./docs/mvp-completion.md)
- [ADRs](./docs/adr/)
