import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  path: z.string().min(1),
});

export const GET = (request: Request): NextResponse => {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ path: searchParams.get('path') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 });
  }

  const { path } = parsed.data;

  try {
    const stat = statSync(path);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Path not found' }, { status: 404 });
  }

  try {
    const dirents = readdirSync(path, { withFileTypes: true });
    const entries = dirents
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => ({
        name: d.name,
        isGitRepo: existsSync(join(path, d.name, '.git')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = dirname(path) !== path ? dirname(path) : null;
    const currentIsGitRepo = existsSync(join(path, '.git'));

    return NextResponse.json({ entries, parentPath, currentIsGitRepo });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 },
    );
  }
};
