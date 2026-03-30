'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useMemo } from 'react';
import {
  Group,
  Button,
  Badge,
  Text,
  Tabs,
  Box,
  Tooltip,
  Loader,
  Notification,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconGitBranch,
  IconArrowUp,
  IconArrowDown,
  IconGitMerge,
  IconUpload,
  IconSearch,
} from '@tabler/icons-react';
import type { Repository } from '@/lib/api';
import type { RepoStatus } from '@/lib/git';
import { getStatus, pullAndMergeMain, pushChanges } from '@/lib/api';
import { usePolling } from '@/hooks/use-polling';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { ChangesView } from '@/components/changes-view';
import { HistoryView } from '@/components/history-view';
import { SearchDialog } from '@/components/search-dialog';
import { BranchSwitcher } from '@/components/branch-switcher';

export const RepoView: FunctionComponent<{ repo: Repository }> = ({ repo }) => {
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [tab, setTab] = useState<string | null>('changes');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [searchOpened, { open: openSearch, close: closeSearch }] =
    useDisclosure(false);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getStatus(repo.path);
      setStatus(s);
    } catch {
      // silently fail on polling errors
    }
  }, [repo.path]);

  usePolling(refreshStatus, 30000, true);

  const handlePullMerge = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pullAndMergeMain(repo.path);
      if (result.hasConflicts) {
        setNotification({
          message: 'Merge conflicts detected. Please resolve in VSCode.',
          color: 'yellow',
        });
      } else if (!result.success) {
        setNotification({ message: result.output, color: 'red' });
      } else {
        setNotification({ message: 'Pull & merge successful', color: 'green' });
      }
      await refreshStatus();
    } catch (e) {
      setNotification({
        message: e instanceof Error ? e.message : 'Pull & merge failed',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [repo.path, refreshStatus]);

  const handlePush = useCallback(async () => {
    setLoading(true);
    try {
      await pushChanges(repo.path, !status?.upstream);
      setNotification({ message: 'Push successful', color: 'green' });
      await refreshStatus();
    } catch (e) {
      setNotification({
        message: e instanceof Error ? e.message : 'Push failed',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [repo.path, status?.upstream, refreshStatus]);

  const shortcuts = useMemo(
    () => [
      { key: 'k', meta: true, handler: openSearch },
      { key: 'p', meta: true, handler: openSearch },
      { key: 'm', meta: true, shift: true, handler: handlePullMerge },
      { key: 'p', meta: true, shift: true, handler: handlePush },
      { key: 'b', meta: true, handler: openBranch },
    ],
    [openSearch, handlePullMerge, handlePush, openBranch],
  );

  useKeyboardShortcuts(shortcuts);

  const totalChanges =
    (status?.stagedFiles.length ?? 0) +
    (status?.unstagedFiles.length ?? 0) +
    (status?.untrackedFiles.length ?? 0);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Status Bar */}
      <Group
        px="md"
        py="xs"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        })}
      >
        <Group gap="sm">
          <Group gap={4}>
            <IconGitBranch size={16} />
            <Text fw={600} size="sm">
              {status?.branch ?? '...'}
            </Text>
          </Group>
          {status && status.ahead > 0 && (
            <Tooltip label={`${status.ahead} unpushed`}>
              <Badge
                color="orange"
                variant="light"
                size="sm"
                leftSection={<IconArrowUp size={10} />}
              >
                {status.ahead}
              </Badge>
            </Tooltip>
          )}
          {status && status.behind > 0 && (
            <Tooltip label={`${status.behind} unpulled`}>
              <Badge
                color="blue"
                variant="light"
                size="sm"
                leftSection={<IconArrowDown size={10} />}
              >
                {status.behind}
              </Badge>
            </Tooltip>
          )}
          {status && status.branch !== 'main' && status.aheadOfMain > 0 && (
            <Badge color="gray" variant="light" size="sm">
              main +{status.aheadOfMain}
            </Badge>
          )}
          {status && status.branch !== 'main' && status.behindMain > 0 && (
            <Badge color="gray" variant="light" size="sm">
              main -{status.behindMain}
            </Badge>
          )}
          {totalChanges > 0 && (
            <Badge color="violet" variant="light" size="sm">
              {totalChanges} changes
            </Badge>
          )}
          {status?.hasConflicts && (
            <Badge color="red" variant="filled" size="sm">
              CONFLICTS
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconSearch size={14} />}
            onClick={openSearch}
          >
            Search
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconGitMerge size={14} />}
            onClick={handlePullMerge}
            loading={loading}
          >
            Pull & Merge
          </Button>
          <Button
            size="xs"
            variant="light"
            color={status && status.ahead > 0 ? 'orange' : undefined}
            leftSection={<IconUpload size={14} />}
            onClick={handlePush}
            loading={loading}
          >
            Push
          </Button>
        </Group>
      </Group>

      {notification && (
        <Notification
          color={notification.color}
          onClose={() => setNotification(null)}
          withCloseButton
          mx="md"
          mt="xs"
        >
          {notification.message}
        </Notification>
      )}

      {/* Main Content */}
      <Tabs
        value={tab}
        onChange={setTab}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Tabs.List px="md">
          <Tabs.Tab value="changes">Changes</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="changes" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {status ? (
            <ChangesView
              repoPath={repo.path}
              status={status}
              onRefresh={refreshStatus}
            />
          ) : (
            <Group justify="center" pt="xl">
              <Loader size="sm" />
            </Group>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <HistoryView repoPath={repo.path} />
        </Tabs.Panel>
      </Tabs>

      <SearchDialog
        opened={searchOpened}
        onClose={closeSearch}
        repoPath={repo.path}
      />

      <BranchSwitcher
        opened={branchOpened}
        onClose={closeBranch}
        repoPath={repo.path}
        onSwitch={refreshStatus}
      />
    </Box>
  );
};
