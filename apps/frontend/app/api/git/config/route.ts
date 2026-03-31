import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  key: z.string().min(1),
  value: z.string().min(1),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  await git.setLocalConfig(
    parsed.data.repo,
    parsed.data.key,
    parsed.data.value,
  );

  return NextResponse.json({ ok: true });
};
