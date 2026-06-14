import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git, GitAuthError } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  remotes: z.array(z.string()),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    await git.fetchRemotes(parsed.data.repo, parsed.data.remotes);
  } catch (e) {
    if (e instanceof GitAuthError) {
      return NextResponse.json(
        { error: 'auth_required', detail: e.stderr },
        { status: 401 },
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
};
