# 使用指南

完整的配置和使用教程，包含从安装到发布的全部步骤。

## 目录

1. [重要前置步骤](#1-重要前置步骤)
2. [配置](#2-配置)
3. [创建文档](#3-创建文档)
4. [发布文档](#4-发布文档)
5. [验证和后续](#5-验证和后续)

---

## 1. 重要前置步骤

### 1.1 创建应用专用密码（必需）

**NextCloud WebDAV API 必须使用应用专用密码，不能使用登录密码！**

**为什么需要应用专用密码？**

NextCloud 出于安全考虑，**WebDAV API 不接受登录密码**，必须使用应用专用密码（App Password）。

即使您的账户密码可以登录 NextCloud 网页，也不能用于 WebDAV API 访问。

**获取步骤：**

1. 登录 NextCloud 网页版
2. 点击右上角的**用户头像**
3. 选择 **设置（Settings）**
4. 在左侧菜单中选择 **安全（Security）**
5. 找到 **应用密码（App passwords）** 或 **设备与会话（Devices & sessions）** 部分
6. 在输入框中输入一个名称，例如：`Cursor Doc Publisher`
7. 点击 **创建（Create）** 按钮
8. **立即复制生成的密码**（通常是一串无空格的字符串）

**示例格式：**
```
登录密码：MyPassword123!  ❌ 不要用这个
应用密码：xxxxx-xxxxx-xxxxx-xxxxx-xxxxx  ✅ 使用这个
```

**常见问题：**

- **Q: 我忘记保存应用密码了怎么办？**
  - A: 重新创建一个新的应用密码即可，旧的会自动失效。

- **Q: 我可以使用同一个应用密码在多个设备上吗？**
  - A: 可以，但建议为每个设备/应用创建独立的应用密码，便于管理和撤销。

- **Q: 如何撤销应用密码？**
  - A: 在安全设置页面，找到对应的应用密码，点击删除/撤销即可。

### 1.2 获取 WebDAV 文件空间地址（重要！）

**很多用户的 WebDAV 地址与登录用户名不同，需要单独获取：**

**步骤：**
1. 登录 NextCloud 网页版
2. 左下角点击 "文件设置"（齿轮图标）
3. 在设置面板左侧选择 "WebDAV"
4. 复制显示的 WebDAV 地址（如：`https://your-domain/remote.php/dav/files/username_1234`）

**关键信息：**
- **URL**：从 WebDAV 地址中提取 NextCloud 服务器地址（如：`https://your-domain`）
- **Username**：您的登录用户名（用于认证）
- **WebDAV文件空间用户名（必填）**：WebDAV 地址中的最后部分（如 `username_1234`）

**示例：**

如果 WebDAV 地址是：`https://docs.streamax.com:18001/remote.php/dav/files/chengang_3074`
- `url`: `https://docs.streamax.com:18001`
- `username`: `chengang`（您的登录用户名）
- `webdavUsername`: `chengang_3074`（必填！从WebDAV地址中获取）

**如果显示 `username_数字` 格式：**
- Username 填写：不带数字的用户名（如 `chengang`）
- WebDAV文件空间用户名 填写：完整的名称（如 `chengang_3074`）
- Password 使用：用不带数字的用户名创建的应用专用密码

---

## 2. 配置

### 2.1 安装插件

**方式一：从 Cursor 扩展市场安装（推荐）**

1. 打开 Cursor
2. 按 `Ctrl/Cmd + Shift + X` 打开扩展面板
3. 搜索 "NextCloud Doc Publisher"
4. 点击 "Install"

**方式二：从命令行安装**

```bash
cursor --install-extension shon-chen.cursor-doc-publish-plugin
```

**方式三：访问 OpenVSX**

👉 [OpenVSX Registry](https://open-vsx.org/extension/shon-chen/cursor-doc-publish-plugin)

### 2.2 配置插件

**Cursor 设置：**
```
Ctrl + , → 搜索 "NextCloud Doc Publisher"

必填项：
- NextCloud URL: https://your-nextcloud.com
- Username: your-username  
- Password: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx  ← 使用应用专用密码！
- WebDAV文件空间用户名: your-username_1234  ← 必填！从WebDAV地址中获取
```

⚠️ **重要说明**：
- Password 必须填写**应用专用密码**，不能填写登录密码！
- WebDAV文件空间用户名是**必填项**，从 WebDAV 地址中获取
- 上传目录在发布时动态选择，无需预先配置

**配置文件示例** `.cursor/doc-publish-config.json`：

```json
{
  "nextcloud": {
    "url": "https://your-nextcloud.com",
    "username": "your-username",
    "password": "your-app-password",
    "webdavUsername": "your-username_1234"
  }
}
```

**使用环境变量**（推荐）：

```json
{
  "nextcloud": {
    "url": "${env:NEXTCLOUD_URL}",
    "username": "${env:NEXTCLOUD_USERNAME}",
    "password": "${env:NEXTCLOUD_PASSWORD}",
    "webdavUsername": "${env:NEXTCLOUD_WEBDAV_USERNAME}"
  }
}
```

### 2.3 配置项说明

**必填配置项：**

- **nextcloud.url**：NextCloud服务器地址
- **nextcloud.username**：NextCloud登录用户名（用于认证）
- **nextcloud.password**：应用专用密码（不是登录密码）
- **nextcloud.webdavUsername**：WebDAV文件空间用户名（必填）

**上传目录：**

- 上传目录在发布时动态选择，支持输入新目录或选择历史记录
- 插件会自动创建目录结构
- 历史记录会自动保存，最多保存20条

### 2.4 测试连接

```
Ctrl + Shift + P → "NextCloud Doc Publisher: Test Connection"
```

测试命令会显示：
- WebDAV URL
- 用户名配置
- 根目录文件列表
- 详细的错误信息和建议

---

## 3. 创建文档

### 3.1 创建文档目录结构

在项目根目录下创建文档目录结构：

```bash
# 进入项目目录
cd base-server-service

# 推荐：按版本+文档类型组织
mkdir -p doc/V2.16.13/design/assets
mkdir -p doc/V2.16.13/requirements/assets
mkdir -p doc/V2.16.13/api/assets
```

**推荐目录结构（版本+类型）**：

```
base-server-service/           # 项目根目录
├── src/
├── pom.xml
├── .cursor/
│   └── doc-publish-config.json # 插件配置文件（可选）
├── .gitignore
└── doc/                       # 文档根目录
    ├── V2.16.13/              # 当前版本
    │   ├── design/            # 设计文档
    │   │   ├── assets/
    │   │   └── (待创建.md文件)
    │   ├── requirements/      # 需求文档
    │   │   └── assets/
    │   ├── api/               # API文档
    │   │   └── assets/
    │   └── tech/              # 技术文档
    │       └── assets/
    └── V2.16.12/              # 历史版本
        └── ...
```

**说明**：插件支持任意目录结构，您可以根据项目需要自由组织。

### 3.2 编写文档

**示例1：设计文档** `doc/V2.16.13/design/用户权限管理设计.md`

```markdown
# 用户权限管理设计文档

## 需求背景

本期需要实现基于RBAC的用户权限管理功能...

## 架构设计

![系统架构](assets/architecture.png)

## 数据模型

![数据模型](assets/data-model.png)
```

**示例2：技术方案** `doc/V2.16.13/tech/缓存优化方案.md`

```markdown
# 缓存优化技术方案

## 方案对比

![方案对比](assets/solution-comparison.png)

## 实施计划

[详细计划](assets/implementation-plan.xlsx)
```

**添加资源文件**：

将图片和文档拖拽到对应的 `assets/` 目录

**资源引用规范**：
- 使用相对路径：`assets/文件名`
- 图片：`![描述](assets/xxx.png)`
- 附件：`[链接文字](assets/xxx.pdf)`
- 上传后文档保持原始引用，在NextCloud中可正常访问

---

## 4. 发布文档

插件支持两种发布模式：
- **单个文档发布**：发布当前打开的Markdown文件
- **目录批量发布**：发布指定目录下的所有Markdown文件

### 4.1 模式一：发布单个文档

适用于编写完成单个文档后快速发布。

**操作方式：**

**方式1：使用命令面板（推荐）**

1. 在Cursor中打开要发布的Markdown文档（如 `doc/V2.16.13/design/用户权限管理设计.md`）
2. 按 `Cmd/Ctrl + Shift + P` 打开命令面板
3. 输入 "Publish Current Doc to NextCloud"
4. 回车执行

**方式2：使用右键菜单**

1. 在文件树中右键点击要发布的Markdown文件
2. 选择 "Publish to NextCloud"

**方式3：使用快捷键**

- Mac: `Cmd + Shift + U`
- Windows/Linux: `Ctrl + Shift + U`

（需要在Cursor中打开要发布的文档）

**发布过程：**

1. **选择上传目录**：弹出目录选择对话框，输入或选择上传目录（如：`/Docs/V2.16.13/design`）
2. **上传资源**：扫描并上传文档中引用的资源文件
3. **上传文档**：上传Markdown文档到NextCloud

**发布日志示例：**

```
[Publishing] Initializing NextCloud client...
[Publishing] Processing document: 用户权限管理设计.md
[Publishing] 扫描文档中引用的资源文件
[Publishing] Uploading assets... (1/3) architecture.png
[Publishing] Uploading assets... (2/3) data-model.png
[Publishing] Uploading assets... (3/3) api-design.pdf
[Publishing] Creating share links...
[Publishing] Uploading markdown document...
[Success] ✓ Published: 用户权限管理设计.md
```

### 4.2 模式二：批量发布目录下的文档

适用于一次性发布多个文档或整个版本的文档。

**操作方式：**

**方式1：使用命令面板**

1. 按 `Cmd/Ctrl + Shift + P` 打开命令面板
2. 输入 "Publish Doc Directory to NextCloud"
3. 选择要发布的目录（如 `doc/V2.16.13/design/`）
4. 回车执行

**方式2：使用右键菜单（推荐）**

1. 在文件树中右键点击文档目录（如 `doc/V2.16.13/design/`）
2. 选择 "Publish Directory to NextCloud"

**方式3：使用快捷键**

- Mac: `Cmd + Option + Shift + U`
- Windows/Linux: `Ctrl + Alt + Shift + U`

**发布过程：**

1. **选择上传目录**：弹出目录选择对话框，输入或选择上传目录
2. **扫描文档**：扫描目录下所有Markdown文件
3. **收集资源**：收集所有文档引用的资源文件（去重）
4. **批量上传**：上传所有资源和文档

**发布日志示例：**

```
[Publishing] Initializing NextCloud client...
[Publishing] Scanning directory: doc/V2.16.13/design
[Publishing] Found 3 markdown file(s)
[Publishing] 收集所有文档引用的资源文件
[Publishing] Uploading shared assets... (1/5) architecture.png
[Publishing] Uploading shared assets... (2/5) data-model.png
[Publishing] Uploading shared assets... (3/5) flow-chart.png
[Publishing] Uploading shared assets... (4/5) api-design.pdf
[Publishing] Uploading shared assets... (5/5) sequence.png
[Publishing] Creating share links...
[Publishing] Processing: 用户权限管理设计.md (1/3)
[Publishing] Processing: 数据迁移方案.md (2/3)
[Publishing] Processing: API接口设计.md (3/3)
[Success] ✓ Published 3 documents
```

### 4.3 两种模式的区别

**单个文档发布**：
- **发布范围**：当前打开的文档
- **assets处理**：只上传文档中引用的资源
- **速度**：快速
- **适用场景**：快速迭代、单文档更新
- **操作复杂度**：简单

**目录批量发布**：
- **发布范围**：目录下所有文档
- **assets处理**：收集所有文档引用的资源（去重）
- **速度**：相对较慢
- **适用场景**：首次发布、批量发布
- **操作复杂度**：需选择目录

---

## 5. 验证和后续

### 5.1 验证发布结果

发布成功后，Cursor会显示通知，包含NextCloud链接：

```
✓ 文档发布成功！
📂 查看文档: https://nextcloud.example.com/index.php/f/12345
```

点击链接访问NextCloud查看文档。

**上传目录示例：**

如果您选择的上传目录是 `/Docs/V2.16.13/design`，文档会上传到：

```
/Docs/
└── V2.16.13/
    └── design/
        ├── 用户权限管理设计.md
        └── assets/
            ├── architecture.png     # 只上传引用的文件
            └── data-model.png
```

**说明**：
- 上传目录完全由您在发布时选择
- 目录结构完全按您输入的路径创建
- 支持任意目录结构，灵活组织文档
- 历史记录会自动保存，方便重复使用

### 5.2 提交到Git

**只提交Markdown文件，不提交资源文件**：

在Cursor中使用源代码管理面板：

1. 打开源代码管理：`Cmd/Ctrl + Shift + G`
2. 勾选 `doc/**/*.md` 文件
3. 确保 `assets/` 目录未被选中（应在 `.gitignore` 中）
4. 输入提交信息："docs: 添加用户权限管理文档"
5. 点击提交

**配置 `.gitignore`**：

```bash
# 添加到 .gitignore
echo "doc/**/assets/" >> .gitignore
echo ".cursor/doc-publish-config.json" >> .gitignore
```

**为什么不提交assets？**
- 资源文件已上传到NextCloud，无需在Git中保存
- 减小Git仓库体积
- Markdown中保持相对路径引用，在NextCloud中可正常访问

---

**相关文档**：
- [常见问题和故障排查](FAQ.md) - FAQ和故障排查方法
- [开发指南](DEVELOPMENT.md) - 开发相关文档
