import { useState, useCallback } from 'react';
import {
  stagePaths,
  unstagePaths,
  stagePatch,
  unstagePatch,
  discardPaths,
  discardPatch,
  discardUntrackedFile,
} from '@/lib/api';
import type { FileDiff } from '@/lib/git';
import type { FileEntry } from '@/components/changes-view/types';

export const useFileOperations = ({
  repoPath,
  onRefresh,
  selectedFile,
  selectedFileStaged,
  loadDiff,
  clearSelection,
  stagedEntries,
  unstagedEntries,
}: {
  repoPath: string;
  onRefresh: () => Promise<void>;
  selectedFile: string | null;
  selectedFileStaged: boolean;
  loadDiff: (filePath: string, staged: boolean) => Promise<void>;
  clearSelection: () => void;
  stagedEntries: FileEntry[];
  unstagedEntries: FileEntry[];
}) => {
  const [discardConfirm, setDiscardConfirm] = useState<{
    label: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

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

  const handleDiscardFile = useCallback(
    (file: FileEntry) => {
      const isUntracked = file.status === '?';
      setDiscardConfirm({
        label: isUntracked
          ? `Untracked ファイル "${file.path}" を削除しますか？`
          : `"${file.path}" の変更を破棄しますか？`,
        onConfirm: async () => {
          if (isUntracked) {
            await discardUntrackedFile(repoPath, file.path);
          } else {
            await discardPaths(repoPath, [file.path]);
          }
          await onRefresh();
          if (selectedFile === file.path && !selectedFileStaged) {
            clearSelection();
          }
        },
      });
    },
    [repoPath, onRefresh, selectedFile, selectedFileStaged, clearSelection],
  );

  const handleDiscardHunk = useCallback(
    (patch: string) => {
      setDiscardConfirm({
        label: 'この hunk の変更を破棄しますか？',
        onConfirm: async () => {
          await discardPatch(repoPath, patch);
          await onRefresh();
          if (selectedFile) {
            loadDiff(selectedFile, false);
          }
        },
      });
    },
    [repoPath, onRefresh, selectedFile, loadDiff],
  );

  const handleDiscardAll = useCallback(() => {
    const trackedPaths: string[] = [];
    for (const e of unstagedEntries) {
      if (e.status !== '?') trackedPaths.push(e.path);
    }
    if (trackedPaths.length === 0) return;
    setDiscardConfirm({
      label: `${trackedPaths.length} 件の unstaged changes をすべて破棄しますか？`,
      onConfirm: async () => {
        await discardPaths(repoPath, trackedPaths);
        await onRefresh();
        clearSelection();
      },
    });
  }, [repoPath, unstagedEntries, onRefresh, clearSelection]);

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

  return {
    discardConfirm,
    setDiscardConfirm,
    handleFileToggle,
    handleHunkStage,
    handleHunkUnstage,
    handleDiscardFile,
    handleDiscardHunk,
    handleDiscardAll,
    handleStageAll,
    handleUnstageAll,
  };
};
