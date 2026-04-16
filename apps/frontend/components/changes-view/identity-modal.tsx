import type { FunctionComponent } from 'react';
import { Modal, Stack, Text, TextInput, Group, Button } from '@mantine/core';

export const IdentityModal: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  identityName: string;
  onIdentityNameChange: (name: string) => void;
  identityEmail: string;
  onIdentityEmailChange: (email: string) => void;
  onSave: () => void;
  saving: boolean;
}> = ({
  opened,
  onClose,
  identityName,
  onIdentityNameChange,
  identityEmail,
  onIdentityEmailChange,
  onSave,
  saving,
}) => (
  <Modal opened={opened} onClose={onClose} title="Git Author Identity">
    <Stack>
      <Text size="sm">
        このリポジトリに user.name / user.email
        が設定されていません。ローカル設定を行います。
      </Text>
      <TextInput
        label="user.name"
        placeholder="Your Name"
        value={identityName}
        onChange={(e) => onIdentityNameChange(e.currentTarget.value)}
        data-autofocus
      />
      <TextInput
        label="user.email"
        placeholder="you@example.com"
        value={identityEmail}
        onChange={(e) => onIdentityEmailChange(e.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          loading={saving}
          disabled={!identityName.trim() || !identityEmail.trim()}
        >
          Save & Commit
        </Button>
      </Group>
    </Stack>
  </Modal>
);
