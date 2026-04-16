import type { FunctionComponent } from 'react';
import {
  Group,
  Text,
  Badge,
  Button,
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import {
  IconGitBranch,
  IconArrowLeft,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import type { DiffFontSize } from '@/components/diff-viewer';
import { isDiffFontSize } from '@/components/diff-viewer';

export const StatusBar: FunctionComponent<{
  branch: string;
  ahead: number;
  behind: number;
  aheadOfMain: number;
  behindMain: number;
  totalChanges: number;
  hasConflicts: boolean;
  diffFontSize: DiffFontSize;
  onDiffFontSizeChange: (size: DiffFontSize) => void;
  onNavigateHistory: () => void;
}> = ({
  branch,
  ahead,
  behind,
  aheadOfMain,
  behindMain,
  totalChanges,
  hasConflicts,
  diffFontSize,
  onDiffFontSizeChange,
  onNavigateHistory,
}) => (
  <Group
    px="md"
    justify="space-between"
    style={(theme) => ({
      borderBottom: `1px solid ${theme.colors.gray[3]}`,
      height: 51,
      flex: '0 0 51px',
      alignItems: 'center',
    })}
  >
    <Group gap="sm">
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconArrowLeft size={14} />}
        onClick={onNavigateHistory}
      >
        History
      </Button>
      <Group gap={4}>
        <IconGitBranch size={16} />
        <Text fw={600} size="sm">
          {branch}
        </Text>
      </Group>
      {ahead > 0 && (
        <Tooltip label={`${ahead} unpushed`}>
          <Badge
            color="orange"
            variant="light"
            size="sm"
            leftSection={<IconArrowUp size={10} />}
          >
            {ahead}
          </Badge>
        </Tooltip>
      )}
      {behind > 0 && (
        <Tooltip label={`${behind} unpulled`}>
          <Badge
            color="blue"
            variant="light"
            size="sm"
            leftSection={<IconArrowDown size={10} />}
          >
            {behind}
          </Badge>
        </Tooltip>
      )}
      {branch !== 'main' && aheadOfMain > 0 && (
        <Badge color="gray" variant="light" size="sm">
          main +{aheadOfMain}
        </Badge>
      )}
      {branch !== 'main' && behindMain > 0 && (
        <Badge color="gray" variant="light" size="sm">
          main -{behindMain}
        </Badge>
      )}
      {totalChanges > 0 && (
        <Badge color="violet" variant="light" size="sm">
          {totalChanges} changes
        </Badge>
      )}
      {hasConflicts && (
        <Badge color="red" variant="filled" size="sm">
          CONFLICTS
        </Badge>
      )}
    </Group>

    <Group gap="xs">
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
    </Group>
  </Group>
);
