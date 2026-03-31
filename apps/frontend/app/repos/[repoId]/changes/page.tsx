import type { FunctionComponent } from 'react';
import { prisma } from '@/lib/prisma';
import { ChangesPageClient } from './page-client';

const Page: FunctionComponent = async () => {
  const row = await prisma.setting.findUnique({ where: { key: 'autoPush' } });
  const initialAutoPush = row?.value === 'true';

  return <ChangesPageClient initialAutoPush={initialAutoPush} />;
};

export default Page;
