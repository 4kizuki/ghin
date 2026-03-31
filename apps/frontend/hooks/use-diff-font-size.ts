'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { DiffFontSize } from '@/components/diff-viewer';
import { isDiffFontSize } from '@/components/diff-viewer';

const STORAGE_KEY = 'diff-font-size';
const DEFAULT: DiffFontSize = 'n';

const listeners = new Set<() => void>();

const notify = (): void => {
  for (const l of listeners) l();
};

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = (): DiffFontSize => {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v !== null && isDiffFontSize(v)) return v;
  return DEFAULT;
};

const getServerSnapshot = (): DiffFontSize => DEFAULT;

export const useDiffFontSize = (): [
  DiffFontSize,
  (size: DiffFontSize) => void,
] => {
  const size = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((next: DiffFontSize) => {
    localStorage.setItem(STORAGE_KEY, next);
    notify();
  }, []);

  return [size, update];
};
