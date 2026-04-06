import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  commits: z.array(
    z.object({
      hash: z.string().regex(/^[0-9a-f]{40}$/),
      newDate: z.string().min(1),
    }),
  ),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const { output, backupTag } = await git.distributeCommitDates(
      parsed.data.repo,
      parsed.data.commits,
    );
    return NextResponse.json({ ok: true, output, backupTag });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Distribution failed' },
      { status: 500 },
    );
  }
};
