'use client';

import type { AnchorProps } from '@mantine/core';
import { Anchor } from '@mantine/core';
import Link from 'next/link';
import type { ComponentProps, FunctionComponent } from 'react';

export const LinkAnchor: FunctionComponent<
  AnchorProps & Omit<ComponentProps<typeof Link>, 'className' | 'style'>
> = (props) => {
  return <Anchor component={Link} {...props} />;
};
