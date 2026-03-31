'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'open-tab-ids';

const listeners = new Set<() => void>();

const notify = (): void => {
  for (const l of listeners) l();
};

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

let cachedRaw: string | null = null;
let cachedResult: string[] | null = null;

const readStore = (): string[] | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedResult;
  cachedRaw = raw;
  if (raw === null) {
    cachedResult = null;
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedResult = null;
      return null;
    }
    if (!parsed.every((v): v is string => typeof v === 'string')) {
      cachedResult = null;
      return null;
    }
    cachedResult = parsed;
    return parsed;
  } catch {
    cachedResult = null;
    return null;
  }
};

const getSnapshot = (): string[] | null => readStore();

const getServerSnapshot = (): string[] | null => null;

const writeStore = (ids: string[]): void => {
  const raw = JSON.stringify(ids);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedResult = ids;
  notify();
};

export const useOpenTabStore = (): string[] | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export const useOpenTabActions = (): {
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  setOpenTabs: (ids: string[]) => void;
} => {
  const openTab = useCallback((id: string) => {
    const current = readStore() ?? [];
    if (!current.includes(id)) {
      writeStore([...current, id]);
    }
  }, []);

  const closeTab = useCallback((id: string) => {
    const current = readStore() ?? [];
    writeStore(current.filter((v) => v !== id));
  }, []);

  const setOpenTabs = useCallback((ids: string[]) => {
    writeStore(ids);
  }, []);

  return { openTab, closeTab, setOpenTabs };
};
