import { z } from 'zod';

const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

const workingHoursGridSchema = z
  .array(z.array(z.boolean()).length(HOURS_PER_DAY))
  .length(DAYS_PER_WEEK);

export type WorkingHoursGrid = z.infer<typeof workingHoursGridSchema>;

export type WorkingHours = {
  enabled: boolean;
  grid: WorkingHoursGrid;
};

export const WEEKDAY_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

export function makeDefaultGrid(): WorkingHoursGrid {
  return Array.from({ length: DAYS_PER_WEEK }, (_, day) =>
    Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
      const isWeekday = day >= 1 && day <= 5;
      const isWorkingHour = hour >= 9 && hour < 18;
      return isWeekday && isWorkingHour;
    }),
  );
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  enabled: false,
  grid: makeDefaultGrid(),
};

export function parseWorkingHoursGrid(
  raw: string | null | undefined,
): WorkingHoursGrid {
  if (!raw) return makeDefaultGrid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return makeDefaultGrid();
  }
  const result = workingHoursGridSchema.safeParse(parsed);
  return result.success ? result.data : makeDefaultGrid();
}

export function stringifyWorkingHoursGrid(grid: WorkingHoursGrid): string {
  return JSON.stringify(grid);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

type HourRange = { start: number; end: number };

function findContiguousHourRanges(row: boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let i = 0;
  while (i < row.length) {
    if (!row[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < row.length && row[j]) j++;
    ranges.push({ start: i, end: j });
    i = j;
  }
  return ranges;
}

export type Interval = { start: number; end: number };

export function buildValidIntervals(
  startMs: number,
  endMs: number,
  wh: WorkingHours,
): Interval[] {
  if (startMs >= endMs) return [];
  if (!wh.enabled) return [{ start: startMs, end: endMs }];

  const intervals: Interval[] = [];
  let cursor = startOfDay(new Date(startMs));

  while (cursor.getTime() < endMs) {
    const weekday = cursor.getDay();
    const row = wh.grid[weekday];
    if (row) {
      for (const range of findContiguousHourRanges(row)) {
        const rangeStart = new Date(cursor);
        rangeStart.setHours(range.start, 0, 0, 0);
        const rangeEnd = new Date(cursor);
        rangeEnd.setHours(range.end, 0, 0, 0); // setHours(24) は翌日 00:00 に正規化される
        const s = Math.max(rangeStart.getTime(), startMs);
        const e = Math.min(rangeEnd.getTime(), endMs);
        if (s < e) intervals.push({ start: s, end: e });
      }
    }
    cursor = addDays(cursor, 1);
  }

  return intervals;
}

export function sampleRandomTimes(
  intervals: Interval[],
  count: number,
): number[] {
  const total = intervals.reduce((s, iv) => s + (iv.end - iv.start), 0);
  if (total <= 0 || count <= 0) return [];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total;
    let placed = false;
    for (const iv of intervals) {
      const len = iv.end - iv.start;
      if (r < len) {
        result.push(iv.start + r);
        placed = true;
        break;
      }
      r -= len;
    }
    if (!placed) {
      const last = intervals[intervals.length - 1];
      result.push(last.end - 1);
    }
  }
  return result;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function summarizeWorkingHours(wh: WorkingHours): string | null {
  if (!wh.enabled) return null;
  const lines: string[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    const row = wh.grid[day];
    if (!row) continue;
    const ranges = findContiguousHourRanges(row);
    if (ranges.length === 0) continue;
    const text = ranges
      .map((r) => `${pad2(r.start)}:00–${pad2(r.end)}:00`)
      .join(', ');
    lines.push(`${WEEKDAY_LABELS[day]} ${text}`);
  }
  return lines.length === 0 ? '稼働時間なし' : lines.join(' / ');
}
