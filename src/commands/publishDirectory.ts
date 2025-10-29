import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '../services/config';
import { NextCloudService } from '../services/nextcloud';
import { MarkdownService } from '../services/markdown';
import { BatchPublishResult, PublishResult, DocPublishConfig, AssetInfo } from '../types';
import { Logger } from '../utils/logger';
import { showDirectorySelector } from '../utils/directorySelector';

/**
 * 批量发布目录命令
 */
export async function publishDirectory(
  uri?: vscode.Uri,
  context?: vscode.ExtensionContext
): Promise<void> {
  try {
    Logger.clear();
    Logger.info('========== 开始批量发布目录 ==========');
    Logger.show(); // 自动显示输出面板

    // 1. 获取目录路径
    let directoryPath: string;
    
    if (uri) {
      // 从右键菜单调用
      directoryPath = uri.fsPath;
      Logger.info(`触发方式: 右键菜单`);
    } else {
      // 从命令面板调用，让用户选择目录
      Logger.info(`触发方式: 命令面板`);
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: '选择文档目录'
      });

      if (!selected || selected.length === 0) {
        Logger.info('用户取消了目录选择');
        return;
      }

      directoryPath = selected[0].fsPath;
    }

    Logger.info(`目录路径: ${directoryPath}`);

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
      const msg = `配置不完整: ${errors.join(', ')}`;
      Logger.error(msg);
      vscode.window.showErrorMessage(msg, '打开设置').then(action => {
        if (action === '打开设置') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'docPublish');
        }
      });
      return;
    }

    // 3. 获取上传目录
    if (!context) {
      vscode.window.showErrorMessage('插件上下文未提供，无法选择上传目录');
      return;
    }

    const uploadDirectory = await showDirectorySelector(
      context,
      '输入或选择上传目录（例如：/Docs/V2.16.13/design）'
    );

    if (!uploadDirectory) {
      Logger.info('用户取消了目录选择');
      return;
    }

    Logger.info(`选择的上传目录: ${uploadDirectory}`);

    // 4. 获取工作区根路径
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('请先打开一个工作区');
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 5. 执行批量发布
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '批量发布文档到 NextCloud',
        cancellable: false
      },
      async (progress) => {
        return await publishDirectoryDocuments(
          directoryPath,
          workspaceRoot,
          uploadDirectory,
          config,
          progress
        );
      }
    );

    // 5. 显示结果
    if (result.successDocs > 0) {
      Logger.success(
        `批量发布完成: 成功 ${result.successDocs}/${result.totalDocs}，资源文件 ${result.totalAssets}`
      );
      
      const message = [
        `✓ 批量发布完成！`,
        `📄 文档: ${result.successDocs}/${result.totalDocs}`,
        `📎 资源: ${result.totalAssets}`,
        result.failedDocs > 0 ? `⚠️ 失败: ${result.failedDocs}` : ''
      ].filter(Boolean).join('\n');

      const action = await vscode.window.showInformationMessage(
        message,
        '查看日志',
        '查看详情'
      );

      if (action === '查看日志') {
        Logger.show();
      } else if (action === '查看详情') {
        showBatchPublishDetails(result);
      }
    } else {
      Logger.error('批量发布失败，所有文档都未能成功发布');
      
      const action = await vscode.window.showErrorMessage(
        `✗ 批量发布失败\n未能发布任何文档`,
        '查看日志'
      );

      if (action === '查看日志') {
        Logger.show();
      }
    }

    Logger.info('========== 批量发布完成 ==========');
  } catch (error) {
    Logger.error('批量发布时发生错误', error as Error);
    vscode.window.showErrorMessage(`批量发布失败: ${(error as Error).message}`);
  }
}

/**
 * 批量发布目录文档的核心逻辑
 */
async function publishDirectoryDocuments(
  directoryPath: string,
  workspaceRoot: string,
  uploadDirectory: string,
  config: DocPublishConfig,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<BatchPublishResult> {
  try {
    // 1. 扫描所有 Markdown 文件
    progress.report({ message: '扫描 Markdown 文件...' });
    Logger.publishing('扫描目录下的所有 Markdown 文件');
    const markdownFiles = MarkdownService.scanMarkdownFiles(directoryPath);

    if (markdownFiles.length === 0) {
      return {
        totalDocs: 0,
        successDocs: 0,
        failedDocs: 0,
        totalAssets: 0,
        results: []
      };
    }

    Logger.info(`找到 ${markdownFiles.length} 个 Markdown 文件`);

    // 2. 初始化 NextCloud 服务
    progress.report({ message: '初始化 NextCloud 客户端...' });
    const nextCloudService = new NextCloudService(config.nextcloud);
    Logger.publishing('初始化 NextCloud 客户端');

    // 3. 标准化上传目录
    const normalizedDir = uploadDirectory.trim().replace(/\/$/, ''); // 去除末尾斜杠
    const baseDir = normalizedDir.startsWith('/') ? normalizedDir : `/${normalizedDir}`;
    Logger.info(`上传目录: ${baseDir}`);

    // 4. 收集所有文档引用的资源文件
    progress.report({ message: '收集文档引用的资源...' });
    Logger.publishing('收集所有文档引用的资源文件');
    
    // 收集所有文档引用的资源（去重）
    const allAssetsMap = new Map<string, AssetInfo>();
    markdownFiles.forEach(mdFile => {
      const assets = MarkdownService.scanAssetReferences(mdFile);
      assets.forEach(asset => {
        // 使用本地路径作为唯一标识，避免重复
        if (!allAssetsMap.has(asset.localPath)) {
          allAssetsMap.set(asset.localPath, asset);
        }
      });
    });
    const allAssets = Array.from(allAssetsMap.values());

    // 5. 批量上传资源
    let linkMap = new Map<string, string>();
    
    if (allAssets.length > 0) {
      progress.report({ message: `批量上传资源... (0/${allAssets.length})` });
      Logger.publishing(`准备批量上传 ${allAssets.length} 个引用的资源文件`);

      allAssets.forEach(asset => {
        // 构建远程路径: {uploadDirectory}/assets/文件名
        const remotePath = `${baseDir}/assets/${asset.fileName}`.replace(/\\/g, '/');
        asset.nextCloudPath = remotePath;
      });

      // 批量上传（默认覆盖）
      linkMap = await nextCloudService.uploadAssetsAndGetLinks(
        allAssets,
        (current, total, fileName) => {
          progress.report({ 
            message: `批量上传资源... (${current}/${total}) ${fileName}` 
          });
          Logger.publishing(`上传资源 (${current}/${total}): ${fileName}`);
        },
        true
      );

      Logger.success(`资源批量上传完成: ${linkMap.size}/${allAssets.length}`);
    } else {
      Logger.info('目录中没有资源文件，跳过资源上传');
    }

    // 6. 逐个处理 Markdown 文件
    const results: PublishResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < markdownFiles.length; i++) {
      const markdownPath = markdownFiles[i];
      const fileName = path.basename(markdownPath);
      
      progress.report({ 
        message: `处理文档 (${i + 1}/${markdownFiles.length}): ${fileName}` 
      });
      Logger.publishing(`处理文档 (${i + 1}/${markdownFiles.length}): ${fileName}`);

      const result = await processMarkdownFile(
        markdownPath,
        directoryPath,
        baseDir,
        nextCloudService,
        linkMap
      );

      results.push(result);
      
      if (result.success) {
        successCount++;
        Logger.success(`✓ ${fileName}`);
      } else {
        failedCount++;
        Logger.error(`✗ ${fileName}: ${result.message}`);
      }
    }

    // 7. 获取文档目录的分享链接
    if (successCount > 0) {
      await nextCloudService.getFolderShareLink(baseDir);
    }

    return {
      totalDocs: markdownFiles.length,
      successDocs: successCount,
      failedDocs: failedCount,
      totalAssets: linkMap.size,
      results
    };
  } catch (error) {
    Logger.error('批量发布失败', error as Error);
    return {
      totalDocs: 0,
      successDocs: 0,
      failedDocs: 0,
      totalAssets: 0,
      results: []
    };
  }
}

/**
 * 处理单个 Markdown 文件（直接上传原始文件）
 */
async function processMarkdownFile(
  markdownPath: string,
  directoryPath: string,
  baseDir: string,
  nextCloudService: NextCloudService,
  linkMap: Map<string, string>
): Promise<PublishResult> {
  try {
    // 获取文件相对于选择目录的路径
    const relativeToDir = path.relative(directoryPath, markdownPath).replace(/\\/g, '/');
    
    // 设置远程路径: {uploadDirectory}/相对路径
    const remotePath = `${baseDir}/${relativeToDir}`.replace(/\\/g, '/');

    // 直接上传原始文档（默认覆盖）
    const uploadSuccess = await nextCloudService.uploadFile(markdownPath, remotePath, true);

    if (!uploadSuccess) {
      return {
        success: false,
        message: '文档上传失败'
      };
    }

    return {
      success: true,
      message: '发布成功'
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message
    };
  }
}

/**
 * 显示批量发布详情
 */
async function showBatchPublishDetails(result: BatchPublishResult): Promise<void> {
  const details: string[] = [
    '### 批量发布详情',
    '',
    `**总计:**`,
    `- 文档总数: ${result.totalDocs}`,
    `- 成功: ${result.successDocs}`,
    `- 失败: ${result.failedDocs}`,
    `- 资源文件: ${result.totalAssets}`,
    '',
    `**详细结果:**`
  ];

  result.results.forEach((res, index) => {
    const status = res.success ? '✓' : '✗';
    details.push(`${index + 1}. ${status} ${res.message}`);
  });

  const doc = await vscode.workspace.openTextDocument({
    content: details.join('\n'),
    language: 'markdown'
  });

  await vscode.window.showTextDocument(doc, { preview: true });
}

