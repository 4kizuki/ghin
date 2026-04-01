'use client';

import type { FunctionComponent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Paper,
  UnstyledButton,
  Group,
  Text,
  Button,
  ScrollArea,
  Loader,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import { IconFolder, IconArrowUp, IconCheck } from '@tabler/icons-react';

type DirEntry = {
  name: string;
};

export const DirectoryPickerModal: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath: string;
}> = ({ opened, onClose, onSelect, initialPath }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [pathInput, setPathInput] = useState(initialPath);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setError(
          typeof data.error === 'string' ? data.error : 'Failed to load',
        );
        setEntries([]);
        setParentPath(null);
        return;
      }
      const data: {
        entries: { name: string; isGitRepo: boolean }[];
        parentPath: string | null;
      } = await res.json();
      setEntries(data.entries.map((e) => ({ name: e.name })));
      setParentPath(data.parentPath);
      setCurrentPath(path);
      setPathInput(path);
    } catch {
      setError('Failed to load directory');
      setEntries([]);
      setParentPath(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (opened) {
      void loadDirectory(initialPath || '/');
    }
  }, [opened, initialPath, loadDirectory]);

  const navigateTo = (path: string) => {
    void loadDirectory(path);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void loadDirectory(pathInput);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onClose();
  };

  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Select Directory"
      size="lg"
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '60vh',
        },
      }}
    >
      <Stack
        gap="sm"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0',
          overflow: 'hidden',
        }}
      >
        <TextInput
          value={pathInput}
          onChange={(e) => setPathInput(e.currentTarget.value)}
          onKeyDown={handlePathKeyDown}
          placeholder="/path/to/directory"
          styles={{ input: { fontFamily: 'monospace' } }}
          style={{ flex: '0 0 auto' }}
        />

        <Breadcrumbs style={{ flex: '0 0 auto' }}>
          <Anchor
            size="sm"
            onClick={() => navigateTo('/')}
            style={{ cursor: 'pointer' }}
          >
            /
          </Anchor>
          {breadcrumbParts.map((part, i) => {
            const path = '/' + breadcrumbParts.slice(0, i + 1).join('/');
            return (
              <Anchor
                key={path}
                size="sm"
                onClick={() => navigateTo(path)}
                style={{ cursor: 'pointer' }}
              >
                {part}
              </Anchor>
            );
          })}
        </Breadcrumbs>

        <Paper
          withBorder
          style={{ flex: '1 1 0', overflow: 'hidden', minHeight: 0 }}
        >
          <ScrollArea
            h="100%"
            styles={{
              viewport: { overscrollBehavior: 'none' },
            }}
          >
            {loading ? (
              <Group justify="center" py="xl">
                <Loader size="sm" />
              </Group>
            ) : error !== null ? (
              <Text c="red" ta="center" py="xl" size="sm">
                {error}
              </Text>
            ) : (
              <Stack gap={0}>
                {parentPath !== null && (
                  <UnstyledButton
                    p="xs"
                    onClick={() => navigateTo(parentPath)}
                    style={{
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Group gap="xs">
                      <IconArrowUp size={16} />
                      <Text size="sm">..</Text>
                    </Group>
                  </UnstyledButton>
                )}
                {entries.map((entry) => (
                  <UnstyledButton
                    key={entry.name}
                    p="xs"
                    onClick={() =>
                      navigateTo(
                        currentPath === '/'
                          ? `/${entry.name}`
                          : `${currentPath}/${entry.name}`,
                      )
                    }
                    style={{
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Group gap="xs">
                      <IconFolder size={16} />
                      <Text size="sm">{entry.name}</Text>
                    </Group>
                  </UnstyledButton>
                ))}
                {entries.length === 0 && parentPath === null && (
                  <Text c="dimmed" ta="center" py="xl" size="sm">
                    Empty directory
                  </Text>
                )}
              </Stack>
            )}
          </ScrollArea>
        </Paper>

        <Button
          leftSection={<IconCheck size={16} />}
          onClick={handleSelect}
          style={{ flex: '0 0 auto' }}
        >
          Select this directory
        </Button>
      </Stack>
    </Modal>
  );
};
