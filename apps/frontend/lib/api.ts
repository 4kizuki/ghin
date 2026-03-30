import type { RepoStatus, FileDiff, CommitInfo, BranchInfo } from '@/lib/git';

type Repository = {
  id: string;
  name: string;
  path: string;
  sortOrder: number;
  createdAt: string;
};

export type { Repository };

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  // eslint-disable-next-line @repo/typescript-convention/no-type-assertion -- Response.json() returns Promise<unknown>, generic cast needed for API client
  return res.json() as Promise<T>;
};

// ─── Repository ─────────────────────────────────────────────────────

export const listRepositories = (): Promise<Repository[]> =>
  fetchJson('/api/repositories');

export const addRepository = (
  name: string,
  path: string,
): Promise<Repository> =>
  fetchJson('/api/repositories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  });

export const removeRepository = (id: string): Promise<{ ok: boolean }> =>
  fetchJson(`/api/repositories/${id}`, { method: 'DELETE' });

// ─── Git Status ─────────────────────────────────────────────────────

export const getStatus = (repo: string): Promise<RepoStatus> =>
  fetchJson(`/api/git/status?repo=${encodeURIComponent(repo)}`);

// ─── Git Diff ───────────────────────────────────────────────────────

export const getDiff = (
  repo: string,
  staged: boolean,
  file?: string,
): Promise<FileDiff[]> => {
  const params = new URLSearchParams({ repo, staged: String(staged) });
  if (file) params.set('file', file);
  return fetchJson(`/api/git/diff?${params.toString()}`);
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
  return fetchJson(`/api/git/log?${params.toString()}`);
};

// ─── Branches ───────────────────────────────────────────────────────

export const getBranches = (repo: string): Promise<BranchInfo[]> =>
  fetchJson(`/api/git/branches?repo=${encodeURIComponent(repo)}`);

// ─── Stage / Unstage ────────────────────────────────────────────────

export const stagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const stagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, patch }),
  });

export const unstagePaths = (
  repo: string,
  paths: string[],
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, paths }),
  });

export const unstagePatch = (
  repo: string,
  patch: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/git/unstage', {
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
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, message, newBranch, autoPush }),
  });

// ─── Push ───────────────────────────────────────────────────────────

export const pushChanges = (
  repo: string,
  setUpstream?: boolean,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, setUpstream }),
  });

// ─── Pull & Merge ───────────────────────────────────────────────────

export const pullAndMergeMain = (
  repo: string,
): Promise<{ success: boolean; output: string; hasConflicts: boolean }> =>
  fetchJson('/api/git/pull-merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });

// ─── Checkout ───────────────────────────────────────────────────────

export const checkoutRef = (
  repo: string,
  ref: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, ref }),
  });

// ─── Branch Cleanup ─────────────────────────────────────────────────

export const getMergedBranches = (
  repo: string,
): Promise<{ branches: string[] }> =>
  fetchJson(`/api/git/branch-cleanup?repo=${encodeURIComponent(repo)}`);

export const deleteMergedBranches = (
  repo: string,
  branches: string[],
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/branch-cleanup', {
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
  return fetchJson(`/api/git/search?${params.toString()}`);
};

// ─── Revert ─────────────────────────────────────────────────────────

export const revertCommit = (
  repo: string,
  hash: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/revert', {
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
  );

// ─── Settings ───────────────────────────────────────────────────────

export const getSettings = (): Promise<Record<string, string>> =>
  fetchJson('/api/settings');

export const setSetting = (
  key: string,
  value: string,
): Promise<{ ok: boolean }> =>
  fetchJson('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
