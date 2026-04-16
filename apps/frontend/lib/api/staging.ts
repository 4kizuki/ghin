import { okSchema } from './schemas';
import { fetchJson } from './fetch';

export const stagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const stagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

export const unstagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const unstagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

export const discardPaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/discard', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const discardPatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/discard', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

export const discardUntrackedFile = (
  repo: string,
  untrackedFile: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/discard', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, untrackedFile }),
  });
