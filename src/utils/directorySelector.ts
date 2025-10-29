import * as vscode from 'vscode';
import { DirectoryHistoryService } from './directoryHistory';
import { Logger } from './logger';

/**
 * 自定义 QuickPick 项目，支持删除操作
 */
interface HistoryItem extends vscode.QuickPickItem {
  directory: string;
  isHistory: boolean;
  isDeleteAction: boolean;
}

/**
 * 显示目录选择对话框
 * @param context 插件上下文
 * @param placeholder 占位符文本
 * @returns 用户选择的目录路径，或 undefined 如果取消
 */
export async function showDirectorySelector(
  context: vscode.ExtensionContext,
  placeholder: string = '输入或选择上传目录'
): Promise<string | undefined> {
  Logger.debug('开始显示目录选择器');
  const history = await DirectoryHistoryService.getHistory(context);
  Logger.debug(`历史记录数量: ${history.length}`);
  
  const quickPick = vscode.window.createQuickPick<HistoryItem>();
  let isResolved = false; // 防止多次 resolve

  // 设置基本属性
  quickPick.placeholder = placeholder;
  quickPick.canSelectMany = false;
  quickPick.matchOnDescription = true;
  quickPick.ignoreFocusOut = false; // 允许点击外部时保持打开

  // 构建选项列表
  const items: HistoryItem[] = [];

  // 添加历史记录（如果有）
  if (history.length > 0) {
    // 添加分隔符
    items.push({
      label: '历史记录',
      kind: vscode.QuickPickItemKind.Separator,
      directory: '',
      isHistory: false,
      isDeleteAction: false,
      description: ''
    });

    // 添加历史记录项
    history.forEach(dir => {
      items.push({
        label: `$(clock) ${dir}`,
        description: '历史记录',
        directory: dir,
        isHistory: true,
        isDeleteAction: false,
        alwaysShow: true
      });
    });

    // 添加分隔符
    items.push({
      label: '操作',
      kind: vscode.QuickPickItemKind.Separator,
      directory: '',
      isHistory: false,
      isDeleteAction: false,
      description: ''
    });

    // 添加删除操作（只显示前5条，避免列表过长）
    history.slice(0, 5).forEach(dir => {
      items.push({
        label: `$(trash) 删除: ${dir}`,
        description: '从历史记录中删除',
        directory: dir,
        isHistory: false,
        isDeleteAction: true,
        kind: vscode.QuickPickItemKind.Default
      });
    });
  }

  // 如果没有历史记录，添加提示项
  if (items.length === 0) {
    items.push({
      label: '$(info) 直接输入目录路径并按 Enter 确认',
      description: '例如：/Docs/V2.16.13/design',
      directory: '',
      isHistory: false,
      isDeleteAction: false
    });
  }

  quickPick.items = items;

  // 处理用户输入（支持直接输入目录）
  quickPick.onDidChangeValue(value => {
    if (value.trim()) {
      // 检查是否已存在于历史记录中
      const existsInHistory = history.includes(value.trim());
      
      // 如果不在历史记录中，添加为自定义输入项
      if (!existsInHistory && !items.some(item => item.directory === value.trim())) {
        const currentItems = [...items];
        const inputItem: HistoryItem = {
          label: `$(edit) ${value.trim()}`,
          description: '新输入',
          directory: value.trim(),
          isHistory: false,
          isDeleteAction: false,
          alwaysShow: true
        };
        
        // 将输入项插入到最前面
        currentItems.unshift(inputItem);
        quickPick.items = currentItems;
      }
    }
  });

  return new Promise((resolve) => {
    const doResolve = (value: string | undefined, reason: string) => {
      if (isResolved) {
        Logger.debug(`目录选择器已 resolve，忽略: ${reason}`);
        return;
      }
      isResolved = true;
      Logger.debug(`目录选择器 resolve: ${reason}, 值: ${value || 'undefined'}`);
      quickPick.dispose();
      resolve(value);
    };

    quickPick.onDidAccept(async () => {
      Logger.debug('用户确认选择');
      const selected = quickPick.selectedItems[0];
      
      if (!selected) {
        // 用户直接输入了内容但未选择
        const inputValue = quickPick.value.trim();
        if (inputValue) {
          Logger.debug(`用户输入了目录: ${inputValue}`);
          await DirectoryHistoryService.addHistory(context, inputValue);
          doResolve(inputValue, '用户输入');
        } else {
          Logger.debug('用户确认但未输入内容，视为取消');
          doResolve(undefined, '用户确认但未输入');
        }
        return;
      }

      // 处理删除操作
      if (selected.isDeleteAction) {
        Logger.debug(`用户选择删除历史记录: ${selected.directory}`);
        await DirectoryHistoryService.removeHistory(context, selected.directory);
        
        // 重新显示选择器（刷新历史记录）
        const newHistory = await DirectoryHistoryService.getHistory(context);
        const newItems: HistoryItem[] = [];
        
        if (newHistory.length > 0) {
          newItems.push({
            label: '历史记录',
            kind: vscode.QuickPickItemKind.Separator,
            directory: '',
            isHistory: false,
            isDeleteAction: false,
            description: ''
          });
          
          newHistory.forEach(dir => {
            newItems.push({
              label: `$(clock) ${dir}`,
              description: '历史记录',
              directory: dir,
              isHistory: true,
              isDeleteAction: false,
              alwaysShow: true
            });
          });
          
          newItems.push({
            label: '操作',
            kind: vscode.QuickPickItemKind.Separator,
            directory: '',
            isHistory: false,
            isDeleteAction: false,
            description: ''
          });
          
          newHistory.slice(0, 5).forEach(dir => {
            newItems.push({
              label: `$(trash) 删除: ${dir}`,
              description: '从历史记录中删除',
              directory: dir,
              isHistory: false,
              isDeleteAction: true,
              kind: vscode.QuickPickItemKind.Default
            });
          });
        }
        
        quickPick.items = newItems;
        quickPick.value = ''; // 清空输入框
        return; // 继续显示选择器
      }

      // 处理选择历史记录或输入
      const selectedDir = selected.directory || quickPick.value.trim();
      
      // 如果选择的是提示项（directory 为空），检查用户是否有输入
      if (!selectedDir) {
        const inputValue = quickPick.value.trim();
        if (inputValue) {
          Logger.debug(`用户选择了提示项但输入了目录: ${inputValue}`);
          await DirectoryHistoryService.addHistory(context, inputValue);
          doResolve(inputValue, '用户输入（通过提示项）');
        } else {
          Logger.debug('选择了提示项但未输入内容，视为取消');
          doResolve(undefined, '选择提示项但未输入');
        }
      } else if (selectedDir) {
        Logger.debug(`用户选择了目录: ${selectedDir}`);
        // 保存到历史记录
        if (!history.includes(selectedDir)) {
          await DirectoryHistoryService.addHistory(context, selectedDir);
        } else {
          // 如果已存在，移到最前面
          await DirectoryHistoryService.removeHistory(context, selectedDir);
          await DirectoryHistoryService.addHistory(context, selectedDir);
        }
        
        doResolve(selectedDir, '用户选择');
      } else {
        Logger.debug('选择了空目录，视为取消');
        doResolve(undefined, '选择为空');
      }
    });

    quickPick.onDidHide(() => {
      // 延迟一点时间，确保不是因为 accept 导致的 hide
      setTimeout(() => {
        if (!isResolved) {
          Logger.debug('目录选择器被隐藏（用户取消）');
          doResolve(undefined, '用户取消');
        }
      }, 100);
    });

    Logger.debug('显示目录选择器');
    quickPick.show();
  });
}

