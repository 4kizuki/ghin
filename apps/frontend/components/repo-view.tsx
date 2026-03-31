'use client';

import type { FunctionComponent, ReactNode } from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Box } from '@mantine/core';
import type { Repository } from '@/lib/api';
import type { RepoStatus } from '@/lib/git';
import { getStatus } from '@/lib/api';
import { usePolling } from '@/hooks/use-polling';
import { RepoStatusProvider } from '@/contexts/repo-status-context';

export const RepoView: FunctionComponent<{
  repo: Repository;
  initialStatus: RepoStatus | null;
  children: ReactNode;
}> = ({ repo, initialStatus, children }) => {
  const [status, setStatus] = useState<RepoStatus | null>(initialStatus);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getStatus(repo.path);
      setStatus(s);
    } catch {
      // silently fail on polling errors
    }
  }, [repo.path]);

  usePolling(refreshStatus, 30000, true);

  const statusContextValue = useMemo(
    () => ({ repoPath: repo.path, status, refreshStatus }),
    [repo.path, status, refreshStatus],
  );

  return (
    <RepoStatusProvider value={statusContextValue}>
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </RepoStatusProvider>
  );
};
