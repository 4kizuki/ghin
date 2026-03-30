import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  paths: z.array(z.string()).optional(),
  patch: z.string().optional(),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  if (parsed.data.patch) {
    await git.unstageHunk(parsed.data.repo, parsed.data.patch);
  } else if (parsed.data.paths) {
    await git.unstageFiles(parsed.data.repo, parsed.data.paths);
  }

  return NextResponse.json({ ok: true });
};
