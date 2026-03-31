import type { FunctionComponent } from 'react';
import { prisma } from '@/lib/prisma';
import { ChangesPageClient } from './page-client';

const Page: FunctionComponent = async () => {
  const [autoPushRow, aiEnabledRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'autoPush' } }),
    prisma.setting.findUnique({ where: { key: 'aiEnabled' } }),
  ]);
  const initialAutoPush = autoPushRow?.value === 'true';
  const aiEnabled = aiEnabledRow?.value === 'true';

  return (
    <ChangesPageClient
      initialAutoPush={initialAutoPush}
      aiEnabled={aiEnabled}
    />
  );
};

export default Page;
