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
  const status = await git.getStatus(parsed.data.repo);
  return NextResponse.json(status);
};
