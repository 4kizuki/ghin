import type { FunctionComponent } from 'react';
import { Modal, Stack, Text, TextInput, Group, Button } from '@mantine/core';

export const OriginSetupModal: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  originUrl: string;
  onOriginUrlChange: (url: string) => void;
  onSubmit: () => void;
  saving: boolean;
}> = ({ opened, onClose, originUrl, onOriginUrlChange, onSubmit, saving }) => (
  <Modal opened={opened} onClose={onClose} title="origin リモートの追加">
    <Stack>
      <Text size="sm">
        remote &quot;origin&quot; が設定されていません。リモートリポジトリの URL
        を入力してください。
      </Text>
      <TextInput
        label="URL"
        placeholder="https://github.com/user/repo.git"
        value={originUrl}
        onChange={(e) => onOriginUrlChange(e.currentTarget.value)}
        data-autofocus
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          loading={saving}
          disabled={!originUrl.trim()}
        >
          追加して続行
        </Button>
      </Group>
    </Stack>
  </Modal>
);
