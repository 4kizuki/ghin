import type { FunctionComponent } from 'react';
import {
  Box,
  Group,
  Text,
  Checkbox,
  ScrollArea,
  Tooltip,
  ActionIcon,
  Badge,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { FileEntry } from './types';
import { getFileIcon, getStatusColor } from './types';

export const FileListPane: FunctionComponent<{
  stagedEntries: FileEntry[];
  unstagedEntries: FileEntry[];
  focusedIndex: number;
  selectedFile: string | null;
  selectedFileStaged: boolean;
  hasTrackedUnstaged: boolean;
  onFileClick: (file: FileEntry, globalIndex: number) => void;
  onFileToggle: (file: FileEntry) => void;
  onDiscardFile: (file: FileEntry) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscardAll: () => void;
}> = ({
  stagedEntries,
  unstagedEntries,
  focusedIndex,
  selectedFile,
  selectedFileStaged,
  hasTrackedUnstaged,
  onFileClick,
  onFileToggle,
  onDiscardFile,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
}) => {
  const renderFileRow = (file: FileEntry, globalIndex: number) => {
    const FileIcon = getFileIcon(file.status);
    const isFocused = globalIndex === focusedIndex;
    const isSelected =
      selectedFile === file.path && selectedFileStaged === file.staged;
    return (
      <Group
        key={`${file.path}-${String(file.staged)}`}
        gap="xs"
        px="sm"
        py={4}
        style={(theme) => ({
          cursor: 'pointer',
          backgroundColor: isSelected
            ? theme.colors.blue[0]
            : isFocused
              ? theme.colors.gray[0]
              : undefined,
          borderLeft: isFocused
            ? `2px solid ${theme.colors.blue[5]}`
            : '2px solid transparent',
          '&:hover': {
            backgroundColor: theme.colors.gray[0],
          },
        })}
        onClick={() => onFileClick(file, globalIndex)}
        wrap="nowrap"
      >
        <Checkbox
          size="xs"
          checked={file.staged}
          onChange={() => onFileToggle(file)}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: '0 0 auto' }}
        />
        <Tooltip label={file.path} openDelay={500}>
          <Group
            gap={4}
            wrap="nowrap"
            style={{
              overflow: 'hidden',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            <FileIcon
              size={14}
              style={{ flex: '0 0 auto' }}
              color={`var(--mantine-color-${getStatusColor(file.status)}-6)`}
            />
            <Text size="xs" truncate="end" style={{ minWidth: 0 }}>
              {file.path.split('/').pop()}
            </Text>
            <Text size="xs" c="dimmed" truncate="end" style={{ minWidth: 0 }}>
              {file.path.includes('/')
                ? file.path.slice(0, file.path.lastIndexOf('/'))
                : ''}
            </Text>
          </Group>
        </Tooltip>
        <Badge
          size="xs"
          variant="light"
          color={getStatusColor(file.status)}
          ml="auto"
          style={{ flex: '0 0 auto' }}
        >
          {file.status}
        </Badge>
        {!file.staged && (
          <Tooltip label="Discard changes">
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDiscardFile(file);
              }}
              style={{ flex: '0 0 auto' }}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    );
  };

  return (
    <Box
      style={{
        width: 300,
        minWidth: 200,
        borderRight: '1px solid var(--mantine-color-gray-3)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Staged section */}
      <Box
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Group px="sm" py={6} gap="xs" style={{ flex: '0 0 auto' }}>
          <Checkbox
            size="xs"
            checked={stagedEntries.length > 0}
            disabled={stagedEntries.length === 0}
            onChange={onUnstageAll}
          />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Staged Changes ({stagedEntries.length})
          </Text>
        </Group>
        <ScrollArea style={{ flex: '1 1 0', overscrollBehavior: 'none' }}>
          {stagedEntries.length === 0 ? (
            <Text size="xs" c="dimmed" px="sm" py={4}>
              No staged changes
            </Text>
          ) : (
            stagedEntries.map((file, index) => renderFileRow(file, index))
          )}
        </ScrollArea>
      </Box>

      {/* Divider */}
      <Box
        style={{
          flex: '0 0 auto',
          borderTop: '1px solid var(--mantine-color-gray-3)',
        }}
      />

      {/* Unstaged section */}
      <Box
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Group
          px="sm"
          py={6}
          gap="xs"
          justify="space-between"
          style={{ flex: '0 0 auto' }}
        >
          <Group gap="xs">
            <Checkbox
              size="xs"
              checked={false}
              disabled={unstagedEntries.length === 0}
              onChange={onStageAll}
            />
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Unstaged Changes ({unstagedEntries.length})
            </Text>
          </Group>
          {hasTrackedUnstaged && (
            <Tooltip label="Discard all tracked changes">
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={onDiscardAll}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <ScrollArea style={{ flex: '1 1 0', overscrollBehavior: 'none' }}>
          {unstagedEntries.length === 0 ? (
            <Text size="xs" c="dimmed" px="sm" py={4}>
              No unstaged changes
            </Text>
          ) : (
            unstagedEntries.map((file, index) =>
              renderFileRow(file, stagedEntries.length + index),
            )
          )}
        </ScrollArea>
      </Box>
    </Box>
  );
};
