import { NextResponse } from 'next/server';
import { z } from 'zod';
import { git } from '@/lib/git';

const querySchema = z.object({
  repo: z.string().min(1),
  type: z.enum(['message', 'file', 'hash']),
  query: z.string().min(1),
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    repo: searchParams.get('repo'),
    type: searchParams.get('type'),
    query: searchParams.get('query'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'repo, type, and query are required' },
      { status: 400 },
    );
  }

  const { repo, type, query } = parsed.data;

  switch (type) {
    case 'message': {
      const results = await git.searchCommits(repo, query);
      return NextResponse.json(results);
    }
    case 'file': {
      const results = await git.searchFileHistory(repo, query);
      return NextResponse.json(results);
    }
    case 'hash': {
      const result = await git.findCommitByHash(repo, query);
      return NextResponse.json(result ? [result] : []);
    }
  }
};
