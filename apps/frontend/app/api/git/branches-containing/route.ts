import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
  hash: z.string().min(1),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: searchParams.get('repo'),
    hash: searchParams.get('hash'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'repo and hash are required' },
      { status: 400 },
    );
  }
  const [branches, localBranches] = await Promise.all([
    git.getBranchesContaining(parsed.data.repo, parsed.data.hash),
    git.getLocalBranchNames(parsed.data.repo),
  ]);
  return NextResponse.json({ branches, localBranches });
};
