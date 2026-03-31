import { useEffect, useRef } from 'react';

export const usePolling = (
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const start = (): NodeJS.Timeout => {
      callbackRef.current();
      return setInterval(() => callbackRef.current(), intervalMs);
    };

    let id = start();

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        clearInterval(id);
      } else {
        id = start();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
};
