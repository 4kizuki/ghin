'use client';

import type { FunctionComponent } from 'react';
import { Group, Loader } from '@mantine/core';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { ChangesView } from '@/components/changes-view';
import { usePolling } from '@/hooks/use-polling';

export const ChangesPageClient: FunctionComponent<{
  initialAutoPush: boolean;
  aiEnabled: boolean;
  defaultAuthorName: string;
  defaultAuthorEmail: string;
}> = ({
  initialAutoPush,
  aiEnabled,
  defaultAuthorName,
  defaultAuthorEmail,
}) => {
  const { repoPath, status, refreshStatus } = useRepoStatus();

  usePolling(refreshStatus, 5_000, true, 120_000);

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
      defaultAuthorName={defaultAuthorName}
      defaultAuthorEmail={defaultAuthorEmail}
    />
  );
};
