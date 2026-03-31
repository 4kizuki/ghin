import type { FunctionComponent } from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { git } from '@/lib/git';
import { HistoryView } from '@/components/history-view';

const remotesSchema = z.array(z.string());

const Page: FunctionComponent<{
  params: Promise<{ repoId: string }>;
}> = async ({ params }) => {
  const { repoId } = await params;
  const repo = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repo) notFound();

  const commits = await git.getLog(repo.path, 200);
  const fetchRemotes =
    repo.fetchRemotes === ''
      ? []
      : remotesSchema.parse(JSON.parse(repo.fetchRemotes));

  return (
    <HistoryView
      repoPath={repo.path}
      initialCommits={commits}
      initialAutoFetch={repo.autoFetch}
      initialFetchRemotes={fetchRemotes}
    />
  );
};

export default Page;
