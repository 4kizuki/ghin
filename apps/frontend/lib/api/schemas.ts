import { z } from 'zod';

export const repositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export type Repository = z.infer<typeof repositorySchema>;

export const fileChangeSchema = z.object({
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

export const hunkLineSchema = z.object({
  type: z.union([z.literal('context'), z.literal('add'), z.literal('remove')]),
  content: z.string(),
  oldLineNumber: z.number().nullable(),
  newLineNumber: z.number().nullable(),
});

export const hunkSchema = z.object({
  header: z.string(),
  oldStart: z.number(),
  oldCount: z.number(),
  newStart: z.number(),
  newCount: z.number(),
  lines: z.array(hunkLineSchema),
});

export const fileDiffSchema = z.object({
  path: z.string(),
  oldPath: z.string().optional(),
  hunks: z.array(hunkSchema),
  isBinary: z.boolean(),
  isNew: z.boolean(),
  isDeleted: z.boolean(),
});

export const commitInfoSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  author: z.string(),
  authorEmail: z.string(),
  date: z.string(),
  message: z.string(),
  parents: z.array(z.string()),
  refs: z.array(z.string()),
});

export const tagInfoSchema = z.object({
  name: z.string(),
});

export const branchInfoSchema = z.object({
  name: z.string(),
  current: z.boolean(),
  upstream: z.string().optional(),
  aheadBehind: z.object({ ahead: z.number(), behind: z.number() }).optional(),
});

export const repoStatusSchema = z.object({
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

export const okSchema = z.object({ ok: z.boolean() });
export const okOutputSchema = z.object({
  ok: z.boolean(),
  output: z.string(),
});
export const mergeResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  hasConflicts: z.boolean(),
});
export const branchesResponseSchema = z.object({
  branches: z.array(z.string()),
});
export const branchesContainingResponseSchema = z.object({
  branches: z.array(z.string()),
  localBranches: z.array(z.string()),
});
export const remotesResponseSchema = z.object({
  remotes: z.array(z.string()),
});
export const urlResponseSchema = z.object({ url: z.string() });
export const settingsResponseSchema = z.record(z.string(), z.string());
