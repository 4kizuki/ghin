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
