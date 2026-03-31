import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  name: z.string().min(1),
  startPoint: z.string().optional(),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const output = await git.createBranch(
    parsed.data.repo,
    parsed.data.name,
    parsed.data.startPoint,
  );
  return NextResponse.json({ ok: true, output });
};
