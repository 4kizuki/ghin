import { z } from 'zod';
import type { Repository } from './schemas';
import { repositorySchema, okSchema } from './schemas';
import { fetchJson } from './fetch';

export const listRepositories = (): Promise<Repository[]> =>
  fetchJson('/api/repositories', z.array(repositorySchema));

export const addRepository = (
  name: string,
  path: string,
): Promise<Repository> =>
  fetchJson('/api/repositories', repositorySchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  });

export const removeRepository = (id: string): Promise<{ ok: boolean }> =>
  fetchJson(`/api/repositories/${id}`, okSchema, { method: 'DELETE' });

const cloneResultSchema = z.object({
  ok: z.boolean(),
  repository: repositorySchema,
});

export const cloneRepository = (
  url: string,
  destDir: string,
): Promise<{ ok: boolean; repository: Repository }> =>
  fetchJson('/api/git/clone', cloneResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, destDir }),
  });
