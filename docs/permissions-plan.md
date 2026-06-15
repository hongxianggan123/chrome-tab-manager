# Chrome 权限最小集

本文档定义当前 Chrome extension manifest 权限策略。

参考官方文档：

- Chrome permissions list: https://developer.chrome.com/docs/extensions/reference/permissions-list
- Chrome tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome sidePanel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Declare permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

## 权限原则

- 只申请 MVP 必需权限。
- 不申请 broad host permissions。
- 不读取或修改网页内容。
- 不注入 content script。
- 不使用 `chrome.storage.sync`。
- 不管理隐身窗口。
- 权限文案必须能和产品功能对应。

## MVP 需要的权限

### `tabs`

用途：

- 查询当前普通窗口中的标签页。
- 读取 tab 的 URL、title、favicon 等用于标签清单展示和重复识别的信息。
- 激活、关闭标签页。
- 监听标签页创建、更新、关闭、移动、激活等事件。

原因：

- MVP 需要跨所有普通窗口管理标签页，而不是只管理当前 active tab。
- 重复识别依赖 URL。

隐私影响：

- `tabs` 是敏感权限，Chrome 可能展示“读取浏览历史”相关警告。
- 产品文档和商店说明中必须解释：扩展只读取当前打开标签页用于本地管理，不记录完整浏览历史，不上传数据。

### `storage`

用途：

- 使用 `chrome.storage.local` 保存归档记录。
- 保存分组折叠状态。

原因：

- 归档项和视图偏好需要跨 side panel 重开保留。

约束：

- 不使用 `chrome.storage.sync`。
- 不保存完整浏览历史、页面内容、表单内容、滚动位置或登录态。

### `sidePanel`

用途：

- 使用 Chrome Side Panel API 提供侧边栏 UI。

原因：

- 侧边栏是 MVP 的主入口。

## Manifest 结构

当前 manifest 权限：

```json
{
  "manifest_version": 3,
  "permissions": ["tabs", "storage", "sidePanel"],
  "side_panel": {
    "default_path": "side-panel.html"
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

实际文件名以当前构建产物为准。

## MVP 不申请的权限

### 不申请 `host_permissions`

原因：

- MVP 不读取网页 DOM。
- MVP 不注入脚本。
- MVP 不向网页发起跨域请求。
- MVP 只需要 tab 元信息和 tab 管理能力。

后续如果做网页内容检测、表单风险判断、页面内提示，再重新评估。

### 不申请 `activeTab`

原因：

- `activeTab` 适合用户主动触发后临时访问当前 tab。
- MVP 需要管理所有普通窗口中的所有标签页，不是只处理当前 active tab。
- 已经使用 `tabs` 权限，不需要再用 `activeTab` 表达核心能力。

### 不申请 `history`

原因：

- 产品明确不记录完整浏览历史。
- 归档记录来自用户主动归档，不来自浏览器历史。

### 不申请 `scripting`

原因：

- MVP 不注入 content script。
- 不读取页面 DOM。
- 不修改网页内容。

### 不申请 `tabGroups`

原因：

- MVP 不展示或过滤 Chrome 原生 Tab Group。
- Chrome 原生 Tab Group 属于后续阶段。

### 不申请 `alarms`

原因：

- MVP 不包含休眠自动归档。
- 后续实现休眠自动归档时再申请。

### 不申请 `processes`

原因：

- MVP 不包含内存指标。
- 后续进入按需诊断指标阶段时再评估 `chrome.processes`。

### 不申请 `notifications`

原因：

- MVP 不使用系统通知。
- 重复提示也不在 MVP 中。

## 隐身模式

MVP 不管理隐身窗口。

实现要求：

- 不主动支持 incognito split/spanning 行为。
- 即使用户未来允许扩展在隐身模式运行，也不应把隐身标签混入主标签清单，除非产品范围被明确修改。

## 权限升级策略

后续每次新增能力都必须回答：

1. 该能力是否确实需要新增权限？
2. 能否用现有权限完成？
3. 新权限是否会改变隐私承诺？
4. 是否需要更新 README、产品设计、测试计划和商店说明？

新增权限应单独记录到本文档。

## 商店说明口径

如果进入发布阶段，权限说明建议包含：

- `tabs`：用于读取当前打开标签页的标题和 URL，识别重复标签页，并执行跳转、关闭、归档等本地操作。
- `storage`：用于在本机保存归档记录和界面折叠状态。
- `sidePanel`：用于在 Chrome 侧边栏展示标签页管理界面。

必须明确：

- 不上传标签页数据。
- 不记录完整浏览历史。
- 不读取网页内容。
- 不管理隐身窗口。
