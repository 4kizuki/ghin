import { z } from 'zod';
import type { TagInfo } from '@/lib/git';
import { tagInfoSchema } from './schemas';
import { fetchJson } from './fetch';

export const getTags = (repo: string): Promise<TagInfo[]> =>
  fetchJson(
    `/api/git/tags?repo=${encodeURIComponent(repo)}`,
    z.array(tagInfoSchema),
  );
