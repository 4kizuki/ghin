import { resolve } from 'node:path';
import type { WorktreeInfo } from './types';
import { exec } from './exec';

export const getWorktrees = async (cwd: string): Promise<WorktreeInfo[]> => {
  const output = await exec(['worktree', 'list', '--porcelain'], cwd);
  const resolvedCwd = resolve(cwd);

  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> | null = null;

  const flush = () => {
    if (current && current.path !== undefined) {
      worktrees.push({
        path: current.path,
        branch: current.branch ?? null,
        head: current.head ?? null,
        isMain: false,
        isCurrent: resolve(current.path) === resolvedCwd,
        locked: current.locked ?? false,
      });
    }
    current = null;
  };

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      flush();
      current = { path: line.slice('worktree '.length) };
    } else if (line.startsWith('HEAD ') && current) {
      current.head = line.slice('HEAD '.length);
    } else if (line.startsWith('branch ') && current) {
      current.branch = line
        .slice('branch '.length)
        .replace(/^refs\/heads\//, '');
    } else if (line === 'detached' && current) {
      current.branch = null;
    } else if (line.startsWith('locked') && current) {
      current.locked = true;
    }
  }
  flush();

  if (worktrees.length > 0) {
    worktrees[0] = { ...worktrees[0], isMain: true };
  }
  return worktrees;
};
