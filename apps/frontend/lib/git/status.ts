import type { RepoStatus, FileDiff, FileChange } from './types';
import { exec } from './exec';
import { parseStatusLine, parseDiff } from './parsers';

export const getStatus = async (cwd: string): Promise<RepoStatus> => {
  const [statusOutput, branchOutput] = await Promise.all([
    exec(['status', '--porcelain=v1', '-u'], cwd),
    exec(['status', '--branch', '--porcelain=v2'], cwd),
  ]);

  let branch = 'HEAD';
  let upstream: string | undefined;
  let ahead = 0;
  let behind = 0;

  for (const line of branchOutput.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length);
    } else if (line.startsWith('# branch.upstream ')) {
      upstream = line.slice('# branch.upstream '.length);
    } else if (line.startsWith('# branch.ab ')) {
      const abMatch = line.match(/\+(\d+) -(\d+)/);
      if (abMatch) {
        ahead = parseInt(abMatch[1], 10);
        behind = parseInt(abMatch[2], 10);
      }
    }
  }

  const stagedFiles: FileChange[] = [];
  const unstagedFiles: FileChange[] = [];
  const untrackedFiles: FileChange[] = [];
  let hasConflicts = false;

  for (const line of statusOutput.split('\n')) {
    if (!line) continue;
    const parsed = parseStatusLine(line);
    if (!parsed) continue;
    if (parsed.staged) stagedFiles.push(parsed.staged);
    if (parsed.unstaged) {
      if (parsed.unstaged.status === '?') {
        untrackedFiles.push(parsed.unstaged);
      } else {
        unstagedFiles.push(parsed.unstaged);
      }
    }
    if (line[0] === 'U' || line[1] === 'U') {
      hasConflicts = true;
    }
  }

  let aheadOfMain = 0;
  let behindMain = 0;
  if (branch !== 'main') {
    try {
      const revList = await exec(
        ['rev-list', '--left-right', '--count', `origin/main...HEAD`],
        cwd,
        { expectedError: /origin\/main.*unknown revision/ },
      );
      const parts = revList.trim().split(/\s+/);
      if (parts.length === 2) {
        behindMain = parseInt(parts[0], 10);
        aheadOfMain = parseInt(parts[1], 10);
      }
    } catch {
      // origin/main may not exist
    }
  }

  return {
    branch,
    upstream,
    ahead,
    behind,
    aheadOfMain,
    behindMain,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    hasConflicts,
  };
};

export const getDiff = async (
  cwd: string,
  staged: boolean,
  filePath?: string,
): Promise<FileDiff[]> => {
  const args = ['diff', '--no-color'];
  if (staged) args.push('--cached');
  if (filePath) args.push('--', filePath);
  const output = await exec(args, cwd);
  return parseDiff(output);
};

export const getUntrackedFileContent = async (
  cwd: string,
  filePath: string,
): Promise<FileDiff> => {
  const output = await exec(
    ['diff', '--no-index', '--no-color', '--', '/dev/null', filePath],
    cwd,
  ).catch((e: unknown) => {
    // git diff --no-index exits with 1 when files differ
    if (e instanceof Error && e.message.includes('failed')) {
      // Try to extract stdout from the error context
      return exec(
        ['diff', '--no-index', '--no-color', '/dev/null', filePath],
        cwd,
      ).catch(() => '');
    }
    return '';
  });
  const files = parseDiff(output);
  return (
    files[0] ?? {
      path: filePath,
      hunks: [],
      isBinary: false,
      isNew: true,
      isDeleted: false,
    }
  );
};
