import { z } from 'zod';
import type { CommitInfo } from '@/lib/git';
import { commitInfoSchema } from './schemas';
import { fetchJson } from './fetch';

export const searchGit = (
  repo: string,
  type: 'message' | 'file' | 'hash',
  query: string,
): Promise<CommitInfo[]> => {
  const params = new URLSearchParams({ repo, type, query });
  return fetchJson(
    `/api/git/search?${params.toString()}`,
    z.array(commitInfoSchema),
  );
};
