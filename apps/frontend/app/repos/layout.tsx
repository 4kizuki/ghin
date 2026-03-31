import type { FunctionComponent, ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { AppShellView } from '@/components/app-shell-view';

const ReposLayout: FunctionComponent<{ children: ReactNode }> = async ({
  children,
}) => {
  const rows = await prisma.repository.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  const repos = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return <AppShellView repos={repos}>{children}</AppShellView>;
};

export default ReposLayout;
