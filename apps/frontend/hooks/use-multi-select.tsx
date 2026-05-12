import { useState, useCallback } from 'react';
import { Stack, Text, Code } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import type { CommitInfo } from '@/lib/git';
import { distributeCommitDates, detectDependencyCommits } from '@/lib/api';
import { formatLocalISOString } from '@/lib/date-format';
import {
  buildValidIntervals,
  sampleRandomTimes,
  type WorkingHours,
} from '@/lib/working-hours';

export const useMultiSelect = ({
  commits,
  repoPath,
  refreshCommits,
  refreshStatus,
  workingHours,
}: {
  commits: CommitInfo[];
  repoPath: string;
  refreshCommits: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  workingHours: WorkingHours;
}) => {
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [distributeStart, setDistributeStart] = useState<string | null>(null);
  const [distributeEnd, setDistributeEnd] = useState<string | null>(null);
  const [distributeLoading, setDistributeLoading] = useState(false);

  const handleMultiSelectToggle = useCallback((checked: boolean) => {
    setMultiSelectMode(checked);
    if (!checked) {
      setSelectedHashes(new Set());
      setDistributeStart(null);
      setDistributeEnd(null);
    }
  }, []);

  const toggleHash = useCallback((hash: string, checked: boolean) => {
    setSelectedHashes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(hash);
      else next.delete(hash);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedHashes(new Set());
    setDistributeStart(null);
    setDistributeEnd(null);
  }, []);

  const handleDistribute = useCallback(async () => {
    const selectedCommits = commits.filter((c) => selectedHashes.has(c.hash));
    if (selectedCommits.length < 2 || !distributeStart || !distributeEnd)
      return;

    const startMs = new Date(distributeStart).getTime();
    const endMs = new Date(distributeEnd).getTime();
    if (startMs >= endMs) return;

    const commitByHash = new Map(commits.map((c) => [c.hash, c]));

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

    const sorted = [...selectedCommits].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const count = sorted.length;
    const intervals = buildValidIntervals(startMs, endMs, workingHours);
    if (intervals.length === 0) {
      notifications.show({
        message:
          '指定範囲内に稼働時間がありません。Settings の Working Hours を確認するか、範囲を変更してください。',
        color: 'red',
      });
      return;
    }
    const randomTimes = sampleRandomTimes(intervals, count).sort(
      (a, b) => a - b,
    );

    const redistributed = sorted.map((c, i) => ({
      hash: c.hash,
      newDate: formatLocalISOString(new Date(randomTimes[i])),
    }));

    const openDistributeConfirm = () => {
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
    };

    const commitByHashForReason = new Map(sorted.map((c) => [c.hash, c]));

    setDistributeLoading(true);
    try {
      const detection = await detectDependencyCommits(
        repoPath,
        sorted.map((c) => c.hash),
      );
      if (detection.flagged.length > 0) {
        modals.openConfirmModal({
          title: '依存関係更新コミットが含まれています',
          children: (
            <Stack gap="xs">
              <Text size="sm">
                以下のコミットは依存関係を更新している可能性があります。日時を移動すると
                lock ファイルと manifest の整合性が崩れる恐れがあります:
              </Text>
              {detection.flagged.map((f) => (
                <Stack key={f.hash} gap={2}>
                  <Text size="xs">
                    <Code>{f.hash.slice(0, 7)}</Code>{' '}
                    {commitByHashForReason.get(f.hash)?.message ?? ''}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {f.reason}
                  </Text>
                </Stack>
              ))}
              <Text size="xs" c="red">
                そのまま続行しますか？
              </Text>
            </Stack>
          ),
          labels: { confirm: 'それでも続行', cancel: 'キャンセル' },
          confirmProps: { color: 'red' },
          onConfirm: openDistributeConfirm,
        });
        return;
      }
    } catch (e) {
      modals.openConfirmModal({
        title: 'AI による依存検出に失敗しました',
        children: (
          <Stack gap="xs">
            <Text size="sm">
              依存関係更新コミットの自動検出が失敗しました。検出結果なしのまま続行できますが、含まれているかは確認できていません。
            </Text>
            <Text size="xs" c="dimmed">
              {e instanceof Error ? e.message : 'Unknown error'}
            </Text>
          </Stack>
        ),
        labels: { confirm: '続行', cancel: 'キャンセル' },
        confirmProps: { color: 'orange' },
        onConfirm: openDistributeConfirm,
      });
      return;
    } finally {
      setDistributeLoading(false);
    }

    openDistributeConfirm();
  }, [
    commits,
    selectedHashes,
    distributeStart,
    distributeEnd,
    repoPath,
    refreshStatus,
    refreshCommits,
    workingHours,
  ]);

  return {
    multiSelectMode,
    selectedHashes,
    distributeStart,
    setDistributeStart,
    distributeEnd,
    setDistributeEnd,
    distributeLoading,
    handleMultiSelectToggle,
    toggleHash,
    clearSelection,
    handleDistribute,
  };
};
