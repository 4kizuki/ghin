import type { FunctionComponent } from 'react';
import { Box, Menu } from '@mantine/core';
import {
  IconGitMerge,
  IconAlertTriangle,
  IconArrowBackUp,
} from '@tabler/icons-react';
import type { CommitInfo } from '@/lib/git';

const extractBranchRefs = (refs: string[]): string[] =>
  refs
    .filter((r) => !r.startsWith('tag: ') && r !== 'HEAD')
    .map((r) => r.replace(/^HEAD -> /, ''));

export const CommitContextMenu: FunctionComponent<{
  contextMenu: { x: number; y: number; commit: CommitInfo } | null;
  onClose: () => void;
  onMergeBranch: (branch: string) => void;
  onReset: (mode: 'hard' | 'mixed' | 'soft', commit: CommitInfo) => void;
}> = ({ contextMenu, onClose, onMergeBranch, onReset }) => (
  <Menu
    opened={contextMenu !== null}
    onChange={(opened) => {
      if (!opened) onClose();
    }}
    position="bottom-start"
    withinPortal
  >
    <Menu.Target>
      <Box
        style={{
          position: 'fixed',
          left: contextMenu?.x ?? 0,
          top: contextMenu?.y ?? 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
    </Menu.Target>
    <Menu.Dropdown>
      {contextMenu && extractBranchRefs(contextMenu.commit.refs).length > 0 && (
        <>
          <Menu.Label>Merge</Menu.Label>
          {extractBranchRefs(contextMenu.commit.refs).map((branch) => (
            <Menu.Item
              key={branch}
              leftSection={<IconGitMerge size={14} />}
              onClick={() => onMergeBranch(branch)}
            >
              Merge {branch} into current branch
            </Menu.Item>
          ))}
          <Menu.Divider />
        </>
      )}
      <Menu.Label>Reset</Menu.Label>
      <Menu.Item
        color="red"
        leftSection={<IconAlertTriangle size={14} />}
        onClick={() => {
          if (contextMenu) onReset('hard', contextMenu.commit);
        }}
      >
        Hard reset current branch to this commit
      </Menu.Item>
      <Menu.Item
        leftSection={<IconArrowBackUp size={14} />}
        onClick={() => {
          if (contextMenu) onReset('mixed', contextMenu.commit);
        }}
      >
        Mixed reset current branch to this commit
      </Menu.Item>
      <Menu.Item
        leftSection={<IconArrowBackUp size={14} />}
        onClick={() => {
          if (contextMenu) onReset('soft', contextMenu.commit);
        }}
      >
        Soft reset current branch to this commit
      </Menu.Item>
    </Menu.Dropdown>
  </Menu>
);
