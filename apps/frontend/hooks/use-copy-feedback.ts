import { useState, useCallback, useRef } from 'react';

export const useCopyFeedback = () => {
  const [copyFeedback, setCopyFeedback] = useState<{
    x: number;
    y: number;
    fading: boolean;
  } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyFadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showCopyFeedback = useCallback((e: React.MouseEvent, text: string) => {
    navigator.clipboard.writeText(text);
    clearTimeout(copyTimerRef.current);
    clearTimeout(copyFadeRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setCopyFeedback({ x: rect.right + 4, y: rect.bottom - 4, fading: false });
    copyFadeRef.current = setTimeout(
      () =>
        setCopyFeedback((prev) => (prev ? { ...prev, fading: true } : null)),
      250,
    );
    copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 750);
  }, []);

  return { copyFeedback, showCopyFeedback };
};
