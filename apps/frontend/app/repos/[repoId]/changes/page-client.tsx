'use client';

import type { FunctionComponent } from 'react';
import { useEffect } from 'react';
import { Group, Loader } from '@mantine/core';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { ChangesView } from '@/components/changes-view';

export const ChangesPageClient: FunctionComponent<{
  initialAutoPush: boolean;
  aiEnabled: boolean;
}> = ({ initialAutoPush, aiEnabled }) => {
  const { repoPath, status, refreshStatus } = useRepoStatus();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

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
      initialAutoPush={initialAutoPush}
      aiEnabled={aiEnabled}
    />
  );
};
