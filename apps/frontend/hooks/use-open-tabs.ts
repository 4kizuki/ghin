'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { setSetting } from '@/lib/api';
import { OPEN_TAB_IDS_SETTING_KEY } from '@/lib/open-tabs-storage';

let store: string[] | null = null;
let storeInitialized = false;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const l of listeners) l();
};

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const writeStore = (ids: string[]): void => {
  store = ids;
  storeInitialized = true;
  notify();
  void setSetting(OPEN_TAB_IDS_SETTING_KEY, JSON.stringify(ids));
};

export const useOpenTabStore = (initial: string[] | null): string[] | null => {
  const getSnapshot = useCallback(
    (): string[] | null => (storeInitialized ? store : initial),
    [initial],
  );
  const getServerSnapshot = useCallback(
    (): string[] | null => initial,
    [initial],
  );
  useEffect(() => {
    if (!storeInitialized) {
      store = initial;
      storeInitialized = true;
      notify();
    }
  }, [initial]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const useOpenTabActions = (): {
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  setOpenTabs: (ids: string[]) => void;
} => {
  const openTab = useCallback((id: string) => {
    const current = store ?? [];
    if (!current.includes(id)) {
      writeStore([...current, id]);
    }
  }, []);

  const closeTab = useCallback((id: string) => {
    const current = store ?? [];
    writeStore(current.filter((v) => v !== id));
  }, []);

  const setOpenTabs = useCallback((ids: string[]) => {
    writeStore(ids);
  }, []);

  return { openTab, closeTab, setOpenTabs };
};
