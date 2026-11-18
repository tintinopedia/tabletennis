"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSessions } from "@/components/useSessions";
import { ItemPanel } from "@/components/ItemPanel";
import { DAYS, TOTAL_DAYS, testsForItem, hasHeartRate, type Level, type PlanDay } from "@/lib/plan";
import { currentDay, fmtDate, todayIso } from "@/lib/analytics";
import { saveSession, type SessionEntry, type SessionMap, type ItemStatus } from "@/lib/store";

export default function TrainPage() {
  const { user, loading, signIn } = useAuth();
  const sessions = useSessions();
  if (loading || (user && !sessions)) return <p className="py-20 text-center text-muted">Loading…</p>;
  if (!user)
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <p className="font-display text-3xl font-bold uppercase">Training log</p>
        <p className="mt-2 text-sm text-ink-2">Only Ahaan can sign in here to log his sessions.</p>
        <button onClick={signIn} className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-table-deep">
          Login with Google
        </button>
      </div>
    );
  return <Trainer sessions={sessions!} />;
}

const blank = (day: number): SessionEntry => ({ day, status: "draft", trainingDate: "", items: {}, tests: {}, hr: {}, matches: 0, notes: "" });
const MATCH_RE = /match|sparring|tournament|tune-up/i;

function missingFor(e: SessionEntry, plan: PlanDay, prevDate?: string, nextDate?: string): string[] {
  const out: string[] = [];
  if (!e.trainingDate) out.push("Training date");
  else {
    if (e.trainingDate > todayIso()) out.push("Training date cannot be in the future");
    if (prevDate && e.trainingDate < prevDate) out.push(`Training date must be on or after Day ${plan.day - 1} (${fmtDate(prevDate)})`);
    if (nextDate && e.trainingDate > nextDate) out.push(`Training date must be on or before Day ${plan.day + 1} (${fmtDate(nextDate)})`);
  }
  plan.items.forEach((it, i) => {
    const s = e.items[String(i)];
    if (!s) out.push(`Mark ${it.code} as Done or Skipped`);
    else if (s === "done") for (const t of testsForItem(it.code)) if (e.tests[t]?.score == null) out.push(`${t} score`);
  });
  return out;
}

function Trainer({ sessions }: { sessions: SessionMap }) {
  const cur = currentDay(sessions);
  const allDone = cur > TOTAL_DAYS;
  const [viewDay, setViewDay] = useState(Math.min(cur, TOTAL_DAYS));
  const plan = DAYS[viewDay - 1];
  const saved = sessions[viewDay];
  const isComplete = saved?.status === "complete";
  const locked = viewDay > cur;
  const isCurrent = viewDay === cur;

  const [entry, setEntry] = useState<SessionEntry>(saved ?? blank(viewDay));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // load entry when switching days, or when remote data changes and nothing is being edited
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

  // autosave drafts for the current (not yet submitted) session
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
        setSaving("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [entry, dirty, isComplete, locked]);

  const prevDate = sessions[viewDay - 1]?.trainingDate;
  const nextDate = sessions[viewDay + 1]?.status === "complete" ? sessions[viewDay + 1]?.trainingDate : undefined;
  const missing = useMemo(() => missingFor(entry, plan, prevDate, nextDate), [entry, plan, prevDate, nextDate]);
  const doneCount = plan.items.filter((_, i) => entry.items[String(i)]).length;

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
      if (isCurrent && viewDay < TOTAL_DAYS) {
        setToast(`Day ${viewDay} saved. Great work! Next up: Day ${viewDay + 1}.`);
        setViewDay(viewDay + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setToast(`Day ${viewDay} updated.`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setSaving("error");
    }
  };

  const setStatus = (i: number, code: string, s: ItemStatus) =>
    update((e) => {
      e.items[String(i)] = s;
      const tests = testsForItem(code);
      if (s === "done") {
        for (const t of tests) e.tests[t] ??= { level: defaultLevel(t), score: null };
      } else {
        const stillUsed = new Set(plan.items.flatMap((it, j) => (j !== i && e.items[String(j)] === "done" ? testsForItem(it.code) : [])));
        for (const t of tests) if (!stillUsed.has(t)) delete e.tests[t];
        if (hasHeartRate(code)) delete e.hr[code];
      }
      return e;
    });

  const statusLabel = isComplete ? "Completed" : locked ? "Locked" : "In progress";
  const progress = (Math.min(cur, TOTAL_DAYS + 1) - 1) / TOTAL_DAYS;

  return (
    <div className="pt-6">
      {toast && (
        <div className="fixed inset-x-0 top-20 z-40 mx-auto w-fit rounded-full bg-good px-5 py-2.5 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}

      {/* Day navigator */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <button
          onClick={() => setViewDay(Math.max(1, viewDay - 1))}
          disabled={viewDay === 1}
          className="rounded-full border border-line px-3 py-2 text-sm font-medium disabled:opacity-40"
          aria-label="Previous session"
        >
          ‹ Prev
        </button>
        <select
          value={viewDay}
          onChange={(e) => setViewDay(Number(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium"
          aria-label="Jump to session"
        >
          {DAYS.map((d) => {
            const st = sessions[d.day]?.status === "complete" ? "✓" : d.day === cur ? "●" : d.day > cur ? "🔒" : "";
            return (
              <option key={d.day} value={d.day}>
                {st} Day {d.day} · {fmtDate(d.plannedDate, { weekday: "short", day: "numeric", month: "short" })} · {d.sessionType}
              </option>
            );
          })}
        </select>
        <button
          onClick={() => setViewDay(Math.min(TOTAL_DAYS, viewDay + 1))}
          disabled={viewDay === TOTAL_DAYS}
          className="rounded-full border border-line px-3 py-2 text-sm font-medium disabled:opacity-40"
          aria-label="Next session"
        >
          Next ›
        </button>
        {!isCurrent && !allDone && (
          <button onClick={() => setViewDay(cur)} className="rounded-full bg-table px-3 py-2 text-sm font-semibold text-white">
            Go to Day {cur}
          </button>
        )}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-label={`${Math.round(progress * 100)}% of the plan complete`}>
          <div className="h-full rounded-full bg-table" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {locked && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          🔒 Preview only. Finish <button className="font-semibold underline" onClick={() => setViewDay(cur)}>Day {cur}</button> first to unlock the next session.
        </div>
      )}
      {allDone && (
        <div className="mt-4 rounded-xl bg-good-soft p-3 text-sm text-good">All {TOTAL_DAYS} sessions are logged. What a season! 🏓</div>
      )}

      {/* Session header */}
      <div className="court-bg mt-4 overflow-hidden rounded-2xl p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              {plan.phase} · {plan.week}
            </p>
            <h1 className="font-display mt-1 text-4xl font-bold uppercase leading-none sm:text-5xl">Day {plan.day}</h1>
            <p className="mt-1 text-lg font-medium">{plan.sessionType}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                isComplete ? "bg-good text-white" : locked ? "bg-white/20" : "bg-ball text-white"
              }`}
            >
              {statusLabel}
            </span>
            <p className="num mt-2 text-sm text-white/80">{plan.duration ? `${plan.duration} min planned` : "Rest day"}</p>
            <p className="text-xs text-white/60">Plan date: {fmtDate(plan.plannedDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Warm-up</p>
            <p>{plan.warmup}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Cooldown and mental</p>
            <p>{plan.cooldown}</p>
          </div>
        </div>
      </div>

      {/* Main plan */}
      <div className="card mt-4 p-4">
        <p className="eyebrow mb-2">Main session</p>
        <ul className="space-y-1.5 text-sm">
          {plan.main.map((m) => (
            <li key={m} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ball" />
              <span className="whitespace-pre-line">{m}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Date */}
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
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          aria-label="Training date"
        />
        {!locked && (
          <button onClick={() => update((x) => ({ ...x, trainingDate: todayIso() }))} className="rounded-full border border-line px-3 py-2 text-sm font-medium hover:bg-paper">
            Today
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold uppercase">Step-by-step drills</h2>
        <p className="num text-sm text-muted">
          {doneCount}/{plan.items.length} marked
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {plan.items.map((it, i) => (
          <ItemPanel
            key={`${plan.day}-${i}`}
            plan={plan}
            item={it}
            index={i}
            status={entry.items[String(i)]}
            tests={entry.tests}
            hr={entry.hr[it.code]}
            readOnly={locked}
            defaultLevel={defaultLevel}
            defaultOpen={!isComplete && i === 0}
            onStatus={(s) => setStatus(i, it.code, s)}
            onTest={(c, t) => update((e) => ({ ...e, tests: { ...e.tests, [c]: t } }))}
            onHr={(v) => update((e) => ({ ...e, hr: { ...e.hr, [it.code]: v } }))}
          />
        ))}
      </div>

      {/* Extras */}
      <div className={`card mt-4 grid gap-4 p-4 ${MATCH_RE.test(plan.sessionType) ? "sm:grid-cols-[200px_1fr]" : ""}`}>
        {MATCH_RE.test(plan.sessionType) ? (
          <label className="block">
            <span className="text-sm font-semibold">Matches played</span>
            <input
              type="number"
              min={0}
              max={20}
              disabled={locked}
              value={entry.matches || 0}
              onChange={(e) => update((x) => ({ ...x, matches: Math.max(0, Number(e.target.value) || 0) }))}
              className="num mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        <label className="block">
          <span className="text-sm font-semibold">Notes</span> <span className="text-xs text-muted">(optional)</span>
          <textarea
            rows={2}
            disabled={locked}
            value={entry.notes}
            onChange={(e) => update((x) => ({ ...x, notes: e.target.value }))}
            placeholder="How did it feel? What will you fix next time?"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      {/* Submit */}
      {!locked && (
        <div className="sticky bottom-3 z-20 mt-6">
          <div className="card flex flex-wrap items-center gap-3 p-3 shadow-lg">
            <div className="min-w-0 flex-1 text-sm">
              {missing.length === 0 ? (
                <span className="font-medium text-good">Everything filled in. Ready to {isComplete ? "save" : "submit"}.</span>
              ) : (
                <span className="text-ink-2">
                  {missing.length} thing{missing.length > 1 ? "s" : ""} left to fill
                  {showMissing && <span className="mt-1 block text-xs text-warn">{missing.slice(0, 6).join(" · ")}{missing.length > 6 ? " …" : ""}</span>}
                </span>
              )}
              <span className="block text-xs text-muted">
                {saving === "saving" ? "Saving…" : saving === "error" ? "Could not save. Check your connection." : !isComplete && saving === "saved" ? "Draft saved" : isComplete && dirty ? "Unsaved changes" : ""}
              </span>
            </div>
            <button
              onClick={submit}
              disabled={saving === "saving" || (isComplete && !dirty)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${missing.length ? "bg-ink-2" : "bg-ball hover:brightness-95"}`}
            >
              {isComplete ? "Save changes" : `Submit Day ${viewDay}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
