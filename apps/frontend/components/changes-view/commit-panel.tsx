import type { FunctionComponent, RefObject } from 'react';
import {
  Box,
  Group,
  Stack,
  Text,
  Textarea,
  Button,
  Switch,
  Tooltip,
} from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';
import { AiSuggestButton } from '@/components/ai-suggest-button';

export const CommitPanel: FunctionComponent<{
  branch: string;
  commitMsg: string;
  onCommitMsgChange: (msg: string) => void;
  commitInputRef: RefObject<HTMLTextAreaElement | null>;
  aiEnabled: boolean;
  aiCommitLoading: boolean;
  onSuggestCommitMessage: () => void;
  stagedCount: number;
  autoPush: boolean;
  onAutoPushToggle: (checked: boolean) => void;
  onCommit: () => void;
  onOpenNewBranch: () => void;
  committing: boolean;
}> = ({
  branch,
  commitMsg,
  onCommitMsgChange,
  commitInputRef,
  aiEnabled,
  aiCommitLoading,
  onSuggestCommitMessage,
  stagedCount,
  autoPush,
  onAutoPushToggle,
  onCommit,
  onOpenNewBranch,
  committing,
}) => (
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
          <IconGitBranch size={14} style={{ flexShrink: 0, marginBottom: 6 }} />
          <Text size="xs" fw={600} style={{ flexShrink: 0, marginBottom: 6 }}>
            {branch}
          </Text>
          <Textarea
            placeholder="Commit message (Enter: newline, ⌘+Enter: commit)"
            size="xs"
            autosize
            minRows={1}
            value={commitMsg}
            onChange={(e) => onCommitMsgChange(e.currentTarget.value)}
            ref={commitInputRef}
            rightSection={
              aiEnabled ? (
                <AiSuggestButton
                  onClick={onSuggestCommitMessage}
                  loading={aiCommitLoading}
                  disabled={stagedCount === 0}
                  tooltip="AI: suggest commit message"
                />
              ) : undefined
            }
            rightSectionWidth={aiEnabled ? 32 : undefined}
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
            onChange={(e) => onAutoPushToggle(e.currentTarget.checked)}
          />
        </Tooltip>
        <Button
          size="sm"
          onClick={onCommit}
          loading={committing}
          disabled={!commitMsg.trim() || stagedCount === 0}
        >
          Commit
        </Button>
        <Button
          size="sm"
          variant="light"
          onClick={onOpenNewBranch}
          loading={committing}
          disabled={!commitMsg.trim() || stagedCount === 0}
        >
          Commit to New Branch
        </Button>
      </Group>
    </Group>
  </Box>
);
