import type { RepoStatus } from '@/lib/git';
import { repoStatusSchema } from './schemas';
import { fetchJson } from './fetch';

export const getStatus = (repo: string): Promise<RepoStatus> =>
  fetchJson(
    `/api/git/status?repo=${encodeURIComponent(repo)}`,
    repoStatusSchema,
  );
