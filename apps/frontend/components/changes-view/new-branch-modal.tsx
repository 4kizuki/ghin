import type { FunctionComponent } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Divider,
  Group,
  Text,
  Badge,
  Button,
  Code,
} from '@mantine/core';
import { AiSuggestButton } from '@/components/ai-suggest-button';

export const NewBranchModal: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  newBranchName: string;
  onNewBranchNameChange: (name: string) => void;
  autoPush: boolean;
  remoteUrl: string | null;
  pushBranchName: string;
  onPushBranchNameChange: (name: string) => void;
  commitMsg: string;
  aiEnabled: boolean;
  aiBranchLoading: boolean;
  onSuggestBranchName: () => void;
  onCommit: () => void;
  committing: boolean;
}> = ({
  opened,
  onClose,
  newBranchName,
  onNewBranchNameChange,
  autoPush,
  remoteUrl,
  pushBranchName,
  onPushBranchNameChange,
  commitMsg,
  aiEnabled,
  aiBranchLoading,
  onSuggestBranchName,
  onCommit,
  committing,
}) => (
  <Modal opened={opened} onClose={onClose} title="Commit to New Branch">
    <Stack>
      <TextInput
        label="Branch name"
        placeholder="feature/my-branch"
        value={newBranchName}
        onChange={(e) => onNewBranchNameChange(e.currentTarget.value)}
        data-autofocus
        rightSection={
          aiEnabled ? (
            <AiSuggestButton
              onClick={onSuggestBranchName}
              loading={aiBranchLoading}
              disabled={!commitMsg.trim()}
              tooltip="AI: suggest branch name"
            />
          ) : undefined
        }
        rightSectionWidth={aiEnabled ? 32 : undefined}
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
              onChange={(e) => onPushBranchNameChange(e.currentTarget.value)}
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
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onCommit}
          loading={committing}
          disabled={!newBranchName.trim()}
        >
          {autoPush ? 'Commit & Push' : 'Commit'}
        </Button>
      </Group>
    </Stack>
  </Modal>
);
