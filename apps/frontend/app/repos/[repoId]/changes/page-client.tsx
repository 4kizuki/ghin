'use client';

import type { FunctionComponent } from 'react';
import { Group, Loader } from '@mantine/core';
import { useEffect } from 'react';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { ChangesView } from '@/components/changes-view';

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

  useEffect(() => {
    const onVisible = (): void => {
      if (!document.hidden) {
        refreshStatus();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
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
      defaultAuthorName={defaultAuthorName}
      defaultAuthorEmail={defaultAuthorEmail}
    />
  );
};
