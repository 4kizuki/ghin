import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import { homedir } from 'node:os';
import { Container, Title } from '@mantine/core';
import { prisma } from '@/lib/prisma';
import { CloneRepositoryView } from '@/components/clone-repository-view';

export const metadata: Metadata = { title: 'Clone Repository' };

const CloneRepositoryPage: FunctionComponent = async () => {
  const setting = await prisma.setting.findUnique({
    where: { key: 'defaultCloneDir' },
  });
  const defaultDir = setting?.value || homedir();

  return (
    <Container
      size="sm"
      py="xl"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Title order={2} mb="lg" style={{ flex: '0 0 auto' }}>
        Clone Repository
      </Title>
      <CloneRepositoryView defaultDir={defaultDir} />
    </Container>
  );
};

export default CloneRepositoryPage;
