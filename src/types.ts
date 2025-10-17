/**
 * 插件配置类型定义
 */

export interface NextCloudConfig {
  url: string;
  username: string;
  password: string;
  basePath: string;
  webdavUsername?: string; // 可选：WebDAV 文件空间用户名（如果与 username 不同）
}

export interface ProjectConfig {
  serviceName: string; // 可以为空字符串，表示不创建此层级目录
  version?: string; // 可选：项目版本号，用于文档版本管理
}

export interface DocPublishConfig {
  nextcloud: NextCloudConfig;
  project: ProjectConfig;
}

export interface AssetInfo {
  localPath: string;
  relativePath: string;
  fileName: string;
  nextCloudPath: string;
  shareLink?: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  docUrl?: string;
  assetsUploaded?: number;
  linksReplaced?: number;
  errors?: string[];
}

export interface BatchPublishResult {
  totalDocs: number;
  successDocs: number;
  failedDocs: number;
  totalAssets: number;
  results: PublishResult[];
}

