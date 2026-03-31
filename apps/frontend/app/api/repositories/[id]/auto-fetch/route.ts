import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { autoFetchManager } from '@/lib/auto-fetch-manager';

const bodySchema = z.object({
  autoFetch: z.boolean(),
  fetchRemotes: z.array(z.string()),
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const repo = await prisma.repository.update({
    where: { id },
    data: {
      autoFetch: parsed.data.autoFetch,
      fetchRemotes: JSON.stringify(parsed.data.fetchRemotes),
    },
  });

  if (parsed.data.autoFetch) {
    autoFetchManager.register(repo.path, parsed.data.fetchRemotes);
  } else {
    autoFetchManager.unregister(repo.path);
  }

  return NextResponse.json({ ok: true });
};
