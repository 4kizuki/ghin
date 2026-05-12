'use client';

import type { FunctionComponent } from 'react';
import { useRef, useEffect } from 'react';
import { Box, Stack, Group, Text } from '@mantine/core';
import { WEEKDAY_LABELS, type WorkingHoursGrid } from '@/lib/working-hours';

const CELL_WIDTH = 22;
const CELL_HEIGHT = 22;
const LABEL_WIDTH = 40;

export const WorkingHoursGridEditor: FunctionComponent<{
  grid: WorkingHoursGrid;
  disabled?: boolean;
  onChange: (grid: WorkingHoursGrid) => void;
}> = ({ grid, disabled = false, onChange }) => {
  const draggingRef = useRef<{ mode: boolean } | null>(null);

  const setCell = (day: number, hour: number, value: boolean) => {
    const current = grid[day]?.[hour];
    if (current === value || current === undefined) return;
    const next = grid.map((row, di) =>
      di === day ? row.map((v, hi) => (hi === hour ? value : v)) : row,
    );
    onChange(next);
  };

  useEffect(() => {
    const stop = () => {
      draggingRef.current = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const handlePointerDown = (day: number, hour: number) => {
    if (disabled) return;
    const current = grid[day]?.[hour] ?? false;
    const mode = !current;
    draggingRef.current = { mode };
    setCell(day, hour, mode);
  };

  const handlePointerEnter = (day: number, hour: number) => {
    if (disabled || !draggingRef.current) return;
    setCell(day, hour, draggingRef.current.mode);
  };

  return (
    <Box style={{ userSelect: 'none', touchAction: 'none' }}>
      <Group gap={0} wrap="nowrap" align="center">
        <Box style={{ width: LABEL_WIDTH }} />
        {Array.from({ length: 24 }, (_, h) => (
          <Box
            key={h}
            style={{
              width: CELL_WIDTH,
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--mantine-color-dimmed)',
              lineHeight: 1,
              paddingBottom: 4,
            }}
          >
            {h}
          </Box>
        ))}
      </Group>
      <Stack gap={2}>
        {grid.map((row, day) => (
          <Group key={day} gap={0} wrap="nowrap" align="center">
            <Box style={{ width: LABEL_WIDTH }}>
              <Text size="xs" c={disabled ? 'dimmed' : undefined}>
                {WEEKDAY_LABELS[day]}
              </Text>
            </Box>
            {row.map((cell, hour) => (
              <Box
                key={hour}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePointerDown(day, hour);
                }}
                onPointerEnter={() => handlePointerEnter(day, hour)}
                style={{
                  width: CELL_WIDTH,
                  height: CELL_HEIGHT,
                  backgroundColor: cell
                    ? disabled
                      ? 'var(--mantine-color-gray-4)'
                      : 'var(--mantine-color-violet-5)'
                    : 'var(--mantine-color-gray-1)',
                  border: '1px solid var(--mantine-color-gray-3)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </Group>
        ))}
      </Stack>
    </Box>
  );
};
