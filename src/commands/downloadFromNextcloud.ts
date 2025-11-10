import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '../services/config';
import { NextCloudService } from '../services/nextcloud';
import { Logger } from '../utils/logger';
import { showDirectorySelector } from '../utils/directorySelector';
import {
  getRemotePathSuggestion,
  normalizeRemoteDirectory,
  joinRemotePath
} from '../utils/pathHelper';

interface DownloadSummary {
  success: boolean;
  downloaded: number;
  total: number;
  errors: string[];
}

export async function downloadFromNextcloud(
  uri?: vscode.Uri,
  context?: vscode.ExtensionContext
): Promise<void> {
  try {
    Logger.clear();
    Logger.info('========== 开始从 NextCloud 下载 ==========');
    Logger.show();

    let targetPath: string | undefined;

    if (uri) {
      targetPath = uri.fsPath;
      Logger.info(`目标路径: ${targetPath}`);
    } else {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: '选择本地目标（文件或目录）'
      });

      if (!selected || selected.length === 0) {
        Logger.info('用户取消了目标选择');
        return;
      }

      targetPath = selected[0].fsPath;
      Logger.info(`目标路径: ${targetPath}`);
    }

    if (!targetPath) {
      return;
    }

    const exists = fs.existsSync(targetPath);
    const stats = exists ? fs.lstatSync(targetPath) : undefined;
    const isDirectory = stats ? stats.isDirectory() : false;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('请先打开一个工作区');
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    if (!context) {
      vscode.window.showErrorMessage('插件上下文未提供，无法选择远程目录');
      return;
    }

    const localBaseDirectory = isDirectory ? targetPath : path.dirname(targetPath);
    const defaultRemoteDir = getRemotePathSuggestion(workspaceRoot, localBaseDirectory);

    const remoteDirectory = await showDirectorySelector(
      context,
      '输入 NextCloud 目录（例如：/Docs/V2.16.13/design）',
      defaultRemoteDir
    );

    if (!remoteDirectory) {
      Logger.info('用户取消了远程目录选择');
      return;
    }

    Logger.info(`选择的远程目录: ${remoteDirectory}`);
    const normalizedRemoteDir = normalizeRemoteDirectory(remoteDirectory);

    const config = await ConfigService.getConfig();
    if (!config) {
      const msg = '未找到配置，请先在设置中配置插件';
      Logger.error(msg);
      vscode.window.showErrorMessage(msg, '打开设置').then(action => {
        if (action === '打开设置') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'docPublish');
        }
      });
      return;
    }

    const errors = ConfigService.validateConfig(config);
    if (errors.length > 0) {
      const msg = `配置不完整: ${errors.join(', ')}`;
      Logger.error(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }

    let overwriteExisting = true;
    if (exists) {
      const promptMessage = isDirectory
        ? `本地目录已存在：${targetPath}\n覆盖将会替换同名文件，是否继续？`
        : `本地文件已存在：${targetPath}\n是否覆盖？`;

      const choice = await vscode.window.showWarningMessage(
        promptMessage,
        { modal: true },
        '覆盖',
        '取消'
      );

      if (choice !== '覆盖') {
        Logger.info('用户取消了下载操作');
        return;
      }

      overwriteExisting = true;
    }

    if (!exists && isDirectory) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    if (!exists && !isDirectory) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    const nextCloudService = new NextCloudService(config.nextcloud);

    const summary = await vscode.window.withProgress<DownloadSummary>(
      {
        location: vscode.ProgressLocation.Notification,
        title: '从 NextCloud 下载',
        cancellable: false
      },
      async (progress) => {
        if (isDirectory) {
          progress.report({ message: '准备下载目录...' });
          return await nextCloudService.downloadDirectory(
            normalizedRemoteDir,
            targetPath,
            overwriteExisting,
            (current, total, fileName) => {
              progress.report({ message: `下载 ${fileName} (${current}/${total})` });
            }
          );
        }

        progress.report({ message: '下载文件...' });
        const remoteFilePath = joinRemotePath(normalizedRemoteDir, path.basename(targetPath));
        const success = await nextCloudService.downloadFile(
          remoteFilePath,
          targetPath,
          overwriteExisting
        );

        return {
          success,
          downloaded: success ? 1 : 0,
          total: 1,
          errors: success ? [] : [`下载失败: ${remoteFilePath}`]
        };
      }
    );

    if (summary.success) {
      const message = isDirectory
        ? `✓ 下载完成：${summary.downloaded}/${summary.total}`
        : '✓ 文件下载完成';
      vscode.window.showInformationMessage(message, '查看日志').then(action => {
        if (action === '查看日志') {
          Logger.show();
        }
      });
    } else {
      Logger.error(`下载过程中存在失败: ${summary.errors.join(', ')}`);
      vscode.window.showErrorMessage(
        '部分文件下载失败，详情请查看日志',
        '查看日志'
      ).then(action => {
        if (action === '查看日志') {
          Logger.show();
        }
      });
    }

    Logger.info('========== 下载完成 ==========');
  } catch (error) {
    Logger.error('下载文件时发生错误', error as Error);
    vscode.window.showErrorMessage(`下载失败: ${(error as Error).message}`);
  }
}


