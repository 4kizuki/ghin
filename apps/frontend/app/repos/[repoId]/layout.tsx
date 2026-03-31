import type { FunctionComponent, ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { git } from '@/lib/git';
import { RepoView } from '@/components/repo-view';
import { getRepository } from './get-repository';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ repoId: string }>;
}): Promise<Metadata> => {
  const { repoId } = await params;
  const repo = await getRepository(repoId);
  if (!repo) return {};
  return {
    title: {
      default: repo.name,
      template: `%s - ${repo.name} | Ghin`,
    },
  };
};

const RepoLayout: FunctionComponent<{
  children: ReactNode;
  params: Promise<{ repoId: string }>;
}> = async ({ children, params }) => {
  const { repoId } = await params;
  const row = await getRepository(repoId);
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
