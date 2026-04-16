import { z } from 'zod';
import { mergeResultSchema } from './schemas';
import { fetchJson } from './fetch';

export const pullAndMergeMain = (
  repo: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> =>
  fetchJson('/api/git/pull-merge', mergeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });

export const mergeRef = (
  repo: string,
  ref: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> =>
  fetchJson('/api/git/merge', mergeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, ref }),
  });

const mergeMsgSchema = z.object({ message: z.string().nullable() });

export const getMergeMsg = (repo: string): Promise<string | null> =>
  fetchJson(
    `/api/git/merge-msg?repo=${encodeURIComponent(repo)}`,
    mergeMsgSchema,
  ).then((r) => r.message);
