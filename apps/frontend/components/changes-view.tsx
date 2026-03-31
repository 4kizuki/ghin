'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Group,
  Text,
  Checkbox,
  ScrollArea,
  Textarea,
  TextInput,
  Button,
  Switch,
  Stack,
  Tooltip,
  ActionIcon,
  Badge,
  Loader,
  SegmentedControl,
  Notification,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconGitBranch,
  IconFile,
  IconFilePlus,
  IconFileOff,
  IconFileDiff,
  IconArrowLeft,
  IconArrowUp,
  IconArrowDown,
  IconGitMerge,
  IconUpload,
  IconSearch,
  IconPlus,
  IconMinus,
} from '@tabler/icons-react';
import { useRouter, useParams } from 'next/navigation';
import type { RepoStatus, FileChange, FileDiff } from '@/lib/git';
import {
  getDiff,
  stagePaths,
  unstagePaths,
  stagePatch,
  unstagePatch,
  commitChanges,
  setSetting,
  pullAndMergeMain,
  pushChanges,
} from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { DiffViewer, isDiffFontSize } from '@/components/diff-viewer';
import { useDiffFontSize } from '@/hooks/use-diff-font-size';
import { NeverError } from '@repo/never-error';
import { SearchDialog } from '@/components/search-dialog';
import { BranchSwitcher } from '@/components/branch-switcher';

type FileEntry = {
  path: string;
  status: FileChange['status'];
  staged: boolean;
};

const getFileIcon = (status: FileChange['status']): typeof IconFile => {
  switch (status) {
    case 'A':
    case '?':
      return IconFilePlus;
    case 'D':
      return IconFileOff;
    case 'M':
    case 'R':
    case 'C':
    case 'U':
      return IconFileDiff;
    case '!':
      return IconFile;
    default:
      throw new NeverError(status);
  }
};

const getStatusColor = (status: FileChange['status']): string => {
  switch (status) {
    case 'A':
    case '?':
      return 'green';
    case 'D':
      return 'red';
    case 'M':
      return 'yellow';
    case 'R':
      return 'blue';
    case 'C':
      return 'cyan';
    case 'U':
      return 'red';
    case '!':
      return 'gray';
    default:
      throw new NeverError(status);
  }
};

export const ChangesView: FunctionComponent<{
  repoPath: string;
  status: RepoStatus;
  onRefresh: () => Promise<void>;
  initialAutoPush: boolean;
}> = ({ repoPath, status, onRefresh, initialAutoPush }) => {
  const router = useRouter();
  const params = useParams<{ repoId: string }>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [diff, setDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [autoPush, setAutoPush] = useState(initialAutoPush);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [diffFontSize, setDiffFontSize] = useDiffFontSize();
  const commitInputRef = useRef<HTMLTextAreaElement>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [searchOpened, { open: openSearch, close: closeSearch }] =
    useDisclosure(false);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);

  const totalChanges =
    status.stagedFiles.length +
    status.unstagedFiles.length +
    status.untrackedFiles.length;

  const stagedEntries = useMemo(
    (): FileEntry[] =>
      status.stagedFiles
        .map((f) => ({ path: f.path, status: f.status, staged: true }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    [status.stagedFiles],
  );

  const unstagedEntries = useMemo((): FileEntry[] => {
    const entries: FileEntry[] = [];
    for (const f of status.unstagedFiles) {
      entries.push({ path: f.path, status: f.status, staged: false });
    }
    for (const f of status.untrackedFiles) {
      entries.push({ path: f.path, status: '?', staged: false });
    }
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }, [status.unstagedFiles, status.untrackedFiles]);

  const allEntries = useMemo(
    (): FileEntry[] => [...stagedEntries, ...unstagedEntries],
    [stagedEntries, unstagedEntries],
  );

  useEffect(() => {
    setFocusedIndex((prev) =>
      Math.min(prev, Math.max(0, allEntries.length - 1)),
    );
  }, [allEntries.length]);

  const loadDiff = useCallback(
    async (filePath: string, staged: boolean) => {
      setLoadingDiff(true);
      try {
        const d = await getDiff(repoPath, staged, filePath);
        setDiff(d);
      } catch {
        setDiff([]);
      } finally {
        setLoadingDiff(false);
      }
    },
    [repoPath],
  );

  const handleFileClick = useCallback(
    (file: FileEntry, globalIndex: number) => {
      setSelectedFile(file.path);
      setFocusedIndex(globalIndex);
      setSelectedFileStaged(file.staged);
      loadDiff(file.path, file.staged);
    },
    [loadDiff],
  );

  const handleFileToggle = useCallback(
    async (file: FileEntry) => {
      if (file.staged) {
        await unstagePaths(repoPath, [file.path]);
      } else {
        await stagePaths(repoPath, [file.path]);
      }
      await onRefresh();
      if (selectedFile === file.path) {
        loadDiff(file.path, selectedFileStaged);
      }
    },
    [repoPath, onRefresh, selectedFile, selectedFileStaged, loadDiff],
  );

  const handleHunkStage = useCallback(
    async (patch: string) => {
      await stagePatch(repoPath, patch);
      await onRefresh();
      if (selectedFile) {
        loadDiff(selectedFile, false);
      }
    },
    [repoPath, onRefresh, selectedFile, loadDiff],
  );

  const handleHunkUnstage = useCallback(
    async (patch: string) => {
      await unstagePatch(repoPath, patch);
      await onRefresh();
      if (selectedFile) {
        loadDiff(selectedFile, true);
      }
    },
    [repoPath, onRefresh, selectedFile, loadDiff],
  );

  const handleStageAll = useCallback(async () => {
    const paths = unstagedEntries.map((f) => f.path);
    if (paths.length === 0) return;
    await stagePaths(repoPath, paths);
    await onRefresh();
  }, [repoPath, unstagedEntries, onRefresh]);

  const handleUnstageAll = useCallback(async () => {
    const paths = stagedEntries.map((f) => f.path);
    if (paths.length === 0) return;
    await unstagePaths(repoPath, paths);
    await onRefresh();
  }, [repoPath, stagedEntries, onRefresh]);

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    try {
      await commitChanges(
        repoPath,
        commitMsg.trim(),
        showNewBranch ? newBranchName.trim() || undefined : undefined,
        autoPush,
      );
      setCommitMsg('');
      setNewBranchName('');
      setShowNewBranch(false);
      await onRefresh();
    } catch {
      // error handled via notification in parent
    } finally {
      setCommitting(false);
    }
  }, [repoPath, commitMsg, showNewBranch, newBranchName, autoPush, onRefresh]);

  const handleAutoPushToggle = useCallback((checked: boolean) => {
    setAutoPush(checked);
    setSetting('autoPush', String(checked));
  }, []);

  const handlePullMerge = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await pullAndMergeMain(repoPath);
      if (result.hasConflicts) {
        setNotification({
          message: 'Merge conflicts detected. Please resolve in VSCode.',
          color: 'yellow',
        });
      } else if (!result.success) {
        setNotification({ message: result.output, color: 'red' });
      } else {
        setNotification({ message: 'Pull & merge successful', color: 'green' });
      }
      await onRefresh();
    } catch (e) {
      setNotification({
        message: e instanceof Error ? e.message : 'Pull & merge failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [repoPath, onRefresh]);

  const handlePush = useCallback(async () => {
    setActionLoading(true);
    try {
      await pushChanges(repoPath, !status.upstream);
      setNotification({ message: 'Push successful', color: 'green' });
      await onRefresh();
    } catch (e) {
      setNotification({
        message: e instanceof Error ? e.message : 'Push failed',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }, [repoPath, status.upstream, onRefresh]);

  const shortcuts = useMemo(
    () => [
      {
        key: 'j',
        handler: () =>
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, allEntries.length - 1);
            const file = allEntries[next];
            if (file) {
              setSelectedFile(file.path);
              setSelectedFileStaged(file.staged);
              loadDiff(file.path, file.staged);
            }
            return next;
          }),
      },
      {
        key: 'k',
        handler: () =>
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            const file = allEntries[next];
            if (file) {
              setSelectedFile(file.path);
              setSelectedFileStaged(file.staged);
              loadDiff(file.path, file.staged);
            }
            return next;
          }),
      },
      {
        key: ' ',
        handler: () => {
          const file = allEntries[focusedIndex];
          if (file) handleFileToggle(file);
        },
      },
      {
        key: 'Enter',
        meta: true,
        handler: handleCommit,
      },
      { key: 'k', meta: true, handler: openSearch },
      { key: 'p', meta: true, handler: openSearch },
      { key: 'm', meta: true, shift: true, handler: handlePullMerge },
      { key: 'p', meta: true, shift: true, handler: handlePush },
      { key: 'b', meta: true, handler: openBranch },
    ],
    [
      allEntries,
      focusedIndex,
      handleFileToggle,
      handleCommit,
      loadDiff,
      openSearch,
      handlePullMerge,
      handlePush,
      openBranch,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  const renderFileRow = (file: FileEntry, globalIndex: number) => {
    const FileIcon = getFileIcon(file.status);
    const isFocused = globalIndex === focusedIndex;
    const isSelected =
      selectedFile === file.path && selectedFileStaged === file.staged;
    return (
      <Group
        key={`${file.path}-${String(file.staged)}`}
        gap="xs"
        px="sm"
        py={4}
        style={(theme) => ({
          cursor: 'pointer',
          backgroundColor: isSelected
            ? theme.colors.blue[0]
            : isFocused
              ? theme.colors.gray[0]
              : undefined,
          borderLeft: isFocused
            ? `2px solid ${theme.colors.blue[5]}`
            : '2px solid transparent',
          '&:hover': {
            backgroundColor: theme.colors.gray[0],
          },
        })}
        onClick={() => handleFileClick(file, globalIndex)}
        wrap="nowrap"
      >
        <Checkbox
          size="xs"
          checked={file.staged}
          onChange={() => handleFileToggle(file)}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: '0 0 auto' }}
        />
        <Tooltip label={file.path} openDelay={500}>
          <Group
            gap={4}
            wrap="nowrap"
            style={{
              overflow: 'hidden',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            <FileIcon
              size={14}
              style={{ flex: '0 0 auto' }}
              color={`var(--mantine-color-${getStatusColor(file.status)}-6)`}
            />
            <Text size="xs" truncate="end" style={{ minWidth: 0 }}>
              {file.path.split('/').pop()}
            </Text>
            <Text size="xs" c="dimmed" truncate="end" style={{ minWidth: 0 }}>
              {file.path.includes('/')
                ? file.path.slice(0, file.path.lastIndexOf('/'))
                : ''}
            </Text>
          </Group>
        </Tooltip>
        <Badge
          size="xs"
          variant="light"
          color={getStatusColor(file.status)}
          ml="auto"
          style={{ flex: '0 0 auto' }}
        >
          {file.status}
        </Badge>
      </Group>
    );
  };

  return (
    <Box
      style={{
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
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => router.push(`/repos/${params.repoId}/histories`)}
          >
            History
          </Button>
          <Group gap={4}>
            <IconGitBranch size={16} />
            <Text fw={600} size="sm">
              {status.branch}
            </Text>
          </Group>
          {status.ahead > 0 && (
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
          {status.behind > 0 && (
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
          {status.branch !== 'main' && status.aheadOfMain > 0 && (
            <Badge color="gray" variant="light" size="sm">
              main +{status.aheadOfMain}
            </Badge>
          )}
          {status.branch !== 'main' && status.behindMain > 0 && (
            <Badge color="gray" variant="light" size="sm">
              main -{status.behindMain}
            </Badge>
          )}
          {totalChanges > 0 && (
            <Badge color="violet" variant="light" size="sm">
              {totalChanges} changes
            </Badge>
          )}
          {status.hasConflicts && (
            <Badge color="red" variant="filled" size="sm">
              CONFLICTS
            </Badge>
          )}
        </Group>

        <Group gap="xs">
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
            color={status.ahead > 0 ? 'orange' : undefined}
            leftSection={<IconUpload size={14} />}
            onClick={handlePush}
            loading={actionLoading}
          >
            Push
          </Button>
        </Group>
      </Group>

      {notification && (
        <Notification
          color={notification.color}
          onClose={() => setNotification(null)}
          withCloseButton
          mx="md"
          mt="xs"
        >
          {notification.message}
        </Notification>
      )}

      <Box
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left pane: file list (staged / unstaged) */}
        <Box
          style={{
            width: 300,
            minWidth: 200,
            borderRight: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Staged section */}
          <Box
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Group
              px="sm"
              py={6}
              justify="space-between"
              style={{ flex: '0 0 auto' }}
            >
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Staged Changes ({stagedEntries.length})
              </Text>
              {stagedEntries.length > 0 && (
                <Tooltip label="Unstage All">
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    onClick={handleUnstageAll}
                  >
                    <IconMinus size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            <ScrollArea style={{ flex: '1 1 0', overscrollBehavior: 'none' }}>
              {stagedEntries.length === 0 ? (
                <Text size="xs" c="dimmed" px="sm" py={4}>
                  No staged changes
                </Text>
              ) : (
                stagedEntries.map((file, index) => renderFileRow(file, index))
              )}
            </ScrollArea>
          </Box>

          {/* Divider */}
          <Box
            style={{
              flex: '0 0 auto',
              borderTop: '1px solid var(--mantine-color-gray-3)',
            }}
          />

          {/* Unstaged section */}
          <Box
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Group
              px="sm"
              py={6}
              justify="space-between"
              style={{ flex: '0 0 auto' }}
            >
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Unstaged Changes ({unstagedEntries.length})
              </Text>
              {unstagedEntries.length > 0 && (
                <Tooltip label="Stage All">
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    onClick={handleStageAll}
                  >
                    <IconPlus size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            <ScrollArea style={{ flex: '1 1 0', overscrollBehavior: 'none' }}>
              {unstagedEntries.length === 0 ? (
                <Text size="xs" c="dimmed" px="sm" py={4}>
                  No unstaged changes
                </Text>
              ) : (
                unstagedEntries.map((file, index) =>
                  renderFileRow(file, stagedEntries.length + index),
                )
              )}
            </ScrollArea>
          </Box>
        </Box>

        {/* Right pane: diff viewer */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {loadingDiff ? (
            <Group justify="center" pt="xl">
              <Loader size="sm" />
            </Group>
          ) : selectedFile && diff.length > 0 ? (
            <DiffViewer
              files={diff}
              staged={selectedFileStaged}
              diffFontSize={diffFontSize}
              onStageHunk={handleHunkStage}
              onUnstageHunk={handleHunkUnstage}
            />
          ) : selectedFile ? (
            <Group justify="center" pt="xl">
              <Text c="dimmed" size="sm">
                No diff available
              </Text>
            </Group>
          ) : (
            <Group justify="center" pt="xl">
              <Text c="dimmed" size="sm">
                Select a file to view changes
              </Text>
            </Group>
          )}
        </Box>
      </Box>

      {/* Bottom: commit panel */}
      <Box
        px="md"
        py="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Group align="flex-end" gap="sm">
          <Stack gap={4} style={{ flex: 1 }}>
            {showNewBranch && (
              <TextInput
                size="xs"
                placeholder="New branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.currentTarget.value)}
              />
            )}
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <IconGitBranch
                size={14}
                style={{ flexShrink: 0, marginBottom: 6 }}
              />
              <Text
                size="xs"
                fw={600}
                style={{ flexShrink: 0, marginBottom: 6 }}
              >
                {status.branch}
              </Text>
              <Textarea
                placeholder="Commit message (Enter: newline, ⌘+Enter: commit)"
                size="xs"
                autosize
                minRows={1}
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.currentTarget.value)}
                ref={commitInputRef}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleCommit();
                  }
                }}
                style={{ flex: 1 }}
              />
            </Group>
          </Stack>
          <Group gap="xs">
            <Tooltip label="Auto-push after commit">
              <Switch
                size="xs"
                label="Auto-push"
                checked={autoPush}
                onChange={(e) => handleAutoPushToggle(e.currentTarget.checked)}
              />
            </Tooltip>
            <Button
              size="sm"
              onClick={handleCommit}
              loading={committing}
              disabled={!commitMsg.trim() || status.stagedFiles.length === 0}
            >
              Commit
            </Button>
            <Button
              size="sm"
              variant="light"
              onClick={() => {
                setShowNewBranch(true);
                handleCommit();
              }}
              loading={committing}
              disabled={!commitMsg.trim() || status.stagedFiles.length === 0}
            >
              Commit to New Branch
            </Button>
          </Group>
        </Group>
      </Box>

      <SearchDialog
        opened={searchOpened}
        onClose={closeSearch}
        repoPath={repoPath}
      />

      <BranchSwitcher
        opened={branchOpened}
        onClose={closeBranch}
        repoPath={repoPath}
        onSwitch={onRefresh}
      />
    </Box>
  );
};
