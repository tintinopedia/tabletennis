"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gate } from "@/components/Gate";
import { useData } from "@/components/DataProvider";
import { ItemPanel } from "@/components/ItemPanel";
import type { Catalog, Day, Level } from "@/lib/plan";
import { currentDay, fmtDate, todayIso } from "@/lib/analytics";
import { saveSession, type SessionEntry, type ItemStatus, saveError } from "@/lib/store";

export default function TrainPage() {
  return (
    <Gate title="Training log">
      <Trainer />
    </Gate>
  );
}

const blank = (day: number): SessionEntry => ({ day, status: "draft", trainingDate: "", items: {}, tests: {}, hr: {}, matches: 0, notes: "" });
const MATCH_RE = /match|sparring|tournament|tune-up/i;

function missingFor(e: SessionEntry, day: Day, cat: Catalog, prevDate?: string, nextDate?: string): string[] {
  const out: string[] = [];
  if (!e.trainingDate) out.push("Training date");
  else {
    if (e.trainingDate > todayIso()) out.push("Training date cannot be in the future");
    if (prevDate && e.trainingDate < prevDate) out.push(`Training date must be on or after Day ${day.day - 1} (${fmtDate(prevDate)})`);
    if (nextDate && e.trainingDate > nextDate) out.push(`Training date must be on or before Day ${day.day + 1} (${fmtDate(nextDate)})`);
  }
  day.items.forEach((it, i) => {
    const s = e.items[String(i)];
    if (!s) out.push(`Mark ${it.code} as Done or Skipped`);
    else if (s === "done") for (const t of cat[it.code]?.tests ?? []) if (e.tests[t.code]?.score == null) out.push(`${t.code} score`);
  });
  return out;
}

function Trainer() {
  const { sessions, days, catalog } = useData();
  const total = days.length;
  const cur = currentDay(sessions, days);
  const allDone = cur > total;
  const [viewDay, setViewDay] = useState(Math.max(1, Math.min(cur, total)));
  const day = days[viewDay - 1];
  const saved = sessions[viewDay];
  const isComplete = saved?.status === "complete";
  const locked = viewDay > cur;
  const isCurrent = viewDay === cur;

  const [entry, setEntry] = useState<SessionEntry>(saved ?? blank(viewDay));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  // heart rate handed over by the iPhone Shortcut: /train?hr=172 (optional &code=D4)
  const [watch, setWatch] = useState<{ hr: number; code: string | null; applied: string | null } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("hr")) return;
    const hr = Math.round(Number(q.get("hr")));
    window.history.replaceState(null, "", window.location.pathname);
    setWatch(hr >= 40 && hr <= 240 ? { hr, code: q.get("code"), applied: null } : { hr: 0, code: null, applied: null });
  }, []);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    setEntry(sessions[viewDay] ?? blank(viewDay));
    setDirty(false);
    setShowMissing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDay]);
  useEffect(() => {
    if (!dirtyRef.current && sessions[viewDay]) setEntry(sessions[viewDay]);
  }, [sessions, viewDay]);

  const defaultLevel = useCallback(
    (code: string): Level => {
      for (let d = viewDay - 1; d >= 1; d--) {
        const t = sessions[d]?.tests?.[code];
        if (t?.level) return t.level;
      }
      return "Foundation";
    },
    [sessions, viewDay]
  );

  const update = (fn: (e: SessionEntry) => SessionEntry) => {
    if (locked) return;
    setEntry((e) => fn(structuredClone(e)));
    setDirty(true);
    setSaving("idle");
  };

  useEffect(() => {
    if (!dirty || isComplete || locked) return;
    const t = setTimeout(async () => {
      setSaving("saving");
      try {
        await saveSession({ ...entry, status: "draft" });
        setDirty(false);
        setSaving("saved");
      } catch (err) {
        console.error(err);
        setSaveMsg(saveError(err));
        setSaving("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [entry, dirty, isComplete, locked]);

  const prevDate = sessions[viewDay - 1]?.trainingDate;
  const nextDate = sessions[viewDay + 1]?.status === "complete" ? sessions[viewDay + 1]?.trainingDate : undefined;
  const missing = useMemo(() => (day ? missingFor(entry, day, catalog, prevDate, nextDate) : []), [entry, day, catalog, prevDate, nextDate]);

  if (!day)
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <p className="font-display text-3xl font-bold uppercase">No sessions planned</p>
        <p className="mt-2 text-sm text-ink-2">Plan the next sessions in Studio.</p>
        <Link href="/studio" className="btn btn-primary mt-5 inline-block">
          Open Studio
        </Link>
      </div>
    );

  const doneCount = day.items.filter((_, i) => entry.items[String(i)]).length;
  const hrItems = day.items.filter((it, i) => it.hr && entry.items[String(i)] !== "skipped");
  const applyWatch = (code: string) => {
    if (!watch) return;
    update((e) => ({ ...e, hr: { ...e.hr, [code]: watch.hr } }));
    setWatch({ ...watch, applied: code });
  };
  if (watch && watch.hr && watch.code && !watch.applied && !locked && hrItems.some((it) => it.code === watch.code)) {
    // Shortcut named the drill: fill it straight away
    queueMicrotask(() => applyWatch(watch.code!));
  }

  const submit = async () => {
    if (missing.length) {
      setShowMissing(true);
      return;
    }
    setSaving("saving");
    try {
      await saveSession({ ...entry, status: "complete", completedAt: entry.completedAt ?? Date.now() });
      setDirty(false);
      setSaving("saved");
      if (isCurrent && viewDay < total) {
        setToast(`Day ${viewDay} saved. Great work! Next up: Day ${viewDay + 1}.`);
        setViewDay(viewDay + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setToast(isCurrent ? `Day ${viewDay} saved. Plan more sessions in Studio.` : `Day ${viewDay} updated.`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setSaveMsg(saveError(err));
      setSaving("error");
    }
  };

  const setStatus = (i: number, code: string, s: ItemStatus | null) =>
    update((e) => {
      if (s === null) {
        delete e.items[String(i)];
        return e;
      }
      e.items[String(i)] = s;
      const tdefs = catalog[code]?.tests ?? [];
      if (s === "done") {
        for (const t of tdefs) e.tests[t.code] ??= { level: defaultLevel(t.code), score: null };
      } else {
        const stillUsed = new Set(day.items.flatMap((it, j) => (j !== i && e.items[String(j)] === "done" ? (catalog[it.code]?.tests ?? []).map((t) => t.code) : [])));
        for (const t of tdefs) if (!stillUsed.has(t.code)) delete e.tests[t.code];
        delete e.hr[code];
      }
      return e;
    });

  const statusLabel = isComplete ? "Completed" : locked ? "Locked" : "In progress";
  const progress = Math.min(cur - 1, total) / Math.max(total, 1);

  return (
    <div className="pt-6">
      {toast && (
        <div className="fixed inset-x-0 top-20 z-40 mx-auto w-fit rounded-full bg-good px-5 py-2.5 text-sm font-semibold text-paper shadow-lg" role="status">
          {toast}
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => setViewDay(Math.max(1, viewDay - 1))} disabled={viewDay === 1} className="btn btn-ghost" aria-label="Previous session">
          ‹ Prev
        </button>
        <select value={viewDay} onChange={(e) => setViewDay(Number(e.target.value))} className="field min-w-0 flex-1 px-3 py-2 text-sm font-medium" aria-label="Jump to session">
          {days.map((d) => {
            const st = sessions[d.day]?.status === "complete" ? "✓" : d.day === cur ? "●" : d.day > cur ? "🔒" : "";
            return (
              <option key={d.day} value={d.day}>
                {st} Day {d.day}
                {d.plannedDate ? ` · ${fmtDate(d.plannedDate, { weekday: "short", day: "numeric", month: "short" })}` : ""} · {d.sessionType}
              </option>
            );
          })}
        </select>
        <button onClick={() => setViewDay(Math.min(total, viewDay + 1))} disabled={viewDay === total} className="btn btn-ghost" aria-label="Next session">
          Next ›
        </button>
        {!isCurrent && !allDone && (
          <button onClick={() => setViewDay(cur)} className="btn bg-table text-white">
            Go to Day {cur}
          </button>
        )}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-label={`${Math.round(progress * 100)}% of planned sessions complete`}>
          <div className="h-full rounded-full bg-table" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {watch && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-critical/30 bg-bad-soft p-3 text-sm">
          <span className="text-bad">⌚ ♥</span>
          {!watch.hr ? (
            <span className="flex-1 text-ink-2">No recent heart-rate reading came from the Watch. Start a workout on the Watch during training, then run the Shortcut again.</span>
          ) : watch.applied ? (
            <span className="flex-1">
              Added <b className="num">{watch.hr} bpm</b> to <b>{watch.applied}</b>. Tap Done on that drill when you are ready.
            </span>
          ) : locked ? (
            <span className="flex-1 text-ink-2">
              Watch heart rate <b className="num text-ink">{watch.hr} bpm</b>. Go to Day {cur} to add it.
            </span>
          ) : hrItems.length === 0 ? (
            <span className="flex-1 text-ink-2">
              Watch heart rate <b className="num text-ink">{watch.hr} bpm</b>, but no drill in this session tracks heart rate.
            </span>
          ) : (
            <>
              <span className="text-ink">
                Watch heart rate <b className="num">{watch.hr} bpm</b>. Add it to:
              </span>
              {hrItems.map((it) => (
                <button key={it.code} onClick={() => applyWatch(it.code)} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper hover:bg-ink-2">
                  {it.code}
                  {entry.hr[it.code] ? ` (now ${entry.hr[it.code]})` : ""}
                </button>
              ))}
            </>
          )}
          <button onClick={() => setWatch(null)} className="ml-auto text-xs text-muted hover:text-ink" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {locked && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          🔒 Preview only. Finish{" "}
          <button className="font-semibold underline" onClick={() => setViewDay(cur)}>
            Day {cur}
          </button>{" "}
          first to unlock the next session.
        </div>
      )}
      {allDone && (
        <div className="mt-4 rounded-xl border border-good/30 bg-good-soft p-3 text-sm text-good">
          All {total} planned sessions are logged. 🏓{" "}
          <Link href="/studio" className="font-semibold underline">
            Plan the next sessions in Studio
          </Link>
          .
        </div>
      )}

      <div className="court-bg mt-4 overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
              {day.phase}
              {day.week ? ` · ${day.week}` : ""}
            </p>
            <h1 className="font-display mt-1 text-4xl font-bold uppercase leading-none sm:text-5xl">Day {day.day}</h1>
            <p className="mt-1 text-lg font-medium">{day.sessionType}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${isComplete ? "bg-good text-paper" : locked ? "bg-card-3 text-ink-2" : "bg-ball text-white"}`}>
              {statusLabel}
            </span>
            <p className="num mt-2 text-sm text-ink-2">{day.duration ? `${day.duration} min planned` : "Rest day"}</p>
            {day.plannedDate && <p className="text-xs text-muted">Plan date: {fmtDate(day.plannedDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>}
          </div>
        </div>
        {(day.warmup || day.cooldown) && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {day.warmup && (
              <div className="rounded-xl bg-paper/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Warm-up</p>
                <p>{day.warmup}</p>
              </div>
            )}
            {day.cooldown && (
              <div className="rounded-xl bg-paper/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cooldown and mental</p>
                <p>{day.cooldown}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {day.main.length > 0 && (
        <div className="card mt-4 p-4">
          <p className="eyebrow mb-2">{day.custom ? "Session notes" : "Main session"}</p>
          <ul className="space-y-1.5 text-sm">
            {day.main.map((m) => (
              <li key={m} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ball" />
                <span className="whitespace-pre-line text-ink-2">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <p className="font-semibold">Training date</p>
          <p className="text-xs text-muted">The day you actually trained this session.</p>
        </div>
        <input
          type="date"
          value={entry.trainingDate}
          max={todayIso()}
          min={prevDate}
          disabled={locked}
          onChange={(e) => update((x) => ({ ...x, trainingDate: e.target.value }))}
          className="field px-3 py-2 text-sm"
          aria-label="Training date"
        />
        {!locked && (
          <button onClick={() => update((x) => ({ ...x, trainingDate: todayIso() }))} className="btn btn-ghost">
            Today
          </button>
        )}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold uppercase">Step-by-step drills</h2>
        <p className="num text-sm text-muted">
          {doneCount}/{day.items.length} marked
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {day.items.map((it, i) => (
          <ItemPanel
            key={`${day.day}-${i}`}
            day={day}
            item={it}
            index={i}
            def={catalog[it.code]}
            status={entry.items[String(i)]}
            tests={entry.tests}
            hr={entry.hr[it.code]}
            readOnly={locked}
            defaultLevel={defaultLevel}
            defaultOpen
            onStatus={(s) => setStatus(i, it.code, s)}
            onTest={(c, t) => update((e) => ({ ...e, tests: { ...e.tests, [c]: t } }))}
            onHr={(v) => update((e) => ({ ...e, hr: { ...e.hr, [it.code]: v } }))}
          />
        ))}
      </div>

      <div className={`card mt-4 grid gap-4 p-4 ${MATCH_RE.test(day.sessionType) ? "sm:grid-cols-[200px_1fr]" : ""}`}>
        {MATCH_RE.test(day.sessionType) && (
          <label className="block">
            <span className="text-sm font-semibold">Matches played</span>
            <input
              type="number"
              min={0}
              max={30}
              disabled={locked}
              value={entry.matches || 0}
              onChange={(e) => update((x) => ({ ...x, matches: Math.max(0, Number(e.target.value) || 0) }))}
              className="field num mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-semibold">Notes</span> <span className="text-xs text-muted">(optional)</span>
          <textarea
            rows={2}
            disabled={locked}
            value={entry.notes}
            onChange={(e) => update((x) => ({ ...x, notes: e.target.value }))}
            placeholder="How did it feel? What will you fix next time?"
            className="field mt-1 w-full px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!locked && (
        <div className="sticky bottom-3 z-20 mt-6">
          <div className="card flex flex-wrap items-center gap-3 p-3 shadow-2xl shadow-black/50">
            <div className="min-w-0 flex-1 text-sm">
              {missing.length === 0 ? (
                <span className="font-medium text-good">Everything filled in. Ready to {isComplete ? "save" : "submit"}.</span>
              ) : (
                <span className="text-ink-2">
                  {missing.length} thing{missing.length > 1 ? "s" : ""} left to fill
                  {showMissing && (
                    <span className="mt-1 block text-xs text-warn">
                      {missing.slice(0, 6).join(" · ")}
                      {missing.length > 6 ? " …" : ""}
                    </span>
                  )}
                </span>
              )}
              <span className="block text-xs text-muted">
                {saving === "saving" ? "Saving…" : saving === "error" ? saveMsg : !isComplete && saving === "saved" ? "Draft saved" : isComplete && dirty ? "Unsaved changes" : ""}
              </span>
            </div>
            <button onClick={submit} disabled={saving === "saving" || (isComplete && !dirty)} className={`btn ${missing.length ? "bg-card-3 text-ink" : "btn-primary"}`}>
              {isComplete ? "Save changes" : `Submit Day ${viewDay}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
