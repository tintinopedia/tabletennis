import type { Catalog, Day, Level, TestDef } from "./plan";
import type { SessionEntry, SessionMap } from "./store";

type TestIdx = Record<string, TestDef & { owner: string }>;

export const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", opts);

export function completed(m: SessionMap): SessionEntry[] {
  return Object.values(m)
    .filter((s) => s.status === "complete")
    .sort((a, b) => a.day - b.day);
}

/** First day that is not yet complete (days.length + 1 when everything planned is done) */
export function currentDay(m: SessionMap, days: Day[]): number {
  for (const d of days) if (m[d.day]?.status !== "complete") return d.day;
  return days.length + 1;
}

export function isMet(t: TestDef | undefined, score: number): boolean | null {
  if (!t || t.target == null) return null;
  return t.direction === "low" ? score <= t.target : score >= t.target;
}

/* ----------------------------- test log ---------------------------- */
export type TestRow = { day: number; date: string; code: string; level: Level; score: number; target: number | null; met: boolean | null };
export function testLog(m: SessionMap, tests: TestIdx): TestRow[] {
  const rows: TestRow[] = [];
  for (const s of completed(m)) {
    for (const [code, t] of Object.entries(s.tests || {})) {
      const def = tests[code];
      if (t.score == null || !def) continue;
      rows.push({ day: s.day, date: s.trainingDate, code, level: t.level, score: t.score, target: def.target, met: isMet(def, t.score) });
    }
  }
  return rows;
}

export type DrillStat = {
  code: string;
  name: string;
  def: TestDef;
  attempts: number;
  latest: number | null;
  latestLevel: Level | null;
  best: number | null;
  first: number | null;
  passRate: number | null;
  series: TestRow[];
  levelUp: boolean;
};
export function drillStats(m: SessionMap, tests: TestIdx): DrillStat[] {
  const log = testLog(m, tests);
  return Object.values(tests).map((t) => {
    const series = log.filter((r) => r.code === t.code);
    const scores = series.map((r) => r.score);
    const latestRow = series[series.length - 1];
    const graded = series.filter((r) => r.met != null);
    const atLevel = latestRow ? series.filter((r) => r.level === latestRow.level).slice(-2) : [];
    return {
      code: t.code,
      name: t.name,
      def: t,
      attempts: series.length,
      latest: latestRow?.score ?? null,
      latestLevel: latestRow?.level ?? null,
      best: scores.length ? (t.direction === "low" ? Math.min(...scores) : Math.max(...scores)) : null,
      first: scores[0] ?? null,
      passRate: graded.length ? graded.filter((r) => r.met).length / graded.length : null,
      series,
      levelUp: t.levels && atLevel.length === 2 && atLevel.every((r) => r.met) && latestRow?.level !== "Advanced",
    };
  });
}

/* ------------------------------ minutes ---------------------------- */
export function minutesOf(s: SessionEntry, day: Day | undefined, cat: Catalog) {
  const out = { table: 0, physical: 0, mental: 0, journal: false };
  if (!day) return out;
  day.items.forEach((it, i) => {
    if (s.items?.[String(i)] !== "done") return;
    const kind = cat[it.code]?.kind ?? "table";
    out[kind] += it.minutes || 0;
    if (/^M1/.test(it.code)) out.journal = true;
  });
  return out;
}

export function totals(m: SessionMap, days: Day[], cat: Catalog, tests: TestIdx) {
  const done = completed(m);
  let mins = 0;
  for (const s of done) {
    const c = minutesOf(s, days[s.day - 1], cat);
    mins += c.table + c.physical + c.mental;
  }
  const log = testLog(m, tests).filter((r) => r.met != null);
  const dates = new Set(done.map((s) => s.trainingDate));
  let streak = 0;
  const sortedDates = [...dates].sort();
  const last = sortedDates[sortedDates.length - 1];
  if (last) {
    const d = new Date(last + "T00:00:00");
    while (dates.has(toIso(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }
  return {
    sessions: done.length,
    hours: mins / 60,
    passRate: log.length ? log.filter((r) => r.met).length / log.length : null,
    tests: log.length,
    streak,
    firstDate: sortedDates[0] ?? null,
    lastDate: last ?? null,
    trainingDays: dates.size,
  };
}

/* ------------------------------ periods ---------------------------- */
export const PERIODS = ["week", "month", "quarter", "half", "year"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABEL: Record<Period, string> = { week: "Weekly", month: "Monthly", quarter: "Quarterly", half: "Half-yearly", year: "Yearly" };

export function periodKey(iso: string, p: Period): string {
  const d = new Date(iso + "T00:00:00");
  const y = d.getFullYear();
  const mo = d.getMonth();
  if (p === "week") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toIso(d);
  }
  if (p === "month") return `${y}-${String(mo + 1).padStart(2, "0")}`;
  if (p === "quarter") return `${y}-Q${Math.floor(mo / 3) + 1}`;
  if (p === "half") return `${y}-H${mo < 6 ? 1 : 2}`;
  return String(y);
}
export function periodLabel(key: string, p: Period): string {
  if (p === "week") return fmtDate(key);
  if (p === "month") return new Date(key + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  if (p === "quarter" || p === "half") {
    const [y, q] = key.split("-");
    return `${q} ${y}`;
  }
  return key;
}

export type VolumeRow = { key: string; label: string; table: number; physical: number; mental: number; sessions: number; matches: number; journalDays: number };
export function volumeByPeriod(m: SessionMap, days: Day[], cat: Catalog, p: Period): VolumeRow[] {
  const map = new Map<string, VolumeRow>();
  for (const s of completed(m)) {
    if (!s.trainingDate) continue;
    const k = periodKey(s.trainingDate, p);
    const r = map.get(k) ?? { key: k, label: periodLabel(k, p), table: 0, physical: 0, mental: 0, sessions: 0, matches: 0, journalDays: 0 };
    const c = minutesOf(s, days[s.day - 1], cat);
    r.table += c.table / 60;
    r.physical += c.physical / 60;
    r.mental += c.mental / 60;
    r.sessions += 1;
    r.matches += s.matches || 0;
    r.journalDays += c.journal ? 1 : 0;
    map.set(k, r);
  }
  return [...map.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => ({ ...r, table: +r.table.toFixed(2), physical: +r.physical.toFixed(2), mental: +r.mental.toFixed(2) }));
}

export type DrillPeriodRow = { key: string; label: string; avg: number; best: number; tests: number; passRate: number | null };
export function drillByPeriod(series: TestRow[], def: TestDef, p: Period): DrillPeriodRow[] {
  const map = new Map<string, TestRow[]>();
  for (const r of series) {
    const k = periodKey(r.date, p);
    (map.get(k) ?? map.set(k, []).get(k)!).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, rows]) => {
      const sc = rows.map((r) => r.score);
      const graded = rows.filter((r) => r.met != null);
      return {
        key: k,
        label: periodLabel(k, p),
        avg: +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(2),
        best: def.direction === "low" ? Math.min(...sc) : Math.max(...sc),
        tests: rows.length,
        passRate: graded.length ? graded.filter((r) => r.met).length / graded.length : null,
      };
    });
}

/* ---------------------------- heart rate --------------------------- */
export type HrRow = { day: number; date: string; code: string; hr: number; baseline: number | null; spike: boolean; delta: number | null };
/** A reading is a spike when it is 12+ bpm (or 8%+) above the average of that drill's previous readings, or 200+ bpm. */
export function heartRates(m: SessionMap): Record<string, HrRow[]> {
  const out: Record<string, HrRow[]> = {};
  for (const s of completed(m)) {
    for (const [code, hr] of Object.entries(s.hr || {})) {
      if (hr == null || !(hr > 0)) continue;
      const prev = out[code] ?? (out[code] = []);
      const window = prev.slice(-6).map((r) => r.hr);
      const baseline = window.length >= 3 ? window.reduce((a, b) => a + b, 0) / window.length : null;
      const delta = baseline == null ? null : hr - baseline;
      const spike = hr >= 200 || (delta != null && delta >= Math.max(12, baseline! * 0.08));
      prev.push({ day: s.day, date: s.trainingDate, code, hr, baseline: baseline == null ? null : Math.round(baseline), spike, delta: delta == null ? null : Math.round(delta) });
    }
  }
  return out;
}
export type HrPeriodRow = { key: string; label: string; avg: number; peak: number; readings: number; spikes: number };
export function hrByPeriod(rows: HrRow[], p: Period): HrPeriodRow[] {
  const map = new Map<string, HrRow[]>();
  for (const r of rows) {
    const k = periodKey(r.date, p);
    (map.get(k) ?? map.set(k, []).get(k)!).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, rs]) => ({
      key: k,
      label: periodLabel(k, p),
      avg: Math.round(rs.reduce((a, r) => a + r.hr, 0) / rs.length),
      peak: Math.max(...rs.map((r) => r.hr)),
      readings: rs.length,
      spikes: rs.filter((r) => r.spike).length,
    }));
}
