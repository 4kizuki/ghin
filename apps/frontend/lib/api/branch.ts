import { z } from 'zod';
import type { BranchInfo } from '@/lib/git';
import {
  branchInfoSchema,
  branchesContainingResponseSchema,
  branchesResponseSchema,
  okOutputSchema,
} from './schemas';
import { fetchJson } from './fetch';

export const getBranches = (repo: string): Promise<BranchInfo[]> =>
  fetchJson(
    `/api/git/branches?repo=${encodeURIComponent(repo)}`,
    z.array(branchInfoSchema),
  );

export const getBranchesContaining = (
  repo: string,
  hash: string,
): Promise<{ branches: string[]; localBranches: string[] }> =>
  fetchJson(
    `/api/git/branches-containing?repo=${encodeURIComponent(repo)}&hash=${encodeURIComponent(hash)}`,
    branchesContainingResponseSchema,
  );

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

export const checkoutRef = (
  repo: string,
  ref: string,
): Promise<{ ok: boolean; output: string }> =>
  fetchJson('/api/git/checkout', okOutputSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, ref }),
  });

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
