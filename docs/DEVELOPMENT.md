# 开发指南

完整的开发文档，包含环境设置、构建、测试、贡献等内容。

## 环境设置

### 前置要求
- Node.js 16+
- npm 或 yarn
- Cursor IDE

### 快速开始

```bash
# 克隆项目
git clone https://github.com/chengang-97/cursor-doc-publish-plugin.git
cd cursor-doc-publish-plugin

# 安装依赖
npm install

# 编译
npm run compile

# 启动 watch 模式
npm run watch
```

## 项目结构

```
cursor-doc-publish-plugin/
├── src/
│   ├── extension.ts          # 插件入口
│   ├── types.ts              # 类型定义
│   ├── commands/             # 命令处理器
│   ├── services/             # 服务层
│   └── utils/                # 工具函数
├── package.json              # 项目配置
└── tsconfig.json             # TypeScript 配置
```

## 调试

### 方式一：F5 调试（推荐）

1. 在 Cursor 中打开项目
2. 按 `F5` 启动调试
3. 会打开新的 Cursor 窗口（扩展开发宿主）
4. 在新窗口中测试插件功能

### 方式二：Watch 模式

```bash
npm run watch
```

然后按 `F5` 启动调试。

## 测试

### 测试配置

在扩展开发宿主中配置：

```json
{
  "nextcloud": {
    "url": "https://your-nextcloud.com",
    "username": "test-user",
    "password": "test-password",
    "basePath": "/TestDocs"
  },
  "project": {
    "serviceName": "test-service",
    "version": "V1.0.0"
  }
}
```

### 测试流程

1. 创建测试文档和资源
2. 测试连接：`Test Connection`
3. 测试单文档发布
4. 测试批量发布
5. 验证 NextCloud 上的文件

## 构建和打包

```bash
# 编译
npm run compile

# 代码检查
npm run lint

# 打包
npm install -g @vscode/vsce
npm run package
```

## 贡献指南

### 提交 PR 前

1. 确保代码通过编译：`npm run compile`
2. 运行代码检查：`npm run lint`
3. 手动测试所有功能
4. 更新相关文档

### Commit 规范

```
<type>(<scope>): <subject>

类型：
- feat: 新功能
- fix: Bug 修复
- docs: 文档更新
- refactor: 重构
- test: 测试相关
```

## 代码规范

- TypeScript 严格模式
- ESLint 检查
- 单一职责原则
- 完整的类型定义
- 详细的错误处理

## 发布流程

1. 更新版本：`npm version [major|minor|patch]`
2. 更新 `CHANGELOG.md`
3. 提交更改
4. 创建标签：`git tag vx.x.x`
5. 推送：`git push && git push --tags`
6. 打包：`npm run package`
7. 发布：`vsce publish`

## 常见问题

### 编译错误

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### 插件不生效

1. 检查 `activationEvents` 配置
2. 重新加载窗口：`Cmd/Ctrl + R`
3. 查看开发者工具控制台错误

---

更多信息请查看项目 README.md

