import { useEffect, useRef } from 'react';

export const usePolling = (
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
  inactiveIntervalMs?: number,
): void => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let lastRunAt = 0;

    const run = (): void => {
      const now = Date.now();
      if (now - lastRunAt < 1_000) return;
      lastRunAt = now;
      callbackRef.current();
    };

    const start = (ms: number): NodeJS.Timeout => {
      run();
      return setInterval(run, ms);
    };

    let id = start(intervalMs);

    const onVisibilityChange = (): void => {
      clearInterval(id);
      if (document.hidden) {
        if (inactiveIntervalMs !== undefined) {
          id = start(inactiveIntervalMs);
        }
      } else {
        id = start(intervalMs);
      }
    };

    const onFocus = (): void => {
      if (document.hidden) return;
      clearInterval(id);
      id = start(intervalMs);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, intervalMs, inactiveIntervalMs]);
};
