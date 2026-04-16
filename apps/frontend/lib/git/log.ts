import type { CommitInfo, FileDiff } from './types';
import { exec } from './exec';
import { parseLogLine, parseDiff } from './parsers';

export const getLog = async (
  cwd: string,
  maxCount: number = 200,
  skip: number = 0,
  branch?: string,
): Promise<CommitInfo[]> => {
  const format = '%H|%h|%an|%ae|%aI|%P|%D|%s';
  const args = [
    'log',
    `--format=${format}`,
    `--max-count=${maxCount}`,
    `--skip=${skip}`,
  ];
  if (branch) args.push(branch);
  else args.push('--all');
  const output = await exec(args, cwd);
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(parseLogLine)
    .filter((c): c is CommitInfo => c !== null);
};

export const searchCommits = async (
  cwd: string,
  query: string,
  maxCount: number = 50,
): Promise<CommitInfo[]> => {
  const format = '%H|%h|%an|%ae|%aI|%P|%D|%s';
  const output = await exec(
    [
      'log',
      '--all',
      `--format=${format}`,
      `--max-count=${maxCount}`,
      '--grep',
      query,
    ],
    cwd,
  );
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(parseLogLine)
    .filter((c): c is CommitInfo => c !== null);
};

export const searchFileHistory = async (
  cwd: string,
  filePath: string,
  maxCount: number = 50,
): Promise<CommitInfo[]> => {
  const format = '%H|%h|%an|%ae|%aI|%P|%D|%s';
  const output = await exec(
    [
      'log',
      '--all',
      `--format=${format}`,
      `--max-count=${maxCount}`,
      '--',
      filePath,
    ],
    cwd,
  );
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(parseLogLine)
    .filter((c): c is CommitInfo => c !== null);
};

export const findCommitByHash = async (
  cwd: string,
  hash: string,
): Promise<CommitInfo | null> => {
  try {
    const format = '%H|%h|%an|%ae|%aI|%P|%D|%s';
    const output = await exec(['log', `-1`, `--format=${format}`, hash], cwd);
    return parseLogLine(output.trim());
  } catch {
    return null;
  }
};

export const getCommitDiff = async (
  cwd: string,
  hash: string,
): Promise<FileDiff[]> => {
  const output = await exec(
    ['diff', '--no-color', `${hash}~1`, hash],
    cwd,
  ).catch(() =>
    // First commit has no parent
    exec(['diff', '--no-color', '--root', hash], cwd),
  );
  return parseDiff(output);
};

export const getGraphLog = async (
  cwd: string,
  maxCount: number = 200,
): Promise<string> => {
  return exec(
    [
      'log',
      '--all',
      '--graph',
      '--oneline',
      '--decorate',
      `--max-count=${maxCount}`,
    ],
    cwd,
  );
};
