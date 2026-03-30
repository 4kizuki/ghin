import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  await prisma.repository.delete({ where: { id } });
  return NextResponse.json({ ok: true });
};
