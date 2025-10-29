import * as vscode from 'vscode';

/**
 * 目录历史记录管理服务
 */
export class DirectoryHistoryService {
  private static readonly STORAGE_KEY = 'docPublish.directoryHistory';
  private static readonly MAX_HISTORY = 20; // 最多保存20条历史记录

  /**
   * 获取历史记录
   */
  public static async getHistory(context: vscode.ExtensionContext): Promise<string[]> {
    const history = context.globalState.get<string[]>(this.STORAGE_KEY, []);
    return history;
  }

  /**
   * 添加历史记录
   */
  public static async addHistory(
    context: vscode.ExtensionContext,
    directory: string
  ): Promise<void> {
    if (!directory || directory.trim() === '') {
      return;
    }

    const normalizedDir = directory.trim().replace(/\/$/, ''); // 去除末尾斜杠
    let history = await this.getHistory(context);

    // 移除重复项
    history = history.filter(item => item !== normalizedDir);

    // 添加到开头
    history.unshift(normalizedDir);

    // 限制历史记录数量
    if (history.length > this.MAX_HISTORY) {
      history = history.slice(0, this.MAX_HISTORY);
    }

    await context.globalState.update(this.STORAGE_KEY, history);
  }

  /**
   * 删除历史记录
   */
  public static async removeHistory(
    context: vscode.ExtensionContext,
    directory: string
  ): Promise<void> {
    const history = await this.getHistory(context);
    const filtered = history.filter(item => item !== directory);
    await context.globalState.update(this.STORAGE_KEY, filtered);
  }

  /**
   * 清空历史记录
   */
  public static async clearHistory(context: vscode.ExtensionContext): Promise<void> {
    await context.globalState.update(this.STORAGE_KEY, []);
  }
}

