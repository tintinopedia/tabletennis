"use client";
import { useState } from "react";
import { ConfirmButton, Field, Toggle, Toast, useToast } from "../ui";
import { newId, put, remove, saveError } from "@/lib/store";
import { fmtDate, todayIso } from "@/lib/analytics";
import { useCoaches, type CoachDoc } from "@/lib/player";

type Form = { id?: string; name: string; from: string; to: string; current: boolean; createdAt?: number };
const blank = (): Form => ({ name: "", from: "", to: "", current: true });
const d = (iso: string) => fmtDate(iso, { day: "numeric", month: "short", year: "numeric" });

export function CoachHistory() {
  const rows = useCoaches();
  const [form, setForm] = useState<Form>(blank());
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const save = async () => {
    if (!form.name.trim()) return setErr("Enter the coach's name.");
    if (!form.from) return setErr("Pick the date the coach started.");
    if (form.from > todayIso()) return setErr("The start date can't be in the future.");
    if (!form.current) {
      if (!form.to) return setErr("Pick the end date, or switch on Still coaching.");
      if (form.to < form.from) return setErr("The end date must be on or after the start date.");
    }
    setErr(null);
    const id = form.id ?? newId();
    try {
      await put("coaches", id, { name: form.name.trim(), from: form.from, to: form.current ? "" : form.to, createdAt: form.createdAt ?? Date.now() });
      showToast(form.id ? "Coach updated" : "Coach added");
      setForm(blank());
    } catch (e) {
      setErr(saveError(e));
    }
  };
  const edit = (c: CoachDoc) => {
    setForm({ id: c.id, name: c.name, from: c.from, to: c.to, current: !c.to, createdAt: c.createdAt });
    setErr(null);
    document.getElementById("coach-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="card overflow-hidden">
      <Toast text={toast} />
      <div id="coach-form" className="p-5">
        <h2 className="font-display text-2xl font-bold uppercase">{form.id ? "Edit coach" : "Coaches"}</h2>
        <p className="text-sm text-muted">Who has coached Tintin, and when. The current coach shows on the Home profile card.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px_170px]">
          <Field label="Coach name">
            <input className="field w-full px-3 py-2 text-sm" placeholder="e.g. Coach Ramesh" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="From">
            <input type="date" max={todayIso()} className="field w-full px-3 py-2 text-sm" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </Field>
          <Field label="To">
            <input
              type="date"
              min={form.from || undefined}
              disabled={form.current}
              className="field w-full px-3 py-2 text-sm disabled:opacity-40"
              value={form.current ? "" : form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle checked={form.current} onChange={(v) => setForm({ ...form, current: v })} label="Still coaching (no end date yet)" />
        </div>
        {err && <p className="mt-3 text-sm text-bad">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={save}>
            {form.id ? "Save changes" : "Add coach"}
          </button>
          {form.id && (
            <button className="btn btn-ghost" onClick={() => setForm(blank())}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {!rows?.length ? (
        <p className="border-t border-line px-5 py-4 text-sm text-muted">No coaches recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-y border-line bg-card-2/50 text-left text-xs text-muted">
                <th className="px-5 py-2 font-medium">Coach</th>
                <th className="px-2 py-2 font-medium">From</th>
                <th className="px-2 py-2 font-medium">To</th>
                <th className="px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={`border-b border-line/70 ${form.id === c.id ? "bg-table/10" : ""}`}>
                  <td className="px-5 py-2.5 font-semibold">
                    {c.name}
                    {!c.to && <span className="ml-2 rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-bold uppercase text-good">Current</span>}
                  </td>
                  <td className="px-2">{d(c.from)}</td>
                  <td className="px-2 text-ink-2">{c.to ? d(c.to) : "Present"}</td>
                  <td className="px-5 py-1.5 text-right whitespace-nowrap">
                    <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => edit(c)}>
                      Edit
                    </button>{" "}
                    <ConfirmButton label="Delete" confirm="Delete coach?" onConfirm={() => remove("coaches", c.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
