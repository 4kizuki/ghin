import type { TagInfo } from './types';
import { exec } from './exec';

export const getTags = async (cwd: string): Promise<TagInfo[]> => {
  const output = await exec(['tag', '--list', '--sort=-creatordate'], cwd);
  const trimmed = output.trim();
  if (!trimmed) return [];
  return trimmed
    .split('\n')
    .filter(Boolean)
    .map((name) => ({ name }));
};
