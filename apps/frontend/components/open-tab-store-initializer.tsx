'use client';

import type { FunctionComponent } from 'react';
import { initOpenTabStore } from '@/hooks/use-open-tabs';

export const OpenTabStoreInitializer: FunctionComponent<{
  initial: string[] | null;
}> = ({ initial }) => {
  initOpenTabStore(initial);
  return null;
};
