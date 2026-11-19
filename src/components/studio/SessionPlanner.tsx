"use client";
import { useMemo, useState } from "react";
import { useData } from "../DataProvider";
import { ConfirmButton, Field, Toggle, Toast, useToast } from "../ui";
import { KIND_STYLE, codeBadge } from "../ItemPanel";
import { PLAN_LENGTH, SECTIONS, type CustomDayDoc, type DayItem } from "@/lib/plan";
import { fmtDate } from "@/lib/analytics";
import { put, remove, saveError } from "@/lib/store";

type Draft = CustomDayDoc & { mainText: string };

export function SessionPlanner() {
  const { days, customDays, sessions, catalog } = useData();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const custom = days.filter((d) => d.custom);
  const nextDay = days.length + 1;
  const lastCustom = custom[custom.length - 1];

  const startNew = (from?: number) => {
    const src = from ? days[from - 1] : undefined;
    const lastDate = custom.length ? customDays.find((c) => c.day === lastCustom.day)?.plannedDate : undefined;
    let plannedDate = "";
    if (lastDate) {
      const d = new Date(lastDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      plannedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    setDraft({
      day: nextDay,
      plannedDate,
      sessionType: src?.sessionType ?? "",
      main: src?.main ?? [],
      mainText: (src?.custom ? src.main : []).join("\n"),
      items: src ? src.items.filter((i) => catalog[i.code]).map((i) => ({ code: i.code, minutes: i.minutes, hr: i.hr, note: i.note ?? "" })) : [],
    });
    setErr(null);
    setTimeout(() => document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  const edit = (day: number) => {
    const c = customDays.find((x) => x.day === day);
    if (!c) return;
    setDraft({ ...c, items: c.items.map((i) => ({ ...i })), mainText: (c.main ?? []).join("\n") });
    setErr(null);
    setTimeout(() => document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const save = async (andNext = false) => {
    if (!draft) return;
    if (!draft.sessionType.trim()) return setErr("Give the session a title.");
    if (!draft.items.length) return setErr("Pick at least one drill.");
    const doc: CustomDayDoc = {
      day: draft.day,
      plannedDate: draft.plannedDate || "",
      sessionType: draft.sessionType.trim(),
      main: draft.mainText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      items: draft.items.map((i) => ({ code: i.code, minutes: Number(i.minutes) || 0, hr: !!i.hr, note: (i.note ?? "").trim() })),
      createdAt: draft.createdAt ?? Date.now(),
    };
    try {
      await put("customDays", String(doc.day), doc);
      showToast(`Day ${doc.day} saved`);
      if (andNext) {
        const d = doc.plannedDate ? new Date(doc.plannedDate + "T00:00:00") : null;
        if (d) d.setDate(d.getDate() + 1);
        setDraft({
          ...doc,
          day: doc.day + 1,
          plannedDate: d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "",
          mainText: (doc.main ?? []).join("\n"),
          createdAt: undefined,
        });
      } else setDraft(null);
    } catch (e) {
      console.error(e);
      setErr(saveError(e));
    }
  };

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    return SECTIONS.map((s) => ({
      section: s,
      codes: Object.values(catalog)
        .filter((c) => c.section === s && (!term || c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    })).filter((g) => g.codes.length);
  }, [catalog, q]);

  const toggleCode = (code: string) =>
    setDraft((d) => {
      if (!d) return d;
      const has = d.items.some((i) => i.code === code);
      const def = catalog[code];
      return { ...d, items: has ? d.items.filter((i) => i.code !== code) : [...d.items, { code, minutes: def.minutes, hr: def.hr, note: "" }] };
    });
  const setItem = (idx: number, patch: Partial<DayItem>) => setDraft((d) => (d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : d));
  const move = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const j = idx + dir;
      if (j < 0 || j >= items.length) return d;
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...d, items };
    });
  const total = draft?.items.reduce((a, i) => a + (Number(i.minutes) || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <section className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full flex-1 sm:w-auto">
            <h2 className="font-display text-2xl font-bold uppercase">Planned sessions</h2>
            <p className="text-sm text-muted">
              Season 1 runs Day 1 to Day {PLAN_LENGTH}. New sessions are added after the last planned day and unlock in order on the Training page.
            </p>
          </div>
          <button onClick={() => startNew()} className="btn btn-primary w-full sm:w-auto">
            + Plan Day {nextDay}
          </button>
          <select
            className="field w-full px-3 py-2 text-sm sm:w-auto"
            value=""
            onChange={(e) => e.target.value && startNew(Number(e.target.value))}
            aria-label="Copy drills from an existing day"
          >
            <option value="">Copy drills from…</option>
            {[...days].reverse().map((d) => (
              <option key={d.day} value={d.day}>
                Day {d.day} · {d.sessionType}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 divide-y divide-line">
          {custom.length === 0 && <p className="py-3 text-sm text-muted">No custom sessions yet. They will appear here after Day {PLAN_LENGTH}.</p>}
          {custom.map((d) => {
            const s = sessions[d.day];
            const state = s?.status === "complete" ? "Logged" : s ? "In progress" : "Planned";
            const canDelete = !s && d.day === lastCustom?.day;
            return (
              <div key={d.day} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-display w-16 text-xl font-bold">Day {d.day}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.sessionType}</p>
                  <p className="text-xs text-muted">
                    {d.plannedDate ? fmtDate(d.plannedDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + " · " : ""}
                    {d.items.map((i) => i.code).join(", ")} · {d.duration} min
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state === "Logged" ? "bg-good-soft text-good" : state === "In progress" ? "bg-warn-soft text-warn" : "bg-card-3 text-ink-2"}`}>{state}</span>
                {!s ? (
                  <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => edit(d.day)}>
                    Edit
                  </button>
                ) : (
                  <span className="text-xs text-muted">locked</span>
                )}
                {canDelete && <ConfirmButton label="Delete" onConfirm={() => remove("customDays", String(d.day))} />}
              </div>
            );
          })}
        </div>
      </section>

      {draft && (
        <section id="planner" className="card scroll-mt-24 p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display flex-1 text-2xl font-bold uppercase">{customDays.some((c) => c.day === draft.day) ? "Edit" : "Plan"} Day {draft.day}</h2>
            <span className="num text-sm text-muted">{total} min total</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Session title">
              <input className="field w-full px-3 py-2 text-sm" value={draft.sessionType} placeholder="e.g. Table: footwork + serve practice" onChange={(e) => setDraft({ ...draft, sessionType: e.target.value })} />
            </Field>
            <Field label="Plan date" hint="optional">
              <input type="date" className="field w-full px-3 py-2 text-sm" value={draft.plannedDate ?? ""} onChange={(e) => setDraft({ ...draft, plannedDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Session notes" hint="one line per point, optional" className="mt-4">
            <textarea rows={2} className="field w-full px-3 py-2 text-sm" value={draft.mainText} onChange={(e) => setDraft({ ...draft, mainText: e.target.value })} />
          </Field>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="eyebrow flex-1">Pick drills</p>
                <input className="field w-48 px-3 py-1.5 text-sm" placeholder="Search codes" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="mt-3 max-h-[480px] space-y-4 overflow-y-auto pr-1">
                {grouped.map((g) => (
                  <div key={g.section}>
                    <p className="mb-1.5 text-xs font-semibold text-ink-2">{g.section}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {g.codes.map((c) => {
                        const on = draft.items.some((i) => i.code === c.code);
                        return (
                          <label key={c.code} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition ${on ? "border-table bg-table/10" : "border-line hover:bg-card-2"}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleCode(c.code)} className="accent-[#3987e5]" />
                            <span className={`font-display rounded px-1.5 text-xs font-bold ${KIND_STYLE[c.kind]}`}>{codeBadge(c.code)}</span>
                            <span className="truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Session order ({draft.items.length})</p>
              <div className="mt-3 space-y-2">
                {draft.items.length === 0 && <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">Tick drills on the left to add them.</p>}
                {draft.items.map((it, i) => {
                  const def = catalog[it.code];
                  return (
                    <div key={it.code} className="rounded-xl border border-line bg-card-2/60 p-3">
                      <div className="flex items-center gap-2">
                        <span className="num w-5 text-xs text-muted">{i + 1}</span>
                        <span className={`font-display rounded px-1.5 text-sm font-bold ${KIND_STYLE[def?.kind ?? "table"]}`}>{codeBadge(it.code)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{def?.name ?? it.code}</span>
                        <button aria-label="Move up" className="rounded px-1.5 text-ink-2 hover:bg-card-3" onClick={() => move(i, -1)}>
                          ↑
                        </button>
                        <button aria-label="Move down" className="rounded px-1.5 text-ink-2 hover:bg-card-3" onClick={() => move(i, 1)}>
                          ↓
                        </button>
                        <button aria-label="Remove" className="rounded px-1.5 text-bad hover:bg-card-3" onClick={() => toggleCode(it.code)}>
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 pl-7">
                        <label className="field flex w-24 items-center gap-1 px-2 text-sm">
                          <input type="number" min={0} max={240} value={it.minutes} onChange={(e) => setItem(i, { minutes: Number(e.target.value) })} className="num w-full bg-transparent py-1 outline-none" aria-label={`${it.code} minutes`} />
                          <span className="text-xs text-muted">min</span>
                        </label>
                        <Toggle checked={!!it.hr} onChange={(v) => setItem(i, { hr: v })} label={<span className="text-ink-2">Heart rate</span>} />
                        {(def?.tests.length ?? 0) > 0 && <span className="text-xs text-muted">scored</span>}
                      </div>
                      <input className="field mt-2 ml-7 w-[calc(100%-1.75rem)] px-2 py-1.5 text-sm" placeholder="Note for this drill (optional), e.g. 3 x 10 balls" value={it.note ?? ""} onChange={(e) => setItem(i, { note: e.target.value })} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {err && <p className="mt-4 text-sm text-bad">{err}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => save(false)}>
              Save Day {draft.day}
            </button>
            {!customDays.some((c) => c.day === draft.day) && (
              <button className="btn btn-ghost" onClick={() => save(true)}>
                Save and plan Day {draft.day + 1}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
