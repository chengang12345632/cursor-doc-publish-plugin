import * as path from 'path';

/**
 * 根据工作区根目录与目标路径生成默认的远程目录建议（去除工作区根路径）
 */
export function getRemotePathSuggestion(
  workspaceRoot: string | undefined,
  targetPath: string
): string {
  if (!workspaceRoot) {
    return '';
  }

  try {
    const relativePath = path.relative(workspaceRoot, targetPath);

    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return '';
    }

    const normalized = relativePath
      .split(path.sep)
      .filter(segment => segment && segment !== '.')
      .join('/');

    if (!normalized) {
      return '';
    }

    return `/${normalized}`;
  } catch {
    return '';
  }
}

/**
 * 标准化远程目录字符串，统一使用 / ，移除多余空格
 */
export function normalizeRemoteDirectory(input: string): string {
  if (!input) {
    return '/';
  }

  const trimmed = input.trim().replace(/\\/g, '/');
  if (trimmed === '' || trimmed === '/') {
    return '/';
  }

  const withoutTrailing = trimmed.replace(/\/+$/, '');
  const withLeading = withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`;
  return withLeading === '' ? '/' : withLeading;
}

/**
 * 拼接远程目录与文件名
 */
export function joinRemotePath(directory: string, fileName: string): string {
  const dir = normalizeRemoteDirectory(directory);
  const sanitizedFile = fileName.replace(/\\/g, '/');
  return dir === '/' ? `/${sanitizedFile}` : `${dir}/${sanitizedFile}`;
}


