import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
  staged: z.enum(['true', 'false']).default('false'),
  file: z.string().optional(),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: searchParams.get('repo'),
    staged: searchParams.get('staged') ?? 'false',
    file: searchParams.get('file') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'repo is required' }, { status: 400 });
  }
  const diff = await git.getDiff(
    parsed.data.repo,
    parsed.data.staged === 'true',
    parsed.data.file,
  );
  return NextResponse.json(diff);
};
