export type { Repository } from './schemas';
export type { CommitMessageSuggestion, BranchNameSuggestion } from './ai';

export { IdentityUnknownError } from './errors';

export {
  listRepositories,
  addRepository,
  removeRepository,
  cloneRepository,
} from './repository';
export { getStatus } from './status';
export { getDiff, getCommitDiff } from './diff';
export { getLog } from './log';
export {
  getBranches,
  getBranchesContaining,
  createBranch,
  checkoutRef,
  checkoutAndPull,
  updateBranchToRemote,
  getMergedBranches,
  deleteMergedBranches,
} from './branch';
export {
  stagePaths,
  stagePatch,
  unstagePaths,
  unstagePatch,
  discardPaths,
  discardPatch,
  discardUntrackedFile,
} from './staging';
export { commitChanges, pushChanges, pullCurrentBranch } from './commit';
export { pullAndMergeMain, mergeRef, getMergeMsg } from './merge';
export {
  fetchRemotes,
  addRemote,
  getRemotes,
  getRemoteUrl,
  updateAutoFetch,
} from './remote';
export { resetToCommit, revertCommit } from './reset';
export { getTags } from './tag';
export { searchGit } from './search';
export { getSettings, setSetting, setGitConfig } from './settings';
export {
  distributeCommitDates,
  openInEditor,
  openInTerminal,
} from './advanced';
export { suggestCommitMessage, suggestBranchName } from './ai';
