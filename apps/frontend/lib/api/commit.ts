import { z } from 'zod';
import { okOutputSchema } from './schemas';
import { fetchJson } from './fetch';

export const commitChanges = (
  repo: string,
  message: string,
  newBranch?: string,
  autoPush?: boolean,
  pushBranch?: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/commit', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, message, newBranch, autoPush, pushBranch }),
  });

export const pushChanges = (
  repo: string,
  setUpstream?: boolean,
  remoteBranch?: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/push', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, setUpstream, remoteBranch }),
  });

const pullResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
});

export const pullCurrentBranch = (
  repo: string,
): Promise<{ success: boolean; output: string }> =>
  fetchJson('/api/git/pull', pullResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });
