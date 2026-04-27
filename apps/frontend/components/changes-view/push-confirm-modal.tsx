import type { FunctionComponent } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  Badge,
  Button,
  Code,
} from '@mantine/core';

export const PushConfirmModal: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  remoteUrl: string | null;
  upstream?: string;
  branch: string;
  pushBranchName: string;
  onPushBranchNameChange: (name: string) => void;
  onConfirm: () => void;
  committing: boolean;
  confirmLabel?: string;
}> = ({
  opened,
  onClose,
  remoteUrl,
  upstream,
  branch,
  pushBranchName,
  onPushBranchNameChange,
  onConfirm,
  committing,
  confirmLabel = 'Commit & Push',
}) => (
  <Modal opened={opened} onClose={onClose} title="Push Confirmation">
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
        {upstream ? (
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Push to:
            </Text>
            <Text size="sm">{upstream}</Text>
          </Group>
        ) : (
          <TextInput
            label="Remote branch name"
            description="upstream 未設定のため、新しい remote branch を作成します"
            placeholder={branch}
            value={pushBranchName}
            onChange={(e) => onPushBranchNameChange(e.currentTarget.value)}
            rightSection={
              <Badge size="xs" color="green" variant="light">
                new
              </Badge>
            }
            rightSectionWidth={40}
          />
        )}
        <Text size="xs" c="dimmed">
          push to: {upstream ?? `origin/${pushBranchName || branch}`}
        </Text>
      </Stack>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} loading={committing}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  </Modal>
);
