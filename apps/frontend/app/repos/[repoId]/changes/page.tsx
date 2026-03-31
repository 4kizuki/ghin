import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ChangesPageClient } from './page-client';

export const metadata: Metadata = { title: 'Changes' };

const Page: FunctionComponent = async () => {
  const [autoPushRow, aiEnabledRow, authorNameRow, authorEmailRow] =
    await Promise.all([
      prisma.setting.findUnique({ where: { key: 'autoPush' } }),
      prisma.setting.findUnique({ where: { key: 'aiEnabled' } }),
      prisma.setting.findUnique({ where: { key: 'defaultAuthorName' } }),
      prisma.setting.findUnique({ where: { key: 'defaultAuthorEmail' } }),
    ]);
  const initialAutoPush = autoPushRow?.value === 'true';
  const aiEnabled = aiEnabledRow?.value === 'true';

  return (
    <ChangesPageClient
      initialAutoPush={initialAutoPush}
      aiEnabled={aiEnabled}
      defaultAuthorName={authorNameRow?.value ?? ''}
      defaultAuthorEmail={authorEmailRow?.value ?? ''}
    />
  );
};

export default Page;
