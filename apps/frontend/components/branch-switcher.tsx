'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  TextInput,
  Stack,
  ScrollArea,
  Text,
  Group,
  Box,
  Badge,
  Button,
  Loader,
  Divider,
} from '@mantine/core';
import { IconSearch, IconGitBranch, IconTrash } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import type { BranchInfo } from '@/lib/git';
import {
  getBranches,
  checkoutRef,
  getMergedBranches,
  deleteMergedBranches,
} from '@/lib/api';

export const BranchSwitcher: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  repoPath: string;
  onSwitch: () => Promise<void>;
}> = ({ opened, onClose, repoPath, onSwitch }) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [mergedBranches, setMergedBranches] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const [b, m] = await Promise.all([
        getBranches(repoPath),
        getMergedBranches(repoPath)
          .then((r) => r.branches)
          .catch(() => []),
      ]);
      setBranches(b);
      setMergedBranches(m);
    } catch {
      setBranches([]);
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
    }
  }, [opened, loadBranches]);

  const handleCheckout = useCallback(
    async (name: string) => {
      await checkoutRef(repoPath, name);
      onClose();
      await onSwitch();
    },
    [repoPath, onClose, onSwitch],
  );

  const handleCleanup = useCallback(() => {
    if (mergedBranches.length === 0) return;
    modals.openConfirmModal({
      title: 'Delete merged branches',
      children: (
        <Stack gap="xs">
          <Text size="sm">Delete these merged branches?</Text>
          {mergedBranches.map((b) => (
            <Text key={b} size="xs" c="dimmed">
              {b}
            </Text>
          ))}
        </Stack>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteMergedBranches(repoPath, mergedBranches);
        loadBranches();
      },
    });
  }, [repoPath, mergedBranches, loadBranches]);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const localBranches = filtered.filter((b) => !b.name.startsWith('origin/'));
  const remoteBranches = filtered.filter((b) => b.name.startsWith('origin/'));

  return (
    <Modal opened={opened} onClose={onClose} title="Switch Branch" size="md">
      <Stack gap="sm">
        <TextInput
          ref={inputRef}
          placeholder="Filter branches..."
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
        />

        {loading ? (
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        ) : (
          <ScrollArea style={{ maxHeight: 400 }}>
            {localBranches.length > 0 && (
              <>
                <Text size="xs" fw={600} c="dimmed" px="sm" py={4}>
                  LOCAL
                </Text>
                {localBranches.map((branch) => (
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
                      {mergedBranches.includes(branch.name) && (
                        <Badge size="xs" color="green" variant="light">
                          merged
                        </Badge>
                      )}
                    </Group>
                  </Box>
                ))}
              </>
            )}

            {remoteBranches.length > 0 && (
              <>
                <Divider my="xs" />
                <Text size="xs" fw={600} c="dimmed" px="sm" py={4}>
                  REMOTE
                </Text>
                {remoteBranches.map((branch) => (
                  <Box
                    key={branch.name}
                    px="sm"
                    py={6}
                    style={{
                      cursor: 'pointer',
                    }}
                    onClick={() => handleCheckout(branch.name)}
                  >
                    <Group gap="xs">
                      <IconGitBranch size={14} />
                      <Text size="sm" c="dimmed">
                        {branch.name}
                      </Text>
                    </Group>
                  </Box>
                ))}
              </>
            )}
          </ScrollArea>
        )}

        {mergedBranches.length > 0 && (
          <>
            <Divider />
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconTrash size={14} />}
              onClick={handleCleanup}
            >
              Clean up {mergedBranches.length} merged branches
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
};
