# 故障排查指南

本文档总结了 NextCloud Doc Publisher 插件使用过程中的常见问题和解决方案。

## 目录

- [快速诊断](#快速诊断)
- [连接问题](#连接问题)
- [认证问题](#认证问题)
- [路径问题](#路径问题)
- [高级问题](#高级问题)

---

## 快速诊断

### 步骤 1：执行测试连接

```
Ctrl + Shift + P → "NextCloud Doc Publisher: Test Connection"
```

测试命令会显示详细的诊断信息，帮助您快速定位问题。

### 步骤 2：查看日志输出

测试命令会显示：
- WebDAV URL
- 用户名配置
- 根目录文件列表
- basePath 是否存在
- 详细的错误信息和建议

---

## 连接问题

### ❌ 403 Forbidden

**症状：**
```
[ERROR] 403 Forbidden
```

**原因：**
1. 使用了登录密码而不是应用专用密码
2. basePath 在 NextCloud 中不存在
3. 用户没有写入权限

**解决方法：**

✅ **检查应用专用密码**
- 必须使用应用专用密码，不能使用登录密码
- 参考：[应用专用密码获取指南](./APP_PASSWORD_GUIDE.md)

✅ **检查 basePath**
- 在 NextCloud 网页版手动创建 basePath 目录
- 确保目录在个人空间或有权限的群组空间

✅ **检查权限**
- 确认用户对该目录有写入权限

---

### ❌ 401 Unauthorized

**症状：**
```
[ERROR] 401 Unauthorized
```

**原因：**
- 用户名或密码错误
- 应用专用密码过期或被撤销
- WebDAV 用户名配置不正确

**解决方法：**

✅ **检查用户名**
- 确认用户名正确（通常是登录用户名）
- 检查是否需要配置 WebDAV文件空间用户名（见下方）

✅ **重新创建应用专用密码**
- 在 NextCloud 安全设置中删除旧密码
- 创建新的应用专用密码
- 更新插件配置

✅ **检查 WebDAV 地址格式**
1. 登录 NextCloud 网页版
2. 点击右下角设置（齿轮图标）
3. 查看 WebDAV 地址

**如果显示 `username_数字` 格式：**
```
https://nextcloud.com/remote.php/dav/files/chengang_3074
```

需要分别配置：
- **Username**: `chengang`（不带数字）
- **WebDAV文件空间用户名**: `chengang_3074`（完整名称）
- **Password**: 用 `chengang` 创建的应用专用密码

---

### ❌ 404 Not Found

**症状：**
```
[ERROR] 404 Not Found
```

**原因：**
- basePath 不存在
- 目录路径拼写错误
- URL 配置错误

**解决方法：**

✅ **手动创建 basePath**
- 在 NextCloud 网页版创建目录
- 确保路径拼写完全一致（区分大小写）

✅ **检查 URL**
- 确认 NextCloud URL 正确
- URL 末尾不要加斜杠（插件会自动处理）

---

## 认证问题

### 空目录列表（0 个项目）

**症状：**
```
[INFO] 根目录下有 0 个项目：
```

**原因：**
- 个人空间为空或未启用
- WebDAV 访问的空间与网页版不同
- WebDAV用户名配置不正确

**解决方法：**

✅ **检查 WebDAV 用户名**
- 查看 NextCloud 设置中的 WebDAV 地址
- 如果是 `username_数字` 格式，配置 WebDAV文件空间用户名

✅ **使用群组文件夹**
- 如果您的文件在群组文件夹中
- 将 basePath 配置为群组文件夹路径
- 例如：`/云平台开发部/平台研发/业务中台组`

✅ **测试创建目录**
- 插件会尝试在空间中创建测试目录
- 如果成功，刷新 NextCloud 网页版查看

---

## 路径问题

### basePath 配置错误

**正确的路径格式：**

```json
{
  "basePath": "/云平台开发部/平台研发/业务中台组",
  "version": "V2.16.13",
  "serviceName": "base-common-service"
}
```

**最终路径：**
```
/云平台开发部/平台研发/业务中台组/V2.16.13/base-common-service/README.md
```

**路径规则：**
- basePath：必须在 NextCloud 中预先手动创建
- version + serviceName：插件自动创建

---

### version 路径可以包含多级

如果需要更复杂的路径结构：

```json
{
  "basePath": "/云平台开发部",
  "version": "平台研发/业务中台组/firefly/V2.16.x/2.16.13",
  "serviceName": "base-common-service"
}
```

**最终路径：**
```
/云平台开发部/平台研发/业务中台组/firefly/V2.16.x/2.16.13/base-common-service/README.md
```

---

## 高级问题

### URL 末尾有双斜杠

**症状：**
```
https://nextcloud.com:18001//remote.php/dav/files/...
                         ^^
```

**原因：**
- NextCloud URL 配置时末尾包含了斜杠

**解决方法：**
- 插件会自动移除末尾的斜杠
- 或手动修改配置，删除 URL 末尾的 `/`

---

### WebDAV 用户名与登录用户名不同

**背景：**
某些 NextCloud 配置（特别是企业环境）会使用不同的标识：
- 登录用户名：`chengang`
- WebDAV 用户名：`chengang_3074`

**识别方法：**
1. 登录 NextCloud 网页版
2. 右下角设置 → WebDAV
3. 查看显示的 WebDAV 地址

**配置示例：**

```json
{
  "nextcloud": {
    "username": "chengang",              // 用于认证
    "webdavUsername": "chengang_3074",   // 用于访问文件
    "password": "xxxxx-xxxxx..."         // 应用专用密码
  }
}
```

**Cursor 设置：**
```
Username: chengang
WebDAV文件空间用户名: chengang_3074
Password: xxxxx-xxxxx-xxxxx...
```

---

### 群组文件夹与个人空间

**个人空间：**
```
文件（Files）
├── Documents
├── Photos
└── test
```

**群组文件夹：**
```
文件（Files）
└── 云平台开发部  ← 群组文件夹（共享空间）
    ├── 平台研发
    └── ...
```

**配置建议：**
- 如果使用群组文件夹，basePath 指向群组文件夹
- 如果使用个人空间，basePath 指向个人空间目录

---

## 调试技巧

### 1. 使用测试连接命令

在每次配置更改后，执行测试连接：
```
Ctrl + Shift + P → "NextCloud Doc Publisher: Test Connection"
```

### 2. 查看详细日志

测试连接会显示：
- 配置信息
- WebDAV URL
- 根目录文件列表
- 详细的错误信息

### 3. 逐步验证

按顺序检查：
1. URL 和认证 → 401/403 错误
2. 文件列表 → 空目录或权限问题
3. basePath 存在性 → 路径配置
4. 文件上传 → 实际发布

---

## 常见配置示例

### 示例 1：简单个人空间

```json
{
  "nextcloud": {
    "url": "https://nextcloud.example.com",
    "username": "john",
    "password": "xxxxx-xxxxx-xxxxx-xxxxx-xxxxx",
    "basePath": "/MyDocs"
  },
  "project": {
    "serviceName": "my-project",
    "version": "V1.0.0"
  }
}
```

### 示例 2：企业群组文件夹

```json
{
  "nextcloud": {
    "url": "https://docs.company.com",
    "username": "john",
    "password": "xxxxx-xxxxx-xxxxx-xxxxx-xxxxx",
    "basePath": "/开发部/研发中心/项目组"
  },
  "project": {
    "serviceName": "platform-service",
    "version": "V2.16.13"
  }
}
```

### 示例 3：特殊 WebDAV 用户名

```json
{
  "nextcloud": {
    "url": "https://docs.company.com",
    "username": "john",
    "webdavUsername": "john_1234",
    "password": "xxxxx-xxxxx-xxxxx-xxxxx-xxxxx",
    "basePath": "/TeamDocs"
  },
  "project": {
    "serviceName": "my-service",
    "version": "V1.0.0"
  }
}
```

---

## 获取帮助

如果问题仍未解决：

1. 查看 [NextCloud 配置指南](./NEXTCLOUD_CONFIG.md)
2. 查看 [应用专用密码指南](./APP_PASSWORD_GUIDE.md)
3. 查看插件输出日志（测试连接命令）
4. 在 GitHub 提交 Issue 并附上完整的测试连接日志

---

更多信息请查看 [README.md](../README.md)

