import { okSchema, remotesResponseSchema, urlResponseSchema } from './schemas';
import { fetchJson } from './fetch';

export const fetchRemotes = (
  repo: string,
  remotes: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/fetch', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, remotes }),
  });

export const addRemote = (
  repo: string,
  name: string,
  url: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/add-remote', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, name, url }),
  });

export const getRemotes = (repo: string): Promise<{ remotes: string[] }> =>
  fetchJson(
    `/api/git/remotes?repo=${encodeURIComponent(repo)}`,
    remotesResponseSchema,
  );

export const getRemoteUrl = (
  repo: string,
  remote: string,
): Promise<{ url: string }> =>
  fetchJson(
    `/api/git/remote-url?repo=${encodeURIComponent(repo)}&remote=${encodeURIComponent(remote)}`,
    urlResponseSchema,
  );

export const updateAutoFetch = (
  repoId: string,
  autoFetch: boolean,
  fetchRemotesValue: string[],
): Promise<{ ok: boolean }> =>
  fetchJson(`/api/repositories/${repoId}/auto-fetch`, okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoFetch, fetchRemotes: fetchRemotesValue }),
  });
