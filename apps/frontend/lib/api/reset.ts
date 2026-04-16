import { okOutputSchema } from './schemas';
import { fetchJson } from './fetch';

export const resetToCommit = (
  repo: string,
  hash: string,
  mode: 'hard' | 'mixed' | 'soft',
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/reset', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, hash, mode }),
  });

export const revertCommit = (
  repo: string,
  hash: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/revert', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, hash }),
  });
