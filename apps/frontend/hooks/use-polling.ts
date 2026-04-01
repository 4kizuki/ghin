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

    const start = (ms: number): NodeJS.Timeout => {
      callbackRef.current();
      return setInterval(() => callbackRef.current(), ms);
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

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs, inactiveIntervalMs]);
};
