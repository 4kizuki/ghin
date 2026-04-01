import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import { homedir } from 'node:os';
import { Container, Title } from '@mantine/core';
import { DirectoryBrowser } from '@/components/directory-browser';

export const metadata: Metadata = { title: 'Add Repository' };

const AddRepositoryPage: FunctionComponent = () => {
  const initialPath = homedir();

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
        Add Repository
      </Title>
      <DirectoryBrowser initialPath={initialPath} />
    </Container>
  );
};

export default AddRepositoryPage;
