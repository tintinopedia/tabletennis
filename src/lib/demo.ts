import { BUILTIN_CATALOG, PLAN_DAYS, type Level } from "./plan";
import type { SessionEntry } from "./store";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Sample data for preview mode only (NEXT_PUBLIC_DEMO=1). */
export function demoSessions(completeUpTo = 140): Record<string, SessionEntry> {
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: Record<string, SessionEntry> = {};
  const lastPlanned = new Date(PLAN_DAYS[completeUpTo - 1].plannedDate + "T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const shift = Math.round((yesterday.getTime() - lastPlanned.getTime()) / 86400000);
  for (const d of PLAN_DAYS.slice(0, completeUpTo)) {
    const p = d.day / completeUpTo;
    const dt = new Date(d.plannedDate + "T00:00:00");
    dt.setDate(dt.getDate() + shift);
    const e: SessionEntry = {
      day: d.day,
      status: "complete",
      trainingDate: iso(dt),
      items: {},
      tests: {},
      hr: {},
      matches: /Match|Sparring|TOURNAMENT|Tune/i.test(d.sessionType) ? 2 + Math.floor(rnd() * 3) : 0,
      notes: "",
    };
    d.items.forEach((it, i) => {
      e.items[String(i)] = rnd() < 0.05 ? "skipped" : "done";
      if (e.items[String(i)] !== "done") return;
      const def = BUILTIN_CATALOG[it.code];
      for (const t of def?.tests ?? []) {
        const level: Level = p > 0.65 && !t.code.startsWith("D8") ? "Competitor" : "Foundation";
        let score: number;
        if (t.code === "D7") score = Math.max(0, Math.round(7 - 5 * p + rnd() * 2.5));
        else if (t.code === "P-505") score = +(3.4 - 0.35 * p + rnd() * 0.1).toFixed(2);
        else if (t.code === "P-HEX") score = +(14.8 - 1.6 * p + rnd() * 0.4).toFixed(2);
        else if (t.code === "P-SLIDE") score = Math.round(15 + 4 * p + rnd() * 2);
        else if (t.code === "P-SLJ") score = Math.round(128 + 14 * p + rnd() * 4);
        else if (t.code === "P-CMJ") score = Math.round(21 + 4 * p + rnd() * 2);
        else {
          const max = t.max ?? 10;
          const base = (0.5 + 0.4 * p) * max + (rnd() - 0.5) * 0.25 * max;
          score = Math.max(0, Math.min(max, Math.round(base)));
        }
        e.tests[t.code] = { level, score };
      }
      if (def?.hr && rnd() < 0.85) {
        let hr = Math.round(178 - 16 * p + (rnd() - 0.5) * 8);
        if (rnd() < 0.05) hr += 22; // occasional spike
        e.hr[it.code] = hr;
      }
    });
    out[String(d.day)] = e;
  }
  return out;
}
