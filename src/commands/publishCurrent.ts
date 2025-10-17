import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '../services/config';
import { NextCloudService } from '../services/nextcloud';
import { MarkdownService } from '../services/markdown';
import { PublishResult, DocPublishConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * 发布当前文档命令
 */
export async function publishCurrent(uri?: vscode.Uri): Promise<void> {
  try {
    Logger.clear();
    Logger.info('========== 开始发布当前文档 ==========');
    Logger.show(); // 自动显示输出面板，方便用户查看日志

    // 1. 获取当前文档路径
    let markdownPath: string;
    
    if (uri) {
      // 从右键菜单调用
      markdownPath = uri.fsPath;
      Logger.info(`触发方式: 右键菜单`);
    } else {
      // 从命令面板或快捷键调用
      Logger.info(`触发方式: 命令面板/快捷键`);
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        const msg = '请先打开一个 Markdown 文档';
        Logger.error(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }
      markdownPath = editor.document.uri.fsPath;
    }

    // 验证是否为 Markdown 文件
    if (!markdownPath.endsWith('.md')) {
      const msg = '当前文件不是 Markdown 文档';
      Logger.error(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }

    Logger.info(`文档路径: ${markdownPath}`);

    // 2. 读取配置
    const config = await ConfigService.getConfig();
    if (!config) {
      const msg = '未找到配置，请先在设置中配置插件';
      Logger.error(msg);
      Logger.error('请按 Ctrl+Shift+P，搜索 "Preferences: Open Settings"，然后搜索 "docPublish" 进行配置');
      vscode.window.showErrorMessage(msg, '打开设置').then(action => {
        if (action === '打开设置') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'docPublish');
        }
      });
      return;
    }

    // 验证配置
    const errors = ConfigService.validateConfig(config);
    if (errors.length > 0) {
      vscode.window.showErrorMessage(`配置不完整: ${errors.join(', ')}`);
      return;
    }

    // 3. 获取工作区根路径
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('请先打开一个工作区');
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 4. 执行发布
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '发布文档到 NextCloud',
        cancellable: false
      },
      async (progress) => {
        return await publishDocument(
          markdownPath,
          workspaceRoot,
          config,
          progress
        );
      }
    );

    // 5. 显示结果
    if (result.success) {
      Logger.success(`文档发布成功: ${path.basename(markdownPath)}`);
      
      const message = [
        `✓ 文档发布成功！`,
        `📄 ${path.basename(markdownPath)}`,
        result.assetsUploaded ? `📎 资源文件: ${result.assetsUploaded}` : ''
      ].filter(Boolean).join('\n');

      const buttons = ['查看日志'];
      if (result.docUrl) {
        buttons.push('打开文档');
      }
      
      const action = await vscode.window.showInformationMessage(
        message,
        ...buttons
      );

      if (action === '查看日志') {
        Logger.show();
      } else if (action === '打开文档' && result.docUrl) {
        vscode.env.openExternal(vscode.Uri.parse(result.docUrl));
      }
    } else {
      Logger.error(`文档发布失败: ${result.message}`);
      
      const action = await vscode.window.showErrorMessage(
        `✗ 文档发布失败\n${result.message}`,
        '查看日志'
      );

      if (action === '查看日志') {
        Logger.show();
      }
    }

    Logger.info('========== 发布完成 ==========');
  } catch (error) {
    Logger.error('发布文档时发生错误', error as Error);
    vscode.window.showErrorMessage(`发布失败: ${(error as Error).message}`);
  }
}

/**
 * 发布单个文档的核心逻辑
 */
async function publishDocument(
  markdownPath: string,
  workspaceRoot: string,
  config: DocPublishConfig,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<PublishResult> {
  try {
    // 1. 初始化 NextCloud 服务
    progress.report({ message: '初始化 NextCloud 客户端...' });
    const nextCloudService = new NextCloudService(config.nextcloud);
    Logger.publishing('初始化 NextCloud 客户端');

    // 2. 获取文档所在目录的最后一级目录名
    const docDir = path.dirname(markdownPath);
    const lastDirName = path.basename(docDir);
    Logger.info(`文档所在目录: ${lastDirName}`);

    // 3. 扫描文档中引用的资源
    progress.report({ message: '扫描文档中引用的资源...' });
    Logger.publishing('扫描文档中引用的资源文件');
    const assets = MarkdownService.scanAssetReferences(markdownPath);

    // 4. 上传资源并获取分享链接
    let linkMap = new Map<string, string>();
    
    if (assets.length > 0) {
      progress.report({ message: `上传资源文件... (0/${assets.length})` });
      Logger.publishing(`准备上传 ${assets.length} 个引用的资源文件`);

      // 设置 NextCloud 路径: basePath/目录名/[serviceName]/assets/文件名
      const fullPath = ConfigService.getFullDocPath(config, lastDirName);

      assets.forEach(asset => {
        // 构建远程路径: basePath/目录名/[serviceName]/assets/文件名
        const remotePath = `${fullPath}/${asset.relativePath}`.replace(/\\/g, '/');
        asset.nextCloudPath = remotePath;
      });

      // 上传资源（默认覆盖）
      linkMap = await nextCloudService.uploadAssetsAndGetLinks(
        assets,
        (current, total, fileName) => {
          progress.report({ 
            message: `上传资源文件... (${current}/${total}) ${fileName}` 
          });
          Logger.publishing(`上传资源 (${current}/${total}): ${fileName}`);
        },
        true
      );

      Logger.success(`资源上传完成: ${linkMap.size}/${assets.length}`);
    } else {
      Logger.info('同级目录下没有资源文件，跳过资源上传');
    }

    // 5. 上传 Markdown 文档（直接上传原始文件）
    progress.report({ message: '上传 Markdown 文档...' });
    Logger.publishing('上传 Markdown 文档到 NextCloud');

    // 设置远程路径: basePath/目录名/[serviceName]/文件名
    const fullPath = ConfigService.getFullDocPath(config, lastDirName);
    const remotePath = `${fullPath}/${path.basename(markdownPath)}`.replace(/\\/g, '/');

    // 直接上传原始文档（默认覆盖）
    const uploadSuccess = await nextCloudService.uploadFile(markdownPath, remotePath, true);

    if (!uploadSuccess) {
      return {
        success: false,
        message: 'Markdown 文档上传失败'
      };
    }

    // 获取文档分享链接
    const docShareLink = await nextCloudService.createShareLink(remotePath);

    Logger.success('Markdown 文档上传成功');

    return {
      success: true,
      message: '文档发布成功',
      docUrl: docShareLink || undefined,
      assetsUploaded: linkMap.size
    };
  } catch (error) {
    Logger.error('发布文档失败', error as Error);
    return {
      success: false,
      message: (error as Error).message
    };
  }
}

