import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

export const GET = async (): Promise<NextResponse> => {
  const repos = await prisma.repository.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(repos);
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const body: unknown = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const repo = await prisma.repository.create({
    data: parsed.data,
  });
  return NextResponse.json(repo, { status: 201 });
};
