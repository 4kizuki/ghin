import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const Page = async () => {
  const repo = await prisma.repository.findFirst({
    orderBy: { sortOrder: 'asc' },
  });
  if (repo) {
    redirect(`/repos/${repo.id}/changes`);
  } else {
    redirect('/repos');
  }
};

export default Page;
