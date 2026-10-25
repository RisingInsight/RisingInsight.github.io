import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface HeatmapWeek {
  days: HeatmapDay[];
  month: string;
}

export interface CommitActivity {
  weeks: HeatmapWeek[];
  totalYear: number;
  totalAll: number;
  lastCommit: string | null;
  currentStreak: number;
  longestStreak: number;
}

function runGit(args: string[]): string {
  const roots = [...new Set([process.cwd(), PROJECT_ROOT])];
  let lastError: unknown;
  for (const cwd of roots) {
    try {
      return execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function levelFor(count: number): HeatmapDay['level'] {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function getCommitActivity(): CommitActivity {
  let dates: string[] = [];
  let totalAll = 0;
  let lastCommit: string | null = null;

  try {
    // %aI preserves the author's own timezone, so a late-night commit in UTC+8
    // still lands on the correct local day when this runs in UTC CI.
    const raw = runGit(['log', '--format=%aI', 'HEAD']);
    dates = raw ? raw.split('\n').map((line) => line.slice(0, 10)).filter(Boolean) : [];
    totalAll = Number(runGit(['rev-list', '--count', 'HEAD'])) || 0;
    const latest = runGit(['log', '-1', '--format=%aI']);
    lastCommit = latest ? latest.slice(0, 10) : null;
  } catch {
    dates = [];
  }

  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayKey = toKey(today);

  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - 52 * 7);

  const days: HeatmapDay[] = [];
  const weeks: HeatmapWeek[] = [];
  let totalYear = 0;

  for (let weekIndex = 0; weekIndex < 53; weekIndex++) {
    const weekDays: HeatmapDay[] = [];
    let month = '';
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(start);
      date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
      const key = toKey(date);
      const future = key > todayKey;
      const count = future ? 0 : counts.get(key) ?? 0;
      if (!future) totalYear += count;
      if (date.getDate() === 1) {
        month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      }
      weekDays.push({ date: key, count, level: levelFor(count), future });
    }
    days.push(...weekDays);
    weeks.push({ days: weekDays, month });
  }

  // 首周可能不包含某月 1 号，补一个月份标签，避免热力图开头没有月份
  if (weeks.length > 0 && !weeks[0].month) {
    weeks[0].month = start
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
  }

  const pastDays = days.filter((day) => !day.future);
  let longestStreak = 0;
  let running = 0;
  for (const day of pastDays) {
    if (day.count > 0) {
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  let cursor = pastDays.length - 1;
  if (cursor >= 0 && pastDays[cursor].count === 0) cursor--;
  while (cursor >= 0 && pastDays[cursor].count > 0) {
    currentStreak++;
    cursor--;
  }

  return {
    weeks,
    totalYear,
    totalAll,
    lastCommit,
    currentStreak,
    longestStreak,
  };
}
