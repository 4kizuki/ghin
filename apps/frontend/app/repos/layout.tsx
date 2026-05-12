import type { FunctionComponent, ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { AppShellView } from '@/components/app-shell-view';
import {
  OPEN_TAB_IDS_SETTING_KEY,
  parseOpenTabIds,
} from '@/lib/open-tabs-storage';

const ReposLayout: FunctionComponent<{ children: ReactNode }> = async ({
  children,
}) => {
  const [rows, setting] = await Promise.all([
    prisma.repository.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.setting.findUnique({ where: { key: OPEN_TAB_IDS_SETTING_KEY } }),
  ]);
  const repos = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
  const initialOpenTabIds = parseOpenTabIds(setting?.value ?? null);

  return (
    <AppShellView repos={repos} initialOpenTabIds={initialOpenTabIds}>
      {children}
    </AppShellView>
  );
};

export default ReposLayout;
