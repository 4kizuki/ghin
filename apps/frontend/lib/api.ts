import { z } from 'zod';
import type { RepoStatus, FileDiff, CommitInfo, BranchInfo } from '@/lib/git';

// ─── Schemas ───────────────────────────────────────────────────────

const repositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

type Repository = z.infer<typeof repositorySchema>;

export type { Repository };

const identityUnknownResponseSchema = z.object({
  error: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

const fileChangeSchema = z.object({
  path: z.string(),
  status: z.union([
    z.literal('M'),
    z.literal('A'),
    z.literal('D'),
    z.literal('R'),
    z.literal('C'),
    z.literal('U'),
    z.literal('?'),
    z.literal('!'),
  ]),
  staged: z.boolean(),
  oldPath: z.string().optional(),
});

const hunkLineSchema = z.object({
  type: z.union([z.literal('context'), z.literal('add'), z.literal('remove')]),
  content: z.string(),
  oldLineNumber: z.number().nullable(),
  newLineNumber: z.number().nullable(),
});

const hunkSchema = z.object({
  header: z.string(),
  oldStart: z.number(),
  oldCount: z.number(),
  newStart: z.number(),
  newCount: z.number(),
  lines: z.array(hunkLineSchema),
});

const fileDiffSchema = z.object({
  path: z.string(),
  oldPath: z.string().optional(),
  hunks: z.array(hunkSchema),
  isBinary: z.boolean(),
  isNew: z.boolean(),
  isDeleted: z.boolean(),
});

const commitInfoSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  author: z.string(),
  authorEmail: z.string(),
  date: z.string(),
  message: z.string(),
  parents: z.array(z.string()),
  refs: z.array(z.string()),
});

const branchInfoSchema = z.object({
  name: z.string(),
  current: z.boolean(),
  upstream: z.string().optional(),
  aheadBehind: z.object({ ahead: z.number(), behind: z.number() }).optional(),
});

const repoStatusSchema = z.object({
  branch: z.string(),
  upstream: z.string().optional(),
  ahead: z.number(),
  behind: z.number(),
  aheadOfMain: z.number(),
  behindMain: z.number(),
  stagedFiles: z.array(fileChangeSchema),
  unstagedFiles: z.array(fileChangeSchema),
  untrackedFiles: z.array(fileChangeSchema),
  hasConflicts: z.boolean(),
});

const okSchema = z.object({ ok: z.boolean() });
const okOutputSchema = z.object({ ok: z.boolean(), output: z.string() });
const mergeResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  hasConflicts: z.boolean(),
});
const branchesResponseSchema = z.object({
  branches: z.array(z.string()),
});
const branchesContainingResponseSchema = z.object({
  branches: z.array(z.string()),
  localBranches: z.array(z.string()),
});
const remotesResponseSchema = z.object({
  remotes: z.array(z.string()),
});
const urlResponseSchema = z.object({ url: z.string() });
const settingsResponseSchema = z.record(z.string(), z.string());

// ─── Errors ────────────────────────────────────────────────────────

export class IdentityUnknownError extends Error {
  readonly userName: string | null;
  readonly userEmail: string | null;
  constructor(userName: string | null, userEmail: string | null) {
    super('identity_unknown');
    this.userName = userName;
    this.userEmail = userEmail;
  }
}

// ─── Fetch ─────────────────────────────────────────────────────────

const fetchJson = async <T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 422 && body.includes('identity_unknown')) {
      const parsed = identityUnknownResponseSchema.parse(JSON.parse(body));
      throw new IdentityUnknownError(parsed.userName, parsed.userEmail);
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }
  const json: unknown = await res.json();
  return schema.parse(json);
};

// ─── Repository ─────────────────────────────────────────────────────

export const listRepositories = (): Promise<Repository[]> =>
  fetchJson('/api/repositories', z.array(repositorySchema));

export const addRepository = (
  name: string,
  path: string,
): Promise<Repository> =>
  fetchJson('/api/repositories', repositorySchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  });

export const removeRepository = (id: string): Promise<{ ok: boolean }> =>
  fetchJson(`/api/repositories/${id}`, okSchema, { method: 'DELETE' });

// ─── Git Status ─────────────────────────────────────────────────────

export const getStatus = (repo: string): Promise<RepoStatus> =>
  fetchJson(
    `/api/git/status?repo=${encodeURIComponent(repo)}`,
    repoStatusSchema,
  );

// ─── Git Diff ───────────────────────────────────────────────────────

export const getDiff = (
  repo: string,
  staged: boolean,
  file?: string,
): Promise<FileDiff[]> => {
  const params = new URLSearchParams({ repo, staged: String(staged) });
  if (file) params.set('file', file);
  return fetchJson(
    `/api/git/diff?${params.toString()}`,
    z.array(fileDiffSchema),
  );
};

// ─── Git Log ────────────────────────────────────────────────────────

export const getLog = (
  repo: string,
  maxCount?: number,
  skip?: number,
  branch?: string,
): Promise<CommitInfo[]> => {
  const params = new URLSearchParams({ repo });
  if (maxCount !== undefined) params.set('maxCount', String(maxCount));
  if (skip !== undefined) params.set('skip', String(skip));
  if (branch) params.set('branch', branch);
  return fetchJson(
    `/api/git/log?${params.toString()}`,
    z.array(commitInfoSchema),
  );
};

// ─── Branches ───────────────────────────────────────────────────────

export const getBranches = (repo: string): Promise<BranchInfo[]> =>
  fetchJson(
    `/api/git/branches?repo=${encodeURIComponent(repo)}`,
    z.array(branchInfoSchema),
  );

// ─── Branches Containing ────────────────────────────────────────────

export const getBranchesContaining = (
  repo: string,
  hash: string,
): Promise<{ branches: string[]; localBranches: string[] }> =>
  fetchJson(
    `/api/git/branches-containing?repo=${encodeURIComponent(repo)}&hash=${encodeURIComponent(hash)}`,
    branchesContainingResponseSchema,
  );

// ─── Create Branch ─────────────────────────────────────────────────

export const createBranch = (
  repo: string,
  name: string,
  startPoint?: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/create-branch', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, name, startPoint }),
  });

// ─── Stage / Unstage ────────────────────────────────────────────────

export const stagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const stagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

export const unstagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const unstagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

// ─── Commit ─────────────────────────────────────────────────────────

export const commitChanges = (
  repo: string,
  message: string,
  newBranch?: string,
  autoPush?: boolean,
  pushBranch?: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/commit', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, message, newBranch, autoPush, pushBranch }),
  });

// ─── Push ───────────────────────────────────────────────────────────

export const pushChanges = (
  repo: string,
  setUpstream?: boolean,
  remoteBranch?: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/push', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, setUpstream, remoteBranch }),
  });

// ─── Pull & Merge ───────────────────────────────────────────────────

export const pullAndMergeMain = (
  repo: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> =>
  fetchJson('/api/git/pull-merge', mergeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });

// ─── Merge ──────────────────────────────────────────────────────────

export const mergeRef = (
  repo: string,
  ref: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> =>
  fetchJson('/api/git/merge', mergeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, ref }),
  });

// ─── Reset ──────────────────────────────────────────────────────────

export const resetToCommit = (
  repo: string,
  hash: string,
  mode: 'hard' | 'mixed' | 'soft',
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/reset', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, hash, mode }),
  });

// ─── Checkout ───────────────────────────────────────────────────────

export const checkoutRef = (
  repo: string,
  ref: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/checkout', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, ref }),
  });

// ─── Update Branch ─────────────────────────────────────────────────

const updateBranchResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
});

export const updateBranchToRemote = (
  repo: string,
  localBranch: string,
  remoteBranch: string,
): Promise<{ success: boolean; output: string }> =>
  fetchJson('/api/git/update-branch', updateBranchResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, localBranch, remoteBranch }),
  });

// ─── Branch Cleanup ─────────────────────────────────────────────────

export const getMergedBranches = (
  repo: string,
): Promise<{ branches: string[] }> =>
  fetchJson(
    `/api/git/branch-cleanup?repo=${encodeURIComponent(repo)}`,
    branchesResponseSchema,
  );

export const deleteMergedBranches = (
  repo: string,
  branches: string[],
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/branch-cleanup', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, branches }),
  });

// ─── Search ─────────────────────────────────────────────────────────

export const searchGit = (
  repo: string,
  type: 'message' | 'file' | 'hash',
  query: string,
): Promise<CommitInfo[]> => {
  const params = new URLSearchParams({ repo, type, query });
  return fetchJson(
    `/api/git/search?${params.toString()}`,
    z.array(commitInfoSchema),
  );
};

// ─── Revert ─────────────────────────────────────────────────────────

export const revertCommit = (
  repo: string,
  hash: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/revert', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, hash }),
  });

// ─── Commit Diff ────────────────────────────────────────────────────

export const getCommitDiff = (
  repo: string,
  hash: string,
): Promise<FileDiff[]> =>
  fetchJson(
    `/api/git/commit-diff?repo=${encodeURIComponent(repo)}&hash=${encodeURIComponent(hash)}`,
    z.array(fileDiffSchema),
  );

// ─── Fetch ──────────────────────────────────────────────────────────

export const fetchRemotes = (
  repo: string,
  remotes: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/fetch', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, remotes }),
  });

export const getRemotes = (repo: string): Promise<{ remotes: string[] }> =>
  fetchJson(
    `/api/git/remotes?repo=${encodeURIComponent(repo)}`,
    remotesResponseSchema,
  );

export const getRemoteUrl = (
  repo: string,
  remote: string,
): Promise<{ url: string }> =>
  fetchJson(
    `/api/git/remote-url?repo=${encodeURIComponent(repo)}&remote=${encodeURIComponent(remote)}`,
    urlResponseSchema,
  );

// ─── Auto Fetch ─────────────────────────────────────────────────────

export const updateAutoFetch = (
  repoId: string,
  autoFetch: boolean,
  fetchRemotesValue: string[],
): Promise<{ ok: boolean }> =>
  fetchJson(`/api/repositories/${repoId}/auto-fetch`, okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoFetch, fetchRemotes: fetchRemotesValue }),
  });

// ─── Settings ───────────────────────────────────────────────────────

export const getSettings = (): Promise<Record<string, string>> =>
  fetchJson('/api/settings', settingsResponseSchema);

export const setSetting = (
  key: string,
  value: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/settings', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });

// ─── Git Config ─────────────────────────────────────────────────────

export const setGitConfig = (
  repo: string,
  key: string,
  value: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/config', okSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, key, value }),
  });

// ─── AI Suggestions ─────────────────────────────────────────────────

const commitMessageSuggestionSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const branchNameSuggestionSchema = z.object({
  branchName: z.string(),
});

type CommitMessageSuggestion = z.infer<typeof commitMessageSuggestionSchema>;
type BranchNameSuggestion = z.infer<typeof branchNameSuggestionSchema>;

export type { CommitMessageSuggestion, BranchNameSuggestion };

export const suggestCommitMessage = (
  repo: string,
  branch: string,
  stagedFiles: { path: string; status: string; staged: boolean }[],
): Promise<CommitMessageSuggestion> =>
  fetchJson('/api/ai/suggest', commitMessageSuggestionSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'commit-message',
      repo,
      branch,
      stagedFiles,
    }),
  });

export const suggestBranchName = (params: {
  commitMessage: string;
  commitHash?: string;
}): Promise<BranchNameSuggestion> =>
  fetchJson('/api/ai/suggest', branchNameSuggestionSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'branch-name', ...params }),
  });
