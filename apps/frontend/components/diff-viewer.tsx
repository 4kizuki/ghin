'use client';

import type { FunctionComponent } from 'react';
import { useCallback, useState, useRef } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  Group,
  Checkbox,
  ActionIcon,
  Tooltip,
  Code,
} from '@mantine/core';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import type { FileDiff, Hunk, HunkLine } from '@/lib/git';

const buildPatch = (
  filePath: string,
  hunk: Hunk,
  selectedLineIndices?: Set<number>,
): string => {
  const lines: string[] = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);

  if (!selectedLineIndices) {
    // Stage entire hunk
    lines.push(hunk.header);
    for (const line of hunk.lines) {
      switch (line.type) {
        case 'context':
          lines.push(` ${line.content}`);
          break;
        case 'add':
          lines.push(`+${line.content}`);
          break;
        case 'remove':
          lines.push(`-${line.content}`);
          break;
      }
    }
  } else {
    // Stage selected lines only
    const patchLines: string[] = [];
    let oldCount = 0;
    let newCount = 0;

    for (let i = 0; i < hunk.lines.length; i++) {
      const line = hunk.lines[i];
      if (line.type === 'context') {
        patchLines.push(` ${line.content}`);
        oldCount++;
        newCount++;
      } else if (line.type === 'remove') {
        if (selectedLineIndices.has(i)) {
          patchLines.push(`-${line.content}`);
          oldCount++;
        } else {
          patchLines.push(` ${line.content}`);
          oldCount++;
          newCount++;
        }
      } else if (line.type === 'add') {
        if (selectedLineIndices.has(i)) {
          patchLines.push(`+${line.content}`);
          newCount++;
        }
        // If not selected, just skip the add line
      }
    }

    lines.push(
      `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@`,
    );
    lines.push(...patchLines);
  }

  return lines.join('\n') + '\n';
};

const HunkView: FunctionComponent<{
  filePath: string;
  hunk: Hunk;
  hunkIndex: number;
  staged: boolean;
  onStageHunk: (patch: string) => Promise<void>;
  onUnstageHunk: (patch: string) => Promise<void>;
}> = ({ filePath, hunk, hunkIndex, staged, onStageHunk, onUnstageHunk }) => {
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [shiftStart, setShiftStart] = useState<number | null>(null);

  const handleLineClick = useCallback(
    (index: number, shiftKey: boolean) => {
      setSelectedLines((prev) => {
        const next = new Set(prev);
        if (shiftKey && shiftStart !== null) {
          const start = Math.min(shiftStart, index);
          const end = Math.max(shiftStart, index);
          for (let i = start; i <= end; i++) {
            const line = hunk.lines[i];
            if (line.type !== 'context') {
              next.add(i);
            }
          }
        } else {
          if (next.has(index)) {
            next.delete(index);
          } else {
            next.add(index);
          }
          setShiftStart(index);
        }
        return next;
      });
    },
    [shiftStart, hunk.lines],
  );

  const handleStageSelected = useCallback(async () => {
    const patch = buildPatch(
      filePath,
      hunk,
      selectedLines.size > 0 ? selectedLines : undefined,
    );
    if (staged) {
      await onUnstageHunk(patch);
    } else {
      await onStageHunk(patch);
    }
    setSelectedLines(new Set());
  }, [filePath, hunk, selectedLines, staged, onStageHunk, onUnstageHunk]);

  const handleStageEntireHunk = useCallback(async () => {
    const patch = buildPatch(filePath, hunk);
    if (staged) {
      await onUnstageHunk(patch);
    } else {
      await onStageHunk(patch);
    }
  }, [filePath, hunk, staged, onStageHunk, onUnstageHunk]);

  return (
    <Box mb="xs">
      <Group
        px="sm"
        py={4}
        gap="xs"
        style={(theme) => ({
          backgroundColor: theme.colors.gray[1],
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        })}
      >
        <Tooltip label={staged ? 'Unstage hunk' : 'Stage hunk'}>
          <ActionIcon
            size="xs"
            variant="light"
            color={staged ? 'red' : 'green'}
            onClick={handleStageEntireHunk}
          >
            {staged ? <IconMinus size={12} /> : <IconPlus size={12} />}
          </ActionIcon>
        </Tooltip>
        {selectedLines.size > 0 && (
          <Tooltip
            label={
              staged
                ? `Unstage ${selectedLines.size} lines`
                : `Stage ${selectedLines.size} lines`
            }
          >
            <ActionIcon
              size="xs"
              variant="filled"
              color={staged ? 'red' : 'green'}
              onClick={handleStageSelected}
            >
              {staged ? <IconMinus size={12} /> : <IconPlus size={12} />}
            </ActionIcon>
          </Tooltip>
        )}
        <Code style={{ fontSize: 11 }}>{hunk.header}</Code>
      </Group>

      <Box style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {hunk.lines.map((line, lineIdx) => {
          const isSelected = selectedLines.has(lineIdx);
          const bgColor =
            line.type === 'add'
              ? isSelected
                ? 'var(--mantine-color-green-2)'
                : 'var(--mantine-color-green-0)'
              : line.type === 'remove'
                ? isSelected
                  ? 'var(--mantine-color-red-2)'
                  : 'var(--mantine-color-red-0)'
                : isSelected
                  ? 'var(--mantine-color-blue-0)'
                  : undefined;

          return (
            <Box
              key={lineIdx}
              px="sm"
              style={{
                display: 'flex',
                backgroundColor: bgColor,
                cursor: line.type !== 'context' ? 'pointer' : undefined,
                userSelect: 'none',
                borderLeft: isSelected
                  ? '3px solid var(--mantine-color-blue-5)'
                  : '3px solid transparent',
              }}
              onClick={(e) => {
                if (line.type !== 'context') {
                  handleLineClick(lineIdx, e.shiftKey);
                }
              }}
            >
              <Text
                size="xs"
                c="dimmed"
                style={{
                  width: 40,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: 'monospace',
                }}
              >
                {line.oldLineNumber ?? ''}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  width: 40,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: 'monospace',
                }}
              >
                {line.newLineNumber ?? ''}
              </Text>
              <Text
                size="xs"
                c={
                  line.type === 'add'
                    ? 'green'
                    : line.type === 'remove'
                      ? 'red'
                      : undefined
                }
                style={{
                  whiteSpace: 'pre',
                  fontFamily: 'monospace',
                  paddingLeft: 8,
                }}
              >
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                {line.content}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export const DiffViewer: FunctionComponent<{
  files: FileDiff[];
  staged: boolean;
  onStageHunk: (patch: string) => Promise<void>;
  onUnstageHunk: (patch: string) => Promise<void>;
}> = ({ files, staged, onStageHunk, onUnstageHunk }) => {
  return (
    <ScrollArea style={{ height: '100%' }}>
      {files.map((file) => (
        <Box key={file.path}>
          <Group
            px="sm"
            py={6}
            style={(theme) => ({
              backgroundColor: theme.colors.gray[0],
              borderBottom: `1px solid ${theme.colors.gray[3]}`,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            })}
          >
            <Text size="sm" fw={600}>
              {file.path}
            </Text>
            {file.isNew && (
              <Text size="xs" c="green">
                NEW
              </Text>
            )}
            {file.isDeleted && (
              <Text size="xs" c="red">
                DELETED
              </Text>
            )}
            {file.isBinary && (
              <Text size="xs" c="dimmed">
                Binary file
              </Text>
            )}
          </Group>
          {file.hunks.map((hunk, i) => (
            <HunkView
              key={i}
              filePath={file.path}
              hunk={hunk}
              hunkIndex={i}
              staged={staged}
              onStageHunk={onStageHunk}
              onUnstageHunk={onUnstageHunk}
            />
          ))}
        </Box>
      ))}
    </ScrollArea>
  );
};
