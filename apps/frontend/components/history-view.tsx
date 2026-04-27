'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Text, Group, Loader, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle, ListRange } from 'react-virtuoso';
import { IconCurrentLocation } from '@tabler/icons-react';
import {
  useSearchParams,
  useRouter,
  usePathname,
  useParams,
} from 'next/navigation';
import type { CommitInfo } from '@/lib/git';
import type { DateDisplayFormat } from '@/lib/date-format';
import { ROW_HEIGHT } from '@/components/commit-graph';
import { useDiffFontSize } from '@/hooks/use-diff-font-size';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { useRepoStatus } from '@/contexts/repo-status-context';
import { usePolling } from '@/hooks/use-polling';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { useCommits } from '@/hooks/use-commits';
import { useCommitDiff } from '@/hooks/use-commit-diff';
import { useFetchRemotes } from '@/hooks/use-fetch-remotes';
import { useMultiSelect } from '@/hooks/use-multi-select';
import { useGitActions } from '@/hooks/use-git-actions';
import { SearchDialog } from '@/components/search-dialog';
import { BranchSwitcher } from '@/components/branch-switcher';
import { CommitCheckoutDialog } from '@/components/commit-checkout-dialog';
import { CommitListRow } from '@/components/history-view/commit-list-row';
import { CommitContextMenu } from '@/components/history-view/commit-context-menu';
import { DiffDrawer } from '@/components/history-view/diff-drawer';
import { HistoryStatusBar } from '@/components/history-view/history-status-bar';
import { OriginSetupModal } from '@/components/history-view/origin-setup-modal';
import { PushConfirmModal } from '@/components/changes-view/push-confirm-modal';

export type { DateDisplayFormat };

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ repoId: string }>();
  const { status, refreshStatus } = useRepoStatus();

  // ─── Custom Hooks ───
  const {
    commits,
    loading,
    loadingMore,
    hasMore,
    graphLayout,
    refreshCommits,
    loadMore,
  } = useCommits({ repoPath, initialCommits });

  const selectedHash = searchParams.get('commit');
  const selectedCommit = useMemo(
    () => commits.find((c) => c.hash === selectedHash) ?? null,
    [commits, selectedHash],
  );

  const setSelectedHash = useCallback(
    (hash: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (hash) {
        p.set('commit', hash);
      } else {
        p.delete('commit');
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname],
  );

  const { commitDiff, loadingDiff } = useCommitDiff({ repoPath, selectedHash });
  const [diffFontSize, setDiffFontSize] = useDiffFontSize();

  const fetchRemotes = useFetchRemotes({
    repoPath,
    repoId: params.repoId,
    initialAutoFetch,
    initialFetchRemotes,
    refreshCommits,
    refreshStatus,
  });

  const multiSelect = useMultiSelect({
    commits,
    repoPath,
    refreshCommits,
    refreshStatus,
  });

  const gitActions = useGitActions({
    repoPath,
    repoId: params.repoId,
    status,
    selectedRemotes: fetchRemotes.selectedRemotes,
    refreshCommits,
    refreshStatus,
    navigateToChanges: () => router.push(`/repos/${params.repoId}/changes`),
  });

  const { copyFeedback, showCopyFeedback } = useCopyFeedback();

  // ─── Dialogs ───
  const [searchOpened, { open: openSearch, close: closeSearch }] =
    useDisclosure(false);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);

  // ─── HEAD tracking ───
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
      virtuosoRef.current.scrollToIndex({ index: headIndex, align: 'center' });
    }
  }, [headIndex]);

  // ─── Context menu ───
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: CommitInfo;
  } | null>(null);

  const handleToggleDiff = useCallback(
    (commit: CommitInfo) => {
      setSelectedHash(selectedHash === commit.hash ? null : commit.hash);
    },
    [selectedHash, setSelectedHash],
  );

  const totalChanges =
    (status?.stagedFiles.length ?? 0) +
    (status?.unstagedFiles.length ?? 0) +
    (status?.untrackedFiles.length ?? 0);

  // ─── Keyboard shortcuts ───
  const shortcuts = useMemo(
    () => [
      { key: 'k', meta: true, handler: openSearch },
      {
        key: 'm',
        meta: true,
        shift: true,
        handler: gitActions.handlePullMerge,
      },
      { key: 'b', meta: true, handler: openBranch },
    ],
    [openSearch, gitActions.handlePullMerge, openBranch],
  );
  useKeyboardShortcuts(shortcuts);

  // ─── Polling ───
  usePolling(refreshCommits, 5_000, fetchRemotes.autoFetch, 120_000);

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
      <HistoryStatusBar
        status={status}
        totalChanges={totalChanges}
        repoId={params.repoId}
        onNavigateChanges={() => router.push(`/repos/${params.repoId}/changes`)}
        onOpenBranch={openBranch}
        multiSelectMode={multiSelect.multiSelectMode}
        selectedHashesSize={multiSelect.selectedHashes.size}
        distributeStart={multiSelect.distributeStart}
        onDistributeStartChange={multiSelect.setDistributeStart}
        distributeEnd={multiSelect.distributeEnd}
        onDistributeEndChange={multiSelect.setDistributeEnd}
        distributeLoading={multiSelect.distributeLoading}
        onDistribute={multiSelect.handleDistribute}
        onClearSelection={multiSelect.clearSelection}
        onMultiSelectToggle={multiSelect.handleMultiSelectToggle}
        fetchLoading={fetchRemotes.fetchLoading}
        autoFetch={fetchRemotes.autoFetch}
        selectedRemotes={fetchRemotes.selectedRemotes}
        availableRemotes={fetchRemotes.availableRemotes}
        onFetch={fetchRemotes.handleFetch}
        onAutoFetchToggle={fetchRemotes.handleAutoFetchToggle}
        onRemoteToggle={fetchRemotes.handleRemoteToggle}
        onLoadRemotes={fetchRemotes.loadRemotes}
        actionLoading={gitActions.actionLoading}
        onSearch={openSearch}
        onPull={gitActions.handlePull}
        onPullMerge={gitActions.handlePullMerge}
        onPush={gitActions.handlePush}
        onOpenInEditor={gitActions.handleOpenInEditor}
        onOpenInTerminal={gitActions.handleOpenInTerminal}
      />

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
        itemContent={(index, commit) => (
          <CommitListRow
            commit={commit}
            node={graphLayout.nodes[index]}
            maxLane={graphLayout.maxLane}
            isHead={index === headIndex}
            isSelected={selectedHash === commit.hash}
            multiSelectMode={multiSelect.multiSelectMode}
            isMultiSelected={multiSelect.selectedHashes.has(commit.hash)}
            dateDisplayFormat={initialDateDisplayFormat}
            onToggleDiff={handleToggleDiff}
            onDoubleClick={gitActions.handleCommitDoubleClick}
            onContextMenu={(e, c) =>
              setContextMenu({ x: e.clientX, y: e.clientY, commit: c })
            }
            onToggleMultiSelect={multiSelect.toggleHash}
            onCopy={showCopyFeedback}
          />
        )}
        components={{
          Footer: () =>
            loadingMore ? (
              <Group justify="center" py="xs">
                <Loader size="xs" />
              </Group>
            ) : null,
        }}
      />

      <CommitContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onMergeBranch={(branch) => {
          setContextMenu(null);
          gitActions.handleMergeBranch(branch);
        }}
        onCheckoutAndPull={(remoteBranch) => {
          setContextMenu(null);
          gitActions.handleCheckoutAndPull(remoteBranch);
        }}
        onReset={(mode, commit) => {
          setContextMenu(null);
          gitActions.handleReset(mode, commit);
        }}
      />

      <DiffDrawer
        selectedCommit={selectedCommit}
        opened={selectedHash !== null}
        onClose={() => setSelectedHash(null)}
        loadingDiff={loadingDiff}
        commitDiff={commitDiff}
        diffFontSize={diffFontSize}
        onDiffFontSizeChange={setDiffFontSize}
        dateDisplayFormat={initialDateDisplayFormat}
      />

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
        commitHash={gitActions.checkoutTarget?.hash ?? null}
        commitMessage={gitActions.checkoutTarget?.message ?? null}
        hasBranchRef={gitActions.checkoutTarget?.hasBranchRef ?? false}
        repoPath={repoPath}
        currentBranch={status?.branch}
        onClose={() => gitActions.setCheckoutTarget(null)}
        onCheckout={gitActions.handlePostCheckout}
      />

      <OriginSetupModal
        opened={gitActions.originSetupOpened}
        onClose={gitActions.closeOriginSetup}
        originUrl={gitActions.originUrl}
        onOriginUrlChange={gitActions.setOriginUrl}
        onSubmit={gitActions.handleAddOriginAndPush}
        saving={gitActions.originSaving}
      />

      <PushConfirmModal
        opened={gitActions.pushConfirmOpened}
        onClose={gitActions.closePushConfirm}
        remoteUrl={gitActions.pushRemoteUrl}
        upstream={status?.upstream}
        branch={status?.branch ?? ''}
        pushBranchName={gitActions.pushBranchName}
        onPushBranchNameChange={gitActions.setPushBranchName}
        onConfirm={gitActions.handlePushConfirm}
        committing={gitActions.actionLoading}
        confirmLabel="Push"
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
