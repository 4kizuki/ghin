import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  ref: z.string().min(1),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { repo, ref } = parsed.data;

  if (/^origin\//.test(ref)) {
    return NextResponse.json(
      {
        error:
          'Cannot checkout remote branch directly. Create a local branch instead.',
      },
      { status: 400 },
    );
  }

  if (/^[0-9a-f]{7,40}$/i.test(ref)) {
    return NextResponse.json(
      { error: 'Cannot checkout a bare commit hash. Create a branch first.' },
      { status: 400 },
    );
  }

  const output = await git.checkout(repo, ref);
  return NextResponse.json({ ok: true, output });
};
