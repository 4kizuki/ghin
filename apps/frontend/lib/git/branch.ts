import type { BranchInfo } from './types';
import { exec } from './exec';

export const getBranches = async (cwd: string): Promise<BranchInfo[]> => {
  const output = await exec(
    [
      'branch',
      '-a',
      '--format=%(HEAD)|%(refname:short)|%(upstream:short)|%(upstream:track)',
    ],
    cwd,
  );
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      const current = parts[0] === '*';
      const name = parts[1];
      const upstream = parts[2] || undefined;
      const trackStr = parts[3] || '';
      let ahead = 0;
      let behind = 0;
      const trackMatch = trackStr.match(/\[ahead (\d+)(?:, behind (\d+))?\]/);
      const behindMatch = trackStr.match(/\[behind (\d+)\]/);
      if (trackMatch) {
        ahead = parseInt(trackMatch[1], 10);
        behind = trackMatch[2] ? parseInt(trackMatch[2], 10) : 0;
      } else if (behindMatch) {
        behind = parseInt(behindMatch[1], 10);
      }
      return {
        name,
        current,
        upstream,
        aheadBehind: upstream ? { ahead, behind } : undefined,
      };
    })
    .filter((b) => b.name !== 'origin' && !b.name.startsWith('origin/HEAD'));
};

export const getBranchesContaining = async (
  cwd: string,
  hash: string,
): Promise<string[]> => {
  const output = await exec(
    ['branch', '-a', '--contains', hash, '--format=%(refname:short)'],
    cwd,
  );
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((b) => !b.startsWith('origin/HEAD'));
};

export const getLocalBranchNames = async (cwd: string): Promise<string[]> => {
  const output = await exec(['branch', '--format=%(refname:short)'], cwd);
  return output.trim().split('\n').filter(Boolean);
};

export const createBranch = async (
  cwd: string,
  name: string,
  startPoint?: string,
): Promise<string> => {
  const args = ['checkout', '-b', name];
  if (startPoint) args.push(startPoint);
  return exec(args, cwd);
};

export const checkout = async (
  cwd: string,
  branchOrRef: string,
): Promise<string> => {
  return exec(['checkout', branchOrRef], cwd);
};

export const updateBranchToRemote = async (
  cwd: string,
  localBranch: string,
  remoteBranch: string,
): Promise<{ success: boolean; output: string }> => {
  try {
    await exec(['merge-base', '--is-ancestor', localBranch, remoteBranch], cwd);
  } catch {
    return {
      success: false,
      output: `Cannot fast-forward: ${localBranch} is not an ancestor of ${remoteBranch}`,
    };
  }

  const currentBranch = (
    await exec(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  ).trim();

  try {
    if (currentBranch === localBranch) {
      const output = await exec(['merge', '--ff-only', remoteBranch], cwd);
      return { success: true, output };
    }
    await exec(['branch', '-f', localBranch, remoteBranch], cwd);
    const output = await exec(['checkout', localBranch], cwd);
    return { success: true, output };
  } catch (e) {
    return {
      success: false,
      output: e instanceof Error ? e.message : 'Update failed',
    };
  }
};

export const getMergedBranches = async (cwd: string): Promise<string[]> => {
  await exec(['fetch', '--prune'], cwd);
  try {
    const output = await exec(['branch', '--merged', 'origin/main'], cwd);
    return output
      .trim()
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b && !b.startsWith('*') && b !== 'main');
  } catch {
    return [];
  }
};

export const checkoutAndPull = async (
  cwd: string,
  remoteBranch: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> => {
  const localBranch = remoteBranch.replace(/^origin\//, '');

  try {
    await exec(['checkout', localBranch], cwd);
  } catch (e) {
    return {
      success: false,
      output: e instanceof Error ? e.message : 'Checkout failed',
      hasConflicts: false,
    };
  }

  try {
    const output = await exec(['pull'], cwd);
    return { success: true, output, hasConflicts: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Pull failed';
    return {
      success: false,
      output: msg,
      hasConflicts: msg.includes('CONFLICT'),
    };
  }
};

export const deleteBranches = async (
  cwd: string,
  branches: string[],
): Promise<string> => {
  if (branches.length === 0) return '';
  return exec(['branch', '-d', ...branches], cwd);
};
