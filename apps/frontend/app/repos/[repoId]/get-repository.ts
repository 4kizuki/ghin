import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export const getRepository = cache((repoId: string) =>
  prisma.repository.findUnique({ where: { id: repoId } }),
);
