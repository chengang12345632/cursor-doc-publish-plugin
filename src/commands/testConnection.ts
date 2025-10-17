import * as vscode from 'vscode';
import { ConfigService } from '../services/config';
import { NextCloudService } from '../services/nextcloud';
import { Logger } from '../utils/logger';

/**
 * 测试 NextCloud 连接命令
 */
export async function testConnection(): Promise<void> {
  try {
    Logger.info('开始测试 NextCloud 连接...');

    // 读取配置
    const config = await ConfigService.getConfig();
    if (!config) {
      vscode.window.showErrorMessage('未找到配置，请先在设置中配置插件');
      return;
    }

    // 验证配置
    const errors = ConfigService.validateConfig(config);
    if (errors.length > 0) {
      vscode.window.showErrorMessage(`配置不完整: ${errors.join(', ')}`);
      return;
    }

    // 测试连接
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '测试 NextCloud 连接',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: '正在连接...' });

        const nextCloudService = new NextCloudService(config.nextcloud);
        const success = await nextCloudService.testConnection();

        if (success) {
          Logger.success('NextCloud 连接测试成功');
          vscode.window.showInformationMessage(
            `✓ NextCloud 连接成功！\n服务器: ${config.nextcloud.url}\n用户: ${config.nextcloud.username}`
          );
        } else {
          Logger.error('NextCloud 连接测试失败');
          vscode.window.showErrorMessage(
            '✗ NextCloud 连接失败，请检查配置和网络连接'
          );
        }
      }
    );
  } catch (error) {
    Logger.error('测试连接时发生错误', error as Error);
    vscode.window.showErrorMessage(`测试连接失败: ${(error as Error).message}`);
  }
}

