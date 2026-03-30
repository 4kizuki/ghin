import path from 'node:path';
import os from 'node:os';
import { defineConfig } from 'prisma/config';

const databaseUrl = `file:${path.join(os.homedir(), '.ghin', 'database.sqlite3')}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
