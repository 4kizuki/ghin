'use client';

import type { FunctionComponent } from 'react';
import { Modal, Table, Text, Kbd, Group } from '@mantine/core';

const shortcuts = [
  { keys: ['⌘', 'K'], description: 'Open search' },
  { keys: ['⌘', '↵'], description: 'Commit' },
  { keys: ['⌘', '⇧', 'P'], description: 'Push' },
  { keys: ['⌘', '⇧', 'M'], description: 'Pull & Merge main' },
  { keys: ['j'], description: 'Move down in file list' },
  { keys: ['k'], description: 'Move up in file list' },
  { keys: ['Space'], description: 'Toggle stage/unstage' },
  { keys: ['⌘', '1-9'], description: 'Switch repo tab' },
  { keys: ['⌘', 'B'], description: 'Switch branch' },
  { keys: ['/'], description: 'Show this help' },
] as const;

export const ShortcutsHelp: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
}> = ({ opened, onClose }) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
    >
      <Table>
        <Table.Tbody>
          {shortcuts.map((s) => (
            <Table.Tr key={s.description}>
              <Table.Td>
                <Group gap={4}>
                  {s.keys.map((key) => (
                    <Kbd key={key} size="sm">
                      {key}
                    </Kbd>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{s.description}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Modal>
  );
};
