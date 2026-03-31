'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
} from '@mantine/core';
import { IconArrowBackUp } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import type { CommitInfo, FileDiff } from '@/lib/git';
import { getLog, getCommitDiff, revertCommit } from '@/lib/api';
import { DiffViewer } from '@/components/diff-viewer';
import { computeGraphLayout } from '@/lib/graph-layout';
import { CommitGraphRow, ROW_HEIGHT } from '@/components/commit-graph';

const noop = async (): Promise<void> => {};

export const HistoryView: FunctionComponent<{
  repoPath: string;
  initialCommits?: CommitInfo[];
}> = ({ repoPath, initialCommits }) => {
  const [commits, setCommits] = useState<CommitInfo[]>(initialCommits ?? []);
  const [loading, setLoading] = useState(!initialCommits);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [commitDiff, setCommitDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const graphLayout = useMemo(
    () => computeGraphLayout(commits),
    [commits],
  );

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
      {/* Commit list with graph */}
      <Box
        style={{
          width: 480,
          minWidth: 320,
          borderRight: '1px solid var(--mantine-color-gray-3)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Group px="sm" py={6}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Commits ({commits.length})
          </Text>
        </Group>
        <ScrollArea style={{ flex: 1 }}>
          {commits.map((commit, index) => {
            const node = graphLayout.nodes[index];
            return (
              <Box
                key={commit.hash}
                style={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW_HEIGHT,
                  cursor: 'pointer',
                  backgroundColor:
                    selectedCommit?.hash === commit.hash
                      ? theme.colors.blue[0]
                      : undefined,
                  borderBottom: `1px solid ${theme.colors.gray[1]}`,
                })}
                onClick={() => handleSelectCommit(commit)}
              >
                <CommitGraphRow
                  node={node}
                  maxLane={graphLayout.maxLane}
                />
                <Stack
                  gap={0}
                  style={{
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                    paddingRight: 8,
                  }}
                >
                  <Text size="xs" fw={500} truncate="end">
                    {commit.message}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {commit.shortHash}
                    </Text>
                    <Text size="xs" c="dimmed" truncate="end">
                      {commit.author}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {new Date(commit.date).toLocaleDateString('ja-JP')}
                    </Text>
                  </Group>
                  {commit.refs.length > 0 && (
                    <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                      {commit.refs.map((ref) => (
                        <Badge
                          key={ref}
                          size="xs"
                          variant="light"
                          style={{ flexShrink: 0 }}
                        >
                          {ref}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </Stack>
                <Tooltip label="Revert">
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    mr="xs"
                    style={{ flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevert(commit);
                    }}
                  >
                    <IconArrowBackUp size={12} />
                  </ActionIcon>
                </Tooltip>
              </Box>
            );
          })}
        </ScrollArea>
      </Box>

      {/* Commit diff */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
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
                  {new Date(selectedCommit.date).toLocaleString('ja-JP')}
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
