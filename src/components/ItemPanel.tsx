"use client";
import { useState } from "react";
import { LEVELS as ALL_LEVELS } from "@/lib/plan";
import { type CodeDef, type Day, type DayItem, type Level } from "@/lib/plan";
import { isMet } from "@/lib/analytics";
import type { ItemStatus, TestEntry } from "@/lib/store";
import { VideoEmbed, ExhibitGrid, StoredImageGrid } from "./Media";

export const KIND_STYLE = {
  table: "bg-table/15 text-[#8fbcf3]",
  physical: "bg-ball/15 text-[#ffa27c]",
  mental: "bg-[#9085e9]/15 text-[#b9b1f3]",
};
export const codeBadge = (code: string) => (/^NV\d+-[RL][123]$/.test(code) ? `N${code.slice(2).split("-")[0]}` : code.length > 4 ? code.split(/\s+/).map((w) => w[0]).join("").slice(0, 4) : code);

type Props = {
  day: Day;
  item: DayItem;
  index: number;
  def?: CodeDef;
  status?: ItemStatus;
  tests: Record<string, TestEntry>;
  hr: number | null | undefined;
  readOnly: boolean;
  defaultLevel: (code: string) => Level;
  onStatus: (s: ItemStatus | null) => void;
  onTest: (code: string, t: TestEntry) => void;
  onHr: (v: number | null) => void;
  defaultOpen?: boolean;
};

export function ItemPanel({ day, item, index, def, status, tests, hr, readOnly, defaultLevel, onStatus, onTest, onHr, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const steps = def?.steps ?? [];
  const exhibits = def?.exhibits ?? [];
  const videos = def?.videos ?? [];
  const testDefs = def?.tests ?? [];
  const codeRe = new RegExp(`(^|[^A-Za-z0-9])${item.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`);
  const prescription = day.custom ? (item.note ? [item.note] : []) : day.main.filter((m) => codeRe.test(m));
  const kind = def?.kind ?? "table";
  const hasResults = testDefs.length > 0 || item.hr;
  const showResults = hasResults && status !== "skipped";
  // videos stay visible at the table (collapse the step to hide them once it's done)
  const showVideos = open || status !== "done";
  const missingScores = testDefs.filter((t) => tests[t.code]?.score == null).map((t) => t.code);
  const needsScores = status === "done" && missingScores.length > 0;
  const [confirm, setConfirm] = useState<null | "ask" | "missing">(null);
  // level descriptions from the drill card ("Foundation: … · Competitor: … · Advanced: …")
  const levelText: Partial<Record<Level, string>> = {};
  for (const part of (steps.find((x) => /^levels?$/i.test(x.k))?.v ?? "").split(/\s·\s/)) {
    const m = part.match(/^(Foundation|Competitor|Advanced)\s*:\s*(.+)$/);
    if (m) levelText[m[1] as Level] = m[2].trim();
  }
  // levels the day's plan mentions for this drill, e.g. "at Foundation pace"
  const suggested = [...new Set(prescription.join(" ").match(/Foundation|Competitor|Advanced/g) ?? [])] as Level[];
  const planLevel = suggested[suggested.length - 1];
  const clickDone = () => {
    if (status === "done") return onStatus(null);
    setConfirm(missingScores.length ? "missing" : "ask");
  };

  return (
    <section className={`card overflow-hidden ${status === "done" ? "!border-good/40" : status === "skipped" ? "opacity-75" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 basis-full items-center gap-3 text-left sm:basis-auto sm:flex-1" aria-expanded={open}>
          <span className={`font-display grid h-11 min-w-11 place-items-center rounded-lg px-2 text-base font-bold ${KIND_STYLE[kind]}`}>{codeBadge(item.code)}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{def?.name ?? item.code}</span>
            <span className="block text-xs text-muted">
              Step {index + 1} · {item.minutes} min
              {testDefs.length > 0 && ` · ${testDefs.length === 1 ? "1 score" : `${testDefs.length} scores`} to log`}
              {item.hr && " · heart rate"}
              {videos.length > 0 && ` · ${videos.length} video${videos.length > 1 ? "s" : ""}`}
            </span>
          </span>
          <svg className={`ml-auto h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" aria-hidden>
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
        <div className="flex w-full overflow-hidden rounded-full border border-line-2 text-sm sm:w-auto" role="group" aria-label="Status">
          {(["done", "skipped"] as const).map((s) => (
            <button
              key={s}
              disabled={readOnly}
              onClick={() => (s === "done" ? clickDone() : (setConfirm(null), onStatus(status === "skipped" ? null : "skipped")))}
              className={`flex-1 px-3 py-2 font-medium transition disabled:cursor-not-allowed sm:flex-none sm:py-1.5 ${
                status === s ? (s === "done" ? "bg-good text-paper" : "bg-card-3 text-ink") : "text-ink-2 hover:bg-card-2"
              }`}
            >
              {s === "done" ? "Done" : "Skipped"}
            </button>
          ))}
        </div>
      </div>

      {confirm && !readOnly && (
        <div className={`flex flex-wrap items-center gap-2 border-t px-3 py-2.5 text-sm sm:px-4 ${confirm === "ask" ? "border-good/30 bg-good-soft" : "border-warn/30 bg-warn-soft"}`} role="alert">
          {confirm === "ask" ? (
            <>
              <span className="flex-1">
                Save <b>{item.code}</b> as done{testDefs.length ? ` with ${testDefs.map((t) => `${t.code} ${tests[t.code]?.score}`).join(", ")}` : ""}
                {item.hr && hr ? `, heart rate ${hr} bpm` : ""}?
              </span>
              <button
                className="rounded-full bg-good px-3 py-1 text-xs font-semibold text-paper"
                onClick={() => {
                  setConfirm(null);
                  onStatus("done");
                }}
              >
                Yes, save
              </button>
              <button className="rounded-full px-3 py-1 text-xs text-ink-2 hover:bg-card-2" onClick={() => setConfirm(null)}>
                Not yet
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-warn">Enter the {missingScores.join(", ")} score{missingScores.length > 1 ? "s" : ""} below first, then tap Done.</span>
              <button className="rounded-full px-3 py-1 text-xs text-ink-2 hover:bg-card-2" onClick={() => setConfirm(null)}>
                OK
              </button>
            </>
          )}
        </div>
      )}

      {(open || showResults || (showVideos && videos.length > 0)) && (
        <div className="space-y-5 border-t border-line p-3 sm:p-4">
          {showVideos && videos.length > 0 && (
            <div className={`grid gap-3 ${videos.length > 1 ? "sm:grid-cols-2" : "sm:max-w-xl"}`}>
              {videos.map((v) => (
                <VideoEmbed key={v.url} v={v} />
              ))}
            </div>
          )}
          {open && (
            <>
              {prescription.length > 0 && (
                <div className="rounded-xl border border-table/25 bg-table/10 p-3">
                  <p className="eyebrow mb-1 !text-[#8fbcf3]">Today&apos;s prescription</p>
                  {prescription.map((p) => (
                    <p key={p} className="text-sm whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {steps.length > 0 && (
                <ol className="space-y-2">
                  {steps.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-display mt-0.5 w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-ball">{f.k || `Step ${i + 1}`}</span>
                      <span className="text-ink-2">{f.v}</span>
                    </li>
                  ))}
                </ol>
              )}
              {exhibits.length > 0 && <ExhibitGrid items={exhibits} />}
              {(def?.images.length ?? 0) > 0 && <StoredImageGrid images={def!.images} />}
              {(item.refs || def?.refs) && <p className="text-xs text-muted">Reference: {item.refs || def?.refs}</p>}
              {!steps.length && !videos.length && !exhibits.length && !def?.images.length && !prescription.length && (
                <p className="text-sm text-muted">No instructions yet. Add steps, a video or images for {item.code} in Studio, Drill library.</p>
              )}
            </>
          )}

          {showResults && (
            <div className="rounded-xl border border-dashed border-line-2 bg-card-2/50 p-3">
              <p className="eyebrow mb-2">
                Log results
                {!status && !readOnly && <span className="ml-2 normal-case tracking-normal text-muted">enter results, then tap Done</span>}
              </p>
              <div className="space-y-3">
                {testDefs.map((tc) => {
                  const t = tests[tc.code] ?? { level: defaultLevel(tc.code), score: null };
                  const met = t.score == null ? null : isMet(tc, t.score);
                  return (
                    <div key={tc.code} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_150px_130px_80px]">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-sm font-semibold">
                          {tc.code} <span className="font-normal text-ink-2">{tc.name}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {tc.counts}
                          {tc.target != null && ` · target ${tc.direction === "low" ? "≤" : "≥"} ${tc.target}`}
                        </p>
                        {tc.levels && levelText[t.level] && (
                          <p className="mt-0.5 text-xs text-ink-2">
                            <span className="font-semibold text-[#8fbcf3]">{t.level}:</span> {levelText[t.level]}
                          </p>
                        )}
                        {tc.levels && planLevel && planLevel !== t.level && !readOnly && (
                          <button className="mt-1 rounded-full border border-table/40 px-2 py-0.5 text-[11px] text-[#8fbcf3] hover:bg-table/10" onClick={() => onTest(tc.code, { ...t, level: planLevel })}>
                            Today&apos;s plan says {planLevel}. Use it
                          </button>
                        )}
                      </div>
                      {tc.levels ? (
                        <select
                          aria-label={`${tc.code} level`}
                          disabled={readOnly}
                          value={t.level}
                          onChange={(e) => onTest(tc.code, { ...t, level: e.target.value as Level })}
                          className="field px-2 py-2 text-sm"
                        >
                          {ALL_LEVELS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                              {planLevel === l ? " (today's plan)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <label className="field flex items-center gap-1 px-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          aria-label={`${tc.code} score`}
                          disabled={readOnly}
                          min={0}
                          max={tc.max ?? undefined}
                          step={tc.step ?? 1}
                          value={t.score ?? ""}
                          placeholder="Score"
                          onChange={(e) => {
                            const raw = e.target.value;
                            let n = raw === "" ? null : Number(raw);
                            if (n != null && tc.max != null) n = Math.min(Math.max(n, 0), tc.max);
                            onTest(tc.code, { ...t, score: n });
                          }}
                          className="num w-full bg-transparent py-2 text-sm outline-none"
                        />
                        <span className="text-xs text-muted">{tc.max ? `/${tc.max}` : tc.unit}</span>
                      </label>
                      <span className={`rounded-full px-2 py-1 text-center text-xs font-semibold ${met == null ? "text-muted" : met ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
                        {met == null ? (t.score == null ? "-" : "Logged") : met ? "✓ Met" : "Not yet"}
                      </span>
                    </div>
                  );
                })}
                {item.hr && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px_130px_80px]">
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-sm font-semibold">
                        Heart rate <span className="font-normal text-muted">(optional)</span>
                      </p>
                      <p className="text-xs text-muted">Peak bpm right after the last series</p>
                    </div>
                    <label className="field flex items-center gap-1 px-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`${item.code} heart rate`}
                        disabled={readOnly}
                        min={40}
                        max={240}
                        value={hr ?? ""}
                        placeholder="bpm"
                        onChange={(e) => onHr(e.target.value === "" ? null : Math.min(240, Math.max(0, Number(e.target.value))))}
                        className="num w-full bg-transparent py-2 text-sm outline-none"
                      />
                      <span className="text-xs text-muted">bpm</span>
                    </label>
                    <span aria-hidden className="text-center text-lg text-bad">♥</span>
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
