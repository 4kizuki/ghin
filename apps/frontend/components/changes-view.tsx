'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Group,
  Text,
  Checkbox,
  ScrollArea,
  TextInput,
  Button,
  Switch,
  Stack,
  Tooltip,
  ActionIcon,
  Badge,
  Loader,
} from '@mantine/core';
import {
  IconGitBranch,
  IconFile,
  IconFilePlus,
  IconFileOff,
  IconFileDiff,
} from '@tabler/icons-react';
import type { RepoStatus, FileChange, FileDiff } from '@/lib/git';
import {
  getDiff,
  stagePaths,
  unstagePaths,
  stagePatch,
  unstagePatch,
  commitChanges,
  getSettings,
  setSetting,
} from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { DiffViewer } from '@/components/diff-viewer';
import { NeverError } from '@repo/never-error';

type FileEntry = {
  path: string;
  status: FileChange['status'];
  staged: boolean;
  partial: boolean;
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
}> = ({ repoPath, status, onRefresh }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [diff, setDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [autoPush, setAutoPush] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const commitInputRef = useRef<HTMLInputElement>(null);

  // Load auto-push setting
  useState(() => {
    getSettings().then((s) => {
      if (s['autoPush'] === 'true') setAutoPush(true);
    });
  });

  const files = useMemo((): FileEntry[] => {
    const entries: FileEntry[] = [];
    const pathSet = new Set<string>();

    for (const f of status.stagedFiles) {
      const unstaged = status.unstagedFiles.find((u) => u.path === f.path);
      entries.push({
        path: f.path,
        status: f.status,
        staged: !unstaged,
        partial: !!unstaged,
      });
      pathSet.add(f.path);
    }

    for (const f of status.unstagedFiles) {
      if (!pathSet.has(f.path)) {
        entries.push({
          path: f.path,
          status: f.status,
          staged: false,
          partial: false,
        });
      }
    }

    for (const f of status.untrackedFiles) {
      entries.push({
        path: f.path,
        status: '?',
        staged: false,
        partial: false,
      });
    }

    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }, [status]);

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
    (file: FileEntry, index: number) => {
      setSelectedFile(file.path);
      setFocusedIndex(index);
      const showStaged = file.staged && !file.partial;
      setSelectedFileStaged(showStaged);
      loadDiff(file.path, showStaged);
    },
    [loadDiff],
  );

  const handleFileToggle = useCallback(
    async (file: FileEntry) => {
      if (file.staged || file.partial) {
        await unstagePaths(repoPath, [file.path]);
      } else {
        await stagePaths(repoPath, [file.path]);
      }
      await onRefresh();
      if (selectedFile === file.path) {
        loadDiff(file.path, !file.staged && !file.partial);
      }
    },
    [repoPath, onRefresh, selectedFile, loadDiff],
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

  const shortcuts = useMemo(
    () => [
      {
        key: 'j',
        handler: () =>
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, files.length - 1);
            const file = files[next];
            if (file) {
              setSelectedFile(file.path);
              const showStaged = file.staged && !file.partial;
              setSelectedFileStaged(showStaged);
              loadDiff(file.path, showStaged);
            }
            return next;
          }),
      },
      {
        key: 'k',
        handler: () =>
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            const file = files[next];
            if (file) {
              setSelectedFile(file.path);
              const showStaged = file.staged && !file.partial;
              setSelectedFileStaged(showStaged);
              loadDiff(file.path, showStaged);
            }
            return next;
          }),
      },
      {
        key: ' ',
        handler: () => {
          const file = files[focusedIndex];
          if (file) handleFileToggle(file);
        },
      },
      {
        key: 'Enter',
        meta: true,
        handler: handleCommit,
      },
    ],
    [files, focusedIndex, handleFileToggle, handleCommit, loadDiff],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left pane: file list */}
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
          <Group px="sm" py={6} justify="space-between">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Changed Files ({files.length})
            </Text>
          </Group>
          <ScrollArea style={{ flex: 1 }}>
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.status);
              const isFocused = index === focusedIndex;
              const isSelected = selectedFile === file.path;
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
                  onClick={() => handleFileClick(file, index)}
                  wrap="nowrap"
                >
                  <Checkbox
                    size="xs"
                    checked={file.staged}
                    indeterminate={file.partial}
                    onChange={() => handleFileToggle(file)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Tooltip label={file.path} openDelay={500}>
                    <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                      <FileIcon
                        size={14}
                        color={`var(--mantine-color-${getStatusColor(file.status)}-6)`}
                      />
                      <Text size="xs" truncate="end" style={{ minWidth: 0 }}>
                        {file.path.split('/').pop()}
                      </Text>
                      <Text size="xs" c="dimmed" truncate="end">
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
                    style={{ flexShrink: 0 }}
                  >
                    {file.status}
                  </Badge>
                </Group>
              );
            })}
          </ScrollArea>
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
            <Group gap="xs">
              <IconGitBranch size={14} />
              <Text size="xs" fw={600}>
                {status.branch}
              </Text>
              {status.stagedFiles.length > 0 && (
                <Badge size="xs" color="green" variant="light">
                  {status.stagedFiles.length} staged
                </Badge>
              )}
            </Group>
            {showNewBranch && (
              <TextInput
                size="xs"
                placeholder="New branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.currentTarget.value)}
              />
            )}
            <TextInput
              placeholder="Commit message"
              size="sm"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.currentTarget.value)}
              ref={commitInputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCommit();
                }
              }}
            />
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
    </Box>
  );
};
