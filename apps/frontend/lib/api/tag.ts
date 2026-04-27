import { z } from 'zod';
import type { TagInfo } from '@/lib/git';
import { tagInfoSchema, okOutputSchema } from './schemas';
import { fetchJson } from './fetch';

export const getTags = (repo: string): Promise<TagInfo[]> =>
  fetchJson(
    `/api/git/tags?repo=${encodeURIComponent(repo)}`,
    z.array(tagInfoSchema),
  );

export const deleteTag = (
  repo: string,
  name: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/tags', okOutputSchema, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, name }),
  });
