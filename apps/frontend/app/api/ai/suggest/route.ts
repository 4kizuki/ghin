import { NextResponse } from 'next/server';
import { z } from 'zod';

import { git } from '@/lib/git';
import { suggestCommitMessage, suggestBranchName } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

const DEFAULT_MODEL = 'gpt-5.3-codex-spark';

// ─── Request Schemas ────────────────────────────────────────────────

const fileChangeSchema = z.object({
  path: z.string(),
  status: z.string(),
  staged: z.boolean(),
});

const commitMessageBody = z.object({
  type: z.literal('commit-message'),
  repo: z.string().min(1),
  branch: z.string(),
  stagedFiles: z.array(fileChangeSchema),
});

const branchNameBody = z.object({
  type: z.literal('branch-name'),
  commitMessage: z.string(),
  commitHash: z.string().optional(),
});

const bodySchema = z.discriminatedUnion('type', [
  commitMessageBody,
  branchNameBody,
]);

// ─── Handler ────────────────────────────────────────────────────────

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const [enabledRow, modelRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'aiEnabled' } }),
    prisma.setting.findUnique({ where: { key: 'aiModel' } }),
  ]);

  if (enabledRow?.value !== 'true') {
    return NextResponse.json(
      { error: 'AI suggestions are disabled' },
      { status: 403 },
    );
  }

  const model = modelRow?.value || DEFAULT_MODEL;

  try {
    if (parsed.data.type === 'commit-message') {
      const [diffs, recentCommits] = await Promise.all([
        git.getDiff(parsed.data.repo, true),
        git.getLog(parsed.data.repo, 20).catch(() => []),
      ]);
      const recentMessages = recentCommits.map((c) => c.message);
      const suggestion = await suggestCommitMessage(
        diffs,
        parsed.data.stagedFiles,
        parsed.data.branch,
        recentMessages,
        model,
      );
      return NextResponse.json(suggestion);
    }

    const suggestion = await suggestBranchName(
      {
        commitMessage: parsed.data.commitMessage,
        commitHash: parsed.data.commitHash,
      },
      model,
    );
    return NextResponse.json(suggestion);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Codex timeout' || message.includes('aborted')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
};
