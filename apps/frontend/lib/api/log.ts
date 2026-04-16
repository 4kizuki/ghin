import { z } from 'zod';
import type { CommitInfo } from '@/lib/git';
import { commitInfoSchema } from './schemas';
import { fetchJson } from './fetch';

export const getLog = (
  repo: string,
  maxCount?: number,
  skip?: number,
  branch?: string,
): Promise<CommitInfo[]> => {
  const params = new URLSearchParams({ repo });
  if (maxCount !== undefined) params.set('maxCount', String(maxCount));
  if (skip !== undefined) params.set('skip', String(skip));
  if (branch) params.set('branch', branch);
  return fetchJson(
    `/api/git/log?${params.toString()}`,
    z.array(commitInfoSchema),
  );
};
