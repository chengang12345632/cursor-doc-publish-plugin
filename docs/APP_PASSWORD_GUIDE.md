# NextCloud 应用专用密码获取指南

## 为什么需要应用专用密码？

NextCloud 出于安全考虑，**WebDAV API 不接受登录密码**，必须使用应用专用密码（App Password）。

即使您的账户密码可以登录 NextCloud 网页，也不能用于 WebDAV API 访问。

## 如何获取应用专用密码？

### 第 1 步：登录 NextCloud

使用您的账户密码登录 NextCloud 网页版。

### 第 2 步：进入安全设置

1. 点击右上角的**用户头像**
2. 选择 **设置（Settings）**
3. 在左侧菜单中选择 **安全（Security）**

### 第 3 步：创建应用密码

1. 找到 **应用密码（App passwords）** 或 **设备与会话（Devices & sessions）** 部分
2. 在输入框中输入一个名称，例如：`Cursor Doc Publisher`
3. 点击 **创建（Create）** 按钮
4. **立即复制生成的密码**（通常是一串无空格的字符串）

**示例格式：**
```
xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

### 第 4 步：使用应用密码

将这个应用专用密码填入插件配置中的 `password` 字段：

**Cursor 设置：**
```
Ctrl + , → 搜索 "NextCloud Doc Publisher"
→ Password: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

**或配置文件：**
```json
{
  "nextcloud": {
    "password": "xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
  }
}
```

## 常见问题

### Q: 我忘记保存应用密码了怎么办？

A: 重新创建一个新的应用密码即可，旧的会自动失效。

### Q: 我可以使用同一个应用密码在多个设备上吗？

A: 可以，但建议为每个设备/应用创建独立的应用密码，便于管理和撤销。

### Q: 如何撤销应用密码？

A: 在安全设置页面，找到对应的应用密码，点击删除/撤销即可。

### Q: 为什么不能用登录密码？

A: 这是 NextCloud 的安全机制，防止密码泄露。应用密码可以随时撤销，而不影响主账户。

## 错误排查

### 403 Forbidden
- ✅ 确认使用的是**应用专用密码**而不是登录密码
- ✅ 确认 basePath 在 NextCloud 中已手动创建
- ✅ 确认用户有该目录的写入权限

### 401 Unauthorized
- ✅ 检查用户名是否正确
- ✅ 检查应用密码是否正确（重新复制，避免多余空格）
- ✅ 检查应用密码是否已被撤销
- ✅ 如果 NextCloud 提示使用 `username_数字` 格式，检查是否需要配置 WebDAV文件空间用户名

### 如何查看 WebDAV 地址？

1. 登录 NextCloud 网页版
2. 点击右下角**设置（齿轮图标）**
3. 在弹出菜单中找到 **"WebDAV"** 部分
4. 会显示类似：`https://nextcloud.com/remote.php/dav/files/username` 或 `username_数字`

**如果显示 `username_数字` 格式：**
- Username 填写：不带数字的用户名（如 `chengang`）
- WebDAV文件空间用户名 填写：完整的名称（如 `chengang_3074`）
- Password 使用：用不带数字的用户名创建的应用专用密码

---

更多信息请查看 [NEXTCLOUD_CONFIG.md](./NEXTCLOUD_CONFIG.md)

