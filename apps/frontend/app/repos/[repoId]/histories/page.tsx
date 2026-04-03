import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { git } from '@/lib/git';
import { prisma } from '@/lib/prisma';
import { HistoryView } from '@/components/history-view';
import type { DateDisplayFormat } from '@/components/history-view';
import { getRepository } from '../get-repository';

export const metadata: Metadata = { title: 'Histories' };

const remotesSchema = z.array(z.string());

const isDateDisplayFormat = (v: string): v is DateDisplayFormat =>
  v === 'relative' || v === 'absolute';

const Page: FunctionComponent<{
  params: Promise<{ repoId: string }>;
}> = async ({ params }) => {
  const { repoId } = await params;
  const repo = await getRepository(repoId);
  if (!repo) notFound();

  const [commits, dateDisplaySetting] = await Promise.all([
    git.getLog(repo.path, 200),
    prisma.setting.findUnique({ where: { key: 'dateDisplayFormat' } }),
  ]);
  const fetchRemotes =
    repo.fetchRemotes === ''
      ? []
      : remotesSchema.parse(JSON.parse(repo.fetchRemotes));
  const dateDisplayFormat =
    dateDisplaySetting && isDateDisplayFormat(dateDisplaySetting.value)
      ? dateDisplaySetting.value
      : 'relative';

  return (
    <HistoryView
      repoPath={repo.path}
      initialCommits={commits}
      initialAutoFetch={repo.autoFetch}
      initialFetchRemotes={fetchRemotes}
      initialDateDisplayFormat={dateDisplayFormat}
    />
  );
};

export default Page;
