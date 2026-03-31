'use client';

import type { FunctionComponent } from 'react';
import { useCallback, useState } from 'react';
import { Box, Text, Group, ActionIcon, Tooltip, Code } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import type { FileDiff, Hunk, HunkLine } from '@/lib/git';
import { NeverError } from '@repo/never-error';

const buildPatch = (
  filePath: string,
  hunk: Hunk,
  selectedLineIndices?: Set<number>,
): string => {
  const lines: string[] = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);

  if (!selectedLineIndices) {
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
        default:
          throw new NeverError(line.type);
      }
    }
  } else {
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
      }
    }

    lines.push(
      `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@`,
    );
    lines.push(...patchLines);
  }

  return lines.join('\n') + '\n';
};

const getDiffLineBackground = (
  type: HunkLine['type'],
  isSelected: boolean,
): string | undefined => {
  switch (type) {
    case 'add':
      return isSelected
        ? 'var(--mantine-color-green-2)'
        : 'var(--mantine-color-green-0)';
    case 'remove':
      return isSelected
        ? 'var(--mantine-color-red-2)'
        : 'var(--mantine-color-red-0)';
    case 'context':
      return isSelected ? 'var(--mantine-color-blue-0)' : undefined;
    default:
      throw new NeverError(type);
  }
};

const getDiffLinePrefix = (type: HunkLine['type']): string => {
  switch (type) {
    case 'add':
      return '+';
    case 'remove':
      return '-';
    case 'context':
      return ' ';
    default:
      throw new NeverError(type);
  }
};

const MONO_FONT = 'Menlo, Monaco, Consolas, "Courier New", monospace';

export type DiffFontSize = 'xs' | 's' | 'n';

const DIFF_FONT_SIZES: ReadonlySet<string> = new Set<DiffFontSize>([
  'xs',
  's',
  'n',
]);

export const isDiffFontSize = (v: string): v is DiffFontSize =>
  DIFF_FONT_SIZES.has(v);

const FONT_SIZE_MAP: Record<DiffFontSize, number> = {
  xs: 9,
  s: 10,
  n: 12,
};

const LINE_NUM_WIDTH_MAP: Record<DiffFontSize, number> = {
  xs: 32,
  s: 36,
  n: 40,
};

const HunkView: FunctionComponent<{
  filePath: string;
  hunk: Hunk;
  staged: boolean;
  readOnly: boolean;
  diffFontSize: DiffFontSize;
  onStageHunk: (patch: string) => Promise<void>;
  onUnstageHunk: (patch: string) => Promise<void>;
}> = ({
  filePath,
  hunk,
  staged,
  readOnly,
  diffFontSize,
  onStageHunk,
  onUnstageHunk,
}) => {
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
            if (hunk.lines[i].type !== 'context') {
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
        {!readOnly && (
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
        )}
        {!readOnly && selectedLines.size > 0 && (
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

      <Box
        style={{ fontFamily: MONO_FONT, fontSize: FONT_SIZE_MAP[diffFontSize] }}
      >
        {hunk.lines.map((line, lineIdx) => {
          const isSelected = selectedLines.has(lineIdx);
          return (
            <Box
              key={lineIdx}
              px="sm"
              style={{
                display: 'flex',
                backgroundColor: getDiffLineBackground(line.type, isSelected),
                cursor:
                  !readOnly && line.type !== 'context' ? 'pointer' : undefined,
                userSelect: 'none',
                borderLeft: isSelected
                  ? '3px solid var(--mantine-color-blue-5)'
                  : '3px solid transparent',
              }}
              onClick={(e) => {
                if (!readOnly && line.type !== 'context') {
                  handleLineClick(lineIdx, e.shiftKey);
                }
              }}
            >
              <Text
                c="dimmed"
                style={{
                  fontSize: 'inherit',
                  width: LINE_NUM_WIDTH_MAP[diffFontSize],
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: MONO_FONT,
                }}
              >
                {line.oldLineNumber ?? ''}
              </Text>
              <Text
                c="dimmed"
                style={{
                  fontSize: 'inherit',
                  width: LINE_NUM_WIDTH_MAP[diffFontSize],
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: MONO_FONT,
                }}
              >
                {line.newLineNumber ?? ''}
              </Text>
              <Text
                c={
                  line.type === 'add'
                    ? 'green'
                    : line.type === 'remove'
                      ? 'red'
                      : undefined
                }
                style={{
                  fontSize: 'inherit',
                  whiteSpace: 'pre',
                  fontFamily: MONO_FONT,
                  paddingLeft: 8,
                }}
              >
                {getDiffLinePrefix(line.type)}
                {line.content}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const FileDiffSection: FunctionComponent<{
  file: FileDiff;
  staged: boolean;
  readOnly: boolean;
  diffFontSize: DiffFontSize;
  onStageHunk: (patch: string) => Promise<void>;
  onUnstageHunk: (patch: string) => Promise<void>;
}> = ({ file, staged, readOnly, diffFontSize, onStageHunk, onUnstageHunk }) => (
  <Box>
    <Group
      px="sm"
      py={6}
      wrap="nowrap"
      style={(theme) => ({
        backgroundColor: theme.colors.gray[0],
        borderBottom: `1px solid ${theme.colors.gray[3]}`,
        overflow: 'hidden',
      })}
    >
      <Tooltip label={file.path} openDelay={500}>
        <Text size="sm" fw={600} truncate="end" style={{ minWidth: 0 }}>
          {file.path}
        </Text>
      </Tooltip>
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
    <Box style={{ overflowX: 'auto' }}>
      <Box style={{ display: 'inline-block', minWidth: '100%' }}>
        {file.hunks.map((hunk, i) => (
          <HunkView
            key={i}
            filePath={file.path}
            hunk={hunk}
            staged={staged}
            readOnly={readOnly}
            diffFontSize={diffFontSize}
            onStageHunk={onStageHunk}
            onUnstageHunk={onUnstageHunk}
          />
        ))}
      </Box>
    </Box>
  </Box>
);

export const DiffViewer: FunctionComponent<{
  files: FileDiff[];
  staged: boolean;
  readOnly?: boolean;
  diffFontSize: DiffFontSize;
  onStageHunk: (patch: string) => Promise<void>;
  onUnstageHunk: (patch: string) => Promise<void>;
}> = ({
  files,
  staged,
  readOnly = false,
  diffFontSize,
  onStageHunk,
  onUnstageHunk,
}) => (
  <Virtuoso
    style={{ height: '100%', overscrollBehavior: 'none' }}
    data={files}
    itemContent={(_index, file) => (
      <FileDiffSection
        file={file}
        staged={staged}
        readOnly={readOnly}
        diffFontSize={diffFontSize}
        onStageHunk={onStageHunk}
        onUnstageHunk={onUnstageHunk}
      />
    )}
  />
);
