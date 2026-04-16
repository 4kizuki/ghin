import { exec } from './exec';

export const reset = async (
  cwd: string,
  hash: string,
  mode: 'hard' | 'mixed' | 'soft',
): Promise<string> => {
  return exec(['reset', `--${mode}`, hash], cwd);
};

export const revertCommit = async (
  cwd: string,
  hash: string,
): Promise<string> => {
  return exec(['revert', '--no-edit', hash], cwd);
};
