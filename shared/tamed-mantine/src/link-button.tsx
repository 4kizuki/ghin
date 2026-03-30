'use client';

import type { ButtonProps } from '@mantine/core';
import { Button } from '@mantine/core';
import Link from 'next/link';
import type { ComponentProps, FunctionComponent } from 'react';

export const LinkButton: FunctionComponent<
  ButtonProps & Omit<ComponentProps<typeof Link>, 'className' | 'style'>
> = (props) => {
  return <Button component={Link} {...props} />;
};
