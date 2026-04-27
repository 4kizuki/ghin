'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActionIcon,
  Button,
  Drawer,
  Modal,
  TextInput,
  Stack,
  Text,
  Group,
  Box,
  Badge,
  Loader,
  Tabs,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconGitBranch,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import type { BranchInfo, TagInfo } from '@/lib/git';
import {
  getBranches,
  getTags,
  deleteTag,
  checkoutRef,
  createBranch,
} from '@/lib/api';

const remoteToLocalName = (branch: string): string =>
  branch.replace(/^origin\//, '');

export const BranchSwitcher: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  repoPath: string;
  onSwitch: () => Promise<void>;
}> = ({ opened, onClose, repoPath, onSwitch }) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>('local');
  const [creatingFrom, setCreatingFrom] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, t] = await Promise.all([
        getBranches(repoPath),
        getTags(repoPath),
      ]);
      setBranches(b);
      setTags(t);
    } catch (e) {
      setBranches([]);
      setTags([]);
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (opened) {
      loadData();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setFilter('');
      setTab('local');
      setCreatingFrom(null);
      setNewBranchName('');
      setDeletingTag(null);
      setError(null);
    }
  }, [opened, loadData]);

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

  const handleDeleteTag = useCallback(
    async (name: string) => {
      setError(null);
      try {
        await deleteTag(repoPath, name);
        setTags((prev) => prev.filter((t) => t.name !== name));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete tag');
      } finally {
        setDeletingTag(null);
      }
    },
    [repoPath],
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
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()),
  );

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
            <Tabs.Tab value="tags">Tags</Tabs.Tab>
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
                    <IconGitBranch size={14} style={{ flexShrink: 0 }} />
                    <Tooltip label={branch.name} openDelay={500}>
                      <Text size="sm" truncate style={{ minWidth: 0 }}>
                        {branch.name}
                      </Text>
                    </Tooltip>
                    {branch.current && (
                      <Badge size="xs" color="blue" style={{ flexShrink: 0 }}>
                        current
                      </Badge>
                    )}
                    {branch.aheadBehind && branch.aheadBehind.ahead > 0 && (
                      <Badge
                        size="xs"
                        color="orange"
                        variant="light"
                        style={{ flexShrink: 0 }}
                      >
                        ↑{branch.aheadBehind.ahead}
                      </Badge>
                    )}
                    {branch.aheadBehind && branch.aheadBehind.behind > 0 && (
                      <Badge
                        size="xs"
                        color="blue"
                        variant="light"
                        style={{ flexShrink: 0 }}
                      >
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
                    <Group gap="xs" wrap="nowrap">
                      <IconGitBranch size={14} style={{ flexShrink: 0 }} />
                      <Tooltip label={branch.name} openDelay={500}>
                        <Text
                          size="sm"
                          c="dimmed"
                          truncate
                          style={{ minWidth: 0 }}
                        >
                          {branch.name}
                        </Text>
                      </Tooltip>
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

          <Tabs.Panel
            value="tags"
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
            ) : filteredTags.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No tags
              </Text>
            ) : (
              filteredTags.map((tag) => (
                <Box key={tag.name} px="sm" py={6}>
                  <Group gap="xs" wrap="nowrap">
                    <IconTag size={14} style={{ flexShrink: 0 }} />
                    <Tooltip label={tag.name} openDelay={500}>
                      <Text size="sm" truncate style={{ minWidth: 0 }}>
                        {tag.name}
                      </Text>
                    </Tooltip>
                    <Tooltip label="Delete tag">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => setDeletingTag(tag.name)}
                        style={{ flexShrink: 0 }}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>
              ))
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={deletingTag !== null}
        onClose={() => setDeletingTag(null)}
        title="Delete Tag"
      >
        <Stack>
          <Text size="sm">
            タグ <b>{deletingTag}</b> を削除しますか？
          </Text>
          <Text size="xs" c="red">
            この操作は元に戻せません。
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeletingTag(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deletingTag) handleDeleteTag(deletingTag);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Drawer>
  );
};
