import { useState, useEffect, useMemo } from 'react';
import type { FileDiff } from '@/lib/git';
import { getCommitDiff } from '@/lib/api';

export const useCommitDiff = ({
  repoPath,
  selectedHash,
}: {
  repoPath: string;
  selectedHash: string | null;
}) => {
  const [fetchedDiff, setFetchedDiff] = useState<{
    hash: string;
    diff: FileDiff[];
  } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- async data fetch requires setState in effect */
  useEffect(() => {
    if (!selectedHash) {
      setLoadingDiff(false);
      return;
    }
    let cancelled = false;
    setLoadingDiff(true);
    getCommitDiff(repoPath, selectedHash)
      .then((diff) => {
        if (!cancelled) {
          setFetchedDiff({ hash: selectedHash, diff });
          setLoadingDiff(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedDiff({ hash: selectedHash, diff: [] });
          setLoadingDiff(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedHash]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const commitDiff = useMemo(() => {
    if (!selectedHash) return [];
    if (fetchedDiff && fetchedDiff.hash === selectedHash)
      return fetchedDiff.diff;
    return [];
  }, [selectedHash, fetchedDiff]);

  return { commitDiff, loadingDiff };
};
