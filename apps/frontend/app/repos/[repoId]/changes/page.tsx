'use client';

import type { FunctionComponent } from 'react';
import { Group, Loader } from '@mantine/core';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { ChangesView } from '@/components/changes-view';

const Page: FunctionComponent = () => {
  const { repoPath, status, refreshStatus } = useRepoStatus();

  if (!status) {
    return (
      <Group justify="center" pt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <ChangesView
      repoPath={repoPath}
      status={status}
      onRefresh={refreshStatus}
    />
  );
};

export default Page;
