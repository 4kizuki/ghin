import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  paths: z.array(z.string()).optional(),
  patch: z.string().optional(),
  untrackedFile: z.string().optional(),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    if (parsed.data.patch) {
      await git.discardHunk(parsed.data.repo, parsed.data.patch);
    } else if (parsed.data.untrackedFile) {
      await git.deleteUntrackedFile(
        parsed.data.repo,
        parsed.data.untrackedFile,
      );
    } else if (parsed.data.paths) {
      await git.discardFiles(parsed.data.repo, parsed.data.paths);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
