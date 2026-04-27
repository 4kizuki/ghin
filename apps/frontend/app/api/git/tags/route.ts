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
  const tags = await git.getTags(parsed.data.repo);
  return NextResponse.json(tags);
};

const deleteBodySchema = z.object({
  repo: z.string().min(1),
  name: z.string().min(1),
});

export const DELETE = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const output = await git.deleteTag(parsed.data.repo, parsed.data.name);
  return NextResponse.json({ ok: true, output });
};
