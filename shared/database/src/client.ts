import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

const getDatabaseUrl = (): string => {
  const dir = path.join(homedir(), '.ghin');
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, 'database.sqlite3')}`;
};

export const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaBetterSqlite3({ url: getDatabaseUrl() });
  return new PrismaClient({ adapter });
};
