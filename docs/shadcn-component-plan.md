# shadcn/ui 组件计划

本文档记录当前项目使用 shadcn/ui 的组件约束和后续新增组件规则。

## 使用原则

- 使用 shadcn/ui 作为基础组件系统。
- 使用组件内置 variants 和语义 token，不在组件上硬覆盖颜色和字体。
- 组件级布局、状态、hover 和响应式样式优先写 Tailwind utility class。
- `src/side-panel/styles.css` 只保存 import、theme token 和 base reset，不继续承载大段业务组件 CSS。
- 布局使用 `gap-*`，不使用 `space-x-*` 或 `space-y-*`。
- 状态徽标使用 `Badge`，不要手写圆角 `span`。
- 空状态使用 `Empty`。
- 加载占位使用 `Skeleton`。
- 错误和提示使用 `Alert` 或 `sonner`，不手写 callout。
- 图标按钮使用 shadcn `Button`，图标带 `data-icon`，不在图标上手写尺寸类。
- 搜索输入如果带清空按钮，使用 `InputGroup`、`InputGroupInput`、`InputGroupAddon`。
- 状态过滤使用 `ToggleGroup` 和 `ToggleGroupItem`，不手写一组 active Button。

## MVP 组件映射

| UI 区域 | shadcn/ui 组件 | 说明 |
| --- | --- | --- |
| 侧边栏滚动区域 | `ScrollArea` | 只让列表区域滚动，顶部搜索和过滤保持可见。 |
| 搜索框 | `InputGroup`, `InputGroupInput`, `InputGroupAddon`, `Button` | 搜索输入和清空按钮。 |
| 状态过滤 | `ToggleGroup`, `ToggleGroupItem` | `全部 / 打开 / 归档 / 重复` 单选过滤。 |
| 分组展开 | `Collapsible` | 分组标题控制展开/折叠。 |
| 分隔线 | `Separator` | 分隔顶部控制区、分组和行。 |
| 状态徽标 | `Badge` | `当前`、`重复 x2`、`已归档`、`特殊 URL`。 |
| 操作按钮 | `Button` | 归档、关闭、删除归档记录。跳转和恢复使用行点击作为主操作。 |
| 完整 URL 查看 | 自定义 `UrlInspector` | 底部固定 inspector，替代 tooltip 或 hover card。 |
| 空状态 | `Empty` | 没有标签、搜索无结果、没有归档项。 |
| 加载状态 | `Skeleton` | 首次读取标签清单时的行骨架。 |
| 错误提示 | `Alert` | API 读取失败、特殊 URL 不可归档等明确提示。 |
| 操作反馈 | `sonner` | 非阻塞操作失败或成功反馈。 |

## 不使用或后置

- MVP 不使用 `Card` 包裹标签行。标签行需要高密度列表形态，卡片会增加视觉噪音。
- MVP 不使用 `Table`。标签清单不是表格数据，行内有状态轨道、动作和多行文本。
- MVP 不使用 `Dialog`、`AlertDialog`。关闭和归档不做二次确认。
- MVP 不使用 `Sheet`。Chrome Side Panel 本身已经是侧边栏容器。
- MVP 不使用 `DropdownMenu`。每行操作数量少，直接展示更可发现。
- MVP 不使用 `Tooltip` 承载完整 URL 或按钮说明。完整 URL 使用底部 inspector，按钮使用 `aria-label`。

## 自定义部分

以下部分需要项目自定义组合，而不是直接套 shadcn 现成大组件：

- `InventoryRow`：标签实例行和归档行。
- `GroupHeader`：包含分组标题、数量摘要、折叠状态。
- 状态轨道：3px 左侧轨道，用 CSS 变量表达打开、归档、重复、特殊 URL 状态。
- 窗口标识：例如 `W1`、`W2` 的紧凑元信息。
- 当前页高亮：当前行背景、加粗状态轨道、`当前` 徽标和组标题提示。
- URL inspector：固定在底部的完整 URL 查看区。

自定义部分仍应使用 shadcn 组件拼装动作、徽标和状态，不手写已有组件能覆盖的交互。

## 主题 token

UI 原型中的颜色需要映射为主题 CSS 变量，而不是直接写 Tailwind 原始颜色。

当前已建立或可继续沿用这些语义 token：

- `--tab-panel`
- `--tab-rail-active`
- `--tab-rail-archived`
- `--tab-rail-duplicate`
- `--tab-rail-special`
- `--tab-danger`

这些 token 用于状态轨道和少量状态表达。正文、边框、背景、muted 文本仍优先使用 shadcn 默认语义 token。

## 图标计划

当前项目使用 lucide 图标。后续新增图标优先从 lucide 中选择。

需要的图标语义：

- 搜索
- 清空搜索
- 展开/折叠
- 归档
- 关闭
- 删除归档记录
- 错误
- 空状态

按钮内图标必须使用 `data-icon`，不要在图标上手写尺寸类。

## 新增组件流程

1. 运行 `shadcn info` 或查看 `components.json` 获取实际项目配置。
2. 按需添加组件，不一次性添加全部组件库。
3. 添加组件前查看对应组件文档。
4. 添加后读取生成文件，确认导入路径、图标库、组合方式符合项目配置。
