import { NextResponse } from 'next/server';
import { z } from 'zod';
import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { git } from '@/lib/git';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  url: z.string().min(1),
  destDir: z.string().min(1),
});

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { url, destDir } = parsed.data;

  if (!existsSync(destDir)) {
    return NextResponse.json(
      { error: `Directory does not exist: ${destDir}` },
      { status: 400 },
    );
  }

  const repoName = basename(url, '.git') || basename(url);
  const repoPath = join(destDir, repoName);

  try {
    await git.cloneRepository(url, destDir);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Clone failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const repo = await prisma.repository.create({
    data: { name: repoName, path: repoPath },
  });

  return NextResponse.json({ ok: true, repository: repo }, { status: 201 });
};
