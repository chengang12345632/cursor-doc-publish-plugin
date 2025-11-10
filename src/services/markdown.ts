import * as fs from 'fs';
import * as path from 'path';
import { AssetInfo } from '../types';
import { Logger } from '../utils/logger';

/**
 * Markdown 处理服务
 */
export class MarkdownService {
  /**
   * 扫描 Markdown 文件中引用的资源
   */
  public static scanAssetReferences(
    markdownPath: string
  ): AssetInfo[] {
    try {
      const content = fs.readFileSync(markdownPath, 'utf-8');
      const assets: AssetInfo[] = [];
      const markdownDir = path.dirname(markdownPath);
      const notFoundAssets = new Set<string>(); // 记录不存在的资源，避免重复警告

      // 匹配所有资源引用: [xxx](assets/yyy)、![xxx](assets/yyy)、![xxx](./assets/yyy) 等
      const assetPattern = /!?\[([^\]]*)\]\(((?:\.\.?\/)*assets\/[^)]+)\)/g;
      let match;

      while ((match = assetPattern.exec(content)) !== null) {
        const relativePath = match[2]; // assets/xxx.png
        const localPath = path.join(markdownDir, relativePath);
        
        // 检查是否已经处理过这个资源
        const exists = assets.some(asset => asset.localPath === localPath);
        
        if (!exists) {
          if (fs.existsSync(localPath)) {
            assets.push({
              localPath,
              relativePath,
              fileName: path.basename(relativePath),
              nextCloudPath: '' // 后续填充
            });
          } else if (!notFoundAssets.has(localPath)) {
            // 只警告一次
            Logger.warn(`资源文件不存在: ${localPath}`);
            notFoundAssets.add(localPath);
          }
        }
      }

      Logger.info(`扫描到 ${assets.length} 个资源引用`);
      return assets;
    } catch (error) {
      Logger.error(`扫描资源引用失败: ${markdownPath}`, error as Error);
      return [];
    }
  }

  /**
   * 扫描目录下所有资源文件
   */
  public static scanAssetsDirectory(
    assetsDir: string
  ): AssetInfo[] {
    try {
      if (!fs.existsSync(assetsDir)) {
        Logger.warn(`资源目录不存在: ${assetsDir}`);
        return [];
      }

      const assets: AssetInfo[] = [];
      const files = fs.readdirSync(assetsDir);

      for (const file of files) {
        const filePath = path.join(assetsDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          const relativePath = `assets/${file}`;
          assets.push({
            localPath: filePath,
            relativePath,
            fileName: file,
            nextCloudPath: '' // 后续填充
          });
        }
      }

      Logger.info(`扫描到 ${assets.length} 个资源文件`);
      return assets;
    } catch (error) {
      Logger.error(`扫描资源目录失败: ${assetsDir}`, error as Error);
      return [];
    }
  }

  /**
   * 替换 Markdown 中的资源链接
   */
  public static replaceAssetLinks(
    markdownPath: string,
    linkMap: Map<string, string>
  ): { success: boolean; replacedCount: number; newContent?: string } {
    try {
      const content = fs.readFileSync(markdownPath, 'utf-8');
      let newContent = content;
      let replacedCount = 0;

      // 替换所有 assets/ 引用
      linkMap.forEach((downloadLink, relativePath) => {
        // 匹配图片引用: ![...](assets/xxx)
        const imagePattern = new RegExp(
          `(!\\[[^\\]]*\\])\\(${this.escapeRegExp(relativePath)}\\)`,
          'g'
        );
        const imageMatches = content.match(imagePattern);
        if (imageMatches) {
          replacedCount += imageMatches.length;
          newContent = newContent.replace(
            imagePattern,
            `$1(${downloadLink})`
          );
        }

        // 匹配链接引用: [...](assets/xxx)
        const linkPattern = new RegExp(
          `(\\[[^\\]]*\\])\\(${this.escapeRegExp(relativePath)}\\)`,
          'g'
        );
        const linkMatches = content.match(linkPattern);
        if (linkMatches) {
          // 避免重复计数（图片也会被匹配到）
          const newMatches = linkMatches.filter(m => !m.startsWith('!'));
          replacedCount += newMatches.length;
          newContent = newContent.replace(
            linkPattern,
            `$1(${downloadLink})`
          );
        }
      });

      Logger.info(`替换了 ${replacedCount} 个资源链接`);
      return { success: true, replacedCount, newContent };
    } catch (error) {
      Logger.error(`替换资源链接失败: ${markdownPath}`, error as Error);
      return { success: false, replacedCount: 0 };
    }
  }

  /**
   * 保存替换后的 Markdown 内容
   */
  public static saveMarkdown(markdownPath: string, content: string): boolean {
    try {
      fs.writeFileSync(markdownPath, content, 'utf-8');
      Logger.info(`保存 Markdown 成功: ${markdownPath}`);
      return true;
    } catch (error) {
      Logger.error(`保存 Markdown 失败: ${markdownPath}`, error as Error);
      return false;
    }
  }

  /**
   * 扫描目录下所有 Markdown 文件
   */
  public static scanMarkdownFiles(directory: string): string[] {
    try {
      if (!fs.existsSync(directory)) {
        Logger.warn(`目录不存在: ${directory}`);
        return [];
      }

      const markdownFiles: string[] = [];
      const items = fs.readdirSync(directory);

      for (const item of items) {
        const itemPath = path.join(directory, item);
        const stat = fs.statSync(itemPath);

        if (stat.isFile() && item.endsWith('.md')) {
          markdownFiles.push(itemPath);
        } else if (stat.isDirectory() && item !== 'assets') {
          // 递归扫描子目录（跳过 assets 目录）
          const subFiles = this.scanMarkdownFiles(itemPath);
          markdownFiles.push(...subFiles);
        }
      }

      Logger.info(`扫描到 ${markdownFiles.length} 个 Markdown 文件`);
      return markdownFiles;
    } catch (error) {
      Logger.error(`扫描 Markdown 文件失败: ${directory}`, error as Error);
      return [];
    }
  }

  /**
   * 获取 Markdown 相对于工作区的路径信息
   */
  public static getMarkdownPathInfo(
    markdownPath: string,
    workspaceRoot: string,
    docDir: string
  ): { relativePath: string; docType?: string; version?: string } {
    const relativePath = path.relative(workspaceRoot, markdownPath);
    const parts = relativePath.split(path.sep);

    // 解析路径: doc/{docType}/{version}/xxx.md 或 doc/{version}/xxx.md
    if (parts[0] === docDir && parts.length >= 3) {
      if (parts.length >= 4) {
        return {
          relativePath,
          docType: parts[1],
          version: parts[2]
        };
      } else {
        return {
          relativePath,
          version: parts[1]
        };
      }
    }

    return { relativePath };
  }

  /**
   * 转义正则表达式特殊字符
   */
  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

