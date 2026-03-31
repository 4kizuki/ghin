import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
  remote: z.string().min(1),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: searchParams.get('repo'),
    remote: searchParams.get('remote'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'repo and remote are required' },
      { status: 400 },
    );
  }
  const url = await git.getRemoteUrl(parsed.data.repo, parsed.data.remote);
  return NextResponse.json({ url });
};
