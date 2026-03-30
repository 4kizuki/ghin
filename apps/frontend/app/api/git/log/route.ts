import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
  maxCount: z.coerce.number().default(200),
  skip: z.coerce.number().default(0),
  branch: z.string().optional(),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: searchParams.get('repo'),
    maxCount: searchParams.get('maxCount') ?? 200,
    skip: searchParams.get('skip') ?? 0,
    branch: searchParams.get('branch') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'repo is required' }, { status: 400 });
  }
  const log = await git.getLog(
    parsed.data.repo,
    parsed.data.maxCount,
    parsed.data.skip,
    parsed.data.branch,
  );
  return NextResponse.json(log);
};
