import * as vscode from 'vscode';

/**
 * 日志工具类
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel;

  /**
   * 初始化日志输出通道
   */
  public static initialize(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('NextCloud Doc Publisher');
    }
  }

  /**
   * 显示输出通道
   */
  public static show(): void {
    this.outputChannel.show(true);
  }

  /**
   * 记录信息日志
   */
  public static info(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [INFO] ${message}`);
  }

  /**
   * 记录错误日志
   */
  public static error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
    if (error) {
      this.outputChannel.appendLine(`  Stack: ${error.stack}`);
    }
  }

  /**
   * 记录警告日志
   */
  public static warn(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [WARN] ${message}`);
  }

  /**
   * 记录调试日志
   */
  public static debug(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [DEBUG] ${message}`);
  }

  /**
   * 记录发布过程日志
   */
  public static publishing(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [Publishing] ${message}`);
  }

  /**
   * 记录成功日志
   */
  public static success(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [Success] ✓ ${message}`);
  }

  /**
   * 清空日志
   */
  public static clear(): void {
    this.outputChannel.clear();
  }

  /**
   * 销毁日志通道
   */
  public static dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
  }
}

