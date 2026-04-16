import { z } from 'zod';
import type { FileDiff } from '@/lib/git';
import { fileDiffSchema } from './schemas';
import { fetchJson } from './fetch';

export const getDiff = (
  repo: string,
  staged: boolean,
  file?: string,
): Promise<FileDiff[]> => {
  const params = new URLSearchParams({ repo, staged: String(staged) });
  if (file) params.set('file', file);
  return fetchJson(
    `/api/git/diff?${params.toString()}`,
    z.array(fileDiffSchema),
  );
};

export const getCommitDiff = (
  repo: string,
  hash: string,
): Promise<FileDiff[]> =>
  fetchJson(
    `/api/git/commit-diff?repo=${encodeURIComponent(repo)}&hash=${encodeURIComponent(hash)}`,
    z.array(fileDiffSchema),
  );
