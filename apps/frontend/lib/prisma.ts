import 'server-only';
import { createPrismaClient } from '@repo/database';

export const prisma = createPrismaClient();
