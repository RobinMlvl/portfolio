/**
 * The commit history shown in the hero: every commit of every product on one timeline, as
 * written by tools/commits.mjs into public/commits/all.json. Pure helpers: the timeline (one
 * column per day; on a history longer than MAX_COLUMNS days, the oldest days gathered in one
 * first column, drawn behind an axis break), which commit sits under the pointer, how a row reads.
 */

/** day since the first commit, HH:MM, short hash, subject, product (index in `repos`) */
export type Commit = [day: number, time: string, hash: string, subject: string, repo: number];

export type RepoRef = { slug: string; name: string; branch: string; total: number };

export type History = {
  repos: RepoRef[];
  first: string;
  last: string;
  days: number;
  total: number;
  /** in the order of the clock */
  commits: Commit[];
};

/** One colour per product, in the order of `repos`. */
export const REPO_COLOR = ['#ECEDEE', '#F2B544', '#7EE0A1'];

/** At most this many columns: one per day for the most recent days, the rest in the first column. */
export const MAX_COLUMNS = 120;

export type Timeline = {
  columns: number;
  /** days gathered in the first column (0 when every day has its own column) */
  earlier: number;
  /** index of the first commit of each column, plus the total at the end */
  start: number[];
  count: number[];
  tallest: number;
};

export function columnOfDay(earlier: number, day: number): number {
  return earlier ? (day < earlier ? 0 : day - earlier + 1) : day;
}

export function timelineOf(h: Pick<History, 'days' | 'commits'>): Timeline {
  const earlier = h.days > MAX_COLUMNS ? h.days - (MAX_COLUMNS - 1) : 0;
  const columns = earlier ? MAX_COLUMNS : Math.max(1, h.days);
  const count = new Array<number>(columns).fill(0);
  for (const c of h.commits) count[columnOfDay(earlier, c[0])]++;
  const start = [0];
  for (let i = 0; i < columns; i++) start.push(start[i] + count[i]);
  return { columns, earlier, start, count, tallest: Math.max(1, ...count) };
}

/** Only the commits of one product, on the same days (the axis does not move). */
export function onlyRepo(h: History, repo: number): History {
  const commits = h.commits.filter((c) => c[4] === repo);
  return { ...h, commits, total: commits.length };
}

/** The column a commit belongs to. */
export function columnOf(t: Timeline, index: number): number {
  let lo = 0, hi = t.columns - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t.start[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/**
 * The commit under the pointer: `fraction` is the height inside the column's stack, 0 at its
 * top, 1 at its bottom (clamped). Null for an empty column.
 */
export function pick(t: Timeline, column: number, fraction: number): number | null {
  const n = t.count[column];
  if (!n) return null;
  return t.start[column] + Math.min(n - 1, Math.max(0, Math.floor(fraction * n)));
}

const DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The calendar day `day` days after `first` (YYYY-MM-DD), as a UTC date. */
export function dateOf(first: string, day: number): Date {
  return new Date(Date.parse(`${first}T00:00:00Z`) + day * DAY);
}

/** 22 Jul 2026 */
export function dayLabel(first: string, day: number): string {
  const d = dateOf(first, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The days a column covers: one day, or "15 Oct 2025 to 7 Jun 2026" for the gathered first column. */
export function columnLabel(first: string, t: Timeline, column: number): string {
  if (t.earlier && column === 0) return `${dayLabel(first, 0)} to ${dayLabel(first, t.earlier - 1)}`;
  return dayLabel(first, t.earlier ? t.earlier + column - 1 : column);
}

/** The first day of each month that has its own column, for the axis. */
export function monthStarts(h: Pick<History, 'first' | 'days'>, t: Timeline): { column: number; label: string }[] {
  const out: { column: number; label: string }[] = [];
  for (let d = Math.max(1, t.earlier); d < h.days; d++) {
    const date = dateOf(h.first, d);
    if (date.getUTCDate() === 1) out.push({ column: columnOfDay(t.earlier, d), label: MONTHS[date.getUTCMonth()].toUpperCase() });
  }
  return out;
}

/** "fix(booking): keep the hold" → prefix "fix(booking)", rest "keep the hold". */
export function splitSubject(subject: string): { prefix: string | null; rest: string } {
  const m = subject.match(/^([A-Za-z]+(?:\([^)]*\))?!?):\s*(.*)$/);
  return m ? { prefix: m[1], rest: m[2] } : { prefix: null, rest: subject };
}

/**
 * The rows of the log: inside the hovered column, a window around the hovered commit;
 * otherwise the last `rows` commits up to the current one.
 */
export function logWindow(t: Timeline, index: number, column: number | null, rows: number): [from: number, to: number] {
  if (column !== null) {
    const a = t.start[column], b = t.start[column + 1];
    const from = Math.min(Math.max(a, index - Math.floor(rows / 2)), Math.max(a, b - rows));
    return [from, Math.min(b, from + rows)];
  }
  const from = Math.max(0, index - rows + 1);
  return [from, index + 1];
}
