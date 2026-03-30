import { useEffect, useCallback } from 'react';

export const usePolling = (
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
): void => {
  useEffect(() => {
    if (!enabled) return;

    callback();
    const id = setInterval(callback, intervalMs);

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        clearInterval(id);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);
};
