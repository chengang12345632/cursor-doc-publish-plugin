/**
 * 插件配置类型定义
 */

export interface NextCloudConfig {
  url: string;
  username: string;
  password: string;
  webdavUsername: string; // 必填：WebDAV 文件空间用户名
}

export interface DocPublishConfig {
  nextcloud: NextCloudConfig;
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

