import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    await git.openInTerminal(parsed.data.repo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to open terminal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
