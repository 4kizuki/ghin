import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { Text } from '@mantine/core';
import type { CommitInfo, RepoStatus } from '@/lib/git';
import {
  pullAndMergeMain,
  pullCurrentBranch,
  pushChanges,
  addRemote,
  getRemoteUrl,
  fetchRemotes as apiFetchRemotes,
  mergeRef,
  resetToCommit,
  openInEditor,
  checkoutAndPull,
} from '@/lib/api';

export const useGitActions = ({
  repoPath,
  repoId,
  status,
  selectedRemotes,
  refreshCommits,
  refreshStatus,
  navigateToChanges,
}: {
  repoPath: string;
  repoId: string;
  status: RepoStatus | null;
  selectedRemotes: string[];
  refreshCommits: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  navigateToChanges: () => void;
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [
    originSetupOpened,
    { open: openOriginSetup, close: closeOriginSetup },
  ] = useDisclosure(false);
  const [originUrl, setOriginUrl] = useState('');
  const [originSaving, setOriginSaving] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<{
    hash: string;
    hasBranchRef: boolean;
    message: string;
  } | null>(null);

  const handleMergeBranch = useCallback(
    async (branch: string) => {
      setActionLoading(true);
      try {
        const result = await mergeRef(repoPath, branch);
        if (result.hasConflicts) {
          notifications.show({
            message: 'Merge conflicts detected. Please resolve conflicts.',
            color: 'yellow',
          });
          navigateToChanges();
        } else if (!result.success) {
          notifications.show({ message: result.output, color: 'red' });
        } else {
          notifications.show({
            message: `Merged ${branch} successfully`,
            color: 'green',
          });
        }
        await refreshStatus();
        await refreshCommits();
      } catch (e) {
        notifications.show({
          message: e instanceof Error ? e.message : 'Merge failed',
          color: 'red',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [repoPath, refreshStatus, refreshCommits, navigateToChanges],
  );

  const handleReset = useCallback(
    (mode: 'hard' | 'mixed' | 'soft', commit: CommitInfo) => {
      const modeLabels = {
        hard: 'Hard reset (discard all changes)',
        mixed: 'Mixed reset (unstage changes)',
        soft: 'Soft reset (keep changes staged)',
      } as const;

      modals.openConfirmModal({
        title: modeLabels[mode],
        children: (
          <Text size="sm">
            Reset current branch to {commit.shortHash} ({commit.message})?
            {mode === 'hard' && ' This will discard all uncommitted changes.'}
          </Text>
        ),
        labels: { confirm: `Reset (--${mode})`, cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          setActionLoading(true);
          try {
            await resetToCommit(repoPath, commit.hash, mode);
            notifications.show({
              message: `Reset (--${mode}) to ${commit.shortHash} successful`,
              color: 'green',
            });
            await refreshStatus();
            await refreshCommits();
          } catch (e) {
            notifications.show({
              message: e instanceof Error ? e.message : 'Reset failed',
              color: 'red',
            });
          } finally {
            setActionLoading(false);
          }
        },
      });
    },
    [repoPath, refreshStatus, refreshCommits],
  );

  const handlePullMerge = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await pullAndMergeMain(repoPath);
      if (result.hasConflicts) {
        notifications.show({
          message: 'Merge conflicts detected. Please resolve conflicts.',
          color: 'yellow',
        });
        navigateToChanges();
      } else if (!result.success) {
        notifications.show({ message: result.output, color: 'red' });
      } else {
        notifications.show({
          message: 'Pull & merge successful',
          color: 'green',
        });
      }
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Pull & merge failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [repoPath, refreshStatus, refreshCommits, navigateToChanges]);

  const handlePull = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await pullCurrentBranch(repoPath);
      if (!result.success) {
        notifications.show({ message: result.output, color: 'red' });
      } else {
        notifications.show({ message: 'Pull successful', color: 'green' });
      }
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Pull failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [repoPath, refreshStatus, refreshCommits]);

  const handleOpenInEditor = useCallback(async () => {
    try {
      await openInEditor(repoPath);
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Failed to open editor',
        color: 'red',
      });
    }
  }, [repoPath]);

  const executePush = useCallback(async () => {
    setActionLoading(true);
    try {
      await pushChanges(repoPath, !status?.upstream);
      await apiFetchRemotes(repoPath, selectedRemotes);
      notifications.show({ message: 'Push successful', color: 'green' });
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Push failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [
    repoPath,
    status?.upstream,
    selectedRemotes,
    refreshStatus,
    refreshCommits,
  ]);

  const handlePush = useCallback(async () => {
    try {
      await getRemoteUrl(repoPath, 'origin');
      await executePush();
    } catch {
      setOriginUrl('');
      openOriginSetup();
    }
  }, [repoPath, executePush, openOriginSetup]);

  const handleAddOriginAndPush = useCallback(async () => {
    if (!originUrl.trim()) return;
    setOriginSaving(true);
    try {
      await addRemote(repoPath, 'origin', originUrl.trim());
      closeOriginSetup();
      await executePush();
    } catch {
      notifications.show({
        title: 'origin の追加に失敗しました',
        message:
          'URL を確認してください。すでに origin が存在する可能性があります。',
        color: 'red',
      });
    } finally {
      setOriginSaving(false);
    }
  }, [repoPath, originUrl, closeOriginSetup, executePush]);

  const handleCheckoutAndPull = useCallback(
    async (remoteBranch: string) => {
      const localBranch = remoteBranch.replace(/^origin\//, '');
      setActionLoading(true);
      try {
        const result = await checkoutAndPull(repoPath, remoteBranch);
        if (result.hasConflicts) {
          notifications.show({
            message: 'Merge conflicts detected. Please resolve conflicts.',
            color: 'yellow',
          });
          navigateToChanges();
        } else if (!result.success) {
          notifications.show({ message: result.output, color: 'red' });
        } else {
          notifications.show({
            message: `Checked out ${localBranch} and pulled successfully`,
            color: 'green',
          });
        }
        await refreshStatus();
        await refreshCommits();
      } catch (e) {
        notifications.show({
          message: e instanceof Error ? e.message : 'Checkout & pull failed',
          color: 'red',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [repoPath, refreshStatus, refreshCommits, navigateToChanges],
  );

  const handleCommitDoubleClick = useCallback((commit: CommitInfo) => {
    const hasBranchRef = commit.refs.some((ref) => !ref.startsWith('tag: '));
    setCheckoutTarget({
      hash: commit.hash,
      hasBranchRef,
      message: commit.message,
    });
  }, []);

  const handlePostCheckout = useCallback(async () => {
    await refreshStatus();
    await refreshCommits();
  }, [refreshStatus, refreshCommits]);

  return {
    actionLoading,
    originSetupOpened,
    originUrl,
    setOriginUrl,
    originSaving,
    closeOriginSetup,
    handleAddOriginAndPush,
    checkoutTarget,
    setCheckoutTarget,
    handleMergeBranch,
    handleCheckoutAndPull,
    handleReset,
    handlePullMerge,
    handlePull,
    handleOpenInEditor,
    handlePush,
    handleCommitDoubleClick,
    handlePostCheckout,
  };
};
