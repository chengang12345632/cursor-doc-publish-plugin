import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DocPublishConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * 配置管理服务
 */
export class ConfigService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly CONFIG_FILE_NAME = '.cursor/doc-publish-config.json';

  /**
   * 获取完整配置
   */
  public static async getConfig(): Promise<DocPublishConfig | null> {
    try {
      // 优先从项目配置文件读取
      const projectConfig = await this.loadProjectConfig();
      if (projectConfig) {
        Logger.info('使用项目配置文件');
        return this.resolveEnvVars(projectConfig);
      }

      // 从 Cursor 设置读取
      const settingsConfig = this.loadSettingsConfig();
      if (settingsConfig) {
        Logger.info('使用 Cursor 设置配置');
        return settingsConfig;
      }

      return null;
    } catch (error) {
      Logger.error('读取配置失败', error as Error);
      return null;
    }
  }

  /**
   * 从项目配置文件加载
   */
  private static async loadProjectConfig(): Promise<DocPublishConfig | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    const configPath = path.join(workspaceFolders[0].uri.fsPath, this.CONFIG_FILE_NAME);
    
    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent) as DocPublishConfig;
    } catch (error) {
      Logger.error(`解析配置文件失败: ${configPath}`, error as Error);
      return null;
    }
  }

  /**
   * 从 Cursor 设置加载
   */
  private static loadSettingsConfig(): DocPublishConfig | null {
    const config = vscode.workspace.getConfiguration('docPublish');

    const nextcloudUrl = config.get<string>('nextcloud.url');
    const nextcloudUsername = config.get<string>('nextcloud.username');
    const nextcloudPassword = config.get<string>('nextcloud.password');
    const nextcloudWebdavUsername = config.get<string>('nextcloud.webdavUsername'); // 必填

    // 验证必填项
    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword || 
        !nextcloudWebdavUsername) {
      return null;
    }

    return {
      nextcloud: {
        url: nextcloudUrl,
        username: nextcloudUsername,
        password: nextcloudPassword,
        webdavUsername: nextcloudWebdavUsername
      }
    };
  }

  /**
   * 解析环境变量
   */
  private static resolveEnvVars(config: DocPublishConfig): DocPublishConfig {
    const envVarPattern = /\$\{env:([^}]+)\}/g;

    const resolveString = (value: string): string => {
      return value.replace(envVarPattern, (_, envVarName) => {
        return process.env[envVarName] || '';
      });
    };

    return {
      nextcloud: {
        url: resolveString(config.nextcloud.url),
        username: resolveString(config.nextcloud.username),
        password: resolveString(config.nextcloud.password),
        webdavUsername: resolveString(config.nextcloud.webdavUsername)
      }
    };
  }

  /**
   * 验证配置是否完整
   */
  public static validateConfig(config: DocPublishConfig | null): string[] {
    const errors: string[] = [];

    if (!config) {
      errors.push('配置为空');
      return errors;
    }

    if (!config.nextcloud.url) {
      errors.push('NextCloud URL 未配置');
    }
    if (!config.nextcloud.username) {
      errors.push('NextCloud 用户名未配置');
    }
    if (!config.nextcloud.password) {
      errors.push('NextCloud 密码未配置');
    }
    if (!config.nextcloud.webdavUsername) {
      errors.push('WebDAV 文件空间用户名未配置');
    }

    return errors;
  }


  /**
   * 显示配置信息
   */
  public static async showConfiguration(): Promise<void> {
    const config = await this.getConfig();
    
    if (!config) {
      vscode.window.showErrorMessage('未找到配置，请先在设置中配置插件');
      return;
    }

    const errors = this.validateConfig(config);
    
    const configInfo = [
      '### NextCloud Doc Publisher Configuration',
      '',
      '**NextCloud 配置:**',
      `- URL: ${config.nextcloud.url}`,
      `- Username: ${config.nextcloud.username}`,
      `- Password: ${'*'.repeat(config.nextcloud.password.length)}`,
      `- WebDAV 文件空间用户名: ${config.nextcloud.webdavUsername}`,
      '',
      '**说明:**',
      '- 上传目录在发布时动态选择',
      '- 支持输入新目录或选择历史记录',
      ''
    ];

    if (errors.length > 0) {
      configInfo.push('', '**配置错误:**');
      errors.forEach(error => {
        configInfo.push(`- ❌ ${error}`);
      });
    } else {
      configInfo.push('', '✅ 配置验证通过');
    }

    const doc = await vscode.workspace.openTextDocument({
      content: configInfo.join('\n'),
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  }
}

