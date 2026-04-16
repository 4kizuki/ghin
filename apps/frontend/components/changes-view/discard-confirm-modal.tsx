import type { FunctionComponent } from 'react';
import { Modal, Stack, Text, Group, Button } from '@mantine/core';

export const DiscardConfirmModal: FunctionComponent<{
  discard: { label: string; onConfirm: () => Promise<void> } | null;
  onClose: () => void;
}> = ({ discard, onClose }) => (
  <Modal opened={discard !== null} onClose={onClose} title="Discard Changes">
    <Stack>
      <Text size="sm">{discard?.label}</Text>
      <Text size="xs" c="red">
        この操作は元に戻せません。
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="red"
          onClick={async () => {
            await discard?.onConfirm();
            onClose();
          }}
        >
          Discard
        </Button>
      </Group>
    </Stack>
  </Modal>
);
