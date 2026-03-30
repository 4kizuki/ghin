import { useEffect } from 'react';

type ShortcutHandler = {
  key: string;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
};

export const useKeyboardShortcuts = (
  shortcuts: ShortcutHandler[],
  enabled: boolean = true,
): void => {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        // Only allow meta shortcuts in input fields
        if (!e.metaKey && !e.ctrlKey) return;
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          shiftMatch
        ) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, enabled]);
};
