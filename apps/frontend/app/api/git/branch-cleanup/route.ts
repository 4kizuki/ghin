import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ repo: searchParams.get('repo') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'repo is required' }, { status: 400 });
  }
  const branches = await git.getMergedBranches(parsed.data.repo);
  return NextResponse.json({ branches });
};

const deleteSchema = z.object({
  repo: z.string().min(1),
  branches: z.array(z.string().min(1)),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const output = await git.deleteBranches(
    parsed.data.repo,
    parsed.data.branches,
  );
  return NextResponse.json({ ok: true, output });
};
