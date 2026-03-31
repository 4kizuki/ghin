import 'server-only';
import { execFile } from 'node:child_process';

// ─── Types ──────────────────────────────────────────────────────────

type FileStatusCode = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | '!';

type FileChange = {
  path: string;
  status: FileStatusCode;
  staged: boolean;
  oldPath?: string;
};

type HunkLine = {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

type Hunk = {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: HunkLine[];
};

type FileDiff = {
  path: string;
  oldPath?: string;
  hunks: Hunk[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
};

type CommitInfo = {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  message: string;
  parents: string[];
  refs: string[];
};

type BranchInfo = {
  name: string;
  current: boolean;
  upstream?: string;
  aheadBehind?: { ahead: number; behind: number };
};

type RepoStatus = {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  aheadOfMain: number;
  behindMain: number;
  stagedFiles: FileChange[];
  unstagedFiles: FileChange[];
  untrackedFiles: FileChange[];
  hasConflicts: boolean;
};

type SearchResult = {
  type: 'commit' | 'file';
  commit: CommitInfo;
};

export type {
  FileStatusCode,
  FileChange,
  HunkLine,
  Hunk,
  FileDiff,
  CommitInfo,
  BranchInfo,
  RepoStatus,
  SearchResult,
};

// ─── Git Command Executor ───────────────────────────────────────────

const exec = (
  args: string[],
  cwd: string,
  stdinData?: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      args,
      { cwd, maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`git ${args[0]} failed: ${stderr || error.message}`),
          );
          return;
        }
        resolve(stdout);
      },
    );
    if (stdinData && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }
  });

// ─── Parsers ────────────────────────────────────────────────────────

const parseStatusLine = (
  line: string,
): { staged: FileChange | null; unstaged: FileChange | null } | null => {
  if (line.length < 4) return null;
  const x = line[0];
  const y = line[1];
  const filePath = line.slice(3);

  let staged: FileChange | null = null;
  let unstaged: FileChange | null = null;

  if (x === '?' && y === '?') {
    return {
      staged: null,
      unstaged: { path: filePath, status: '?', staged: false },
    };
  }

  if (x !== ' ' && x !== '?') {
    staged = {
      path: filePath,
      status:
        x === 'M' ||
        x === 'A' ||
        x === 'D' ||
        x === 'R' ||
        x === 'C' ||
        x === 'U'
          ? x
          : 'M',
      staged: true,
    };
  }

  if (y !== ' ' && y !== '?') {
    unstaged = {
      path: filePath,
      status:
        y === 'M' ||
        y === 'A' ||
        y === 'D' ||
        y === 'R' ||
        y === 'C' ||
        y === 'U'
          ? y
          : 'M',
      staged: false,
    };
  }

  return { staged, unstaged };
};

const parseHunkHeader = (
  header: string,
): {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
} => {
  const match = header.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return { oldStart: 0, oldCount: 0, newStart: 0, newCount: 0 };
  return {
    oldStart: parseInt(match[1], 10),
    oldCount: match[2] !== undefined ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newCount: match[4] !== undefined ? parseInt(match[4], 10) : 1,
  };
};

const parseDiff = (diffOutput: string): FileDiff[] => {
  const files: FileDiff[] = [];
  const fileSections = diffOutput.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split('\n');
    const headerLine = lines[0];
    const pathMatch = headerLine.match(/a\/(.*) b\/(.*)/);
    if (!pathMatch) continue;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];
    const isNew = section.includes('new file mode');
    const isDeleted = section.includes('deleted file mode');
    const isBinary = section.includes('Binary files');

    const hunks: Hunk[] = [];
    let currentHunk: Hunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const { oldStart, oldCount, newStart, newCount } =
          parseHunkHeader(line);
        currentHunk = {
          header: line,
          oldStart,
          oldCount,
          newStart,
          newCount,
          lines: [],
        };
        hunks.push(currentHunk);
        oldLine = oldStart;
        newLine = newStart;
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          oldLineNumber: null,
          newLineNumber: newLine,
        });
        newLine++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNumber: oldLine,
          newLineNumber: null,
        });
        oldLine++;
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine,
          newLineNumber: newLine,
        });
        oldLine++;
        newLine++;
      }
    }

    files.push({
      path: newPath,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      hunks,
      isBinary,
      isNew,
      isDeleted,
    });
  }

  return files;
};

const parseLogLine = (line: string): CommitInfo | null => {
  // Format: hash|shortHash|author|email|date|parents|refs|message
  const parts = line.split('|');
  if (parts.length < 8) return null;
  return {
    hash: parts[0],
    shortHash: parts[1],
    author: parts[2],
    authorEmail: parts[3],
    date: parts[4],
    parents: parts[5] ? parts[5].split(' ') : [],
    refs: parts[6] ? parts[6].split(', ').filter(Boolean) : [],
    message: parts.slice(7).join('|'),
  };
};

// ─── Git Operations ─────────────────────────────────────────────────

const getStatus = async (cwd: string): Promise<RepoStatus> => {
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

const getDiff = async (
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

const getUntrackedFileContent = async (
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

const getLog = async (
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

const getBranches = async (cwd: string): Promise<BranchInfo[]> => {
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
    .filter((b) => !b.name.startsWith('origin/HEAD'));
};

const getBranchesContaining = async (
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

const stageFiles = async (cwd: string, paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  await exec(['add', '--', ...paths], cwd);
};

const unstageFiles = async (cwd: string, paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  await exec(['reset', 'HEAD', '--', ...paths], cwd);
};

const stageHunk = async (cwd: string, patchContent: string): Promise<void> => {
  await exec(['apply', '--cached', '--unidiff-zero', '-'], cwd, patchContent);
};

const unstageHunk = async (
  cwd: string,
  patchContent: string,
): Promise<void> => {
  await exec(
    ['apply', '--cached', '--unidiff-zero', '--reverse', '-'],
    cwd,
    patchContent,
  );
};

const commit = async (cwd: string, message: string): Promise<string> => {
  const output = await exec(['commit', '-m', message], cwd);
  return output;
};

const push = async (
  cwd: string,
  setUpstream?: boolean,
  remoteBranch?: string,
): Promise<string> => {
  const args = ['push'];
  if (setUpstream) {
    const localBranch = (
      await exec(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
    ).trim();
    if (remoteBranch && remoteBranch !== localBranch) {
      args.push('-u', 'origin', `${localBranch}:${remoteBranch}`);
    } else {
      args.push('-u', 'origin', localBranch);
    }
  }
  return exec(args, cwd);
};

const pull = async (
  cwd: string,
  remote: string = 'origin',
  branch: string = 'main',
): Promise<string> => {
  return exec(['pull', remote, branch], cwd);
};

const mergeMain = async (
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

const pullAndMergeMain = async (
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

const checkout = async (cwd: string, branchOrRef: string): Promise<string> => {
  return exec(['checkout', branchOrRef], cwd);
};

const createBranch = async (
  cwd: string,
  name: string,
  startPoint?: string,
): Promise<string> => {
  const args = ['checkout', '-b', name];
  if (startPoint) args.push(startPoint);
  return exec(args, cwd);
};

const getMergedBranches = async (cwd: string): Promise<string[]> => {
  await exec(['fetch', '--prune'], cwd);
  const output = await exec(['branch', '--merged', 'origin/main'], cwd);
  return output
    .trim()
    .split('\n')
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith('*') && b !== 'main');
};

const deleteBranches = async (
  cwd: string,
  branches: string[],
): Promise<string> => {
  if (branches.length === 0) return '';
  return exec(['branch', '-d', ...branches], cwd);
};

const searchCommits = async (
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

const searchFileHistory = async (
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

const findCommitByHash = async (
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

const revertCommit = async (cwd: string, hash: string): Promise<string> => {
  return exec(['revert', '--no-edit', hash], cwd);
};

const getCommitDiff = async (
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

const getGraphLog = async (
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

const getRemoteUrl = async (cwd: string, remote: string): Promise<string> => {
  const output = await exec(['remote', 'get-url', remote], cwd);
  return output.trim();
};

const getRemotes = async (cwd: string): Promise<string[]> => {
  const output = await exec(['remote'], cwd);
  return output.trim().split('\n').filter(Boolean);
};

const fetchRemotes = async (cwd: string, remotes: string[]): Promise<void> => {
  if (remotes.length === 0) {
    await exec(['fetch', '--all'], cwd);
  } else {
    for (const remote of remotes) {
      await exec(['fetch', remote], cwd);
    }
  }
};

export const git = {
  getStatus,
  getDiff,
  getUntrackedFileContent,
  getLog,
  getBranches,
  getBranchesContaining,
  stageFiles,
  unstageFiles,
  stageHunk,
  unstageHunk,
  commit,
  push,
  pull,
  mergeMain,
  pullAndMergeMain,
  checkout,
  createBranch,
  getMergedBranches,
  deleteBranches,
  searchCommits,
  searchFileHistory,
  findCommitByHash,
  revertCommit,
  getCommitDiff,
  getGraphLog,
  getRemoteUrl,
  getRemotes,
  fetchRemotes,
};
