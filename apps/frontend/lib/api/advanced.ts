import { z } from 'zod';
import { fetchJson } from './fetch';

const distributeResultSchema = z.object({
  ok: z.boolean(),
  output: z.string(),
  backupTag: z.string(),
});

export const distributeCommitDates = (
  repo: string,
  commits: Array<{ hash: string; newDate: string }>,
): Promise<{ ok: boolean; output: string; backupTag: string }> =>
  fetchJson('/api/git/distribute-dates', distributeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, commits }),
  });

export const openInEditor = async (repo: string): Promise<void> => {
  const res = await fetch('/api/open-editor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to open editor: ${body}`);
  }
};

export const openInTerminal = async (repo: string): Promise<void> => {
  const res = await fetch('/api/open-terminal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to open terminal: ${body}`);
  }
};
