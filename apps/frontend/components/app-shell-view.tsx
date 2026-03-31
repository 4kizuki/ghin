'use client';

import type { FunctionComponent, ReactNode } from 'react';
import { useState, useCallback, useMemo } from 'react';
import {
  Tabs,
  Group,
  ActionIcon,
  Text,
  Stack,
  Modal,
  TextInput,
  Button,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconX } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useParams, useRouter, usePathname } from 'next/navigation';
import type { Repository } from '@/lib/api';
import { addRepository, removeRepository } from '@/lib/api';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';

export const AppShellView: FunctionComponent<{
  repos: Repository[];
  children: ReactNode;
}> = ({ repos, children }) => {
  const params = useParams<{ repoId?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const repoId = params.repoId ?? null;

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [helpOpened, { open: openHelp, close: closeHelp }] =
    useDisclosure(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const navigateToRepo = useCallback(
    (id: string) => {
      const tab = pathname.endsWith('/histories') ? 'histories' : 'changes';
      router.push(`/repos/${id}/${tab}`);
    },
    [router, pathname],
  );

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !newPath.trim()) return;
    const repo = await addRepository(newName.trim(), newPath.trim());
    setNewName('');
    setNewPath('');
    closeAdd();
    router.refresh();
    router.push(`/repos/${repo.id}/changes`);
  }, [newName, newPath, closeAdd, router]);

  const handleRemove = useCallback(
    (id: string) => {
      modals.openConfirmModal({
        title: 'Remove repository',
        children: (
          <Text size="sm">
            Are you sure you want to remove this repository from Ghin?
          </Text>
        ),
        labels: { confirm: 'Remove', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await removeRepository(id);
          router.refresh();
          if (repoId === id) {
            const remaining = repos.filter((r) => r.id !== id);
            if (remaining.length > 0) {
              router.push(`/repos/${remaining[0].id}/changes`);
            } else {
              router.replace('/repos');
            }
          }
        },
      });
    },
    [repoId, repos, router],
  );

  const activeRepo = useMemo(
    () => repos.find((r) => r.id === repoId),
    [repos, repoId],
  );

  const shortcuts = useMemo(
    () => [
      { key: '?', handler: openHelp },
      ...repos.slice(0, 9).map((repo, i) => ({
        key: String(i + 1),
        meta: true,
        handler: () => navigateToRepo(repo.id),
      })),
    ],
    [repos, openHelp, navigateToRepo],
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
        <Tabs.List>
          {repos.map((repo) => (
            <Tabs.Tab
              key={repo.id}
              value={repo.id}
              rightSection={
                <Box
                  component="span"
                  style={{ cursor: 'pointer', display: 'inline-flex' }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleRemove(repo.id);
                  }}
                >
                  <IconX size={12} />
                </Box>
              }
            >
              {repo.name}
            </Tabs.Tab>
          ))}
          <ActionIcon variant="subtle" color="gray" ml="xs" onClick={openAdd}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tabs.List>

        {activeRepo && (
          <Box style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {children}
          </Box>
        )}

        {repos.length === 0 && (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Text c="dimmed" size="lg">
              No repositories added
            </Text>
            <Button onClick={openAdd} leftSection={<IconPlus size={16} />}>
              Add Repository
            </Button>
          </Stack>
        )}
      </Tabs>

      <Modal opened={addOpened} onClose={closeAdd} title="Add Repository">
        <Stack>
          <TextInput
            label="Name"
            placeholder="my-project"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <TextInput
            label="Path"
            placeholder="/Users/you/projects/my-project"
            value={newPath}
            onChange={(e) => setNewPath(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add</Button>
          </Group>
        </Stack>
      </Modal>

      <ShortcutsHelp opened={helpOpened} onClose={closeHelp} />
    </Box>
  );
};
