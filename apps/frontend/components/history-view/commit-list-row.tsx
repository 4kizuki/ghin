import { memo } from 'react';
import {
  Box,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  CopyButton,
  HoverCard,
  Checkbox,
} from '@mantine/core';
import { IconFileCode, IconCheck, IconCopy } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import type { CommitInfo } from '@/lib/git';
import type { GraphNode } from '@/lib/graph-layout';
import { CommitGraphRow, ROW_HEIGHT } from '@/components/commit-graph';
import type { DateDisplayFormat } from '@/lib/date-format';
import { formatAbsoluteTime } from '@/lib/date-format';

export const CommitListRow = memo<{
  commit: CommitInfo;
  node: GraphNode;
  maxLane: number;
  isHead: boolean;
  isSelected: boolean;
  multiSelectMode: boolean;
  isMultiSelected: boolean;
  dateDisplayFormat: DateDisplayFormat;
  onToggleDiff: (commit: CommitInfo) => void;
  onDoubleClick: (commit: CommitInfo) => void;
  onContextMenu: (e: React.MouseEvent, commit: CommitInfo) => void;
  onToggleMultiSelect: (hash: string, checked: boolean) => void;
  onCopy: (e: React.MouseEvent, text: string) => void;
}>(
  ({
    commit,
    node,
    maxLane,
    isHead,
    isSelected,
    multiSelectMode,
    isMultiSelected,
    dateDisplayFormat,
    onToggleDiff,
    onDoubleClick,
    onContextMenu,
    onToggleMultiSelect,
    onCopy,
  }) => (
    <Box
      onDoubleClick={() => onDoubleClick(commit)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, commit);
      }}
      style={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        height: ROW_HEIGHT,
        borderBottom: `1px solid ${theme.colors.gray[1]}`,
        cursor: 'pointer',
        ...(isHead && {
          backgroundColor: theme.colors.blue[0],
        }),
      })}
    >
      {multiSelectMode && (
        <Checkbox
          size="xs"
          ml={4}
          style={{ flexShrink: 0 }}
          checked={isMultiSelected}
          onChange={(e) =>
            onToggleMultiSelect(commit.hash, e.currentTarget.checked)
          }
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      )}
      <Tooltip label="View diff">
        <ActionIcon
          size="xs"
          variant={isSelected ? 'filled' : 'subtle'}
          ml={4}
          style={{ flexShrink: 0 }}
          onClick={() => onToggleDiff(commit)}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <IconFileCode size={14} />
        </ActionIcon>
      </Tooltip>

      <CommitGraphRow node={node} maxLane={maxLane} />

      <Box
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.cursor = el.scrollWidth > el.clientWidth ? 'ew-resize' : '';
        }}
        style={{
          display: 'flex',
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        <HoverCard position="top" shadow="sm" withinPortal openDelay={750}>
          <HoverCard.Target>
            <Text
              size="xs"
              fw={500}
              truncate="end"
              style={{ flexShrink: 1, minWidth: 100 }}
            >
              {commit.message}
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown p="xs">
            <Text size="xs" style={{ maxWidth: 400, wordBreak: 'break-word' }}>
              {commit.message}
            </Text>
          </HoverCard.Dropdown>
        </HoverCard>

        {commit.refs.length > 0 && (
          <Group gap={4} wrap="nowrap" ml="xs" style={{ flexShrink: 0 }}>
            {commit.refs.map((ref) => (
              <Badge key={ref} size="xs" variant="light">
                {ref}
              </Badge>
            ))}
          </Group>
        )}
      </Box>

      <HoverCard position="top" shadow="sm" withinPortal openDelay={750}>
        <HoverCard.Target>
          <Text
            size="xs"
            c="dimmed"
            ml="xs"
            ff="monospace"
            style={{
              flexShrink: 0,
              width: 64,
              cursor: 'copy',
            }}
            onClick={(e) => onCopy(e, commit.shortHash)}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {commit.shortHash}
          </Text>
        </HoverCard.Target>
        <HoverCard.Dropdown p="xs">
          <Group gap={4} align="center">
            <Text size="xs" ff="monospace">
              {commit.hash}
            </Text>
            <CopyButton value={commit.hash}>
              {({ copied, copy }) => (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  onClick={copy}
                >
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </ActionIcon>
              )}
            </CopyButton>
          </Group>
        </HoverCard.Dropdown>
      </HoverCard>

      <HoverCard position="top" shadow="sm" withinPortal openDelay={750}>
        <HoverCard.Target>
          <Text
            size="xs"
            c="dimmed"
            ml="xs"
            truncate="end"
            style={{
              flexShrink: 0,
              width: 120,
              cursor: 'copy',
            }}
            onClick={(e) => onCopy(e, commit.author)}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {commit.author}
          </Text>
        </HoverCard.Target>
        <HoverCard.Dropdown p="xs">
          <Group gap={4} align="center">
            <Text size="xs">
              {commit.author} &lt;{commit.authorEmail}&gt;
            </Text>
            <CopyButton value={`${commit.author} <${commit.authorEmail}>`}>
              {({ copied, copy }) => (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  onClick={copy}
                >
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </ActionIcon>
              )}
            </CopyButton>
          </Group>
        </HoverCard.Dropdown>
      </HoverCard>

      <HoverCard position="top" shadow="sm" withinPortal openDelay={750}>
        <HoverCard.Target>
          <Text
            size="xs"
            c="dimmed"
            ml="xs"
            style={{
              flexShrink: 0,
              width: dateDisplayFormat === 'absolute' ? 130 : 80,
            }}
          >
            {dateDisplayFormat === 'absolute'
              ? formatAbsoluteTime(commit.date)
              : DateTime.fromISO(commit.date).toRelative()}
          </Text>
        </HoverCard.Target>
        <HoverCard.Dropdown p="xs">
          <Text size="xs">
            {dateDisplayFormat === 'absolute'
              ? DateTime.fromISO(commit.date).toRelative()
              : formatAbsoluteTime(commit.date)}
          </Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </Box>
  ),
);

CommitListRow.displayName = 'CommitListRow';
