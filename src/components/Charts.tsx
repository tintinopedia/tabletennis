"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar, Legend, ComposedChart } from "recharts";
import type { TestRow, HrRow, VolumeRow, DrillPeriodRow, HrPeriodRow } from "@/lib/analytics";
import { fmtDate } from "@/lib/analytics";

export const S1 = "#3987e5";
export const S2 = "#d95926";
export const CRIT = "#d03b3b";
const GRID = "#1e2a42";
const AXIS = { fontSize: 11, fill: "#7b879b" };
const SURF = "#0f1626";
const legendStyle = { fontSize: 12, color: "#b7c0cf" };

function Tip({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line-2 bg-card-2 px-3 py-2 text-xs text-ink shadow-xl">{children}</div>;
}
export function Empty({ text = "Charts fill in after the first logged session." }: { text?: string }) {
  return <div className="grid h-full min-h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">{text}</div>;
}

export function VolumeChart({ rows }: { rows: VolumeRow[] }) {
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={12} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as VolumeRow;
            return (
              <Tip>
                <p className="font-semibold">{r.label}</p>
                <p className="num">
                  Table {r.table.toFixed(1)} h · Physical {r.physical.toFixed(1)} h
                </p>
                <p className="num">
                  {r.sessions} sessions · {r.matches} matches · {r.journalDays} journal days
                </p>
              </Tip>
            );
          }}
        />
        <Bar dataKey="table" name="Table hours" stackId="h" fill={S1} stroke={SURF} strokeWidth={2} isAnimationActive={false} />
        <Bar dataKey="physical" name="Physical hours" stackId="h" fill={S2} stroke={SURF} strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DrillPeriodChart({ rows, target, max, low, unit }: { rows: DrillPeriodRow[]; target: number | null; max?: number | null; low: boolean; unit?: string }) {
  if (!rows.length) return <Empty text="No scores logged for this drill yet." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 14, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={12} />
        <YAxis domain={max ? [0, max] : ["auto", "auto"]} tick={AXIS} tickLine={false} axisLine={false} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        {target != null && <ReferenceLine y={target} stroke="#b7c0cf" strokeDasharray="4 4" label={{ value: `Target ${low ? "≤" : "≥"} ${target}`, position: "insideTopRight", fontSize: 11, fill: "#b7c0cf" }} />}
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as DrillPeriodRow;
            return (
              <Tip>
                <p className="font-semibold">{r.label}</p>
                <p className="num">
                  Average {r.avg}
                  {max ? `/${max}` : unit ? ` ${unit}` : ""} · Best {r.best}
                </p>
                <p className="num">
                  {r.tests} tests{r.passRate != null ? ` · ${Math.round(r.passRate * 100)}% at target` : ""}
                </p>
              </Tip>
            );
          }}
        />
        <Bar dataKey="avg" name="Average" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        <Line dataKey="best" name={low ? "Best (lowest)" : "Best"} stroke={S2} strokeWidth={2} dot={{ r: 4, fill: S2, stroke: SURF, strokeWidth: 2 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function HrPeriodChart({ rows }: { rows: HrPeriodRow[] }) {
  if (!rows.length) return <Empty text="No heart-rate readings yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 14, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={12} />
        <YAxis domain={["dataMin - 8", "dataMax + 8"]} tick={AXIS} tickLine={false} axisLine={false} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <Tooltip
          cursor={{ stroke: "#2d3b58" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as HrPeriodRow;
            return (
              <Tip>
                <p className="font-semibold">{r.label}</p>
                <p className="num">
                  Average {r.avg} bpm · Peak {r.peak} bpm
                </p>
                <p className="num">
                  {r.readings} readings{r.spikes ? <span className="text-bad"> · ▲ {r.spikes} spike{r.spikes > 1 ? "s" : ""}</span> : ""}
                </p>
              </Tip>
            );
          }}
        />
        <Line dataKey="avg" name="Average bpm" stroke={S1} strokeWidth={2} dot={{ r: 4, fill: S1, stroke: SURF, strokeWidth: 2 }} isAnimationActive={false} />
        <Line
          dataKey="peak"
          name="Peak bpm"
          stroke={S2}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(p: { cx?: number; cy?: number; payload?: HrPeriodRow; index?: number }) =>
            p.payload?.spikes ? (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={6} fill={CRIT} stroke={SURF} strokeWidth={2} />
            ) : (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={S2} stroke={SURF} strokeWidth={2} />
            )
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HrReadingsChart({ rows }: { rows: HrRow[] }) {
  if (!rows.length) return <Empty text="No heart-rate readings for this drill yet." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 18, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis domain={["dataMin - 8", "dataMax + 8"]} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: "#2d3b58" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as HrRow;
            return (
              <Tip>
                <p className="font-semibold">
                  Day {r.day} · {fmtDate(r.date, { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="num">{r.hr} bpm</p>
                {r.baseline != null && <p className="num text-ink-2">Usual for this drill ≈ {r.baseline} bpm</p>}
                {r.spike && <p className="font-semibold text-bad">▲ Spike: +{r.delta ?? "?"} bpm above usual</p>}
              </Tip>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="hr"
          stroke={S2}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(p: { cx?: number; cy?: number; payload?: HrRow; index?: number }) =>
            p.payload?.spike ? (
              <g key={p.index}>
                <circle cx={p.cx} cy={p.cy} r={7} fill={CRIT} stroke={SURF} strokeWidth={2} />
                <text x={p.cx} y={(p.cy ?? 0) - 11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#f06a6a">
                  ▲
                </text>
              </g>
            ) : (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={S2} stroke={SURF} strokeWidth={1.5} />
            )
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ values, target, low }: { values: number[]; target: number | null; low: boolean }) {
  if (values.length < 2) return <span className="text-xs text-muted">-</span>;
  const w = 84,
    h = 24;
  const all = target != null ? [...values, target] : values;
  const mn = Math.min(...all),
    mx = Math.max(...all);
  const y = (v: number) => (mx === mn ? h / 2 : h - 2 - ((v - mn) / (mx - mn)) * (h - 4));
  const x = (i: number) => 2 + (i / (values.length - 1)) * (w - 4);
  return (
    <svg width={w} height={h} role="img" aria-label={`Trend${low ? " (lower is better)" : ""}`}>
      {target != null && <line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke="#3a4866" strokeDasharray="2 3" />}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={S1} strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill={S1} />
    </svg>
  );
}

export function MiniLine({ rows, unit }: { rows: TestRow[]; unit?: string }) {
  if (!rows.length) return <Empty text="Not tested yet" />;
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <Tip>
                <p className="num font-semibold">
                  {(payload[0].payload as TestRow).score} {unit}
                </p>
                <p>{fmtDate((payload[0].payload as TestRow).date, { day: "numeric", month: "short", year: "numeric" })}</p>
              </Tip>
            ) : null
          }
        />
        <Line type="monotone" dataKey="score" stroke={S1} strokeWidth={2} dot={{ r: 4, fill: S1, stroke: SURF, strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
