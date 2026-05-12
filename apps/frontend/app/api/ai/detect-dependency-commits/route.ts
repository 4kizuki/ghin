import { NextResponse } from 'next/server';
import { z } from 'zod';

import { git } from '@/lib/git';
import { detectDependencyCommits } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

const DEFAULT_MODEL = 'gpt-5.3-codex-spark';

const bodySchema = z.object({
  repo: z.string().min(1),
  hashes: z.array(z.string().regex(/^[0-9a-f]{40}$/)).min(1),
});

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
    const commits = await Promise.all(
      parsed.data.hashes.map(async (hash) => {
        const [info, diffs] = await Promise.all([
          git.findCommitByHash(parsed.data.repo, hash),
          git.getCommitDiff(parsed.data.repo, hash),
        ]);
        return {
          hash,
          message: info?.message ?? '',
          diffs,
        };
      }),
    );
    const result = await detectDependencyCommits(commits, model);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Codex timeout' || message.includes('aborted')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
};
