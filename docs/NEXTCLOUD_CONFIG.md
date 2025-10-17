# NextCloud 配置指南

## ⚠️ 重要前置步骤

### 1. 创建应用专用密码（必需）

NextCloud 的 WebDAV API 需要使用**应用专用密码**，而不是您的登录密码：

**步骤：**
1. 登录 NextCloud 网页版
2. 点击右上角头像 → **设置（Settings）**
3. 左侧菜单选择 **安全（Security）**
4. 找到 **应用密码（App passwords）** 或 **设备与会话（Devices & sessions）**
5. 在 **"创建新的应用密码"** 输入名称，如：`Cursor Doc Publisher`
6. 点击创建，**复制生成的密码**（通常是一串无空格的字符）
7. 将这个密码用于插件配置

**示例：**
```
登录密码：MyPassword123!  ❌ 不要用这个
应用密码：xxxxx-xxxxx-xxxxx-xxxxx-xxxxx  ✅ 使用这个
```

### 2. 在 NextCloud 创建根目录

**在 NextCloud 中手动创建 basePath 目录：**

```
登录 NextCloud → 文件 → 新建文件夹
创建路径：/云平台开发部1
```

插件会自动创建 basePath **下的所有子目录**，但 basePath 本身必须预先存在。

### 3. 配置插件

**Cursor 设置**：
```
Ctrl + , → 搜索 "NextCloud Doc Publisher"

必填项：
- NextCloud URL: https://your-nextcloud.com
- Username: your-username  
- Password: your-app-password  ← 使用应用专用密码！
- Base Path: /云平台开发部  ← 必须在 NextCloud 中预先创建
- Service Name: your-service
- Version: V1.0.0

可选项（特殊情况）：
- WebDAV文件空间用户名: your-username_3074  ← 见下方说明
```

**WebDAV文件空间用户名说明：**
- 大多数情况下**不需要填写**此项
- 如果 NextCloud 设置页面提示您使用类似 `username_数字` 的 WebDAV 地址，才需要填写
- 例如：`https://nextcloud.com/remote.php/dav/files/chengang_3074`
  - Username 填：`chengang`
  - WebDAV文件空间用户名 填：`chengang_3074`

**或配置文件** `.cursor/doc-publish-config.json`：
```json
{
  "nextcloud": {
    "url": "https://your-nextcloud.com",
    "username": "your-username",
    "password": "your-app-password",
    "basePath": "/你的团队目录",
    "webdavUsername": "your-username_3074"  // 可选，如果需要
  },
  "project": {
    "serviceName": "your-service",
    "version": "V1.0.0"
  }
}
```

**注意：** 
- **basePath 必须在 NextCloud 中预先手动创建**
- 插件会自动创建 basePath **下的所有子目录**

### 4. 测试连接

```
Ctrl + Shift + P → "NextCloud Doc Publisher: Test Connection"
```

## 最终路径

文档上传到：`{basePath}/{version}/{serviceName}/文档.md`

示例：`/你的团队目录/V1.0.0/your-service/README.md`

## 常见问题

### 403 Forbidden
**原因：**
- ❌ 使用了登录密码而不是应用专用密码
- ❌ basePath 在 NextCloud 中不存在
- ❌ 用户没有在该目录的写入权限

**解决方法：**
1. **确保使用应用专用密码**（见上面步骤 1）
2. **在 NextCloud 中手动创建 basePath**（见上面步骤 2）
3. 检查 NextCloud 用户在该目录的权限

### 404 Not Found
- basePath 不存在，需要手动创建
- 检查 NextCloud URL 是否正确
- 检查路径拼写是否正确

### 文件覆盖策略
**问题：** 上传文件时 NextCloud 提示选择保留哪个版本？

**解决方案：**
1. 确保配置中 `overwriteExisting: true`（默认值）
2. 插件会自动覆盖已存在的文件，保留最新上传的版本
3. 如果设置为 `false`，插件会跳过已存在的文件

**配置示例：**
```json
{
  "plugin": {
    "overwriteExisting": true  // 自动覆盖，避免手动选择
  }
}
```

### 401 Unauthorized
**原因：**
- ❌ 用户名或密码错误
- ❌ 应用专用密码过期或被撤销

**解决方法：**
1. 确认用户名正确
2. 重新创建应用专用密码
3. 如果 NextCloud 提示使用 `username_数字` 格式的 WebDAV 地址，配置 WebDAV文件空间用户名

### 空目录列表（0 个项目）
**原因：**
- 个人空间为空或未启用
- WebDAV 访问的空间与网页版不同

**解决方法：**
1. 检查是否填写了正确的 WebDAV文件空间用户名
2. 在 NextCloud 设置中查看 WebDAV 地址，确认用户名格式
3. 使用群组文件夹作为 basePath

### 配置验证失败
- 检查所有必填项是否填写
- basePath 不能为空

---

更多信息请查看 README.md

