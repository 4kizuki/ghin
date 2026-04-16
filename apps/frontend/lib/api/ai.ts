import { z } from 'zod';
import { fetchJson } from './fetch';

const commitMessageSuggestionSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const branchNameSuggestionSchema = z.object({
  branchName: z.string(),
});

export type CommitMessageSuggestion = z.infer<
  typeof commitMessageSuggestionSchema
>;
export type BranchNameSuggestion = z.infer<typeof branchNameSuggestionSchema>;

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
