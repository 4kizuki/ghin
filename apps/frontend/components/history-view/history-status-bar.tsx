import type { FunctionComponent } from 'react';
import {
  Group,
  Text,
  Badge,
  Button,
  Tooltip,
  Indicator,
  Switch,
  ActionIcon,
  Popover,
  Stack,
  Divider,
  Checkbox,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconClock,
  IconDownload,
  IconGitBranch,
  IconGitMerge,
  IconPlus,
  IconSearch,
  IconUpload,
  IconX,
  IconBrandVscode,
} from '@tabler/icons-react';
import type { RepoStatus } from '@/lib/git';

export const HistoryStatusBar: FunctionComponent<{
  status: RepoStatus | null;
  totalChanges: number;
  repoId: string;
  onNavigateChanges: () => void;
  onOpenBranch: () => void;
  multiSelectMode: boolean;
  selectedHashesSize: number;
  distributeStart: string | null;
  onDistributeStartChange: (v: string | null) => void;
  distributeEnd: string | null;
  onDistributeEndChange: (v: string | null) => void;
  distributeLoading: boolean;
  onDistribute: () => void;
  onClearSelection: () => void;
  onMultiSelectToggle: (checked: boolean) => void;
  fetchLoading: boolean;
  autoFetch: boolean;
  selectedRemotes: string[];
  availableRemotes: string[];
  onFetch: () => void;
  onAutoFetchToggle: (checked: boolean) => void;
  onRemoteToggle: (remote: string, checked: boolean) => void;
  onLoadRemotes: () => void;
  actionLoading: boolean;
  onSearch: () => void;
  onPull: () => void;
  onPullMerge: () => void;
  onPush: () => void;
  onOpenInEditor: () => void;
}> = ({
  status,
  totalChanges,
  repoId,
  onNavigateChanges,
  onOpenBranch,
  multiSelectMode,
  selectedHashesSize,
  distributeStart,
  onDistributeStartChange,
  distributeEnd,
  onDistributeEndChange,
  distributeLoading,
  onDistribute,
  onClearSelection,
  onMultiSelectToggle,
  fetchLoading,
  autoFetch,
  selectedRemotes,
  availableRemotes,
  onFetch,
  onAutoFetchToggle,
  onRemoteToggle,
  onLoadRemotes,
  actionLoading,
  onSearch,
  onPull,
  onPullMerge,
  onPush,
  onOpenInEditor,
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
      <Indicator
        label={totalChanges}
        size={16}
        disabled={totalChanges === 0}
        color="violet"
        offset={4}
      >
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={onNavigateChanges}
        >
          Changes
        </Button>
      </Indicator>
      <Button
        variant="subtle"
        color="dark"
        size="sm"
        px="xs"
        leftSection={<IconGitBranch size={16} />}
        onClick={onOpenBranch}
      >
        {status?.branch ?? '...'}
      </Button>
      {status && status.ahead > 0 && (
        <Tooltip label={`${status.ahead} unpushed`}>
          <Badge
            color="orange"
            variant="light"
            size="sm"
            leftSection={<IconArrowUp size={10} />}
          >
            {status.ahead}
          </Badge>
        </Tooltip>
      )}
      {status && status.behind > 0 && (
        <Tooltip label={`${status.behind} unpulled`}>
          <Badge
            color="blue"
            variant="light"
            size="sm"
            leftSection={<IconArrowDown size={10} />}
          >
            {status.behind}
          </Badge>
        </Tooltip>
      )}
      {status &&
        status.branch !== 'main' &&
        (status.aheadOfMain > 0 || status.behindMain > 0) && (
          <Badge color="gray" variant="light" size="sm">
            main:{' '}
            {[
              status.aheadOfMain > 0 && `+${status.aheadOfMain}`,
              status.behindMain > 0 && `-${status.behindMain}`,
            ]
              .filter(Boolean)
              .join(' / ')}
          </Badge>
        )}
      {status?.hasConflicts && (
        <Badge color="red" variant="filled" size="sm">
          CONFLICTS
        </Badge>
      )}
    </Group>

    <Group gap="xs">
      {multiSelectMode && selectedHashesSize > 0 ? (
        <>
          <Badge size="lg" variant="light" color="violet">
            {selectedHashesSize} selected
          </Badge>
          <DateTimePicker
            size="xs"
            placeholder="Start"
            value={distributeStart}
            onChange={onDistributeStartChange}
            style={{ width: 180 }}
            valueFormat="YYYY/MM/DD HH:mm"
          />
          <Text size="xs" c="dimmed">
            ~
          </Text>
          <DateTimePicker
            size="xs"
            placeholder="End"
            value={distributeEnd}
            onChange={onDistributeEndChange}
            style={{ width: 180 }}
            valueFormat="YYYY/MM/DD HH:mm"
          />
          <Button
            size="xs"
            variant="filled"
            color="violet"
            leftSection={<IconClock size={14} />}
            onClick={onDistribute}
            loading={distributeLoading}
            disabled={
              selectedHashesSize < 2 ||
              !distributeStart ||
              !distributeEnd ||
              new Date(distributeStart).getTime() >=
                new Date(distributeEnd).getTime()
            }
          >
            Distribute
          </Button>
          <ActionIcon size="sm" variant="subtle" onClick={onClearSelection}>
            <IconX size={14} />
          </ActionIcon>
        </>
      ) : (
        <>
          <Switch
            size="xs"
            label="Select"
            checked={multiSelectMode}
            onChange={(e) => onMultiSelectToggle(e.currentTarget.checked)}
          />
          <Button.Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={onFetch}
              loading={fetchLoading}
            >
              Fetch
            </Button>
            <Popover position="bottom-end" onOpen={onLoadRemotes}>
              <Popover.Target>
                <Button size="xs" variant="light" px={4}>
                  <IconChevronDown size={14} />
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Switch
                    size="xs"
                    label="Auto Fetch (60s)"
                    checked={autoFetch}
                    onChange={(e) => onAutoFetchToggle(e.currentTarget.checked)}
                  />
                  <Divider />
                  <Text size="xs" fw={600} c="dimmed">
                    Remotes
                  </Text>
                  {availableRemotes.map((remote) => (
                    <Checkbox
                      key={remote}
                      size="xs"
                      label={remote}
                      checked={selectedRemotes.includes(remote)}
                      onChange={(e) =>
                        onRemoteToggle(remote, e.currentTarget.checked)
                      }
                    />
                  ))}
                  {availableRemotes.length === 0 && (
                    <Text size="xs" c="dimmed">
                      Loading...
                    </Text>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Button.Group>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconSearch size={14} />}
            onClick={onSearch}
          >
            Search
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={onPull}
            loading={actionLoading}
          >
            Pull
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconGitMerge size={14} />}
            onClick={onPullMerge}
            loading={actionLoading}
          >
            Pull & Merge
          </Button>
          <Button
            size="xs"
            variant="light"
            color={status && status.ahead > 0 ? 'orange' : undefined}
            leftSection={<IconUpload size={14} />}
            onClick={onPush}
            loading={actionLoading}
          >
            Push
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconBrandVscode size={14} />}
            onClick={onOpenInEditor}
          >
            VSCode
          </Button>
        </>
      )}
    </Group>
  </Group>
);
