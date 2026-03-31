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
  Badge,
  Loader,
  Modal,
  SegmentedControl,
  Notification,
  Divider,
  Code,
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
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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
  getRemoteUrl,
  setGitConfig,
  IdentityUnknownError,
} from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { DiffViewer, isDiffFontSize } from '@/components/diff-viewer';
import { useDiffFontSize } from '@/hooks/use-diff-font-size';
import { NeverError } from '@repo/never-error';
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
  const [committing, setCommitting] = useState(false);
  const [autoPush, setAutoPush] = useState(initialAutoPush);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [diffFontSize, setDiffFontSize] = useDiffFontSize();
  const commitInputRef = useRef<HTMLTextAreaElement>(null);

  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);
  const [newBranchOpened, { open: openNewBranch, close: closeNewBranch }] =
    useDisclosure(false);
  const [
    pushConfirmOpened,
    { open: openPushConfirm, close: closePushConfirm },
  ] = useDisclosure(false);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [pushBranchName, setPushBranchName] = useState('');
  const [identityOpened, { open: openIdentity, close: closeIdentity }] =
    useDisclosure(false);
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');
  const [identitySaving, setIdentitySaving] = useState(false);
  const [pendingCommitAction, setPendingCommitAction] = useState<
    (() => Promise<void>) | null
  >(null);

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

  const fetchRemoteUrlInfo = useCallback(async (): Promise<boolean> => {
    try {
      const result = await getRemoteUrl(repoPath, 'origin');
      setRemoteUrl(result.url);
      return true;
    } catch {
      setRemoteUrl(null);
      return false;
    }
  }, [repoPath]);

  const handleIdentityError = useCallback(
    (error: unknown, retryAction: () => Promise<void>) => {
      if (error instanceof IdentityUnknownError) {
        setIdentityName(error.userName ?? '');
        setIdentityEmail(error.userEmail ?? '');
        setPendingCommitAction(() => retryAction);
        openIdentity();
        return true;
      }
      return false;
    },
    [openIdentity],
  );

  const handleCommitDirect = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    try {
      await commitChanges(repoPath, commitMsg.trim(), undefined, false);
      setCommitMsg('');
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        await commitChanges(repoPath, commitMsg.trim(), undefined, false);
        setCommitMsg('');
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [repoPath, commitMsg, onRefresh, handleIdentityError]);

  const handleCommitAndPush = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    const effectivePushBranch =
      !status.upstream && pushBranchName ? pushBranchName : undefined;
    try {
      await commitChanges(
        repoPath,
        commitMsg.trim(),
        undefined,
        true,
        effectivePushBranch,
      );
      setCommitMsg('');
      closePushConfirm();
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        const branch =
          !status.upstream && pushBranchName ? pushBranchName : undefined;
        await commitChanges(
          repoPath,
          commitMsg.trim(),
          undefined,
          true,
          branch,
        );
        setCommitMsg('');
        closePushConfirm();
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [
    repoPath,
    commitMsg,
    status.upstream,
    pushBranchName,
    onRefresh,
    closePushConfirm,
    handleIdentityError,
  ]);

  const showNoOriginError = useCallback(() => {
    notifications.show({
      title: 'Push できません',
      message:
        'remote "origin" が設定されていません。push するにはリモートを追加してください。',
      color: 'red',
      style: { marginBottom: 80 },
    });
  }, []);

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    if (autoPush) {
      setPushBranchName('');
      const ok = await fetchRemoteUrlInfo();
      if (!ok) {
        showNoOriginError();
        return;
      }
      openPushConfirm();
    } else {
      handleCommitDirect();
    }
  }, [
    commitMsg,
    autoPush,
    fetchRemoteUrlInfo,
    showNoOriginError,
    openPushConfirm,
    handleCommitDirect,
  ]);

  const handleOpenNewBranch = useCallback(async () => {
    setPushBranchName('');
    if (autoPush) {
      const ok = await fetchRemoteUrlInfo();
      if (!ok) {
        showNoOriginError();
        return;
      }
    }
    openNewBranch();
  }, [autoPush, fetchRemoteUrlInfo, showNoOriginError, openNewBranch]);

  const handleCommitToNewBranch = useCallback(async () => {
    if (!commitMsg.trim() || !newBranchName.trim()) return;
    setCommitting(true);
    const effectivePushBranch =
      autoPush && pushBranchName ? pushBranchName : undefined;
    try {
      await commitChanges(
        repoPath,
        commitMsg.trim(),
        newBranchName.trim(),
        autoPush,
        effectivePushBranch,
      );
      setCommitMsg('');
      setNewBranchName('');
      setPushBranchName('');
      closeNewBranch();
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        const branch = autoPush && pushBranchName ? pushBranchName : undefined;
        await commitChanges(
          repoPath,
          commitMsg.trim(),
          newBranchName.trim(),
          autoPush,
          branch,
        );
        setCommitMsg('');
        setNewBranchName('');
        setPushBranchName('');
        closeNewBranch();
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [
    repoPath,
    commitMsg,
    newBranchName,
    autoPush,
    pushBranchName,
    onRefresh,
    closeNewBranch,
    handleIdentityError,
  ]);

  const handleSaveIdentity = useCallback(async () => {
    if (!identityName.trim() || !identityEmail.trim()) return;
    setIdentitySaving(true);
    try {
      await setGitConfig(repoPath, 'user.name', identityName.trim());
      await setGitConfig(repoPath, 'user.email', identityEmail.trim());
      closeIdentity();
      if (pendingCommitAction) {
        await pendingCommitAction();
        setPendingCommitAction(null);
      }
    } catch {
      notifications.show({
        title: 'Git config の設定に失敗しました',
        message: 'user.name / user.email を設定できませんでした。',
        color: 'red',
        style: { marginBottom: 80 },
      });
    } finally {
      setIdentitySaving(false);
    }
  }, [
    repoPath,
    identityName,
    identityEmail,
    closeIdentity,
    pendingCommitAction,
  ]);

  const handleAutoPushToggle = useCallback((checked: boolean) => {
    setAutoPush(checked);
    setSetting('autoPush', String(checked));
  }, []);

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
      { key: 'b', meta: true, handler: openBranch },
    ],
    [
      allEntries,
      focusedIndex,
      handleFileToggle,
      handleCommit,
      loadDiff,
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
            <Group px="sm" py={6} gap="xs" style={{ flex: '0 0 auto' }}>
              <Checkbox
                size="xs"
                checked={stagedEntries.length > 0}
                disabled={stagedEntries.length === 0}
                onChange={handleUnstageAll}
              />
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Staged Changes ({stagedEntries.length})
              </Text>
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
            <Group px="sm" py={6} gap="xs" style={{ flex: '0 0 auto' }}>
              <Checkbox
                size="xs"
                checked={false}
                disabled={unstagedEntries.length === 0}
                onChange={handleStageAll}
              />
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Unstaged Changes ({unstagedEntries.length})
              </Text>
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
                style={{ flex: 1 }}
              />
            </Group>
          </Stack>
          <Group gap="xs">
            <Tooltip label="Push after commit">
              <Switch
                size="xs"
                label="Push"
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
              onClick={handleOpenNewBranch}
              loading={committing}
              disabled={!commitMsg.trim() || status.stagedFiles.length === 0}
            >
              Commit to New Branch
            </Button>
          </Group>
        </Group>
      </Box>

      <BranchSwitcher
        opened={branchOpened}
        onClose={closeBranch}
        repoPath={repoPath}
        onSwitch={onRefresh}
      />

      <Modal
        opened={newBranchOpened}
        onClose={closeNewBranch}
        title="Commit to New Branch"
      >
        <Stack>
          <TextInput
            label="Branch name"
            placeholder="feature/my-branch"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.currentTarget.value)}
            data-autofocus
          />
          {autoPush && (
            <>
              <Divider label="Push destination" labelPosition="left" />
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    Remote:
                  </Text>
                  <Text size="sm">origin</Text>
                  {remoteUrl && (
                    <Code style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
                      {remoteUrl}
                    </Code>
                  )}
                </Group>
                <TextInput
                  label="Remote branch name"
                  description="origin/ に push されるブランチ名"
                  placeholder={newBranchName || 'feature/my-branch'}
                  value={pushBranchName}
                  onChange={(e) => setPushBranchName(e.currentTarget.value)}
                  rightSection={
                    <Badge size="xs" color="green" variant="light">
                      new
                    </Badge>
                  }
                  rightSectionWidth={40}
                />
                <Text size="xs" c="dimmed">
                  push to: origin/{pushBranchName || newBranchName || '...'}
                </Text>
              </Stack>
            </>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeNewBranch}>
              Cancel
            </Button>
            <Button
              onClick={handleCommitToNewBranch}
              loading={committing}
              disabled={!newBranchName.trim()}
            >
              {autoPush ? 'Commit & Push' : 'Commit'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={pushConfirmOpened}
        onClose={closePushConfirm}
        title="Push Confirmation"
      >
        <Stack>
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="sm" fw={500}>
                Remote:
              </Text>
              <Text size="sm">origin</Text>
              {remoteUrl && (
                <Code style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
                  {remoteUrl}
                </Code>
              )}
            </Group>
            {status.upstream ? (
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  Push to:
                </Text>
                <Text size="sm">{status.upstream}</Text>
              </Group>
            ) : (
              <TextInput
                label="Remote branch name"
                description="upstream 未設定のため、新しい remote branch を作成します"
                placeholder={status.branch}
                value={pushBranchName}
                onChange={(e) => setPushBranchName(e.currentTarget.value)}
                rightSection={
                  <Badge size="xs" color="green" variant="light">
                    new
                  </Badge>
                }
                rightSectionWidth={40}
              />
            )}
            <Text size="xs" c="dimmed">
              push to:{' '}
              {status.upstream ?? `origin/${pushBranchName || status.branch}`}
            </Text>
          </Stack>
          <Group justify="flex-end">
            <Button variant="default" onClick={closePushConfirm}>
              Cancel
            </Button>
            <Button onClick={handleCommitAndPush} loading={committing}>
              Commit & Push
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={identityOpened}
        onClose={() => {
          closeIdentity();
          setPendingCommitAction(null);
        }}
        title="Git Author Identity"
      >
        <Stack>
          <Text size="sm">
            このリポジトリに user.name / user.email
            が設定されていません。ローカル設定を行います。
          </Text>
          <TextInput
            label="user.name"
            placeholder="Your Name"
            value={identityName}
            onChange={(e) => setIdentityName(e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label="user.email"
            placeholder="you@example.com"
            value={identityEmail}
            onChange={(e) => setIdentityEmail(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                closeIdentity();
                setPendingCommitAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveIdentity}
              loading={identitySaving}
              disabled={!identityName.trim() || !identityEmail.trim()}
            >
              Save & Commit
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};
