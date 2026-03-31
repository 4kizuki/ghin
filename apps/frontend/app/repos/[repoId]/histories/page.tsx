import type { FunctionComponent } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { git } from '@/lib/git';
import { HistoryView } from '@/components/history-view';

const Page: FunctionComponent<{
  params: Promise<{ repoId: string }>;
}> = async ({ params }) => {
  const { repoId } = await params;
  const repo = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repo) notFound();

  const commits = await git.getLog(repo.path, 200);

  return <HistoryView repoPath={repo.path} initialCommits={commits} />;
};

export default Page;
