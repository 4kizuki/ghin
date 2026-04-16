import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { CommitInfo } from '@/lib/git';
import { getLog } from '@/lib/api';
import { computeGraphLayout } from '@/lib/graph-layout';

const PAGE_SIZE = 200;

export const useCommits = ({
  repoPath,
  initialCommits,
}: {
  repoPath: string;
  initialCommits?: CommitInfo[];
}) => {
  const [commits, setCommits] = useState<CommitInfo[]>(initialCommits ?? []);
  const [loading, setLoading] = useState(!initialCommits);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    () => (initialCommits?.length ?? 0) >= PAGE_SIZE,
  );
  const loadingMoreRef = useRef(false);

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

  return {
    commits,
    loading,
    loadingMore,
    hasMore,
    graphLayout,
    refreshCommits,
    loadMore,
  };
};
