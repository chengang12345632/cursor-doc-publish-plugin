import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ConfigService } from './services/config';
import { publishCurrent } from './commands/publishCurrent';
import { publishDirectory } from './commands/publishDirectory';
import { downloadFromNextcloud } from './commands/downloadFromNextcloud';
import { testConnection } from './commands/testConnection';

/**
 * 插件激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('NextCloud Doc Publisher 插件已激活');

  // 初始化日志
  Logger.initialize();
  Logger.info('NextCloud Doc Publisher 插件启动');

  // 注册命令：发布当前文档
  const publishCurrentCommand = vscode.commands.registerCommand(
    'docPublish.publishCurrent',
    async (uri?: vscode.Uri) => {
      await publishCurrent(uri, context);
    }
  );

  // 注册命令：批量发布目录
  const publishDirectoryCommand = vscode.commands.registerCommand(
    'docPublish.publishDirectory',
    async (uri?: vscode.Uri) => {
      await publishDirectory(uri, context);
    }
  );

  // 注册命令：从 NextCloud 下载到本地
  const downloadFromNextcloudCommand = vscode.commands.registerCommand(
    'docPublish.downloadFromNextcloud',
    async (uri?: vscode.Uri) => {
      await downloadFromNextcloud(uri, context);
    }
  );

  // 注册命令：测试连接
  const testConnectionCommand = vscode.commands.registerCommand(
    'docPublish.testConnection',
    async () => {
      await testConnection();
    }
  );

  // 注册命令：显示配置
  const showConfigCommand = vscode.commands.registerCommand(
    'docPublish.showConfiguration',
    async () => {
      await ConfigService.showConfiguration();
    }
  );

  // 添加到上下文，以便在插件停用时清理
  context.subscriptions.push(
    publishCurrentCommand,
    publishDirectoryCommand,
    downloadFromNextcloudCommand,
    testConnectionCommand,
    showConfigCommand
  );

  // 显示欢迎消息
  showWelcomeMessage(context);

  Logger.info('所有命令已注册完成');
}

/**
 * 插件停用时调用
 */
export function deactivate() {
  Logger.info('NextCloud Doc Publisher 插件停用');
  Logger.dispose();
}

/**
 * 显示欢迎消息（仅首次安装时）
 */
async function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  
  if (!hasShownWelcome) {
    const config = await ConfigService.getConfig();
    
    if (!config) {
      const action = await vscode.window.showInformationMessage(
        '欢迎使用 NextCloud Doc Publisher！\n请先配置插件以开始使用。',
        '打开设置',
        '查看文档'
      );

      if (action === '打开设置') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'docPublish');
      } else if (action === '查看文档') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/chengang12345632/cursor-doc-publish-plugin#readme')
        );
      }
    }

    await context.globalState.update('hasShownWelcome', true);
  }
}

