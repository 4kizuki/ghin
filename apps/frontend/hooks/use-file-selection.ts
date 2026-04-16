import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { RepoStatus, FileDiff } from '@/lib/git';
import { getDiff, getMergeMsg } from '@/lib/api';
import type { FileEntry } from '@/components/changes-view/types';

export const useFileSelection = ({
  repoPath,
  status,
}: {
  repoPath: string;
  status: RepoStatus;
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const selectedFileRef = useRef<string | null>(null);
  const selectedFileStagedRef = useRef(false);
  const [diff, setDiff] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [commitMsg, setCommitMsg] = useState('');

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

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);
  useEffect(() => {
    selectedFileStagedRef.current = selectedFileStaged;
  }, [selectedFileStaged]);

  const isInitialStatus = useRef(true);
  useEffect(() => {
    if (isInitialStatus.current) {
      isInitialStatus.current = false;
      return;
    }
    if (selectedFileRef.current) {
      loadDiff(selectedFileRef.current, selectedFileStagedRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh diff when status updates from polling
  }, [status]);

  // Pre-fill commit message from MERGE_MSG when conflicts are detected
  useEffect(() => {
    if (!status.hasConflicts) return;
    if (commitMsg !== '') return;
    let cancelled = false;
    void getMergeMsg(repoPath).then((msg) => {
      if (cancelled || msg === null) return;
      setCommitMsg(msg);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when hasConflicts changes
  }, [status.hasConflicts, repoPath]);

  const handleFileClick = useCallback(
    (file: FileEntry, globalIndex: number) => {
      setSelectedFile(file.path);
      setFocusedIndex(globalIndex);
      setSelectedFileStaged(file.staged);
      loadDiff(file.path, file.staged);
    },
    [loadDiff],
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setDiff([]);
  }, []);

  return {
    selectedFile,
    selectedFileStaged,
    diff,
    loadingDiff,
    focusedIndex,
    setFocusedIndex,
    commitMsg,
    setCommitMsg,
    stagedEntries,
    unstagedEntries,
    allEntries,
    loadDiff,
    handleFileClick,
    clearSelection,
    setSelectedFile,
    setSelectedFileStaged,
  };
};
