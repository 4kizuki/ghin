import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from './exec';

export const stageFiles = async (
  cwd: string,
  paths: string[],
): Promise<void> => {
  if (paths.length === 0) return;
  await exec(['add', '--', ...paths], cwd);
};

export const unstageFiles = async (
  cwd: string,
  paths: string[],
): Promise<void> => {
  if (paths.length === 0) return;
  await exec(['reset', 'HEAD', '--', ...paths], cwd);
};

export const stageHunk = async (
  cwd: string,
  patchContent: string,
): Promise<void> => {
  await exec(['apply', '--cached', '--unidiff-zero', '-'], cwd, patchContent);
};

export const unstageHunk = async (
  cwd: string,
  patchContent: string,
): Promise<void> => {
  await exec(
    ['apply', '--cached', '--unidiff-zero', '--reverse', '-'],
    cwd,
    patchContent,
  );
};

export const discardFiles = async (
  cwd: string,
  paths: string[],
): Promise<void> => {
  if (paths.length === 0) return;
  await exec(['checkout', '--', ...paths], cwd);
};

export const discardHunk = async (
  cwd: string,
  patchContent: string,
): Promise<void> => {
  await exec(['apply', '--unidiff-zero', '-'], cwd, patchContent);
};

export const deleteUntrackedFile = async (
  cwd: string,
  filePath: string,
): Promise<void> => {
  await unlink(join(cwd, filePath));
};
