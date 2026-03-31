'use client';

import type { FunctionComponent } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export const BackLink: FunctionComponent = () => {
  const router = useRouter();

  return (
    <ActionIcon variant="subtle" color="gray" onClick={() => router.back()}>
      <IconArrowLeft size={20} />
    </ActionIcon>
  );
};
