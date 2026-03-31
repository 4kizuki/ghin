import 'server-only';

import { Codex } from '@openai/codex-sdk';
import { z } from 'zod';

import type { FileDiff } from '@/lib/git';

// ─── Schemas ────────────────────────────────────────────────────────

const commitMessageSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const branchNameSchema = z.object({
  branchName: z.string(),
});

type CommitMessageSuggestion = z.infer<typeof commitMessageSchema>;
type BranchNameSuggestion = z.infer<typeof branchNameSchema>;

export type { CommitMessageSuggestion, BranchNameSuggestion };

// ─── Diff Formatting ────────────────────────────────────────────────

const MAX_DIFF_CHARS = 8000;

const formatDiffForPrompt = (diffs: readonly FileDiff[]): string => {
  const lines: string[] = [];
  let charCount = 0;

  for (const d of diffs) {
    const prefix = d.isNew ? 'A' : d.isDeleted ? 'D' : 'M';
    lines.push(`${prefix} ${d.path}`);
  }
  lines.push('');

  let filesIncluded = 0;
  for (const d of diffs) {
    if (charCount > MAX_DIFF_CHARS) break;
    lines.push(`--- ${d.path} ---`);
    for (const hunk of d.hunks) {
      lines.push(hunk.header);
      for (const line of hunk.lines) {
        const prefix =
          line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
        const text = `${prefix}${line.content}`;
        charCount += text.length;
        if (charCount > MAX_DIFF_CHARS) {
          lines.push('[... truncated]');
          break;
        }
        lines.push(text);
      }
      if (charCount > MAX_DIFF_CHARS) break;
    }
    filesIncluded++;
  }

  if (filesIncluded < diffs.length) {
    lines.push(`[... ${diffs.length - filesIncluded} more files not shown]`);
  }

  return lines.join('\n');
};

// ─── Prompt Builders ────────────────────────────────────────────────

const buildCommitMessagePrompt = (
  diffText: string,
  stagedFiles: readonly { path: string; status: string }[],
  branch: string,
  recentMessages: readonly string[],
): string => {
  const fileList = stagedFiles.map((f) => `  ${f.status} ${f.path}`).join('\n');

  const historySection =
    recentMessages.length > 0
      ? `\nRecent commit messages (match tone, style, language, and conventions):
${recentMessages.map((m) => `  - ${m}`).join('\n')}\n`
      : '';

  return `You are a git commit message generator following the Conventional Commits specification.
Write a commit message for the following staged changes.
Rules:
- Format: <type>[optional scope]: <description>
- Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build, revert
- Scope is optional, derived from the area of change (e.g. auth, api, ui)
- Description: imperative mood, lowercase, no period at end, max 72 chars total
- subject field = the full first line including type, scope, and description
- body: only if the changes are complex; otherwise empty string
- If body is present, separate from subject with a blank line
- BREAKING CHANGE: add "!" after type/scope if breaking, and explain in body
- If recent commit messages show a consistent pattern (language, scope style, prefix conventions), follow that pattern
- Respond with ONLY valid JSON matching the output schema

Branch: ${branch}
${historySection}
Staged files:
${fileList}

Diff:
${diffText}`;
};

const buildBranchNamePrompt = (context: {
  commitMessage: string;
  commitHash?: string;
}): string => {
  const lines = [
    'Suggest a git branch name for the following commit.',
    'Rules:',
    '- Use kebab-case with a conventional prefix: feat/, fix/, refactor/, docs/, chore/, test/',
    '- Max 50 chars total',
    '- Respond with ONLY valid JSON matching the output schema',
    '',
  ];

  if (context.commitHash) {
    lines.push(`Commit: ${context.commitHash}`);
  }
  lines.push(`Commit message: ${context.commitMessage}`);

  return lines.join('\n');
};

// ─── Codex Agent ────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

const extractJson = (text: string): string => {
  const fenceMatch = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceMatch = /\{[\s\S]*\}/.exec(text);
  if (braceMatch) return braceMatch[0];

  return text.trim();
};

const runCodexAgent = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
  model: string,
): Promise<T> => {
  const codex = new Codex();
  const thread = codex.startThread({
    model,
    modelReasoningEffort: 'low',
    sandboxMode: 'read-only',
    skipGitRepoCheck: true,
    approvalPolicy: 'never',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const turn = await thread.run(prompt, {
      outputSchema: z.toJSONSchema(schema),
      signal: controller.signal,
    });

    const json = extractJson(turn.finalResponse);
    return schema.parse(JSON.parse(json));
  } finally {
    clearTimeout(timeoutId);
  }
};

// ─── Public API ─────────────────────────────────────────────────────

export const suggestCommitMessage = async (
  diffs: readonly FileDiff[],
  stagedFiles: readonly { path: string; status: string }[],
  branch: string,
  recentMessages: readonly string[],
  model: string,
): Promise<CommitMessageSuggestion> => {
  const diffText = formatDiffForPrompt(diffs);
  const prompt = buildCommitMessagePrompt(
    diffText,
    stagedFiles,
    branch,
    recentMessages,
  );
  return runCodexAgent(prompt, commitMessageSchema, model);
};

export const suggestBranchName = async (
  context: {
    commitMessage: string;
    commitHash?: string;
  },
  model: string,
): Promise<BranchNameSuggestion> => {
  const prompt = buildBranchNamePrompt(context);
  return runCodexAgent(prompt, branchNameSchema, model);
};
