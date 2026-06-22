# Chrome 权限最小集

本文档定义当前 Chrome extension manifest 权限策略。

参考官方文档：

- Chrome permissions list: https://developer.chrome.com/docs/extensions/reference/permissions-list
- Chrome tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome sidePanel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Declare permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting

## 权限原则

- 只申请 MVP 必需权限。
- 不申请 broad host permissions。
- 默认不读取或修改网页内容。
- 默认不注入 content script；页面浮层作为用户主动开启的后置增强，通过可选权限启用。
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
- 使用 `chrome.storage.session` 保存当前浏览器会话内最近一条待处理重复提示和已处理 tabId 集合。

原因：

- 归档项和视图偏好需要跨 side panel 重开保留。
- 重复提示会话状态需要在 MV3 service worker 挂起后恢复，但不需要跨浏览器重启保存。

约束：

- 不使用 `chrome.storage.sync`。
- 不保存完整浏览历史、页面内容、表单内容、滚动位置或登录态。
- 待处理重复提示和已处理 tabId 只保存在 `chrome.storage.session`，浏览器会话结束后清理。

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

### 默认不申请 `host_permissions`

原因：

- MVP 不读取网页 DOM。
- MVP 不注入脚本。
- MVP 不向网页发起跨域请求。
- MVP 只需要 tab 元信息和 tab 管理能力。

后续重复提示页面浮层需要页面注入能力时，使用 `optional_host_permissions`，由用户在设置中开启页面浮层时授权。授权只用于在普通网页内展示重复提示页面浮层，不读取网页正文，不上传页面内容。

### 不申请 `activeTab`

原因：

- `activeTab` 适合用户主动触发后临时访问当前 tab。
- MVP 需要管理所有普通窗口中的所有标签页，不是只处理当前 active tab。
- 已经使用 `tabs` 权限，不需要再用 `activeTab` 表达核心能力。

### 不申请 `history`

原因：

- 产品明确不记录完整浏览历史。
- 归档记录来自用户主动归档，不来自浏览器历史。

### 页面浮层可选申请 `scripting`

默认原因：

- MVP 不注入 content script。
- 不读取页面 DOM。
- 不修改网页内容。

后置增强：

- 用户开启重复提示页面浮层时，需要 `scripting` 加用户授权的 host access 才能向普通网页注入提示 UI。
- `scripting` 不应成为侧边栏提示模式的必需权限。
- 如果用户拒绝授权，或当前页面不可注入，功能必须降级为侧边栏待处理提示和 action badge/title。

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
- 重复提示第一版不使用系统通知。

## MVP 后置：重复提示页面浮层权限

触发条件：

- 用户在设置中把重复提示展示方式从侧边栏切换为页面浮层。

需要能力：

- `scripting`：向触发重复提示的新重复标签页注入页面浮层代码。
- `optional_host_permissions: ["<all_urls>"]`：允许在用户授权后，于任意普通网页上运行页面浮层。

不使用：

- 不申请 `notifications`。
- 不使用 `history`。
- 不使用 broad host permissions 作为默认安装权限；`<all_urls>` 只作为页面浮层的运行时可选授权。
- 不在 manifest 中静态注册覆盖所有页面的 content script。
- 不为特殊 URL、Chrome Web Store、扩展页面等受限页面注入。

隐私约束：

- 页面浮层只展示重复提示和动作按钮。
- 不读取网页正文、表单内容、滚动位置、登录态或 Cookie。
- 不保存页面内容。
- 不上传数据。

降级策略：

- 未授权、授权被撤销、注入失败或页面不可注入时，保留最近一条侧边栏待处理重复提示，并设置扩展 action badge/title。

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
- `scripting`：仅在用户开启页面浮层后，用于在授权网页上显示重复页面提示浮层。
- `<all_urls>` 可选站点访问：仅在用户开启页面浮层后请求，用于让重复提示能覆盖用户可能打开的普通网页；不读取页面内容。

必须明确：

- 不上传标签页数据。
- 不记录完整浏览历史。
- 默认不读取网页内容；页面浮层开启后也不读取网页正文或表单内容，只注入提示 UI。
- 不管理隐身窗口。
