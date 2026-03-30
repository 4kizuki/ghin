'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
import type { Repository } from '@/lib/api';
import { listRepositories, addRepository, removeRepository } from '@/lib/api';
import { RepoView } from '@/components/repo-view';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';

export const AppShellView: FunctionComponent = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [helpOpened, { open: openHelp, close: closeHelp }] =
    useDisclosure(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const loadRepos = useCallback(async () => {
    const data = await listRepositories();
    setRepos(data);
    if (data.length > 0 && !activeTab) {
      setActiveTab(data[0].id);
    }
  }, [activeTab]);

  useEffect(() => {
    loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !newPath.trim()) return;
    const repo = await addRepository(newName.trim(), newPath.trim());
    setRepos((prev) => [...prev, repo]);
    setActiveTab(repo.id);
    setNewName('');
    setNewPath('');
    closeAdd();
  }, [newName, newPath, closeAdd]);

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
          setRepos((prev) => prev.filter((r) => r.id !== id));
          if (activeTab === id) {
            setActiveTab((prev) => {
              const remaining = repos.filter((r) => r.id !== id);
              return remaining.length > 0 ? remaining[0].id : null;
            });
          }
        },
      });
    },
    [activeTab, repos],
  );

  const activeRepo = useMemo(
    () => repos.find((r) => r.id === activeTab),
    [repos, activeTab],
  );

  const shortcuts = useMemo(
    () => [
      { key: '?', handler: openHelp },
      ...repos.slice(0, 9).map((repo, i) => ({
        key: String(i + 1),
        meta: true,
        handler: () => setActiveTab(repo.id),
      })),
    ],
    [repos, openHelp],
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
        value={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Tabs.List>
          {repos.map((repo) => (
            <Tabs.Tab
              key={repo.id}
              value={repo.id}
              rightSection={
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(repo.id);
                  }}
                >
                  <IconX size={12} />
                </ActionIcon>
              }
            >
              {repo.name}
            </Tabs.Tab>
          ))}
          <ActionIcon variant="subtle" color="gray" ml="xs" onClick={openAdd}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tabs.List>

        {repos.map((repo) => (
          <Tabs.Panel
            key={repo.id}
            value={repo.id}
            style={{ flex: 1, overflow: 'hidden' }}
          >
            {activeRepo?.id === repo.id && <RepoView repo={repo} />}
          </Tabs.Panel>
        ))}

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
