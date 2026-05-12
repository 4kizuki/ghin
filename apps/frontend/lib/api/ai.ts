import { z } from 'zod';
import { fetchJson } from './fetch';

const commitMessageSuggestionSchema = z.object({
  subject: z.string(),
  body: z.string(),
  dangerFiles: z.array(z.string()),
});

const branchNameSuggestionSchema = z.object({
  branchName: z.string(),
});

const dependencyDetectionSchema = z.object({
  flagged: z.array(
    z.object({
      hash: z.string(),
      reason: z.string(),
    }),
  ),
});

export type CommitMessageSuggestion = z.infer<
  typeof commitMessageSuggestionSchema
>;
export type BranchNameSuggestion = z.infer<typeof branchNameSuggestionSchema>;
export type DependencyDetection = z.infer<typeof dependencyDetectionSchema>;

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

export const detectDependencyCommits = (
  repo: string,
  hashes: string[],
): Promise<DependencyDetection> =>
  fetchJson('/api/ai/detect-dependency-commits', dependencyDetectionSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, hashes }),
  });
