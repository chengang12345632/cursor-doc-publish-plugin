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
  private basePath: string;

  constructor(config: NextCloudConfig) {
    this.config = config;
    this.basePath = config.basePath;
    
    // 标准化 URL，移除末尾的斜杠
    const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    
    // WebDAV 文件空间用户名（如果配置了 webdavUsername 则使用它，否则使用 username）
    const webdavUser = config.webdavUsername || config.username;
    
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
      const webdavUser = this.config.webdavUsername || this.config.username;
      const webdavUrl = `${baseUrl}/remote.php/dav/files/${webdavUser}`;
      
      Logger.info(`配置的 URL: ${this.config.url}`);
      if (this.config.url.endsWith('/')) {
        Logger.warn(`注意：URL 末尾有斜杠，已自动移除`);
      }
      Logger.info(`实际 WebDAV URL: ${webdavUrl}`);
      Logger.info(`认证用户名: ${this.config.username}`);
      if (this.config.webdavUsername) {
        Logger.info(`文件空间用户名: ${this.config.webdavUsername}`);
      }
      Logger.info(`Base Path: ${this.basePath}`);
      
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
        
        Logger.info('');
        Logger.info('正在检查 basePath 是否存在...');
        
        const basePathExists = await this.webdavClient.exists(this.basePath);
        if (basePathExists) {
          Logger.success(`✓ Base Path 存在: ${this.basePath}`);
        } else {
          Logger.error(`✗ Base Path 不存在: ${this.basePath}`);
          Logger.error(``);
          Logger.error(`📋 诊断结果：`);
          Logger.error(`  - WebDAV 连接成功`);
          Logger.error(`  - 但个人空间是空的（0 个文件/文件夹）`);
          Logger.error(``);
          Logger.error(`🤔 可能的原因：`);
          Logger.error(`  1. 您的 NextCloud 个人空间从未使用过（全新账户）`);
          Logger.error(`  2. 您在网页版看到的文件在"群组文件夹"或"共享空间"`);
          Logger.error(`  3. NextCloud 配置了特殊的文件空间结构`);
          Logger.error(``);
          Logger.error(`💡 解决方案：`);
          Logger.error(`  方案 1：在 NextCloud 网页版的个人空间根目录创建 "${this.basePath.replace('/', '')}" 文件夹`);
          Logger.error(`         登录 → 左侧"文件（Files）" → 确保在根目录 → 新建文件夹`);
          Logger.error(``);
          Logger.error(`  方案 2：如果您的文件在群组文件夹中，修改 basePath 配置：`);
          Logger.error(`         例如：/云平台开发部/平台研发/业务中台组`);
          Logger.error(``);
          Logger.error(`  方案 3：尝试使用插件创建测试目录（下一步）`);
        }
        
        // 提供创建目录的选项
        if (!basePathExists && contents.length === 0) {
          Logger.info(``);
          Logger.info(`📝 尝试创建测试目录...`);
          
          try {
            // 尝试创建 basePath
            await this.webdavClient.createDirectory(this.basePath);
            Logger.success(`✓ 成功创建目录: ${this.basePath}`);
            Logger.info(``);
            Logger.info(`🎉 好消息！`);
            Logger.info(`   - 目录创建成功`);
            Logger.info(`   - 现在请刷新 NextCloud 网页版，看看 "${this.basePath.replace('/', '')}" 文件夹是否出现`);
            Logger.info(`   - 如果出现了，说明配置正确，可以开始使用插件了`);
            Logger.info(`   - 如果没出现，说明 WebDAV 空间和网页版不是同一个空间`);
          } catch (createError: any) {
            Logger.error(`✗ 创建目录失败: ${this.basePath}`);
            Logger.error(`   错误: ${createError.message || String(createError)}`);
            Logger.error(``);
            Logger.error(`📌 建议：`);
            Logger.error(`   1. 检查您的 NextCloud 账户是否有创建目录的权限`);
            Logger.error(`   2. 或者，在网页版手动创建目录后再试`);
            Logger.error(`   3. 如果您的文件在群组文件夹，修改 basePath 配置指向群组文件夹`);
          }
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

  /**
   * 创建目录（递归）
   * 注意：basePath 必须预先存在，插件只创建 basePath 下的子目录
   */
  public async createDirectory(dirPath: string): Promise<boolean> {
    try {
      // 标准化路径
      const normalizedPath = dirPath.replace(/\\/g, '/');
      const normalizedBasePath = this.basePath.replace(/\\/g, '/');
      
      // 根目录不需要创建
      if (normalizedPath === '/' || normalizedPath === '') {
        return true;
      }

      // 如果是 basePath 本身，验证其是否存在而不尝试创建
      if (normalizedPath === normalizedBasePath) {
        const exists = await this.webdavClient.exists(normalizedPath);
        if (!exists) {
          Logger.error(`Base Path 不存在，请在 NextCloud 中手动创建: ${normalizedPath}`);
          Logger.error(`提示：登录 NextCloud → 文件 → 新建文件夹 → 创建 "${normalizedBasePath}"`);
          return false;
        }
        Logger.debug(`Base Path 已存在: ${normalizedPath}`);
        return true;
      }

      // 如果路径不在 basePath 下，拒绝创建
      if (!normalizedPath.startsWith(normalizedBasePath + '/')) {
        Logger.error(`路径不在 basePath 范围内，拒绝创建: ${normalizedPath}`);
        Logger.error(`basePath: ${normalizedBasePath}`);
        return false;
      }

      // 检查目录是否已存在
      const exists = await this.webdavClient.exists(normalizedPath);
      if (exists) {
        Logger.debug(`目录已存在: ${normalizedPath}`);
        return true;
      }

      // 递归创建父目录
      const parentDir = path.dirname(normalizedPath).replace(/\\/g, '/');
      if (parentDir && parentDir !== '/' && parentDir !== '.') {
        const parentCreated = await this.createDirectory(parentDir);
        if (!parentCreated) {
          Logger.error(`无法创建父目录: ${parentDir}`);
          return false;
        }
      }

      // 创建当前目录
      try {
        await this.webdavClient.createDirectory(normalizedPath);
        Logger.info(`创建目录成功: ${normalizedPath}`);
        return true;
      } catch (createError: any) {
        // 再次检查是否已存在（可能在创建过程中被其他进程创建）
        const existsNow = await this.webdavClient.exists(normalizedPath);
        if (existsNow) {
          Logger.debug(`目录在创建过程中已被创建: ${normalizedPath}`);
          return true;
        }
        
        // 记录详细错误信息
        const errorMsg = createError?.message || String(createError);
        const statusCode = createError?.response?.status;
        Logger.error(`创建目录失败: ${normalizedPath} (状态码: ${statusCode}, 错误: ${errorMsg})`);
        
        // 403 错误提示可能是权限或密码问题
        if (statusCode === 403) {
          Logger.error(`提示：403 错误通常是因为：`);
          Logger.error(`  1. 使用了登录密码而不是应用专用密码`);
          Logger.error(`  2. 用户没有在该目录的写入权限`);
          Logger.error(`  3. basePath 不存在（请先手动创建）`);
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

