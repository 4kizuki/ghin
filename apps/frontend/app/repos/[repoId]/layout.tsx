import type { FunctionComponent, ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { git } from '@/lib/git';
import { RepoView } from '@/components/repo-view';

const RepoLayout: FunctionComponent<{
  children: ReactNode;
  params: Promise<{ repoId: string }>;
}> = async ({ children, params }) => {
  const { repoId } = await params;
  const row = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!row) notFound();

  const repo = { ...row, createdAt: row.createdAt.toISOString() };
  const initialStatus = await git.getStatus(repo.path).catch(() => null);

  return (
    <RepoView repo={repo} initialStatus={initialStatus}>
      {children}
    </RepoView>
  );
};

export default RepoLayout;
