import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const bodySchema = z.object({
  repo: z.string().min(1),
  message: z.string().min(1),
  newBranch: z.string().optional(),
  autoPush: z.boolean().default(false),
  pushBranch: z.string().optional(),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const userName = await git.getConfig(parsed.data.repo, 'user.name');
  const userEmail = await git.getConfig(parsed.data.repo, 'user.email');
  if (!userName || !userEmail) {
    return NextResponse.json(
      { error: 'identity_unknown', userName, userEmail },
      { status: 422 },
    );
  }

  if (parsed.data.newBranch) {
    await git.createBranch(parsed.data.repo, parsed.data.newBranch);
  }

  const output = await git.commit(parsed.data.repo, parsed.data.message);

  if (parsed.data.autoPush) {
    await git.push(parsed.data.repo, true, parsed.data.pushBranch);
  }

  return NextResponse.json({ ok: true, output });
};
