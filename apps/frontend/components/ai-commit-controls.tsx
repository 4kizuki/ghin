'use client';

import type { FunctionComponent } from 'react';
import { ActionIcon, Group, Loader, Tooltip } from '@mantine/core';
import { IconInfinity, IconSparkles, IconX } from '@tabler/icons-react';
import type { CommitPhase } from '@/lib/api';

const phaseLabels: Record<CommitPhase, string> = {
  'analyzing-diff': '変更を解析中…',
  'checking-history': '履歴を確認中…',
  'inspecting-file': 'ファイルを確認中…',
  working: '生成中…',
};

export const AiCommitControls: FunctionComponent<{
  onSuggest: () => void;
  onSuggestUnlimited: () => void;
  onCancel: () => void;
  loading: boolean;
  phase: CommitPhase | null;
  disabled?: boolean;
}> = ({
  onSuggest,
  onSuggestUnlimited,
  onCancel,
  loading,
  phase,
  disabled = false,
}) => {
  if (loading) {
    const phaseLabel = phase ? phaseLabels[phase] : '生成中…';
    return (
      <Group gap={2} wrap="nowrap">
        <Tooltip label={phaseLabel} openDelay={300}>
          <Loader size={12} />
        </Tooltip>
        <ActionIcon
          variant="subtle"
          size="xs"
          color="red"
          onClick={onCancel}
          aria-label="中断"
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label="AI: コミットメッセージを生成 (最大60秒)" openDelay={300}>
        <ActionIcon
          variant="subtle"
          size="xs"
          onClick={onSuggest}
          disabled={disabled}
          aria-label="AI: コミットメッセージを生成 (最大60秒)"
        >
          <IconSparkles size={14} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="AI: 時間無制限で生成" openDelay={300}>
        <ActionIcon
          variant="subtle"
          size="xs"
          onClick={onSuggestUnlimited}
          disabled={disabled}
          aria-label="AI: 時間無制限で生成"
        >
          <IconInfinity size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
