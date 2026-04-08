'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  CopyButton,
  HoverCard,
  Loader,
  Drawer,
  SegmentedControl,
  Stack,
  CloseButton,
  Button,
  Indicator,
  Popover,
  Switch,
  Checkbox,
  Divider,
  Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle, ListRange } from 'react-virtuoso';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconDownload,
  IconFileCode,
  IconGitBranch,
  IconGitMerge,
  IconPlus,
  IconSearch,
  IconCurrentLocation,
  IconUpload,
  IconAlertTriangle,
  IconArrowBackUp,
  IconClock,
  IconX,
} from '@tabler/icons-react';
import { DateTimePicker } from '@mantine/dates';
import {
  useSearchParams,
  useRouter,
  usePathname,
  useParams,
} from 'next/navigation';
import { DateTime } from 'luxon';
import type { CommitInfo, FileDiff } from '@/lib/git';
import {
  getLog,
  getCommitDiff,
  pullAndMergeMain,
  pushChanges,
  fetchRemotes as apiFetchRemotes,
  getRemotes as apiGetRemotes,
  updateAutoFetch,
  mergeRef,
  resetToCommit,
  distributeCommitDates,
} from '@/lib/api';
import { DiffViewer, isDiffFontSize } from '@/components/diff-viewer';
import { useDiffFontSize } from '@/hooks/use-diff-font-size';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { computeGraphLayout } from '@/lib/graph-layout';
import { CommitGraphRow, ROW_HEIGHT } from '@/components/commit-graph';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { usePolling } from '@/hooks/use-polling';
import { SearchDialog } from '@/components/search-dialog';
import { BranchSwitcher } from '@/components/branch-switcher';
import { CommitCheckoutDialog } from '@/components/commit-checkout-dialog';

export type DateDisplayFormat = 'relative' | 'absolute';

const noop = async (): Promise<void> => {};

const RELATIVE_TIME_UNITS = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
] satisfies ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; ms: number }>;

const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });

function formatRelativeTime(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (Math.abs(diff) >= ms) {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return rtf.format(Math.round(diff / 1000), 'second');
}

function formatAbsoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const extractBranchRefs = (refs: string[]): string[] =>
  refs
    .filter((r) => !r.startsWith('tag: ') && r !== 'HEAD')
    .map((r) => r.replace(/^HEAD -> /, ''));

export const HistoryView: FunctionComponent<{
  repoPath: string;
  initialCommits?: CommitInfo[];
  initialAutoFetch?: boolean;
  initialFetchRemotes?: string[];
  initialDateDisplayFormat?: DateDisplayFormat;
}> = ({
  repoPath,
  initialCommits,
  initialAutoFetch = false,
  initialFetchRemotes = [],
  initialDateDisplayFormat = 'relative',
}) => {
  const PAGE_SIZE = 200;
  const [commits, setCommits] = useState<CommitInfo[]>(initialCommits ?? []);
  const [loading, setLoading] = useState(!initialCommits);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    () => (initialCommits?.length ?? 0) >= PAGE_SIZE,
  );
  const loadingMoreRef = useRef(false);
  const [commitDiff, setCommitDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [diffFontSize, setDiffFontSize] = useDiffFontSize();
  const [copyFeedback, setCopyFeedback] = useState<{
    x: number;
    y: number;
    fading: boolean;
  } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyFadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [actionLoading, setActionLoading] = useState(false);

  // Multi-select mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [distributeStart, setDistributeStart] = useState<string | null>(null);
  const [distributeEnd, setDistributeEnd] = useState<string | null>(null);
  const [distributeLoading, setDistributeLoading] = useState(false);

  const [searchOpened, { open: openSearch, close: closeSearch }] =
    useDisclosure(false);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);
  const [checkoutTarget, setCheckoutTarget] = useState<{
    hash: string;
    hasBranchRef: boolean;
    message: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: CommitInfo;
  } | null>(null);

  // HEAD tracking
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState<ListRange>({
    startIndex: 0,
    endIndex: 0,
  });

  const headIndex = useMemo(
    () => commits.findIndex((c) => c.refs.some((r) => r.startsWith('HEAD'))),
    [commits],
  );

  const headVisible =
    headIndex >= 0 &&
    headIndex >= visibleRange.startIndex &&
    headIndex <= visibleRange.endIndex;

  const scrollToHead = useCallback(() => {
    if (headIndex >= 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: headIndex,
        align: 'center',
      });
    }
  }, [headIndex]);

  // Fetch state
  const [fetchLoading, setFetchLoading] = useState(false);
  const [autoFetch, setAutoFetch] = useState(initialAutoFetch);
  const [selectedRemotes, setSelectedRemotes] =
    useState<string[]>(initialFetchRemotes);
  const [availableRemotes, setAvailableRemotes] = useState<string[]>([]);

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
  const params = useParams<{ repoId: string }>();
  const { status, refreshStatus } = useRepoStatus();

  const totalChanges =
    (status?.stagedFiles.length ?? 0) +
    (status?.unstagedFiles.length ?? 0) +
    (status?.untrackedFiles.length ?? 0);

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

  const refreshCommits = useCallback(async () => {
    try {
      const data = await getLog(repoPath, PAGE_SIZE);
      setCommits(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setCommits([]);
      setHasMore(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (initialCommits) return;
    refreshCommits().then(() => setLoading(false));
  }, [initialCommits, refreshCommits]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const newCommits = await getLog(repoPath, PAGE_SIZE, commits.length);
      if (newCommits.length > 0) {
        setCommits((prev) => [...prev, ...newCommits]);
      }
      setHasMore(newCommits.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [repoPath, commits.length, hasMore]);

  // ─── Fetch handlers ─────────────────────────────────────────────────

  const handleFetch = useCallback(async () => {
    setFetchLoading(true);
    try {
      await apiFetchRemotes(repoPath, selectedRemotes);
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Fetch failed',
        color: 'red',
      });
    } finally {
      setFetchLoading(false);
    }
  }, [repoPath, selectedRemotes, refreshStatus, refreshCommits]);

  const handleAutoFetchToggle = useCallback(
    (checked: boolean) => {
      setAutoFetch(checked);
      updateAutoFetch(params.repoId, checked, selectedRemotes);
    },
    [params.repoId, selectedRemotes],
  );

  const handleRemoteToggle = useCallback(
    (remote: string, checked: boolean) => {
      const next = checked
        ? [...selectedRemotes, remote]
        : selectedRemotes.filter((r) => r !== remote);
      setSelectedRemotes(next);
      updateAutoFetch(params.repoId, autoFetch, next);
    },
    [params.repoId, autoFetch, selectedRemotes],
  );

  const loadRemotes = useCallback(async () => {
    try {
      const result = await apiGetRemotes(repoPath);
      setAvailableRemotes(result.remotes);
    } catch {
      // silently fail
    }
  }, [repoPath]);

  // Auto-refresh commits when auto-fetch is enabled
  usePolling(refreshCommits, 5_000, autoFetch, 120_000);

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

  const handleCommitDoubleClick = useCallback((commit: CommitInfo) => {
    const hasBranchRef = commit.refs.some((ref) => !ref.startsWith('tag: '));
    setCheckoutTarget({
      hash: commit.hash,
      hasBranchRef,
      message: commit.message,
    });
  }, []);

  const handlePostCheckout = useCallback(async () => {
    await refreshStatus();
    await refreshCommits();
  }, [refreshStatus, refreshCommits]);

  const handleMergeBranch = useCallback(
    async (branch: string) => {
      setContextMenu(null);
      setActionLoading(true);
      try {
        const result = await mergeRef(repoPath, branch);
        if (result.hasConflicts) {
          notifications.show({
            message: 'Merge conflicts detected. Please resolve in VSCode.',
            color: 'yellow',
          });
        } else if (!result.success) {
          notifications.show({ message: result.output, color: 'red' });
        } else {
          notifications.show({
            message: `Merged ${branch} successfully`,
            color: 'green',
          });
        }
        await refreshStatus();
        await refreshCommits();
      } catch (e) {
        notifications.show({
          message: e instanceof Error ? e.message : 'Merge failed',
          color: 'red',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [repoPath, refreshStatus, refreshCommits],
  );

  const handleReset = useCallback(
    (mode: 'hard' | 'mixed' | 'soft') => {
      const commit = contextMenu?.commit;
      setContextMenu(null);
      if (!commit) return;

      const modeLabels = {
        hard: 'Hard reset (discard all changes)',
        mixed: 'Mixed reset (unstage changes)',
        soft: 'Soft reset (keep changes staged)',
      } as const;

      modals.openConfirmModal({
        title: modeLabels[mode],
        children: (
          <Text size="sm">
            Reset current branch to {commit.shortHash} ({commit.message})?
            {mode === 'hard' && ' This will discard all uncommitted changes.'}
          </Text>
        ),
        labels: { confirm: `Reset (--${mode})`, cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          setActionLoading(true);
          try {
            await resetToCommit(repoPath, commit.hash, mode);
            notifications.show({
              message: `Reset (--${mode}) to ${commit.shortHash} successful`,
              color: 'green',
            });
            await refreshStatus();
            await refreshCommits();
          } catch (e) {
            notifications.show({
              message: e instanceof Error ? e.message : 'Reset failed',
              color: 'red',
            });
          } finally {
            setActionLoading(false);
          }
        },
      });
    },
    [contextMenu, repoPath, refreshStatus, refreshCommits],
  );

  const handlePullMerge = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await pullAndMergeMain(repoPath);
      if (result.hasConflicts) {
        notifications.show({
          message: 'Merge conflicts detected. Please resolve in VSCode.',
          color: 'yellow',
        });
      } else if (!result.success) {
        notifications.show({ message: result.output, color: 'red' });
      } else {
        notifications.show({
          message: 'Pull & merge successful',
          color: 'green',
        });
      }
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Pull & merge failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [repoPath, refreshStatus, refreshCommits]);

  const handlePush = useCallback(async () => {
    setActionLoading(true);
    try {
      await pushChanges(repoPath, !status?.upstream);
      await apiFetchRemotes(repoPath, selectedRemotes);
      notifications.show({ message: 'Push successful', color: 'green' });
      await refreshStatus();
      await refreshCommits();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Push failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [
    repoPath,
    status?.upstream,
    selectedRemotes,
    refreshStatus,
    refreshCommits,
  ]);

  const handleMultiSelectToggle = useCallback((checked: boolean) => {
    setMultiSelectMode(checked);
    if (!checked) {
      setSelectedHashes(new Set());
      setDistributeStart(null);
      setDistributeEnd(null);
    }
  }, []);

  const handleDistribute = useCallback(() => {
    const selectedCommits = commits.filter((c) => selectedHashes.has(c.hash));
    if (selectedCommits.length < 2 || !distributeStart || !distributeEnd)
      return;

    const startMs = new Date(distributeStart).getTime();
    const endMs = new Date(distributeEnd).getTime();
    if (startMs >= endMs) return;

    // Validate chronological order with non-selected adjacent commits
    const commitByHash = new Map(commits.map((c) => [c.hash, c]));

    // Parent boundary: start must be >= latest non-selected parent date
    for (const sc of selectedCommits) {
      for (const parentHash of sc.parents) {
        if (selectedHashes.has(parentHash)) continue;
        const parent = commitByHash.get(parentHash);
        if (!parent) continue;
        const parentDateMs = new Date(parent.date).getTime();
        if (startMs < parentDateMs) {
          notifications.show({
            message: `範囲の開始日時が親コミット ${parent.shortHash} (${new Date(parent.date).toLocaleString('ja-JP')}) より前のため、時系列が不整合になります`,
            color: 'red',
          });
          return;
        }
      }
    }

    // Child boundary: end must be <= earliest non-selected child date
    for (const c of commits) {
      if (selectedHashes.has(c.hash)) continue;
      for (const parentHash of c.parents) {
        if (!selectedHashes.has(parentHash)) continue;
        const childDateMs = new Date(c.date).getTime();
        if (endMs > childDateMs) {
          notifications.show({
            message: `範囲の終了日時が子コミット ${c.shortHash} (${new Date(c.date).toLocaleString('ja-JP')}) より後のため、時系列が不整合になります`,
            color: 'red',
          });
          return;
        }
      }
    }

    // Sort selected commits by their current date (oldest first)
    const sorted = [...selectedCommits].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Generate random timestamps within range, sorted ascending
    const count = sorted.length;
    const randomTimes = Array.from(
      { length: count },
      () => startMs + Math.random() * (endMs - startMs),
    ).sort((a, b) => a - b);

    const redistributed = sorted.map((c, i) => ({
      hash: c.hash,
      newDate: new Date(randomTimes[i]).toISOString(),
    }));

    modals.openConfirmModal({
      title: 'Distribute commit dates',
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {count} 件のコミットの日時を以下の範囲内にランダム分布します:
          </Text>
          <Text size="sm" fw={600}>
            {new Date(distributeStart).toLocaleString('ja-JP')} ~{' '}
            {new Date(distributeEnd).toLocaleString('ja-JP')}
          </Text>
          <Text size="xs" c="red">
            Warning: git の履歴を書き換えます。push
            済みのコミットには使用しないでください。
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Distribute', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setDistributeLoading(true);
        try {
          await distributeCommitDates(repoPath, redistributed);
          notifications.show({
            message: 'Dates distributed successfully',
            color: 'green',
          });
          setSelectedHashes(new Set());
          setMultiSelectMode(false);
          setDistributeStart(null);
          setDistributeEnd(null);
          await refreshStatus();
          await refreshCommits();
        } catch (e) {
          notifications.show({
            message: e instanceof Error ? e.message : 'Distribution failed',
            color: 'red',
          });
        } finally {
          setDistributeLoading(false);
        }
      },
    });
  }, [
    commits,
    selectedHashes,
    distributeStart,
    distributeEnd,
    repoPath,
    refreshStatus,
    refreshCommits,
  ]);

  const shortcuts = useMemo(
    () => [
      { key: 'k', meta: true, handler: openSearch },
      { key: 'm', meta: true, shift: true, handler: handlePullMerge },
      { key: 'b', meta: true, handler: openBranch },
    ],
    [openSearch, handlePullMerge, openBranch],
  );

  useKeyboardShortcuts(shortcuts);

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
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Status Bar */}
      <Group
        px="md"
        justify="space-between"
        style={(theme) => ({
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
          height: 51,
          flex: '0 0 51px',
          alignItems: 'center',
        })}
      >
        <Group gap="sm">
          <Indicator
            label={totalChanges}
            size={16}
            disabled={totalChanges === 0}
            color="violet"
            offset={4}
          >
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => router.push(`/repos/${params.repoId}/changes`)}
            >
              Changes
            </Button>
          </Indicator>
          <Button
            variant="subtle"
            color="dark"
            size="sm"
            px="xs"
            leftSection={<IconGitBranch size={16} />}
            onClick={openBranch}
          >
            {status?.branch ?? '...'}
          </Button>
          {status && status.ahead > 0 && (
            <Tooltip label={`${status.ahead} unpushed`}>
              <Badge
                color="orange"
                variant="light"
                size="sm"
                leftSection={<IconArrowUp size={10} />}
              >
                {status.ahead}
              </Badge>
            </Tooltip>
          )}
          {status && status.behind > 0 && (
            <Tooltip label={`${status.behind} unpulled`}>
              <Badge
                color="blue"
                variant="light"
                size="sm"
                leftSection={<IconArrowDown size={10} />}
              >
                {status.behind}
              </Badge>
            </Tooltip>
          )}
          {status &&
            status.branch !== 'main' &&
            (status.aheadOfMain > 0 || status.behindMain > 0) && (
              <Badge color="gray" variant="light" size="sm">
                main:{' '}
                {[
                  status.aheadOfMain > 0 && `+${status.aheadOfMain}`,
                  status.behindMain > 0 && `-${status.behindMain}`,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              </Badge>
            )}
          {status?.hasConflicts && (
            <Badge color="red" variant="filled" size="sm">
              CONFLICTS
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          {multiSelectMode && selectedHashes.size > 0 ? (
            <>
              <Badge size="lg" variant="light" color="violet">
                {selectedHashes.size} selected
              </Badge>
              <DateTimePicker
                size="xs"
                placeholder="Start"
                value={distributeStart}
                onChange={setDistributeStart}
                style={{ width: 180 }}
                valueFormat="YYYY/MM/DD HH:mm"
              />
              <Text size="xs" c="dimmed">
                ~
              </Text>
              <DateTimePicker
                size="xs"
                placeholder="End"
                value={distributeEnd}
                onChange={setDistributeEnd}
                style={{ width: 180 }}
                valueFormat="YYYY/MM/DD HH:mm"
              />
              <Button
                size="xs"
                variant="filled"
                color="violet"
                leftSection={<IconClock size={14} />}
                onClick={handleDistribute}
                loading={distributeLoading}
                disabled={
                  selectedHashes.size < 2 ||
                  !distributeStart ||
                  !distributeEnd ||
                  new Date(distributeStart).getTime() >=
                    new Date(distributeEnd).getTime()
                }
              >
                Distribute
              </Button>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => {
                  setSelectedHashes(new Set());
                  setDistributeStart(null);
                  setDistributeEnd(null);
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            </>
          ) : (
            <>
              <Switch
                size="xs"
                label="Select"
                checked={multiSelectMode}
                onChange={(e) =>
                  handleMultiSelectToggle(e.currentTarget.checked)
                }
              />
              <Button.Group>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconDownload size={14} />}
                  onClick={handleFetch}
                  loading={fetchLoading}
                >
                  Fetch
                </Button>
                <Popover position="bottom-end" onOpen={loadRemotes}>
                  <Popover.Target>
                    <Button size="xs" variant="light" px={4}>
                      <IconChevronDown size={14} />
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack gap="xs">
                      <Switch
                        size="xs"
                        label="Auto Fetch (60s)"
                        checked={autoFetch}
                        onChange={(e) =>
                          handleAutoFetchToggle(e.currentTarget.checked)
                        }
                      />
                      <Divider />
                      <Text size="xs" fw={600} c="dimmed">
                        Remotes
                      </Text>
                      {availableRemotes.map((remote) => (
                        <Checkbox
                          key={remote}
                          size="xs"
                          label={remote}
                          checked={selectedRemotes.includes(remote)}
                          onChange={(e) =>
                            handleRemoteToggle(remote, e.currentTarget.checked)
                          }
                        />
                      ))}
                      {availableRemotes.length === 0 && (
                        <Text size="xs" c="dimmed">
                          Loading...
                        </Text>
                      )}
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              </Button.Group>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconSearch size={14} />}
                onClick={openSearch}
              >
                Search
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconGitMerge size={14} />}
                onClick={handlePullMerge}
                loading={actionLoading}
              >
                Pull & Merge
              </Button>
              <Button
                size="xs"
                variant="light"
                color={status && status.ahead > 0 ? 'orange' : undefined}
                leftSection={<IconUpload size={14} />}
                onClick={handlePush}
                loading={actionLoading}
              >
                Push
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Group px="sm" py={6}>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Commits ({commits.length}
          {hasMore ? '+' : ''})
        </Text>
      </Group>

      <Virtuoso
        ref={virtuosoRef}
        style={{ flex: 1, overscrollBehavior: 'none' }}
        data={commits}
        fixedItemHeight={ROW_HEIGHT}
        endReached={loadMore}
        overscan={200}
        rangeChanged={setVisibleRange}
        itemContent={(index, commit) => {
          const isHead = index === headIndex;
          const node = graphLayout.nodes[index];
          return (
            <Box
              onDoubleClick={() => handleCommitDoubleClick(commit)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  commit,
                });
              }}
              style={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                height: ROW_HEIGHT,
                borderBottom: `1px solid ${theme.colors.gray[1]}`,
                cursor: 'pointer',
                ...(isHead && {
                  backgroundColor: theme.colors.blue[0],
                }),
              })}
            >
              {multiSelectMode && (
                <Checkbox
                  size="xs"
                  ml={4}
                  style={{ flexShrink: 0 }}
                  checked={selectedHashes.has(commit.hash)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setSelectedHashes((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(commit.hash);
                      else next.delete(commit.hash);
                      return next;
                    });
                  }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              )}
              <Tooltip label="View diff">
                <ActionIcon
                  size="xs"
                  variant={selectedHash === commit.hash ? 'filled' : 'subtle'}
                  ml={4}
                  style={{ flexShrink: 0 }}
                  onClick={() => handleToggleDiff(commit)}
                  onDoubleClick={(e) => e.stopPropagation()}
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
                <HoverCard
                  position="top"
                  shadow="sm"
                  withinPortal
                  openDelay={750}
                >
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

              <HoverCard
                position="top"
                shadow="sm"
                withinPortal
                openDelay={750}
              >
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
                    onDoubleClick={(e) => e.stopPropagation()}
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

              <HoverCard
                position="top"
                shadow="sm"
                withinPortal
                openDelay={750}
              >
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
                    onDoubleClick={(e) => e.stopPropagation()}
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

              <HoverCard
                position="top"
                shadow="sm"
                withinPortal
                openDelay={750}
              >
                <HoverCard.Target>
                  <Text
                    size="xs"
                    c="dimmed"
                    ml="xs"
                    style={{
                      flexShrink: 0,
                      width: initialDateDisplayFormat === 'absolute' ? 130 : 80,
                    }}
                  >
                    {initialDateDisplayFormat === 'absolute'
                      ? formatAbsoluteTime(commit.date)
                      : DateTime.fromISO(commit.date).toRelative()}
                  </Text>
                </HoverCard.Target>
                <HoverCard.Dropdown p="xs">
                  <Text size="xs">
                    {initialDateDisplayFormat === 'absolute'
                      ? DateTime.fromISO(commit.date).toRelative()
                      : formatAbsoluteTime(commit.date)}
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            </Box>
          );
        }}
        components={{
          Footer: () =>
            loadingMore ? (
              <Group justify="center" py="xs">
                <Loader size="xs" />
              </Group>
            ) : null,
        }}
      />

      <Menu
        opened={contextMenu !== null}
        onChange={(opened) => {
          if (!opened) setContextMenu(null);
        }}
        position="bottom-start"
        withinPortal
      >
        <Menu.Target>
          <Box
            style={{
              position: 'fixed',
              left: contextMenu?.x ?? 0,
              top: contextMenu?.y ?? 0,
              width: 0,
              height: 0,
              pointerEvents: 'none',
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          {contextMenu &&
            extractBranchRefs(contextMenu.commit.refs).length > 0 && (
              <>
                <Menu.Label>Merge</Menu.Label>
                {extractBranchRefs(contextMenu.commit.refs).map((branch) => (
                  <Menu.Item
                    key={branch}
                    leftSection={<IconGitMerge size={14} />}
                    onClick={() => handleMergeBranch(branch)}
                  >
                    Merge {branch} into current branch
                  </Menu.Item>
                ))}
                <Menu.Divider />
              </>
            )}
          <Menu.Label>Reset</Menu.Label>
          <Menu.Item
            color="red"
            leftSection={<IconAlertTriangle size={14} />}
            onClick={() => handleReset('hard')}
          >
            Hard reset current branch to this commit
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowBackUp size={14} />}
            onClick={() => handleReset('mixed')}
          >
            Mixed reset current branch to this commit
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowBackUp size={14} />}
            onClick={() => handleReset('soft')}
          >
            Soft reset current branch to this commit
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Drawer
        opened={selectedHash !== null}
        onClose={() => setSelectedHash(null)}
        position="right"
        size="60%"
        lockScroll={false}
        withOverlay={false}
        withinPortal={false}
        withCloseButton={false}
        styles={{
          content: {
            borderLeft: '2px solid var(--mantine-color-gray-4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          header: {
            flex: '0 0 auto',
            alignItems: 'flex-start',
            overflow: 'hidden',
          },
          title: {
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          },
          body: {
            flex: '1 1 0',
            overflow: 'hidden',
          },
        }}
        title={
          selectedCommit && (
            <Group justify="space-between" wrap="nowrap" w="100%">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate="end">
                  {selectedCommit.message}
                </Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed" ff="monospace">
                    {selectedCommit.shortHash}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {selectedCommit.author}
                  </Text>
                  <Tooltip
                    label={
                      initialDateDisplayFormat === 'absolute'
                        ? DateTime.fromISO(selectedCommit.date).toRelative()
                        : formatAbsoluteTime(selectedCommit.date)
                    }
                    openDelay={750}
                  >
                    <Text size="xs" c="dimmed">
                      {initialDateDisplayFormat === 'absolute'
                        ? formatAbsoluteTime(selectedCommit.date)
                        : DateTime.fromISO(selectedCommit.date).toRelative()}
                    </Text>
                  </Tooltip>
                </Group>
              </Stack>
              <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                <CloseButton size="sm" onClick={() => setSelectedHash(null)} />
                <SegmentedControl
                  size="xs"
                  value={diffFontSize}
                  onChange={(v) => {
                    if (isDiffFontSize(v)) setDiffFontSize(v);
                  }}
                  data={[
                    { label: 'XS', value: 'xs' },
                    { label: 'S', value: 's' },
                    { label: 'N', value: 'n' },
                  ]}
                />
              </Stack>
            </Group>
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
            readOnly
            diffFontSize={diffFontSize}
            onStageHunk={noop}
            onUnstageHunk={noop}
          />
        )}
      </Drawer>

      <SearchDialog
        opened={searchOpened}
        onClose={closeSearch}
        repoPath={repoPath}
      />

      <BranchSwitcher
        opened={branchOpened}
        onClose={closeBranch}
        repoPath={repoPath}
        onSwitch={refreshStatus}
      />

      <CommitCheckoutDialog
        commitHash={checkoutTarget?.hash ?? null}
        commitMessage={checkoutTarget?.message ?? null}
        hasBranchRef={checkoutTarget?.hasBranchRef ?? false}
        repoPath={repoPath}
        currentBranch={status?.branch}
        onClose={() => setCheckoutTarget(null)}
        onCheckout={handlePostCheckout}
      />

      {headIndex >= 0 && !headVisible && (
        <Tooltip label="Go to HEAD" position="left">
          <ActionIcon
            variant="filled"
            color="blue"
            radius="xl"
            size="lg"
            onClick={scrollToHead}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <IconCurrentLocation size={18} />
          </ActionIcon>
        </Tooltip>
      )}

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
