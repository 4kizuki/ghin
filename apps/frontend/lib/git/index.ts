import 'server-only';

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
} from './types';

import { getStatus, getDiff, getUntrackedFileContent } from './status';
import {
  getLog,
  searchCommits,
  searchFileHistory,
  findCommitByHash,
  getCommitDiff,
  getGraphLog,
} from './log';
import {
  getBranches,
  getBranchesContaining,
  getLocalBranchNames,
  createBranch,
  checkout,
  checkoutAndPull,
  updateBranchToRemote,
  getMergedBranches,
  deleteBranches,
} from './branch';
import {
  stageFiles,
  unstageFiles,
  stageHunk,
  unstageHunk,
  discardFiles,
  discardHunk,
  deleteUntrackedFile,
} from './staging';
import { commit, push, pull, pullCurrentBranch } from './commit';
import { merge, mergeMain, pullAndMergeMain, getMergeMsg } from './merge';
import {
  getRemoteUrl,
  getRemotes,
  addRemote,
  fetchRemotes,
  getConfig,
  setLocalConfig,
} from './remote';
import { reset, revertCommit } from './reset';
import {
  cloneRepository,
  openInEditor,
  isWorkingTreeClean,
  distributeCommitDates,
} from './repo';

export const git = {
  getStatus,
  getDiff,
  getUntrackedFileContent,
  getLog,
  getBranches,
  getBranchesContaining,
  getLocalBranchNames,
  stageFiles,
  unstageFiles,
  stageHunk,
  unstageHunk,
  commit,
  push,
  pull,
  pullCurrentBranch,
  merge,
  mergeMain,
  pullAndMergeMain,
  checkout,
  checkoutAndPull,
  updateBranchToRemote,
  createBranch,
  getMergedBranches,
  deleteBranches,
  searchCommits,
  searchFileHistory,
  findCommitByHash,
  revertCommit,
  reset,
  getCommitDiff,
  getGraphLog,
  getRemoteUrl,
  getRemotes,
  fetchRemotes,
  getConfig,
  setLocalConfig,
  cloneRepository,
  discardFiles,
  discardHunk,
  deleteUntrackedFile,
  isWorkingTreeClean,
  distributeCommitDates,
  addRemote,
  getMergeMsg,
  openInEditor,
};
