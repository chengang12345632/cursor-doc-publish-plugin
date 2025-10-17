# v1.1.0 更新摘要

## 🎉 重要更新

本次更新解决了 NextCloud 企业环境中常见的认证和路径访问问题，大幅提升了插件的兼容性和易用性。

---

## 🎯 核心新增功能

### 1. WebDAV 用户名配置

**背景：**
某些 NextCloud 环境（特别是企业部署）中，登录用户名和 WebDAV 文件空间用户名不同。

**示例：**
- 登录用户名：`chengang`
- WebDAV 地址：`https://nextcloud.com/remote.php/dav/files/chengang_3074`

**解决方案：**
新增 `webdavUsername` 配置项，支持分别配置：
- `username`: 用于 WebDAV 认证
- `webdavUsername`: 用于访问文件空间

**配置示例：**
```json
{
  "nextcloud": {
    "username": "chengang",
    "webdavUsername": "chengang_3074",
    "password": "xxxxx-xxxxx..."
  }
}
```

---

### 2. 增强的测试连接功能

**新增功能：**
- ✅ 显示实际使用的 WebDAV URL
- ✅ 列出根目录下的所有文件和文件夹
- ✅ 自动检测 basePath 是否存在
- ✅ 提供详细的诊断信息和解决建议
- ✅ 自动尝试创建不存在的 basePath

**使用方法：**
```
Ctrl + Shift + P → "NextCloud Doc Publisher: Test Connection"
```

**输出示例：**
```
[INFO] 实际 WebDAV URL: https://docs.streamax.com:18001/remote.php/dav/files/chengang_3074
[INFO] 认证用户名: chengang
[INFO] 文件空间用户名: chengang_3074

[INFO] 根目录下有 10 个项目：
[INFO]   📁 Documents
[INFO]   📁 Photos
[INFO]   📁 test
[INFO]   📁 云平台开发部

[SUCCESS] ✓ Base Path 存在: /test
```

---

## 📖 新增文档

### 1. [故障排查指南](./TROUBLESHOOTING.md)

完整的问题诊断和解决方案，包括：
- 403 Forbidden 错误
- 401 Unauthorized 错误
- 404 Not Found 错误
- 空目录列表问题
- WebDAV 用户名配置
- 路径配置问题

### 2. [应用专用密码指南](./APP_PASSWORD_GUIDE.md)

详细的应用专用密码获取步骤：
- 为什么需要应用专用密码
- 如何获取应用专用密码
- 如何查看 WebDAV 地址
- 常见错误排查

### 3. 更新所有配置文档

- 更新 [NextCloud 配置指南](./NEXTCLOUD_CONFIG.md)
- 更新配置示例文件
- 更新 README.md

---

## 🐛 问题修复

### 1. WebDAV 认证问题

**问题：**
```
[ERROR] 401 Unauthorized
```

**原因：**
NextCloud 提示使用 `username_数字` 格式，但配置中只填了带数字的用户名。

**修复：**
- 添加 `webdavUsername` 配置
- 认证使用不带数字的用户名
- 文件访问使用带数字的用户名

---

### 2. 重复警告问题

**问题：**
同一个不存在的资源被警告两次。

**原因：**
图片和链接的正则表达式都会匹配同一个资源。

**修复：**
- 使用单一正则表达式匹配所有资源
- 使用 Set 记录已警告的资源，避免重复

---

### 3. URL 末尾斜杠问题

**问题：**
```
https://nextcloud.com:18001//remote.php/dav/files/...
```

**原因：**
用户配置的 URL 末尾包含斜杠。

**修复：**
- 自动检测并移除 URL 末尾的斜杠
- 显示警告提示用户

---

## 🔧 改进优化

### 1. 更好的错误提示

**之前：**
```
[ERROR] 创建目录失败: /test
```

**现在：**
```
[ERROR] ✗ Base Path 不存在: /test

📋 诊断结果：
  - WebDAV 连接成功
  - 但个人空间是空的（0 个文件/文件夹）

🤔 可能的原因：
  1. 您的 NextCloud 个人空间从未使用过（全新账户）
  2. 您在网页版看到的文件在"群组文件夹"或"共享空间"
  3. NextCloud 配置了特殊的文件空间结构

💡 解决方案：
  方案 1：在 NextCloud 网页版的个人空间根目录创建 "test" 文件夹
  方案 2：如果您的文件在群组文件夹中，修改 basePath 配置
  方案 3：尝试使用插件创建测试目录（下一步）
```

### 2. 优化日志输出

- 使用不同级别（INFO、WARN、ERROR、SUCCESS、DEBUG）
- 更清晰的格式和图标
- 更详细的诊断信息

### 3. 自动化处理

- 自动移除 URL 末尾斜杠
- 自动尝试创建测试目录
- 自动检测配置问题

---

## 📋 配置变更

### package.json

新增配置项：
```json
{
  "docPublish.nextcloud.webdavUsername": {
    "type": "string",
    "description": "WebDAV文件空间用户名（可选，如果与登录用户名不同，如 chengang_3074）",
    "default": ""
  }
}
```

### types.ts

更新接口：
```typescript
export interface NextCloudConfig {
  url: string;
  username: string;
  password: string;
  basePath: string;
  webdavUsername?: string; // 新增
}
```

---

## 🎓 使用建议

### 1. 首次配置时

1. 获取应用专用密码（必需）
2. 检查 NextCloud 中的 WebDAV 地址
3. 如果是 `username_数字` 格式，配置 `webdavUsername`
4. 执行测试连接验证配置

### 2. 遇到问题时

1. 执行测试连接查看详细诊断
2. 查看 [故障排查指南](./TROUBLESHOOTING.md)
3. 检查日志中的建议和解决方案

### 3. 企业环境

- 通常需要配置 `webdavUsername`
- basePath 通常指向群组文件夹
- 需要使用应用专用密码

---

## ✅ 测试建议

更新后，建议重新测试：

1. **测试连接**
   ```
   Ctrl + Shift + P → Test Connection
   ```

2. **发布单个文档**
   ```
   打开 .md 文件 → Ctrl + Shift + U
   ```

3. **批量发布**
   ```
   右键文件夹 → Batch Publish Directory
   ```

---

## 📊 兼容性

**支持的 NextCloud 版本：**
- NextCloud 20+
- 支持标准 WebDAV 协议
- 支持 NextCloud Sharing API

**支持的环境：**
- 个人 NextCloud 部署
- 企业 NextCloud 部署
- 群组文件夹
- 共享空间

---

## 🙏 感谢

感谢用户反馈的问题，帮助我们改进插件！

特别感谢在 NextCloud 企业环境中测试并提供详细反馈的用户。

---

## 📞 获取帮助

- 查看 [故障排查指南](./TROUBLESHOOTING.md)
- 查看 [应用专用密码指南](./APP_PASSWORD_GUIDE.md)
- 查看 [NextCloud 配置指南](./NEXTCLOUD_CONFIG.md)
- 提交 GitHub Issue

---

更多信息请查看 [CHANGELOG.md](../CHANGELOG.md) 和 [README.md](../README.md)

