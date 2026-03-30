'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  Group,
  Badge,
  Stack,
  ActionIcon,
  Tooltip,
  Loader,
  Button,
} from '@mantine/core';
import { IconGitCommit, IconArrowBackUp, IconEye } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import type { CommitInfo, FileDiff } from '@/lib/git';
import { getLog, getCommitDiff, revertCommit } from '@/lib/api';
import { DiffViewer } from '@/components/diff-viewer';

const noop = async (): Promise<void> => {};

export const HistoryView: FunctionComponent<{ repoPath: string }> = ({
  repoPath,
}) => {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [commitDiff, setCommitDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const loadCommits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLog(repoPath, 200);
      setCommits(data);
    } catch {
      setCommits([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    loadCommits();
  }, [loadCommits]);

  const handleSelectCommit = useCallback(
    async (commit: CommitInfo) => {
      setSelectedCommit(commit);
      setLoadingDiff(true);
      try {
        const diff = await getCommitDiff(repoPath, commit.hash);
        setCommitDiff(diff);
      } catch {
        setCommitDiff([]);
      } finally {
        setLoadingDiff(false);
      }
    },
    [repoPath],
  );

  const handleRevert = useCallback(
    (commit: CommitInfo) => {
      modals.openConfirmModal({
        title: 'Revert commit',
        children: (
          <Text size="sm">
            Revert &quot;{commit.message}&quot; ({commit.shortHash})?
          </Text>
        ),
        labels: { confirm: 'Revert', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await revertCommit(repoPath, commit.hash);
          loadCommits();
        },
      });
    },
    [repoPath, loadCommits],
  );

  if (loading) {
    return (
      <Group justify="center" pt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Commit list */}
      <Box
        style={{
          width: 400,
          minWidth: 300,
          borderRight: '1px solid var(--mantine-color-gray-3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Group px="sm" py={6}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Commits ({commits.length})
          </Text>
        </Group>
        <ScrollArea style={{ flex: 1 }}>
          {commits.map((commit) => (
            <Box
              key={commit.hash}
              px="sm"
              py={6}
              style={(theme) => ({
                cursor: 'pointer',
                backgroundColor:
                  selectedCommit?.hash === commit.hash
                    ? theme.colors.blue[0]
                    : undefined,
                borderBottom: `1px solid ${theme.colors.gray[1]}`,
              })}
              onClick={() => handleSelectCommit(commit)}
            >
              <Group gap="xs" wrap="nowrap">
                <IconGitCommit
                  size={14}
                  style={{ flexShrink: 0 }}
                  color="var(--mantine-color-gray-6)"
                />
                <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" fw={500} truncate="end">
                      {commit.message}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {commit.shortHash}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {commit.author}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(commit.date).toLocaleDateString()}
                    </Text>
                  </Group>
                  {commit.refs.length > 0 && (
                    <Group gap={4} mt={2}>
                      {commit.refs.map((ref) => (
                        <Badge key={ref} size="xs" variant="light">
                          {ref}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </Stack>
                <Group gap={4} style={{ flexShrink: 0 }}>
                  <Tooltip label="Revert">
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevert(commit);
                      }}
                    >
                      <IconArrowBackUp size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          ))}
        </ScrollArea>
      </Box>

      {/* Commit diff */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {loadingDiff ? (
          <Group justify="center" pt="xl">
            <Loader size="sm" />
          </Group>
        ) : selectedCommit ? (
          <>
            <Box
              px="sm"
              py={6}
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <Text size="sm" fw={600}>
                {selectedCommit.message}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {selectedCommit.hash}
                </Text>
                <Text size="xs" c="dimmed">
                  {selectedCommit.author}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(selectedCommit.date).toLocaleString()}
                </Text>
              </Group>
            </Box>
            <DiffViewer
              files={commitDiff}
              staged={false}
              onStageHunk={noop}
              onUnstageHunk={noop}
            />
          </>
        ) : (
          <Group justify="center" pt="xl">
            <Text c="dimmed" size="sm">
              Select a commit to view changes
            </Text>
          </Group>
        )}
      </Box>
    </Box>
  );
};
