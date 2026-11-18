"use client";
import { useState } from "react";
import {
  DRILL_CARDS,
  EXHIBITS,
  EXTRA_STEPS,
  LEVELS,
  TEST_BY_CODE,
  hasHeartRate,
  testsForItem,
  categoryOf,
  type PlanDay,
  type PlanItem,
  type Level,
} from "@/lib/plan";
import { isMet } from "@/lib/analytics";
import type { ItemStatus, TestEntry } from "@/lib/store";
import { VideoEmbed, ExhibitGrid } from "./Media";

const CAT_STYLE = {
  table: "bg-[#e3eefb] text-table-deep",
  physical: "bg-[#fde9df] text-[#a6421a]",
  mental: "bg-[#ecebf8] text-[#4a3aa7]",
};

type Props = {
  plan: PlanDay;
  item: PlanItem;
  index: number;
  status?: ItemStatus;
  tests: Record<string, TestEntry>;
  hr: number | null | undefined;
  readOnly: boolean;
  defaultLevel: (code: string) => Level;
  onStatus: (s: ItemStatus) => void;
  onTest: (code: string, t: TestEntry) => void;
  onHr: (v: number | null) => void;
  defaultOpen?: boolean;
};

export function ItemPanel({ plan, item, index, status, tests, hr, readOnly, defaultLevel, onStatus, onTest, onHr, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const card = DRILL_CARDS[item.code];
  const steps = card?.fields ?? EXTRA_STEPS[item.code] ?? [];
  const exhibits = EXHIBITS[item.code] ?? [];
  const videos = plan.videos.filter((v) => v.code === item.code);
  const codeRe = new RegExp(`(^|[^A-Za-z0-9])${item.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`);
  const prescription = plan.main.filter((m) => codeRe.test(m));
  const testCodes = testsForItem(item.code);
  const cat = categoryOf(item.code);
  const name = item.label.replace(/^[^(]*\(/, "").replace(/\)$/, "") || item.label;
  const needsScores = status === "done" && testCodes.some((c) => tests[c]?.score == null);

  return (
    <section className={`card overflow-hidden ${status === "done" ? "border-good/40" : status === "skipped" ? "opacity-80" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className={`font-display grid h-11 min-w-11 place-items-center rounded-lg px-2 text-base font-bold ${CAT_STYLE[cat]}`}>
            {item.code.length > 4 ? item.code.split(" ").map((w) => w[0]).join("") : item.code}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{card?.title ?? name}</span>
            <span className="block text-xs text-muted">
              Step {index + 1} · {item.minutes} min
              {testCodes.length > 0 && ` · ${testCodes.length === 1 ? "1 score" : `${testCodes.length} scores`} to log`}
              {hasHeartRate(item.code) && " · heart rate optional"}
              {videos.length > 0 && ` · ${videos.length} video${videos.length > 1 ? "s" : ""}`}
            </span>
          </span>
          <svg className={`ml-auto h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
        <div className="flex overflow-hidden rounded-full border border-line text-sm" role="group" aria-label="Status">
          {(["done", "skipped"] as const).map((s) => (
            <button
              key={s}
              disabled={readOnly}
              onClick={() => onStatus(s)}
              className={`px-3 py-1.5 font-medium transition disabled:cursor-not-allowed ${
                status === s ? (s === "done" ? "bg-good text-white" : "bg-ink-2 text-white") : "bg-card text-ink-2 hover:bg-paper"
              }`}
            >
              {s === "done" ? "Done" : "Skipped"}
            </button>
          ))}
        </div>
      </div>

      {(open || (status === "done" && (testCodes.length > 0 || hasHeartRate(item.code)))) && (
        <div className="space-y-5 border-t border-line p-3 sm:p-4">
          {open && (
            <>
              {prescription.length > 0 && (
                <div className="rounded-xl bg-[#e3eefb]/60 p-3">
                  <p className="eyebrow mb-1 !text-table-deep">Today&apos;s prescription</p>
                  {prescription.map((p) => (
                    <p key={p} className="text-sm">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {steps.length > 0 && (
                <ol className="space-y-2">
                  {steps.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-display mt-0.5 w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-ball">{f.k}</span>
                      <span className="text-ink-2">{f.v}</span>
                    </li>
                  ))}
                </ol>
              )}
              {videos.length > 0 && (
                <div className={`grid gap-3 ${videos.length > 1 ? "sm:grid-cols-2" : "sm:max-w-xl"}`}>
                  {videos.map((v) => (
                    <VideoEmbed key={v.url} v={v} />
                  ))}
                </div>
              )}
              {exhibits.length > 0 && <ExhibitGrid items={exhibits} />}
              {item.refs && <p className="text-xs text-muted">Reference: {item.refs}</p>}
            </>
          )}

          {status === "done" && (testCodes.length > 0 || hasHeartRate(item.code)) && (
            <div className="rounded-xl border border-dashed border-line bg-paper/60 p-3">
              <p className="eyebrow mb-2">Log results</p>
              <div className="space-y-3">
                {testCodes.map((c) => {
                  const tc = TEST_BY_CODE[c];
                  const t = tests[c] ?? { level: defaultLevel(c), score: null };
                  const met = t.score == null ? null : isMet(c, t.score);
                  return (
                    <div key={c} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_150px_120px_80px]">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-sm font-semibold">
                          {c} <span className="font-normal text-ink-2">{tc.name}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {tc.counts}
                          {tc.target != null && ` · target ${tc.direction === "low" ? "≤" : "≥"} ${tc.target}`}
                        </p>
                      </div>
                      {!c.startsWith("P-") ? (
                        <select
                          aria-label={`${c} level`}
                          disabled={readOnly}
                          value={t.level}
                          onChange={(e) => onTest(c, { ...t, level: e.target.value as Level })}
                          className="rounded-lg border border-line bg-white px-2 py-2 text-sm"
                        >
                          {LEVELS.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <label className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 focus-within:border-table">
                        <input
                          type="number"
                          inputMode="decimal"
                          aria-label={`${c} score`}
                          disabled={readOnly}
                          min={0}
                          max={tc.max}
                          step={tc.step ?? 1}
                          value={t.score ?? ""}
                          placeholder="Score"
                          onChange={(e) => {
                            const raw = e.target.value;
                            let n = raw === "" ? null : Number(raw);
                            if (n != null && tc.max != null) n = Math.min(Math.max(n, 0), tc.max);
                            onTest(c, { ...t, score: n });
                          }}
                          className="num w-full bg-transparent py-2 text-sm outline-none"
                        />
                        <span className="text-xs text-muted">{tc.max ? `/${tc.max}` : tc.unit}</span>
                      </label>
                      <span
                        className={`rounded-full px-2 py-1 text-center text-xs font-semibold ${
                          met == null ? "text-muted" : met ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
                        }`}
                      >
                        {met == null ? (t.score == null ? "-" : "Logged") : met ? "✓ Met" : "Not yet"}
                      </span>
                    </div>
                  );
                })}
                {hasHeartRate(item.code) && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px_120px_80px]">
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-sm font-semibold">
                        Heart rate <span className="font-normal text-muted">(optional)</span>
                      </p>
                      <p className="text-xs text-muted">Peak bpm right after the last series</p>
                    </div>
                    <label className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 focus-within:border-table">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`${item.code} heart rate`}
                        disabled={readOnly}
                        min={40}
                        max={230}
                        value={hr ?? ""}
                        placeholder="bpm"
                        onChange={(e) => onHr(e.target.value === "" ? null : Math.min(230, Math.max(0, Number(e.target.value))))}
                        className="num w-full bg-transparent py-2 text-sm outline-none"
                      />
                      <span className="text-xs text-muted">bpm</span>
                    </label>
                    <span aria-hidden className="text-center text-lg">♥</span>
                  </div>
                )}
              </div>
              {needsScores && !readOnly && <p className="mt-2 text-xs text-warn">Enter every score to finish this step.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
