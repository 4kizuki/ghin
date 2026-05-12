import { z } from 'zod';
import type { WorktreeInfo } from '@/lib/git';
import { worktreeInfoSchema } from './schemas';
import { fetchJson } from './fetch';

export const getWorktrees = (repo: string): Promise<WorktreeInfo[]> =>
  fetchJson(
    `/api/git/worktrees?repo=${encodeURIComponent(repo)}`,
    z.array(worktreeInfoSchema),
  );
