import { okSchema, settingsResponseSchema } from './schemas';
import { fetchJson } from './fetch';

export const getSettings = (): Promise<Record<string, string>> =>
  fetchJson('/api/settings', settingsResponseSchema);

export const setSetting = (
  key: string,
  value: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/settings', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });

export const setGitConfig = (
  repo: string,
  key: string,
  value: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/config', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, key, value }),
  });
