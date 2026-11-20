"use client";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ConfirmButton, Field, Toast, useToast } from "../ui";
import { Empty } from "../Charts";
import { newId, put, remove, saveError } from "@/lib/store";
import { fmtDate, todayIso } from "@/lib/analytics";
import { fmtHeight, fmtWeight, useMeasurements, useProfile, type Measurement } from "@/lib/player";

const S1 = "#3987e5";
const S2 = "#d95926";
const GRID = "#1e2a42";
const AXIS = { fontSize: 11, fill: "#7b879b" };

type Form = { id?: string; date: string; ft: string; inch: string; kg: string; createdAt?: number };
const blank = (): Form => ({ date: todayIso(), ft: "", inch: "", kg: "" });

export function PlayerProfile() {
  const rows = useMeasurements();
  const profile = useProfile();
  const [form, setForm] = useState<Form>(blank());
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  // playing details
  const [grip, setGrip] = useState("");
  const [style, setStyle] = useState("");
  const [hand, setHand] = useState<"Right" | "Left" | "">("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (profile && !loaded) {
      setGrip(profile.grip ?? "");
      setStyle(profile.style ?? "");
      setHand(profile.hand ?? "");
      setLoaded(true);
    }
  }, [profile, loaded]);

  const saveMeasurement = async () => {
    const ft = Number(form.ft),
      inch = Number(form.inch || 0),
      kg = Number(form.kg);
    if (!form.date) return setErr("Pick the date the measurement was taken.");
    if (form.date > todayIso()) return setErr("The date can't be in the future.");
    if (!(ft >= 2 && ft <= 7) || !(inch >= 0 && inch < 12)) return setErr("Enter height as feet (2 to 7) and inches (0 to 11.5).");
    if (!(kg >= 10 && kg <= 150)) return setErr("Enter weight in kg (10 to 150).");
    setErr(null);
    const id = form.id ?? newId();
    try {
      await put("measurements", id, { date: form.date, heightIn: +(ft * 12 + inch).toFixed(1), weightKg: +kg.toFixed(1), createdAt: form.createdAt ?? Date.now() });
      showToast(form.id ? "Entry updated" : "Measurement saved");
      setForm(blank());
    } catch (e) {
      setErr(saveError(e));
    }
  };
  const edit = (m: Measurement) => {
    const ft = Math.floor(m.heightIn / 12);
    setForm({ id: m.id, date: m.date, ft: String(ft), inch: String(+(m.heightIn - ft * 12).toFixed(1)), kg: String(m.weightKg), createdAt: m.createdAt });
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveProfile = async () => {
    try {
      await put("profile", "main", { grip: grip.trim(), style: style.trim(), hand, updatedAt: Date.now() });
      showToast("Playing details saved");
    } catch (e) {
      setErr(saveError(e));
    }
  };

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold uppercase">{form.id ? "Edit measurement" : "Height and weight"}</h2>
        <p className="text-sm text-muted">Record once a month. These show on the Home profile card.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr_160px]">
          <Field label="Captured on">
            <input type="date" max={todayIso()} className="field w-full px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Height">
            <div className="flex gap-2">
              <label className="field flex flex-1 items-center gap-1 px-3">
                <input type="number" inputMode="numeric" min={2} max={7} className="num w-full bg-transparent py-2 text-sm outline-none" placeholder="4" value={form.ft} onChange={(e) => setForm({ ...form, ft: e.target.value })} aria-label="Height feet" />
                <span className="text-xs text-muted">ft</span>
              </label>
              <label className="field flex flex-1 items-center gap-1 px-3">
                <input type="number" inputMode="decimal" min={0} max={11.5} step={0.5} className="num w-full bg-transparent py-2 text-sm outline-none" placeholder="2" value={form.inch} onChange={(e) => setForm({ ...form, inch: e.target.value })} aria-label="Height inches" />
                <span className="text-xs text-muted">in</span>
              </label>
            </div>
          </Field>
          <Field label="Weight">
            <label className="field flex items-center gap-1 px-3">
              <input type="number" inputMode="decimal" min={10} max={150} step={0.1} className="num w-full bg-transparent py-2 text-sm outline-none" placeholder="26.5" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} aria-label="Weight kg" />
              <span className="text-xs text-muted">kg</span>
            </label>
          </Field>
        </div>
        {err && <p className="mt-3 text-sm text-bad">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={saveMeasurement}>
            {form.id ? "Save changes" : "Add measurement"}
          </button>
          {form.id && (
            <button className="btn btn-ghost" onClick={() => setForm(blank())}>
              Cancel
            </button>
          )}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <p className="eyebrow mb-3">Playing details</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_160px]">
            <Field label="Grip">
              <input className="field w-full px-3 py-2 text-sm" placeholder="e.g. Shakehand" value={grip} onChange={(e) => setGrip(e.target.value)} />
            </Field>
            <Field label="Style">
              <input className="field w-full px-3 py-2 text-sm" placeholder="e.g. Offensive, two-wing looper" value={style} onChange={(e) => setStyle(e.target.value)} />
            </Field>
            <Field label="Playing hand">
              <select className="field w-full px-3 py-2 text-sm" value={hand} onChange={(e) => setHand(e.target.value as "Right" | "Left" | "")}>
                <option value="">Select</option>
                <option>Right</option>
                <option>Left</option>
              </select>
            </Field>
          </div>
          <button className="btn btn-ghost mt-4" onClick={saveProfile}>
            Save playing details
          </button>
        </div>
      </section>

      <GrowthCharts rows={rows ?? []} />

      <section className="card overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="font-display text-2xl font-bold uppercase">History</h2>
          <p className="text-sm text-muted">Latest first.</p>
        </div>
        {!rows?.length ? (
          <p className="px-5 pb-5 text-sm text-muted">No measurements yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-y border-line bg-card-2/50 text-left text-xs text-muted">
                  <th className="px-5 py-2 font-medium">Captured date</th>
                  <th className="px-2 py-2 text-right font-medium">Height</th>
                  <th className="px-2 py-2 text-right font-medium">Weight</th>
                  <th className="px-5 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className={`border-b border-line/70 ${form.id === m.id ? "bg-table/10" : ""}`}>
                    <td className="px-5 py-2.5">{fmtDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="num px-2 text-right">{fmtHeight(m.heightIn)}</td>
                    <td className="num px-2 text-right">{fmtWeight(m.weightKg)}</td>
                    <td className="px-5 py-1.5 text-right whitespace-nowrap">
                      <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => edit(m)}>
                        Edit
                      </button>{" "}
                      <ConfirmButton label="Delete" onConfirm={() => remove("measurements", m.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function GrowthCharts({ rows }: { rows: Measurement[] }) {
  const [mode, setMode] = useState<"month" | "year">("month");
  const data = useMemo(() => {
    // latest reading in each month / year, oldest first
    const map = new Map<string, Measurement>();
    for (const m of [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)) map.set(mode === "month" ? m.date.slice(0, 7) : m.date.slice(0, 4), m);
    return [...map.entries()].map(([k, m]) => ({
      key: k,
      label: mode === "month" ? new Date(k + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : k,
      date: m.date,
      height: m.heightIn,
      weight: m.weightKg,
    }));
  }, [rows, mode]);
  const first = data[0],
    last = data[data.length - 1];
  const dH = first && last && data.length > 1 ? +(last.height - first.height).toFixed(1) : null;
  const dW = first && last && data.length > 1 ? +(last.weight - first.weight).toFixed(1) : null;
  const tip = (unit: "h" | "w") =>
    function T({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
      if (!active || !payload?.length) return null;
      const r = payload[0].payload as (typeof data)[number];
      return (
        <div className="rounded-lg border border-line-2 bg-card-2 px-3 py-2 text-xs shadow-xl">
          <p className="font-semibold">{fmtDate(r.date, { day: "numeric", month: "short", year: "numeric" })}</p>
          <p className="num">{unit === "h" ? fmtHeight(r.height) : fmtWeight(r.weight)}</p>
        </div>
      );
    };
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <h2 className="font-display text-2xl font-bold uppercase">Growth</h2>
          <p className="text-sm text-muted">
            {dH != null ? `Since ${fmtDate(first.date, { month: "short", year: "numeric" })}: ${dH >= 0 ? "+" : ""}${dH} in height, ${dW! >= 0 ? "+" : ""}${dW} kg.` : "Changes appear once there are two or more entries."}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-card-2/50 p-1" role="tablist" aria-label="Growth period">
          {(["month", "year"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-sm font-medium ${mode === m ? "bg-ink text-paper" : "text-ink-2"}`}>
              {m === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="mt-4 h-48">
          <Empty text="Add the first measurement to start the growth chart." />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-2">Height</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={12} />
                <YAxis domain={[(m: number) => Math.floor(m - 1), (m: number) => Math.ceil(m + 1)]} allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtHeight(v)} width={52} />
                <Tooltip content={tip("h")} cursor={{ stroke: "#2d3b58" }} />
                <Line dataKey="height" stroke={S1} strokeWidth={2} dot={{ r: 4, fill: S1, stroke: "#0f1626", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-2">Weight</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={12} />
                <YAxis domain={[(m: number) => Math.floor(m - 1), (m: number) => Math.ceil(m + 1)]} allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} kg`} width={52} />
                <Tooltip content={tip("w")} cursor={{ stroke: "#2d3b58" }} />
                <Line dataKey="weight" stroke={S2} strokeWidth={2} dot={{ r: 4, fill: S2, stroke: "#0f1626", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
