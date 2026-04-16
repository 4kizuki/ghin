import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import {
  fetchRemotes as apiFetchRemotes,
  getRemotes as apiGetRemotes,
  updateAutoFetch,
} from '@/lib/api';

export const useFetchRemotes = ({
  repoPath,
  repoId,
  initialAutoFetch,
  initialFetchRemotes,
  refreshCommits,
  refreshStatus,
}: {
  repoPath: string;
  repoId: string;
  initialAutoFetch: boolean;
  initialFetchRemotes: string[];
  refreshCommits: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}) => {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [autoFetch, setAutoFetch] = useState(initialAutoFetch);
  const [selectedRemotes, setSelectedRemotes] =
    useState<string[]>(initialFetchRemotes);
  const [availableRemotes, setAvailableRemotes] = useState<string[]>([]);

  const handleFetch = useCallback(async () => {
    setFetchLoading(true);
    try {
      await apiFetchRemotes(repoPath, selectedRemotes);
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Fetch failed',
        color: 'red',
      });
    } finally {
      setFetchLoading(false);
    }
  }, [repoPath, selectedRemotes, refreshStatus, refreshCommits]);

  const handleAutoFetchToggle = useCallback(
    (checked: boolean) => {
      setAutoFetch(checked);
      updateAutoFetch(repoId, checked, selectedRemotes);
    },
    [repoId, selectedRemotes],
  );

  const handleRemoteToggle = useCallback(
    (remote: string, checked: boolean) => {
      const next = checked
        ? [...selectedRemotes, remote]
        : selectedRemotes.filter((r) => r !== remote);
      setSelectedRemotes(next);
      updateAutoFetch(repoId, autoFetch, next);
    },
    [repoId, autoFetch, selectedRemotes],
  );

  const loadRemotes = useCallback(async () => {
    try {
      const result = await apiGetRemotes(repoPath);
      setAvailableRemotes(result.remotes);
    } catch {
      // silently fail
    }
  }, [repoPath]);

  return {
    fetchLoading,
    autoFetch,
    selectedRemotes,
    availableRemotes,
    handleFetch,
    handleAutoFetchToggle,
    handleRemoteToggle,
    loadRemotes,
  };
};
