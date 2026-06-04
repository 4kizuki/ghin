import { z } from 'zod';
import { NeverError } from '@repo/never-error';
import { fetchJson } from './fetch';

const commitMessageSuggestionSchema = z.object({
  subject: z.string(),
  body: z.string(),
  dangerFiles: z.array(z.string()),
});

const commitPhaseSchema = z.enum([
  'analyzing-diff',
  'checking-history',
  'inspecting-file',
  'working',
]);

export type CommitPhase = z.infer<typeof commitPhaseSchema>;

const commitStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('progress'), phase: commitPhaseSchema }),
  z.object({
    type: z.literal('final'),
    suggestion: commitMessageSuggestionSchema,
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

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

export const streamCommitMessageSuggestion = async (
  repo: string,
  options: {
    unlimited: boolean;
    signal?: AbortSignal;
    onProgress?: (phase: CommitPhase) => void;
  },
): Promise<CommitMessageSuggestion> => {
  const res = await fetch('/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'commit-message',
      repo,
      unlimited: options.unlimited,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Response had no body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleChunk = (chunk: string): CommitMessageSuggestion | null => {
    const line = chunk
      .split('\n')
      .find((candidate) => candidate.startsWith('data: '));
    if (!line) return null;
    const parsed: unknown = JSON.parse(line.slice('data: '.length));
    const event = commitStreamEventSchema.parse(parsed);
    switch (event.type) {
      case 'progress':
        options.onProgress?.(event.phase);
        return null;
      case 'final':
        return event.suggestion;
      case 'error':
        throw new Error(event.message);
      default:
        throw new NeverError(event);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const chunk = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const suggestion = handleChunk(chunk);
      if (suggestion) return suggestion;
      separatorIndex = buffer.indexOf('\n\n');
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const suggestion = handleChunk(trailing);
    if (suggestion) return suggestion;
  }

  throw new Error('Stream ended without a result');
};

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
