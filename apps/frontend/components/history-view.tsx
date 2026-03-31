'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  CopyButton,
  HoverCard,
  Loader,
  Drawer,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconCheck,
  IconCopy,
  IconFileCode,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  const [commitDiff, setCommitDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{
    x: number;
    y: number;
    fading: boolean;
  } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyFadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showCopyFeedback = useCallback((e: React.MouseEvent, text: string) => {
    navigator.clipboard.writeText(text);
    clearTimeout(copyTimerRef.current);
    clearTimeout(copyFadeRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setCopyFeedback({ x: rect.right + 4, y: rect.bottom - 4, fading: false });
    copyFadeRef.current = setTimeout(
      () =>
        setCopyFeedback((prev) => (prev ? { ...prev, fading: true } : null)),
      250,
    );
    copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 750);
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedHash = searchParams.get('commit');

  const selectedCommit = useMemo(
    () => commits.find((c) => c.hash === selectedHash) ?? null,
    [commits, selectedHash],
  );

  const setSelectedHash = useCallback(
    (hash: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (hash) {
        params.set('commit', hash);
      } else {
        params.delete('commit');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname],
  );

  const graphLayout = useMemo(() => computeGraphLayout(commits), [commits]);

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

  // Load diff when selectedHash changes (including on initial load from URL)
  useEffect(() => {
    if (!selectedHash) {
      setCommitDiff([]);
      return;
    }
    let cancelled = false;
    setLoadingDiff(true);
    getCommitDiff(repoPath, selectedHash)
      .then((diff) => {
        if (!cancelled) setCommitDiff(diff);
      })
      .catch(() => {
        if (!cancelled) setCommitDiff([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDiff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedHash]);

  const handleToggleDiff = useCallback(
    (commit: CommitInfo) => {
      if (selectedHash === commit.hash) {
        setSelectedHash(null);
      } else {
        setSelectedHash(commit.hash);
      }
    },
    [selectedHash, setSelectedHash],
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
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
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
                borderBottom: `1px solid ${theme.colors.gray[1]}`,
              })}
            >
              <Tooltip label="View diff">
                <ActionIcon
                  size="xs"
                  variant={selectedHash === commit.hash ? 'filled' : 'subtle'}
                  ml={4}
                  style={{ flexShrink: 0 }}
                  onClick={() => handleToggleDiff(commit)}
                >
                  <IconFileCode size={14} />
                </ActionIcon>
              </Tooltip>

              <CommitGraphRow node={node} maxLane={graphLayout.maxLane} />

              <Box
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.cursor =
                    el.scrollWidth > el.clientWidth ? 'ew-resize' : '';
                }}
                style={{
                  display: 'flex',
                  flex: 1,
                  minWidth: 0,
                  alignItems: 'center',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: 'none',
                }}
              >
                <HoverCard position="top" shadow="sm" withinPortal>
                  <HoverCard.Target>
                    <Text
                      size="xs"
                      fw={500}
                      truncate="end"
                      style={{ flexShrink: 1, minWidth: 100 }}
                    >
                      {commit.message}
                    </Text>
                  </HoverCard.Target>
                  <HoverCard.Dropdown p="xs">
                    <Text
                      size="xs"
                      style={{ maxWidth: 400, wordBreak: 'break-word' }}
                    >
                      {commit.message}
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>

                {commit.refs.length > 0 && (
                  <Group
                    gap={4}
                    wrap="nowrap"
                    ml="xs"
                    style={{ flexShrink: 0 }}
                  >
                    {commit.refs.map((ref) => (
                      <Badge key={ref} size="xs" variant="light">
                        {ref}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Box>

              <HoverCard position="top" shadow="sm" withinPortal>
                <HoverCard.Target>
                  <Text
                    size="xs"
                    c="dimmed"
                    ml="xs"
                    ff="monospace"
                    style={{
                      flexShrink: 0,
                      width: 64,
                      cursor: 'copy',
                    }}
                    onClick={(e) => showCopyFeedback(e, commit.shortHash)}
                  >
                    {commit.shortHash}
                  </Text>
                </HoverCard.Target>
                <HoverCard.Dropdown p="xs">
                  <Group gap={4} align="center">
                    <Text size="xs" ff="monospace">
                      {commit.hash}
                    </Text>
                    <CopyButton value={commit.hash}>
                      {({ copied, copy }) => (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color={copied ? 'teal' : 'gray'}
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size={12} />
                          ) : (
                            <IconCopy size={12} />
                          )}
                        </ActionIcon>
                      )}
                    </CopyButton>
                  </Group>
                </HoverCard.Dropdown>
              </HoverCard>

              <HoverCard position="top" shadow="sm" withinPortal>
                <HoverCard.Target>
                  <Text
                    size="xs"
                    c="dimmed"
                    ml="xs"
                    truncate="end"
                    style={{
                      flexShrink: 0,
                      width: 120,
                      cursor: 'copy',
                    }}
                    onClick={(e) => showCopyFeedback(e, commit.author)}
                  >
                    {commit.author}
                  </Text>
                </HoverCard.Target>
                <HoverCard.Dropdown p="xs">
                  <Group gap={4} align="center">
                    <Text size="xs">
                      {commit.author} &lt;{commit.authorEmail}&gt;
                    </Text>
                    <CopyButton
                      value={`${commit.author} <${commit.authorEmail}>`}
                    >
                      {({ copied, copy }) => (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color={copied ? 'teal' : 'gray'}
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size={12} />
                          ) : (
                            <IconCopy size={12} />
                          )}
                        </ActionIcon>
                      )}
                    </CopyButton>
                  </Group>
                </HoverCard.Dropdown>
              </HoverCard>

              <Text
                size="xs"
                c="dimmed"
                ml="xs"
                style={{ flexShrink: 0, width: 130 }}
              >
                {new Date(commit.date).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <Tooltip label="Revert">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  mx="xs"
                  style={{ flexShrink: 0 }}
                  onClick={() => handleRevert(commit)}
                >
                  <IconArrowBackUp size={12} />
                </ActionIcon>
              </Tooltip>
            </Box>
          );
        })}
      </ScrollArea>

      <Drawer
        opened={selectedHash !== null}
        onClose={() => setSelectedHash(null)}
        position="right"
        size="60%"
        lockScroll={false}
        withOverlay={false}
        withinPortal={false}
        styles={{
          content: {
            borderLeft: '2px solid var(--mantine-color-gray-4)',
          },
        }}
        title={
          selectedCommit && (
            <Box>
              <Text size="sm" fw={600}>
                {selectedCommit.message}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed" ff="monospace">
                  {selectedCommit.shortHash}
                </Text>
                <Text size="xs" c="dimmed">
                  {selectedCommit.author}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(selectedCommit.date).toLocaleString('ja-JP')}
                </Text>
              </Group>
            </Box>
          )
        }
      >
        {loadingDiff ? (
          <Group justify="center" pt="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <DiffViewer
            files={commitDiff}
            staged={false}
            onStageHunk={noop}
            onUnstageHunk={noop}
          />
        )}
      </Drawer>

      {copyFeedback && (
        <Text
          size="xs"
          fw={600}
          c="teal"
          style={{
            position: 'fixed',
            right: `calc(100vw - ${String(copyFeedback.x)}px)`,
            top: copyFeedback.y,
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: copyFeedback.fading ? 0 : 1,
            transition: copyFeedback.fading ? 'opacity 500ms ease-out' : 'none',
          }}
        >
          Copied
        </Text>
      )}
    </Box>
  );
};
