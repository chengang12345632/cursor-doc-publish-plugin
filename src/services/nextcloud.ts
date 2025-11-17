import { createClient, WebDAVClient } from 'webdav';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { NextCloudConfig, AssetInfo } from '../types';
import { Logger } from '../utils/logger';

/**
 * NextCloud 服务
 */
export class NextCloudService {
  private webdavClient: WebDAVClient;
  private httpClient: AxiosInstance;
  private config: NextCloudConfig;

  constructor(config: NextCloudConfig) {
    this.config = config;
    
    // 标准化 URL，移除末尾的斜杠
    const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    
    // WebDAV 文件空间用户名
    const webdavUser = config.webdavUsername;
    
    // 初始化 WebDAV 客户端
    const webdavUrl = `${baseUrl}/remote.php/dav/files/${webdavUser}`;
    this.webdavClient = createClient(webdavUrl, {
      username: config.username,  // 认证使用 username
      password: config.password
    });

    // 初始化 HTTP 客户端
    this.httpClient = axios.create({
      baseURL: baseUrl,
      auth: {
        username: config.username,
        password: config.password
      },
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'OCS-APIRequest': 'true'
      }
    });

    Logger.info('NextCloud 客户端初始化成功');
    Logger.debug(`WebDAV URL: ${webdavUrl}`);
  }

  /**
   * 测试连接
   */
  public async testConnection(): Promise<boolean> {
    try {
      Logger.info('测试 NextCloud 连接...');
      
      // 显示标准化后的 URL
      const baseUrl = this.config.url.endsWith('/') ? this.config.url.slice(0, -1) : this.config.url;
      const webdavUser = this.config.webdavUsername;
      const webdavUrl = `${baseUrl}/remote.php/dav/files/${webdavUser}`;
      
      Logger.info(`配置的 URL: ${this.config.url}`);
      if (this.config.url.endsWith('/')) {
        Logger.warn(`注意：URL 末尾有斜杠，已自动移除`);
      }
      Logger.info(`实际 WebDAV URL: ${webdavUrl}`);
      Logger.info(`认证用户名: ${this.config.username}`);
      Logger.info(`文件空间用户名: ${this.config.webdavUsername}`);
      
      const exists = await this.webdavClient.exists('/');
      if (exists) {
        Logger.success('✓ NextCloud 连接测试成功');
        
        // 列出根目录内容
        Logger.info('');
        Logger.info('正在列出根目录内容...');
        let contents: any[] = [];
        try {
          contents = await this.webdavClient.getDirectoryContents('/') as any[];
          Logger.info(`根目录下有 ${contents.length} 个项目：`);
          contents.forEach((item: any) => {
            const type = item.type === 'directory' ? '📁' : '📄';
            const name = item.basename;
            Logger.info(`  ${type} ${name}`);
          });
        } catch (listError) {
          Logger.error('无法列出根目录内容', listError as Error);
        }
        
        
        return true;
      }
      
      Logger.error('无法访问 NextCloud 根目录');
      return false;
    } catch (error) {
      Logger.error('NextCloud 连接测试失败', error as Error);
      Logger.error('常见原因：');
      Logger.error('  1. 使用了登录密码而不是应用专用密码');
      Logger.error('  2. URL、用户名或密码配置错误');
      Logger.error('  3. NextCloud 服务器不可访问');
      return false;
    }
  }

  private normalizeRemotePath(remotePath: string): string {
    if (!remotePath) {
      return '/';
    }

    const trimmed = remotePath.trim().replace(/\\/g, '/');
    if (!trimmed || trimmed === '/') {
      return '/';
    }

    const withoutTrailing = trimmed.replace(/\/+$/, '');
    const withLeading = withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`;
    return withLeading || '/';
  }

  /**
   * 创建目录（递归）
   */
  public async createDirectory(dirPath: string): Promise<boolean> {
    try {
      // 标准化路径
      const normalizedPath = dirPath.replace(/\\/g, '/');
      
      // 根目录不需要创建
      if (normalizedPath === '/' || normalizedPath === '') {
        return true;
      }

      // 确保路径以 / 开头
      const fullPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

      // 检查目录是否已存在
      const exists = await this.webdavClient.exists(fullPath);
      if (exists) {
        Logger.debug(`目录已存在: ${fullPath}`);
        return true;
      }

      // 递归创建父目录
      const parentDir = path.dirname(fullPath).replace(/\\/g, '/');
      if (parentDir && parentDir !== '/' && parentDir !== '.') {
        const parentCreated = await this.createDirectory(parentDir);
        if (!parentCreated) {
          Logger.error(`无法创建父目录: ${parentDir}`);
          return false;
        }
      }

      // 创建当前目录
      try {
        await this.webdavClient.createDirectory(fullPath);
        Logger.info(`创建目录成功: ${fullPath}`);
        return true;
      } catch (createError: any) {
        // 再次检查是否已存在（可能在创建过程中被其他进程创建）
        const existsNow = await this.webdavClient.exists(fullPath);
        if (existsNow) {
          Logger.debug(`目录在创建过程中已被创建: ${fullPath}`);
          return true;
        }
        
        // 记录详细错误信息
        const errorMsg = createError?.message || String(createError);
        const statusCode = createError?.response?.status;
        Logger.error(`创建目录失败: ${fullPath} (状态码: ${statusCode}, 错误: ${errorMsg})`);
        
        // 403 错误提示可能是权限或密码问题
        if (statusCode === 403) {
          Logger.error(`提示：403 错误通常是因为：`);
          Logger.error(`  1. 使用了登录密码而不是应用专用密码`);
          Logger.error(`  2. 用户没有在该目录的写入权限`);
        }
        
        throw createError;
      }
    } catch (error) {
      Logger.error(`创建目录失败: ${dirPath}`, error as Error);
      return false;
    }
  }

  /**
   * 上传文件
   */
  public async uploadFile(localPath: string, remotePath: string, overwriteExisting: boolean = true): Promise<boolean> {
    try {
      // 确保远程目录存在
      const remoteDir = path.dirname(remotePath);
      await this.createDirectory(remoteDir);

      // 读取文件内容
      const fileContent = fs.readFileSync(localPath);

      // 检查文件是否已存在
      const fileExists = await this.webdavClient.exists(remotePath);
      
      if (fileExists && !overwriteExisting) {
        Logger.info(`文件已存在，跳过上传: ${remotePath}`);
        return true;
      }
      
      if (fileExists && overwriteExisting) {
        Logger.info(`文件已存在，将覆盖: ${remotePath}`);
      }
      
      // 上传文件
      await this.webdavClient.putFileContents(remotePath, fileContent, {
        overwrite: overwriteExisting,
        headers: fileExists && overwriteExisting ? {
          // 如果文件已存在且要覆盖，强制覆盖（不检查 ETag）
          'If-Match': '*'
        } : {
          // 如果文件不存在或不允许覆盖，使用 If-None-Match 确保不冲突
          'If-None-Match': '*'
        }
      });

      Logger.success(`${fileExists ? '覆盖' : '上传'}文件成功: ${remotePath}`);
      return true;
    } catch (error) {
      Logger.error(`上传文件失败: ${remotePath}`, error as Error);
      return false;
    }
  }

  /**
   * 批量上传文件
   */
  public async uploadFiles(
    files: Array<{ localPath: string; remotePath: string }>,
    onProgress?: (current: number, total: number, fileName: string) => void,
    overwriteExisting: boolean = true
  ): Promise<boolean> {
    let successCount = 0;
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = path.basename(file.localPath);
      
      if (onProgress) {
        onProgress(i + 1, total, fileName);
      }

      const success = await this.uploadFile(file.localPath, file.remotePath, overwriteExisting);
      if (success) {
        successCount++;
      }
    }

    Logger.info(`批量上传完成: ${successCount}/${total}`);
    return successCount === total;
  }

  /**
   * 创建分享链接
   */
  public async createShareLink(filePath: string): Promise<string | null> {
    try {
      const response = await this.httpClient.post(
        '/ocs/v2.php/apps/files_sharing/api/v1/shares',
        {
          path: filePath,
          shareType: 3, // 公开链接
          permissions: 1 // 只读
        },
        {
          params: {
            format: 'json'
          }
        }
      );

      if (response.data?.ocs?.data?.url) {
        const shareUrl = response.data.ocs.data.url;
        Logger.info(`创建分享链接成功: ${filePath} -> ${shareUrl}`);
        return shareUrl;
      }

      Logger.error(`创建分享链接失败: ${filePath}，响应无效`);
      return null;
    } catch (error) {
      // 如果链接已存在，尝试获取现有链接
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 403) {
        Logger.warn(`分享链接可能已存在，尝试获取现有链接: ${filePath}`);
        return await this.getExistingShareLink(filePath);
      }
      
      Logger.error(`创建分享链接失败: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * 获取或创建分享链接（优先复用已存在的链接）
   */
  public async getOrCreateShareLink(filePath: string): Promise<string | null> {
    const existing = await this.getExistingShareLink(filePath);
    if (existing) {
      Logger.info(`复用已存在的分享链接: ${filePath} -> ${existing}`);
      return existing;
    }
    return await this.createShareLink(filePath);
  }

  /**
   * 下载单个文件到本地
   */
  public async downloadFile(
    remotePath: string,
    localPath: string,
    overwriteExisting: boolean = true
  ): Promise<boolean> {
    try {
      const normalizedRemotePath = this.normalizeRemotePath(remotePath);
      const remoteExists = await this.webdavClient.exists(normalizedRemotePath);

      if (!remoteExists) {
        Logger.error(`远程文件不存在: ${normalizedRemotePath}`);
        return false;
      }

      if (!overwriteExisting && fs.existsSync(localPath)) {
        Logger.info(`Local file already exists, skipping download: ${localPath}`);
        return true; // Return true to indicate successful skip (not an error)
      }

      const rawData = await this.webdavClient.getFileContents(normalizedRemotePath, {
        format: 'binary'
      });

      const fileBuffer = Buffer.isBuffer(rawData)
        ? rawData
        : Buffer.from(rawData as ArrayBuffer);

      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, fileBuffer);

      Logger.info(`下载文件成功: ${normalizedRemotePath} -> ${localPath}`);
      return true;
    } catch (error) {
      Logger.error(`下载文件失败: ${remotePath}`, error as Error);
      return false;
    }
  }

  /**
   * 下载远程目录到本地
   */
  public async downloadDirectory(
    remoteDir: string,
    localDir: string,
    overwriteExisting: boolean = true,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<{ success: boolean; downloaded: number; total: number; errors: string[] }> {
    try {
      const normalizedRemoteDir = this.normalizeRemotePath(remoteDir);
      const targetRemoteDir = normalizedRemoteDir === '' ? '/' : normalizedRemoteDir;

      const remoteExists = await this.webdavClient.exists(targetRemoteDir || '/');
      if (!remoteExists) {
        const message = `远程目录不存在: ${targetRemoteDir}`;
        Logger.error(message);
        return { success: false, downloaded: 0, total: 0, errors: [message] };
      }

      const contents = await this.webdavClient.getDirectoryContents(targetRemoteDir || '/', {
        deep: true
      }) as Array<{ type: string; filename: string; basename: string }>;

      const files = contents.filter(item => item.type === 'file');
      const total = files.length;

      if (total === 0) {
        Logger.warn(`远程目录中没有文件: ${targetRemoteDir}`);
        fs.mkdirSync(localDir, { recursive: true });
        return { success: true, downloaded: 0, total: 0, errors: [] };
      }

      fs.mkdirSync(localDir, { recursive: true });

      let downloaded = 0;
      let skipped = 0;
      const errors: string[] = [];
      const baseForRelative = targetRemoteDir === '' ? '/' : targetRemoteDir;

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const remoteFilePath = this.normalizeRemotePath(item.filename);
        const relativePosix = path.posix.relative(
          baseForRelative === '' ? '/' : baseForRelative,
          remoteFilePath
        );
        const relativeSegments = relativePosix
          .split('/')
          .filter(segment => segment && segment !== '.');
        const localFilePath = path.join(localDir, ...relativeSegments);

        if (onProgress) {
          onProgress(i + 1, total, item.basename);
        }

        const fileExistedBefore = fs.existsSync(localFilePath);
        const success = await this.downloadFile(remoteFilePath, localFilePath, overwriteExisting);

        if (success) {
          // Check if file was actually downloaded or skipped
          if (!overwriteExisting && fileExistedBefore) {
            skipped += 1;
          } else {
            downloaded += 1;
          }
        } else {
          errors.push(remoteFilePath);
        }
      }

      const success = errors.length === 0;
      if (success) {
        if (skipped > 0) {
          Logger.success(`Directory download completed: ${downloaded} downloaded, ${skipped} skipped out of ${total} files`);
        } else {
          Logger.success(`Directory download completed: ${downloaded}/${total} files`);
        }
      } else {
        Logger.warn(`Directory download completed with errors: ${downloaded} downloaded, ${skipped} skipped, ${errors.length} failed out of ${total} files`);
      }

      return { success, downloaded, total, errors };
    } catch (error) {
      Logger.error(`下载目录失败: ${remoteDir}`, error as Error);
      return { success: false, downloaded: 0, total: 0, errors: [(error as Error).message] };
    }
  }

  /**
   * 获取已存在的分享链接
   */
  private async getExistingShareLink(filePath: string): Promise<string | null> {
    try {
      const response = await this.httpClient.get(
        '/ocs/v2.php/apps/files_sharing/api/v1/shares',
        {
          params: {
            format: 'json',
            path: filePath,
            reshares: true
          }
        }
      );

      const shares = response.data?.ocs?.data;
      if (Array.isArray(shares) && shares.length > 0) {
        // 找到公开链接（shareType = 3）
        // NextCloud API 使用 snake_case 命名
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const publicShare = shares.find(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          (share: { share_type?: number; url?: string }) => share.share_type === 3
        );
        if (publicShare?.url) {
          Logger.info(`获取现有分享链接成功: ${filePath} -> ${publicShare.url}`);
          return publicShare.url;
        }
      }

      return null;
    } catch (error) {
      Logger.error(`获取现有分享链接失败: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * 批量创建分享链接
   */
  public async createShareLinks(
    filePaths: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    const linkMap = new Map<string, string>();
    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      if (onProgress) {
        onProgress(i + 1, total);
      }

      const shareLink = await this.createShareLink(filePath);
      if (shareLink) {
        linkMap.set(filePath, shareLink);
      }
    }

    Logger.info(`批量创建分享链接完成: ${linkMap.size}/${total}`);
    return linkMap;
  }

  /**
   * 获取直接下载链接
   */
  public getDirectDownloadLink(shareUrl: string): string {
    // NextCloud 分享链接格式: https://nextcloud.example.com/s/TOKEN
    // 直接下载链接格式: https://nextcloud.example.com/s/TOKEN/download
    if (shareUrl.endsWith('/')) {
      return `${shareUrl}download`;
    }
    return `${shareUrl}/download`;
  }

  /**
   * 上传资源并获取映射表
   */
  public async uploadAssetsAndGetLinks(
    assets: AssetInfo[],
    onProgress?: (current: number, total: number, fileName: string) => void,
    overwriteExisting: boolean = true
  ): Promise<Map<string, string>> {
    // 1. 上传所有资源
    const uploadFiles = assets.map(asset => ({
      localPath: asset.localPath,
      remotePath: asset.nextCloudPath
    }));

    await this.uploadFiles(uploadFiles, onProgress, overwriteExisting);

    // 2. 创建分享链接
    const remotePaths = assets.map(asset => asset.nextCloudPath);
    const linkMap = await this.createShareLinks(remotePaths);

    // 3. 构建相对路径到下载链接的映射
    const resultMap = new Map<string, string>();
    assets.forEach(asset => {
      const shareLink = linkMap.get(asset.nextCloudPath);
      if (shareLink) {
        // 使用直接下载链接
        const downloadLink = this.getDirectDownloadLink(shareLink);
        resultMap.set(asset.relativePath, downloadLink);
      }
    });

    return resultMap;
  }

  /**
   * 获取文件夹分享链接
   */
  public async getFolderShareLink(folderPath: string): Promise<string | null> {
    return await this.createShareLink(folderPath);
  }
}

