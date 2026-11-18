import { DAYS, TEST_BY_CODE, testsForItem, hasHeartRate, type Level } from "./plan";
import type { SessionMap, SessionEntry } from "./store";

/** Sample data for preview mode only (no Firebase configured). */
export function demoSeed(completeUpTo = 58): SessionMap {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: SessionMap = {};
  const lastPlanned = new Date(DAYS[completeUpTo - 1].plannedDate + "T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const shift = Math.round((yesterday.getTime() - lastPlanned.getTime()) / 86400000);
  for (const d of DAYS.slice(0, completeUpTo)) {
    const p = d.day / completeUpTo; // progress 0..1
    const dt = new Date(d.plannedDate + "T00:00:00");
    dt.setDate(dt.getDate() + shift);
    const e: SessionEntry = {
      day: d.day,
      status: "complete",
      trainingDate: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
      items: {},
      tests: {},
      hr: {},
      matches: /Match|Sparring/.test(d.sessionType) ? 2 + Math.floor(rnd() * 3) : 0,
      notes: "",
    };
    d.items.forEach((it, i) => {
      e.items[String(i)] = rnd() < 0.06 ? "skipped" : "done";
      if (e.items[String(i)] !== "done") return;
      for (const t of testsForItem(it.code)) {
        const tc = TEST_BY_CODE[t];
        const level: Level = p > 0.7 && t !== "D8-A" && t !== "D8-B" ? "Competitor" : "Foundation";
        let score: number;
        if (t === "D7") score = Math.max(0, Math.round(7 - 5 * p + rnd() * 2.5));
        else if (t === "P-505") score = +(3.4 - 0.35 * p + rnd() * 0.1).toFixed(2);
        else if (t === "P-HEX") score = +(14.8 - 1.6 * p + rnd() * 0.4).toFixed(2);
        else if (t === "P-SLIDE") score = Math.round(15 + 4 * p + rnd() * 2);
        else if (t === "P-SLJ") score = Math.round(128 + 14 * p + rnd() * 4);
        else if (t === "P-CMJ") score = Math.round(21 + 4 * p + rnd() * 2);
        else {
          const max = tc.max ?? 10;
          const base = (0.5 + 0.38 * p) * max + (rnd() - 0.5) * 0.25 * max;
          score = Math.max(0, Math.min(max, Math.round(base)));
        }
        e.tests[t] = { level, score };
      }
      if (hasHeartRate(it.code) && rnd() < 0.8) e.hr[it.code] = Math.round(176 - 14 * p + (rnd() - 0.5) * 10);
    });
    out[d.day] = e;
  }
  return out;
}
