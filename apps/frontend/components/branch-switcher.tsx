'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Drawer,
  TextInput,
  Stack,
  Text,
  Group,
  Box,
  Badge,
  Loader,
  Tabs,
} from '@mantine/core';
import { IconSearch, IconGitBranch } from '@tabler/icons-react';
import type { BranchInfo } from '@/lib/git';
import { getBranches, checkoutRef, createBranch } from '@/lib/api';

const remoteToLocalName = (branch: string): string =>
  branch.replace(/^origin\//, '');

export const BranchSwitcher: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  repoPath: string;
  onSwitch: () => Promise<void>;
}> = ({ opened, onClose, repoPath, onSwitch }) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>('local');
  const [creatingFrom, setCreatingFrom] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await getBranches(repoPath);
      setBranches(b);
    } catch (e) {
      setBranches([]);
      setError(e instanceof Error ? e.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (opened) {
      loadBranches();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setFilter('');
      setTab('local');
      setCreatingFrom(null);
      setNewBranchName('');
      setError(null);
    }
  }, [opened, loadBranches]);

  const handleCheckout = useCallback(
    async (name: string) => {
      setError(null);
      try {
        await checkoutRef(repoPath, name);
        onClose();
        await onSwitch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to checkout branch');
      }
    },
    [repoPath, onClose, onSwitch],
  );

  const handleCreateFromRemote = useCallback(async () => {
    if (!newBranchName.trim() || !creatingFrom) return;
    setError(null);
    try {
      await createBranch(repoPath, newBranchName.trim(), creatingFrom);
      onClose();
      await onSwitch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create branch');
    }
  }, [repoPath, newBranchName, creatingFrom, onClose, onSwitch]);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const localBranches = filtered.filter((b) => !b.name.startsWith('origin/'));
  const remoteBranches = filtered.filter((b) => b.name.startsWith('origin/'));

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Switch Branch"
      position="left"
      size="sm"
      styles={{ body: { height: 'calc(100% - 60px)', overflow: 'hidden' } }}
    >
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
          ref={inputRef}
          placeholder="Filter branches..."
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          style={{ flex: '0 0 auto' }}
        />

        {error && (
          <Text size="sm" c="red" style={{ flex: '0 0 auto' }}>
            {error}
          </Text>
        )}

        <Tabs
          value={tab}
          onChange={setTab}
          style={{
            flex: '1 1 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Tabs.List style={{ flex: '0 0 auto' }}>
            <Tabs.Tab value="local">Local</Tabs.Tab>
            <Tabs.Tab value="remote">Remote</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            value="local"
            style={{
              flex: '1 1 0',
              overflow: 'auto',
              overscrollBehavior: 'none',
            }}
          >
            {loading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : (
              localBranches.map((branch) => (
                <Box
                  key={branch.name}
                  px="sm"
                  py={6}
                  style={(theme) => ({
                    cursor: 'pointer',
                    backgroundColor: branch.current
                      ? theme.colors.blue[0]
                      : undefined,
                    '&:hover': {
                      backgroundColor: theme.colors.gray[0],
                    },
                  })}
                  onClick={() => {
                    if (!branch.current) handleCheckout(branch.name);
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <IconGitBranch size={14} />
                    <Text size="sm">{branch.name}</Text>
                    {branch.current && (
                      <Badge size="xs" color="blue">
                        current
                      </Badge>
                    )}
                    {branch.aheadBehind && branch.aheadBehind.ahead > 0 && (
                      <Badge size="xs" color="orange" variant="light">
                        ↑{branch.aheadBehind.ahead}
                      </Badge>
                    )}
                    {branch.aheadBehind && branch.aheadBehind.behind > 0 && (
                      <Badge size="xs" color="blue" variant="light">
                        ↓{branch.aheadBehind.behind}
                      </Badge>
                    )}
                  </Group>
                </Box>
              ))
            )}
          </Tabs.Panel>

          <Tabs.Panel
            value="remote"
            style={{
              flex: '1 1 0',
              overflow: 'auto',
              overscrollBehavior: 'none',
            }}
          >
            {loading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : (
              remoteBranches.map((branch) => (
                <Box key={branch.name}>
                  <Box
                    px="sm"
                    py={6}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCreatingFrom(branch.name);
                      setNewBranchName(remoteToLocalName(branch.name));
                    }}
                  >
                    <Group gap="xs">
                      <IconGitBranch size={14} />
                      <Text size="sm" c="dimmed">
                        {branch.name}
                      </Text>
                    </Group>
                  </Box>
                  {creatingFrom === branch.name && (
                    <Box px="sm" py={4}>
                      <Group gap="xs">
                        <TextInput
                          autoFocus
                          size="xs"
                          placeholder="local-branch-name"
                          leftSection={<IconGitBranch size={14} />}
                          value={newBranchName}
                          onChange={(e) =>
                            setNewBranchName(e.currentTarget.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFromRemote();
                          }}
                          style={{ flex: 1 }}
                        />
                        <Button
                          size="xs"
                          disabled={!newBranchName.trim()}
                          onClick={handleCreateFromRemote}
                        >
                          Create
                        </Button>
                      </Group>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Drawer>
  );
};
