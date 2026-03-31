'use client';

import type { FunctionComponent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
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
  Badge,
  Box,
} from '@mantine/core';
import {
  IconFolder,
  IconArrowUp,
  IconGitBranch,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { addRepository } from '@/lib/api';
import { useOpenTabActions } from '@/hooks/use-open-tabs';

type DirEntry = {
  name: string;
  isGitRepo: boolean;
};

export const DirectoryBrowser: FunctionComponent<{
  initialPath: string;
}> = ({ initialPath }) => {
  const router = useRouter();
  const { openTab } = useOpenTabActions();

  const [currentPath, setCurrentPath] = useState(initialPath);
  const [pathInput, setPathInput] = useState(initialPath);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [currentIsGitRepo, setCurrentIsGitRepo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
        setCurrentIsGitRepo(false);
        return;
      }
      const data: {
        entries: DirEntry[];
        parentPath: string | null;
        currentIsGitRepo: boolean;
      } = await res.json();
      setEntries(data.entries);
      setParentPath(data.parentPath);
      setCurrentIsGitRepo(data.currentIsGitRepo);
      setCurrentPath(path);
      setPathInput(path);
    } catch {
      setError('Failed to load directory');
      setEntries([]);
      setParentPath(null);
      setCurrentIsGitRepo(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory(initialPath);
  }, [initialPath, loadDirectory]);

  const navigateTo = (path: string) => {
    void loadDirectory(path);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void loadDirectory(pathInput);
    }
  };

  const handleAdd = async () => {
    const name = currentPath.split('/').filter(Boolean).pop() ?? currentPath;
    setAdding(true);
    try {
      const repo = await addRepository(name, currentPath);
      openTab(repo.id);
      router.push(`/repos/${repo.id}/histories`);
      router.refresh();
    } catch {
      setError('Failed to add repository');
    } finally {
      setAdding(false);
    }
  };

  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  return (
    <Stack
      gap="sm"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
                    {entry.isGitRepo && (
                      <Badge
                        size="xs"
                        color="teal"
                        variant="light"
                        leftSection={<IconGitBranch size={10} />}
                      >
                        git
                      </Badge>
                    )}
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

      <Box style={{ flex: '0 0 auto' }}>
        {currentIsGitRepo && (
          <Paper withBorder p="sm" mb="sm" bg="teal.0">
            <Group gap="xs" mb="xs">
              <IconGitBranch size={16} />
              <Text size="sm" fw={500}>
                Git repository detected
              </Text>
            </Group>
            <Button fullWidth onClick={() => void handleAdd()} loading={adding}>
              Add this repository
            </Button>
          </Paper>
        )}
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </Box>
    </Stack>
  );
};
