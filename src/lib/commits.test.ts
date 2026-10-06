import { describe, it, expect } from 'vitest';
import { columnLabel, columnOf, dayLabel, lastDays, logWindow, monthStarts, onlyRepo, periodOf, pick, splitSubject, timelineOf, weeklyCounts, type Commit, type History } from '@/lib/commits';

const c = (day: number, i: number, repo = 0): Commit => [day, '10:00', `h${i}`, `feat: commit ${i}`, repo];
// day 0: 3 commits, day 1: none, day 2: 1 commit
const short = { first: '2026-07-05', days: 3, commits: [c(0, 0), c(0, 1), c(0, 2), c(2, 3)] };

describe('timelineOf', () => {
  it('makes one column per day and counts the commits of each', () => {
    const t = timelineOf(short);
    expect(t).toMatchObject({ columns: 3, earlier: 0, count: [3, 0, 1], start: [0, 3, 3, 4], tallest: 3 });
  });
  it('on a long history, keeps one column per day for the last 119 days and gathers the rest in the first', () => {
    const t = timelineOf({ days: 355, commits: [c(0, 0), c(235, 1), c(236, 2), c(354, 3)] });
    expect(t.earlier).toBe(236);
    expect(t.columns).toBe(120);
    expect(t.count[0]).toBe(2); // days 0 to 235
    expect(t.count[1]).toBe(1); // day 236, the first with its own column
    expect(t.count[119]).toBe(1); // the last day
  });
});

describe('lastDays', () => {
  it('keeps every column when each is one day', () => {
    expect(lastDays(timelineOf(short))).toEqual({ from: 0, days: 3, commits: 4, tallest: 3 });
  });
  it('leaves out the gathered first column, its commits and its height', () => {
    const t = timelineOf({ days: 355, commits: [c(0, 0), c(1, 1), c(2, 2), c(236, 3), c(354, 4)] });
    expect(lastDays(t)).toEqual({ from: 1, days: 119, commits: 2, tallest: 1 });
  });
});

describe('onlyRepo', () => {
  it('keeps the commits of one product on the same days', () => {
    const h: History = { repos: [], first: '2026-07-05', last: '2026-07-07', days: 3, total: 4, commits: [c(0, 0, 0), c(0, 1, 1), c(2, 2, 1), c(2, 3, 0)] };
    const one = onlyRepo(h, 1);
    expect(one.commits.map((x) => x[2])).toEqual(['h1', 'h2']);
    expect([one.total, one.days]).toEqual([2, 3]);
  });
});

describe('pick and columnOf', () => {
  const t = timelineOf(short);
  it('finds the commit under the pointer inside a column, top to bottom', () => {
    expect(pick(t, 0, 0)).toBe(0);
    expect(pick(t, 0, 0.5)).toBe(1);
    expect(pick(t, 0, 1)).toBe(2);
    expect(pick(t, 0, -3)).toBe(0);
  });
  it('has nothing to pick in an empty day', () => {
    expect(pick(t, 1, 0.5)).toBeNull();
  });
  it('finds the column of a commit, skipping empty days', () => {
    expect([0, 1, 2, 3].map((i) => columnOf(t, i))).toEqual([0, 0, 0, 2]);
  });
});

describe('labels', () => {
  const long = timelineOf({ days: 355, commits: [] });
  it('writes a day without any separator character', () => {
    expect(dayLabel('2026-07-05', 17)).toBe('22 Jul 2026');
  });
  it('writes the days of the gathered first column, then one day per column', () => {
    expect(columnLabel('2025-10-15', long, 0)).toBe('15 Oct 2025 to 7 Jun 2026');
    expect(columnLabel('2025-10-15', long, 1)).toBe('8 Jun 2026');
    expect(columnLabel('2025-10-15', long, 119)).toBe('4 Oct 2026');
  });
  it('marks the months that have their own columns', () => {
    expect(monthStarts({ first: '2025-10-15', days: 355 }, long).map((m) => m.label)).toEqual(['JUL', 'AUG', 'SEP', 'OCT']);
    expect(monthStarts({ first: '2026-07-05', days: 92 }, timelineOf({ days: 92, commits: [] })).map((m) => m.label)).toEqual(['AUG', 'SEP', 'OCT']);
  });
  it('splits the conventional prefix from the message', () => {
    expect(splitSubject('fix(booking): keep the hold')).toEqual({ prefix: 'fix(booking)', rest: 'keep the hold' });
    expect(splitSubject('Wave 0: scaffold')).toEqual({ prefix: null, rest: 'Wave 0: scaffold' });
    expect(splitSubject('Merge branch main')).toEqual({ prefix: null, rest: 'Merge branch main' });
  });
});

describe('logWindow', () => {
  const t = timelineOf({ days: 2, commits: Array.from({ length: 30 }, (_, i) => c(i < 20 ? 0 : 1, i)) });
  it('keeps the rows inside the hovered day, around the hovered commit', () => {
    expect(logWindow(t, 10, 0, 6)).toEqual([7, 13]);
    expect(logWindow(t, 1, 0, 6)).toEqual([0, 6]);
    expect(logWindow(t, 19, 0, 6)).toEqual([14, 20]);
  });
  it('shows the last rows up to the current commit while playing', () => {
    expect(logWindow(t, 25, null, 6)).toEqual([20, 26]);
    expect(logWindow(t, 2, null, 6)).toEqual([0, 3]);
  });
});

describe('periodOf', () => {
  it('says since when while commits still come in', () => {
    expect(periodOf({ first: '2026-07-05', last: '2026-10-05', generated: '2026-10-06' })).toBe('Since Jul 2026');
  });
  it('gives both ends once a product went quiet, the year once when it is the same', () => {
    expect(periodOf({ first: '2025-02-22', last: '2025-07-07', generated: '2026-10-06' })).toBe('Feb to Jul 2025');
    expect(periodOf({ first: '2025-10-15', last: '2026-08-29', generated: '2026-10-06' })).toBe('Oct 2025 to Aug 2026');
  });
});

describe('weeklyCounts', () => {
  it('counts one product\'s commits week by week over its own span', () => {
    const h = { commits: [c(3, 0, 1), c(3, 1, 0), c(4, 2, 1), c(17, 3, 1)] };
    expect(weeklyCounts(h, 1)).toEqual([2, 0, 1]); // days 3 to 9, 10 to 16, 17
    expect(weeklyCounts(h, 0)).toEqual([1]);
    expect(weeklyCounts(h, 2)).toEqual([]);
  });
});
