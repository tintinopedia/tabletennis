import { DAYS, TEST_CODES, TEST_BY_CODE, categoryOf, isJournalCode, HR_CODES, type Level } from "./plan";
import type { SessionMap, SessionEntry } from "./store";

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());

export type TestRow = { day: number; date: string; code: string; level: Level; score: number; target: number | null; met: boolean | null };

export function completed(m: SessionMap): SessionEntry[] {
  return Object.values(m)
    .filter((s) => s.status === "complete")
    .sort((a, b) => a.day - b.day);
}

export function currentDay(m: SessionMap): number {
  for (const d of DAYS) if (m[d.day]?.status !== "complete") return d.day;
  return DAYS.length + 1;
}

export function isMet(code: string, score: number): boolean | null {
  const t = TEST_BY_CODE[code];
  if (!t || t.target == null) return null;
  return t.direction === "low" ? score <= t.target : score >= t.target;
}

export function testLog(m: SessionMap): TestRow[] {
  const rows: TestRow[] = [];
  for (const s of completed(m)) {
    for (const [code, t] of Object.entries(s.tests || {})) {
      if (t.score == null || !TEST_BY_CODE[code]) continue;
      rows.push({ day: s.day, date: s.trainingDate, code, level: t.level, score: t.score, target: TEST_BY_CODE[code].target, met: isMet(code, t.score) });
    }
  }
  return rows;
}

export type DrillStat = {
  code: string;
  name: string;
  attempts: number;
  latest: number | null;
  latestLevel: Level | null;
  best: number | null;
  target: number | null;
  passRate: number | null;
  direction: "high" | "low";
  series: TestRow[];
  levelUp: boolean;
  first: number | null;
};

export function drillStats(m: SessionMap): DrillStat[] {
  const log = testLog(m);
  return TEST_CODES.map((t) => {
    const series = log.filter((r) => r.code === t.code);
    const scores = series.map((r) => r.score);
    const latestRow = series[series.length - 1];
    const best = scores.length ? (t.direction === "low" ? Math.min(...scores) : Math.max(...scores)) : null;
    const graded = series.filter((r) => r.met != null);
    const atLevel = latestRow ? series.filter((r) => r.level === latestRow.level).slice(-2) : [];
    return {
      code: t.code,
      name: t.name,
      attempts: series.length,
      latest: latestRow?.score ?? null,
      latestLevel: latestRow?.level ?? null,
      best,
      target: t.target,
      passRate: graded.length ? graded.filter((r) => r.met).length / graded.length : null,
      direction: t.direction,
      series,
      levelUp: atLevel.length === 2 && atLevel.every((r) => r.met) && latestRow?.level !== "Advanced",
      first: scores[0] ?? null,
    };
  });
}

export function minutesByCategory(s: SessionEntry) {
  const plan = DAYS[s.day - 1];
  const out = { table: 0, physical: 0, mental: 0, journal: false };
  plan.items.forEach((it, i) => {
    if (s.items?.[String(i)] !== "done") return;
    out[categoryOf(it.code)] += it.minutes;
    if (isJournalCode(it.code)) out.journal = true;
  });
  return out;
}

function mondayOf(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return toIso(d);
}

export type WeekRow = { week: string; table: number; physical: number; matches: number; journalDays: number; sessions: number };
export function weeklyVolume(m: SessionMap): WeekRow[] {
  const map = new Map<string, WeekRow>();
  for (const s of completed(m)) {
    if (!s.trainingDate) continue;
    const w = mondayOf(s.trainingDate);
    const r = map.get(w) ?? { week: w, table: 0, physical: 0, matches: 0, journalDays: 0, sessions: 0 };
    const c = minutesByCategory(s);
    r.table += c.table / 60;
    r.physical += c.physical / 60;
    r.matches += s.matches || 0;
    r.journalDays += c.journal ? 1 : 0;
    r.sessions += 1;
    map.set(w, r);
  }
  return [...map.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((r) => ({ ...r, table: +r.table.toFixed(2), physical: +r.physical.toFixed(2) }));
}

export function totals(m: SessionMap) {
  const done = completed(m);
  let mins = 0;
  for (const s of done) {
    const c = minutesByCategory(s);
    mins += c.table + c.physical + c.mental;
  }
  const log = testLog(m).filter((r) => r.met != null);
  const dates = new Set(done.map((s) => s.trainingDate));
  let streak = 0;
  const last = done[done.length - 1]?.trainingDate;
  if (last) {
    const d = new Date(last + "T00:00:00");
    while (dates.has(toIso(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }
  return {
    sessions: done.length,
    trainingSessions: done.filter((s) => DAYS[s.day - 1].duration > 0).length,
    hours: mins / 60,
    passRate: log.length ? log.filter((r) => r.met).length / log.length : null,
    tests: log.length,
    streak,
    lastDate: last ?? null,
  };
}

export type HrRow = { day: number; date: string; hr: number };
export function heartRates(m: SessionMap): Record<string, HrRow[]> {
  const out: Record<string, HrRow[]> = Object.fromEntries(HR_CODES.map((c) => [c, []]));
  for (const s of completed(m)) {
    for (const [code, hr] of Object.entries(s.hr || {})) {
      if (hr != null && out[code]) out[code].push({ day: s.day, date: s.trainingDate, hr });
    }
  }
  return out;
}

export function daysUntil(iso: string) {
  const t = new Date(iso + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((t - now.getTime()) / 86400000);
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", opts);
