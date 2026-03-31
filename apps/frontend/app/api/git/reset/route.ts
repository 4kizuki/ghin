import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  hash: z.string().min(1),
  mode: z.enum(['hard', 'mixed', 'soft']),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const output = await git.reset(
    parsed.data.repo,
    parsed.data.hash,
    parsed.data.mode,
  );
  return NextResponse.json({ ok: true, output });
};
