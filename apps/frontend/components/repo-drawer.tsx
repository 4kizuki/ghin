'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Drawer,
  TextInput,
  Stack,
  Text,
  Group,
  Box,
  Badge,
  ActionIcon,
  Button,
} from '@mantine/core';
import {
  IconSearch,
  IconTrash,
  IconPlus,
  IconDownload,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { Repository } from '@/lib/api';

export const RepoDrawer: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  repos: Repository[];
  openTabIds: string[];
  onOpenRepo: (id: string) => void;
  onDeleteRepo: (id: string) => void;
}> = ({ opened, onClose, repos, openTabIds, onOpenRepo, onDeleteRepo }) => {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setFilter('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (opened) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [opened]);

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const highlighted = filter !== '' ? filtered[0] : undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && highlighted) {
      onOpenRepo(highlighted.id);
      handleClose();
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title="Repositories"
      position="left"
      size="sm"
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        },
        content: {
          display: 'flex',
          flexDirection: 'column',
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
          ref={inputRef}
          placeholder="Search repositories..."
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: '0 0 auto' }}
        />

        <Box
          style={{
            flex: '1 1 0',
            overflow: 'auto',
            overscrollBehavior: 'none',
          }}
        >
          {filtered.map((repo) => {
            const isOpen = openTabIds.includes(repo.id);
            const isHighlighted = repo.id === highlighted?.id;
            return (
              <Group
                key={repo.id}
                px="sm"
                py={6}
                wrap="nowrap"
                bg={
                  isHighlighted ? 'var(--mantine-color-blue-light)' : undefined
                }
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  onOpenRepo(repo.id);
                  handleClose();
                }}
              >
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" truncate>
                      {repo.name}
                    </Text>
                    {isOpen && (
                      <Badge size="xs" color="blue" variant="light">
                        open
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {repo.path}
                  </Text>
                </Box>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDeleteRepo(repo.id);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            );
          })}

          {filtered.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No repositories found
            </Text>
          )}
        </Box>

        <Stack gap="xs" style={{ flex: '0 0 auto' }}>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={() => {
              onClose();
              router.push('/clone-repository');
            }}
          >
            Clone Repository
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            onClick={() => {
              onClose();
              router.push('/add-repository');
            }}
          >
            Add Repository
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};
