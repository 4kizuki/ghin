import type { FunctionComponent } from 'react';
import {
  Drawer,
  Group,
  Stack,
  Text,
  Tooltip,
  CloseButton,
  SegmentedControl,
  Loader,
} from '@mantine/core';
import { DateTime } from 'luxon';
import type { CommitInfo, FileDiff } from '@/lib/git';
import type { DiffFontSize } from '@/components/diff-viewer';
import { DiffViewer, isDiffFontSize } from '@/components/diff-viewer';
import type { DateDisplayFormat } from '@/lib/date-format';
import { formatAbsoluteTime } from '@/lib/date-format';

const noop = async (): Promise<void> => {};

export const DiffDrawer: FunctionComponent<{
  selectedCommit: CommitInfo | null;
  opened: boolean;
  onClose: () => void;
  loadingDiff: boolean;
  commitDiff: FileDiff[];
  diffFontSize: DiffFontSize;
  onDiffFontSizeChange: (size: DiffFontSize) => void;
  dateDisplayFormat: DateDisplayFormat;
}> = ({
  selectedCommit,
  opened,
  onClose,
  loadingDiff,
  commitDiff,
  diffFontSize,
  onDiffFontSizeChange,
  dateDisplayFormat,
}) => (
  <Drawer
    opened={opened}
    onClose={onClose}
    position="right"
    size="60%"
    lockScroll={false}
    withOverlay={false}
    withinPortal={false}
    withCloseButton={false}
    styles={{
      content: {
        borderLeft: '2px solid var(--mantine-color-gray-4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
      header: {
        flex: '0 0 auto',
        alignItems: 'flex-start',
        overflow: 'hidden',
      },
      title: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      },
      body: {
        flex: '1 1 0',
        overflow: 'hidden',
      },
    }}
    title={
      selectedCommit && (
        <Group justify="space-between" wrap="nowrap" w="100%">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} truncate="end">
              {selectedCommit.message}
            </Text>
            <Group gap="xs">
              <Text size="xs" c="dimmed" ff="monospace">
                {selectedCommit.shortHash}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedCommit.author}
              </Text>
              <Tooltip
                label={
                  dateDisplayFormat === 'absolute'
                    ? DateTime.fromISO(selectedCommit.date).toRelative()
                    : formatAbsoluteTime(selectedCommit.date)
                }
                openDelay={750}
              >
                <Text size="xs" c="dimmed">
                  {dateDisplayFormat === 'absolute'
                    ? formatAbsoluteTime(selectedCommit.date)
                    : DateTime.fromISO(selectedCommit.date).toRelative()}
                </Text>
              </Tooltip>
            </Group>
          </Stack>
          <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
            <CloseButton size="sm" onClick={onClose} />
            <SegmentedControl
              size="xs"
              value={diffFontSize}
              onChange={(v: string) => {
                if (isDiffFontSize(v)) onDiffFontSizeChange(v);
              }}
              data={[
                { label: 'XS', value: 'xs' },
                { label: 'S', value: 's' },
                { label: 'N', value: 'n' },
              ]}
            />
          </Stack>
        </Group>
      )
    }
  >
    {loadingDiff ? (
      <Group justify="center" pt="xl">
        <Loader size="sm" />
      </Group>
    ) : (
      <DiffViewer
        files={commitDiff}
        staged={false}
        readOnly
        diffFontSize={diffFontSize}
        onStageHunk={noop}
        onUnstageHunk={noop}
      />
    )}
  </Drawer>
);
