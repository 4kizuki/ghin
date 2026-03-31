'use client';

import type { FunctionComponent, ReactNode } from 'react';
import { useCallback, useMemo, useEffect } from 'react';
import {
  Tabs,
  Group,
  ActionIcon,
  Text,
  Stack,
  Button,
  Box,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconMenu2,
  IconPlus,
  IconSearch,
  IconSettings,
  IconX,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useParams, useRouter, usePathname } from 'next/navigation';
import type { Repository } from '@/lib/api';
import { removeRepository } from '@/lib/api';
import { SearchDialog } from '@/components/search-dialog';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { RepoDrawer } from '@/components/repo-drawer';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { useOpenTabStore, useOpenTabActions } from '@/hooks/use-open-tabs';

export const AppShellView: FunctionComponent<{
  repos: Repository[];
  children: ReactNode;
}> = ({ repos, children }) => {
  const params = useParams<{ repoId?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const repoId = params.repoId ?? null;

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [helpOpened, { open: openHelp, close: closeHelp }] =
    useDisclosure(false);
  const [searchOpened, { open: openSearch, close: closeSearch }] =
    useDisclosure(false);

  const allRepoIds = useMemo(() => repos.map((r) => r.id), [repos]);
  const rawOpenTabIds = useOpenTabStore();
  const { openTab, closeTab, setOpenTabs } = useOpenTabActions();

  // null = localStorage 未初期化（初回起動 or SSR）→ 全リポジトリ表示
  const openTabIds = useMemo(() => {
    if (rawOpenTabIds === null) return allRepoIds;
    return rawOpenTabIds.filter((id) => allRepoIds.includes(id));
  }, [rawOpenTabIds, allRepoIds]);

  // 初回起動時に全リポジトリを localStorage に保存
  useEffect(() => {
    if (rawOpenTabIds === null && typeof window !== 'undefined') {
      if (localStorage.getItem('open-tab-ids') === null) {
        setOpenTabs(allRepoIds);
      }
    }
  }, [rawOpenTabIds, allRepoIds, setOpenTabs]);

  // URL の repoId がタブに無い場合は自動的に開く（repoId 変更時のみ）
  useEffect(() => {
    if (repoId && repos.some((r) => r.id === repoId)) {
      openTab(repoId);
    }
  }, [repoId, repos, openTab]);

  const visibleRepos = useMemo(
    () => repos.filter((r) => openTabIds.includes(r.id)),
    [repos, openTabIds],
  );

  const navigateToRepo = useCallback(
    (id: string) => {
      const tab = pathname.endsWith('/histories') ? 'histories' : 'changes';
      router.push(`/repos/${id}/${tab}`);
    },
    [router, pathname],
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      closeTab(id);
      if (repoId === id) {
        const remaining = openTabIds.filter((tid) => tid !== id);
        if (remaining.length > 0) {
          navigateToRepo(remaining[0]);
        } else {
          router.push('/repos');
        }
      }
    },
    [closeTab, repoId, openTabIds, navigateToRepo, router],
  );

  const handleDeleteRepo = useCallback(
    (id: string) => {
      const repo = repos.find((r) => r.id === id);
      modals.openConfirmModal({
        title: 'Remove repository',
        children: (
          <Text size="sm">
            Are you sure you want to remove &quot;{repo?.name}&quot; from Ghin?
          </Text>
        ),
        labels: { confirm: 'Remove', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await removeRepository(id);
          closeTab(id);
          router.refresh();
          if (repoId === id) {
            const remaining = openTabIds.filter((tid) => tid !== id);
            if (remaining.length > 0) {
              navigateToRepo(remaining[0]);
            } else {
              router.push('/repos');
            }
          }
        },
      });
    },
    [repos, repoId, openTabIds, closeTab, navigateToRepo, router],
  );

  const handleOpenRepo = useCallback(
    (id: string) => {
      if (!openTabIds.includes(id)) {
        openTab(id);
      }
      navigateToRepo(id);
    },
    [openTabIds, openTab, navigateToRepo],
  );

  const activeRepo = useMemo(
    () => visibleRepos.find((r) => r.id === repoId),
    [visibleRepos, repoId],
  );

  const shortcuts = useMemo(
    () => [
      { key: '?', handler: openHelp },
      ...visibleRepos.slice(0, 9).map((repo, i) => ({
        key: String(i + 1),
        meta: true,
        handler: () => navigateToRepo(repo.id),
      })),
    ],
    [visibleRepos, openHelp, navigateToRepo],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <Box
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={repoId}
        onChange={(v) => {
          if (v) navigateToRepo(v);
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Group
          wrap="nowrap"
          gap={0}
          justify="space-between"
          style={(theme) => ({
            borderBottom: `2px solid ${theme.colors.gray[2]}`,
          })}
        >
          <Tabs.List style={{ flexWrap: 'nowrap', borderBottom: 'none' }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              mx={4}
              onClick={openDrawer}
              style={{ alignSelf: 'center' }}
            >
              <IconMenu2 size={18} />
            </ActionIcon>
            {visibleRepos.map((repo) => (
              <Tabs.Tab
                key={repo.id}
                value={repo.id}
                rightSection={
                  <Box
                    component="span"
                    style={{ cursor: 'pointer', display: 'inline-flex' }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleCloseTab(repo.id);
                    }}
                  >
                    <IconX size={12} />
                  </Box>
                }
              >
                {repo.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Group gap={0} wrap="nowrap">
            <Tooltip label="Search (⌘K)" openDelay={400}>
              <ActionIcon
                variant="subtle"
                color="gray"
                mx={4}
                onClick={openSearch}
                disabled={!activeRepo}
              >
                <IconSearch size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Settings" openDelay={400}>
              <ActionIcon
                variant="subtle"
                color="gray"
                mx={4}
                onClick={() => router.push('/settings')}
              >
                <IconSettings size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {activeRepo && (
          <Box style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {children}
          </Box>
        )}

        {visibleRepos.length === 0 && repos.length > 0 && (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Text c="dimmed" size="lg">
              No repositories open
            </Text>
            <Button onClick={openDrawer} leftSection={<IconMenu2 size={16} />}>
              Open Repository List
            </Button>
          </Stack>
        )}

        {repos.length === 0 && (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Text c="dimmed" size="lg">
              No repositories added
            </Text>
            <Button
              onClick={() => router.push('/add-repository')}
              leftSection={<IconPlus size={16} />}
            >
              Add Repository
            </Button>
          </Stack>
        )}
      </Tabs>

      <RepoDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        repos={repos}
        openTabIds={openTabIds}
        onOpenRepo={handleOpenRepo}
        onDeleteRepo={handleDeleteRepo}
      />

      <ShortcutsHelp opened={helpOpened} onClose={closeHelp} />

      <SearchDialog
        opened={searchOpened}
        onClose={closeSearch}
        repoPath={activeRepo?.path ?? ''}
      />
    </Box>
  );
};
