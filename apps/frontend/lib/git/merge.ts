import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from './exec';

export const merge = async (
  cwd: string,
  ref: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> => {
  try {
    const output = await exec(['merge', ref], cwd);
    return { success: true, output, hasConflicts: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Merge failed';
    return {
      success: false,
      output: msg,
      hasConflicts: msg.includes('CONFLICT'),
    };
  }
};

export const mergeMain = async (
  cwd: string,
): Promise<{ success: boolean; output: string }> => {
  try {
    const output = await exec(['merge', 'origin/main'], cwd);
    return { success: true, output };
  } catch (e) {
    return {
      success: false,
      output: e instanceof Error ? e.message : 'Merge failed',
    };
  }
};

export const pullAndMergeMain = async (
  cwd: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> => {
  try {
    await exec(['fetch', 'origin', 'main'], cwd);
  } catch (e) {
    return {
      success: false,
      output: e instanceof Error ? e.message : 'Fetch failed',
      hasConflicts: false,
    };
  }

  const currentBranch = (
    await exec(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  ).trim();

  if (currentBranch === 'main') {
    try {
      const output = await exec(['merge', 'origin/main'], cwd);
      return { success: true, output, hasConflicts: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Merge failed';
      return {
        success: false,
        output: msg,
        hasConflicts: msg.includes('CONFLICT'),
      };
    }
  }

  try {
    const output = await exec(['merge', 'origin/main'], cwd);
    return { success: true, output, hasConflicts: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Merge failed';
    return {
      success: false,
      output: msg,
      hasConflicts: msg.includes('CONFLICT'),
    };
  }
};

export const getMergeMsg = async (cwd: string): Promise<string | null> => {
  try {
    const msg = await readFile(join(cwd, '.git', 'MERGE_MSG'), 'utf-8');
    return msg.trim() || null;
  } catch {
    return null;
  }
};
