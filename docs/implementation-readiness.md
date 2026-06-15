# 实现阶段启动清单

本文档定义从当前文档阶段进入代码实现阶段前需要确认和执行的事项。

## 进入条件

只有满足以下条件，才开始创建代码和配置文件：

1. 用户明确要求进入实现阶段。
2. MVP 范围仍保持冻结，或用户明确要求解冻并修改 [MVP 范围](./mvp-scope.md)。
3. 技术方案仍采用 Manifest V3、Vite、React、TypeScript、shadcn/ui。
4. 权限策略仍为 `tabs`、`storage`、`sidePanel`。
5. 不新增 content script、options page、popup page。

## 阶段 0 实现顺序

推荐顺序：

1. 创建 Vite + React + TypeScript 项目骨架。
2. 配置 Chrome extension MV3 构建。
3. 初始化 shadcn/ui。
4. 添加 MVP 首批 shadcn 组件。
5. 创建 side panel 静态入口。
6. 创建 service worker 静态入口。
7. 配置 manifest。
8. 加载到 Chrome 开发者模式验证。
9. 再开始实现 domain/storage/worker 逻辑。

## 初始化前检查

执行代码生成前检查：

- 当前目录是 `/Users/emily/ghx/chrome-tab-manager`。
- 项目仍没有现有 `package.json`，避免覆盖用户代码。
- 已读 [AGENTS.md](../AGENTS.md)。
- 已读 [MVP 范围](./mvp-scope.md)。
- 已读 [项目结构方案](./project-structure.md)。
- 已读 [shadcn/ui 组件计划](./shadcn-component-plan.md)。

## shadcn 初始化注意事项

进入实现阶段后：

- 使用项目实际 package manager 运行 shadcn CLI。
- 初始化后运行 `shadcn info` 获取真实项目配置。
- 不假设 import alias。
- 不假设 icon library。
- 添加组件前查看对应组件 docs。
- 添加组件后读取生成文件，确认导入路径和组合方式正确。

MVP 首批组件见 [shadcn/ui 组件计划](./shadcn-component-plan.md)。

## 第一轮可加载验收

阶段 0 结束时，不要求完整功能，但必须满足：

- Chrome 可以加载 unpacked extension。
- side panel 可以打开。
- side panel 显示静态 MVP shell。
- service worker 可以启动。
- manifest 只包含 MVP 权限。
- 没有 content script。
- 没有 popup page。
- 没有 options page。

## 第一轮功能实现顺序

阶段 0 之后，推荐功能顺序：

1. URL 规范化纯函数和测试。
2. Chrome snapshot 读取。
3. side panel 展示打开标签实例。
4. 完整 host 分组和排序。
5. 重复组计算。
6. 搜索和单一状态过滤。
7. 跳转。
8. 关闭。
9. storage schema 和归档记录。
10. 归档。
11. 恢复归档。
12. 删除归档记录。
13. 空状态、loading、error。
14. 基础无障碍检查。

## 不越界事项

实现 MVP 时不要加入：

- 自定义分组配置。
- 侧边栏置顶。
- 批量操作。
- 新页面重复提示。
- 休眠标签页识别。
- 休眠自动归档。
- 内存指标。
- 设置页。
- content script。
- host permissions。

如果实现中发现需要这些能力，先停下来更新文档并确认范围。

## 手动验证入口

每完成一个功能段，使用 [测试计划](./test-plan.md) 中对应场景验证。

最低验证顺序：

1. 加载扩展。
2. 普通窗口与隐身窗口。
3. 默认完整 host 分组。
4. 重复识别。
5. 跳转。
6. 单个关闭。
7. 单个归档。
8. 恢复归档。
9. 删除归档记录。
10. 搜索过滤。
11. 空状态和错误状态。

