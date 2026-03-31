'use client';

import type { FunctionComponent } from 'react';
import { ActionIcon, Tooltip, Loader } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';

export const AiSuggestButton: FunctionComponent<{
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  tooltip?: string;
  size?: number;
}> = ({
  onClick,
  loading,
  disabled = false,
  tooltip = 'AI suggest',
  size = 14,
}) => (
  <Tooltip label={tooltip} openDelay={300}>
    <ActionIcon
      variant="subtle"
      size="xs"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={tooltip}
    >
      {loading ? <Loader size={size - 2} /> : <IconSparkles size={size} />}
    </ActionIcon>
  </Tooltip>
);
