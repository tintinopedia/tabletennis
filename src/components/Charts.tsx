"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { TestRow, HrRow, WeekRow } from "@/lib/analytics";
import { fmtDate } from "@/lib/analytics";

const S1 = "#2a78d6";
const S2 = "#eb6834";
const GRID = "#e4e2da";
const AXIS = { fontSize: 11, fill: "#8a8880" };

function Tip({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-md">{children}</div>;
}

export function Empty({ text = "Charts fill in after the first logged session." }: { text?: string }) {
  return <div className="grid h-full min-h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">{text}</div>;
}

export function ScoreChart({ rows, target, max, low, unit }: { rows: TestRow[]; target: number | null; max?: number; low: boolean; unit?: string }) {
  if (!rows.length) return <Empty text="No scores logged for this drill yet." />;
  const data = rows.map((r, i) => ({ ...r, i: i + 1 }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis domain={max ? [0, max] : ["auto", "auto"]} allowDecimals={!max} tick={AXIS} tickLine={false} axisLine={false} reversed={false} />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="#52514e"
            strokeDasharray="4 4"
            label={{ value: `Target ${low ? "≤" : "≥"} ${target}`, position: "insideTopRight", fontSize: 11, fill: "#52514e" }}
          />
        )}
        <Tooltip
          cursor={{ stroke: "#c3c2b7" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as TestRow;
            return (
              <Tip>
                <p className="font-semibold">
                  Day {r.day} · {fmtDate(r.date, { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="num">
                  Score {r.score}
                  {max ? `/${max}` : unit ? ` ${unit}` : ""} · {r.level}
                </p>
                {r.met != null && <p className={r.met ? "text-good" : "text-warn"}>{r.met ? "✓ Target met" : "Below target"}</p>}
              </Tip>
            );
          }}
        />
        <Line type="monotone" dataKey="score" stroke={S1} strokeWidth={2} dot={{ r: 4, fill: S1, stroke: "#fcfcfb", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HrChart({ rows }: { rows: HrRow[] }) {
  if (!rows.length) return <Empty text="No heart-rate readings for this drill yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis domain={["dataMin - 8", "dataMax + 8"]} tick={AXIS} tickLine={false} axisLine={false} unit="" />
        <Tooltip
          cursor={{ stroke: "#c3c2b7" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <Tip>
                <p className="font-semibold">Day {(payload[0].payload as HrRow).day}</p>
                <p className="num">{(payload[0].payload as HrRow).hr} bpm</p>
              </Tip>
            ) : null
          }
        />
        <Line type="monotone" dataKey="hr" stroke={S2} strokeWidth={2} dot={{ r: 4, fill: S2, stroke: "#fcfcfb", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart({ rows }: { rows: WeekRow[] }) {
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tickFormatter={(d) => fmtDate(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Tooltip
          cursor={{ fill: "rgba(15,27,45,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as WeekRow;
            return (
              <Tip>
                <p className="font-semibold">Week of {fmtDate(r.week, { day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="num">Table {r.table.toFixed(1)} h · Physical {r.physical.toFixed(1)} h</p>
                <p className="num">Total {(r.table + r.physical).toFixed(1)} h · {r.sessions} sessions</p>
                <p className="num">Matches {r.matches} · Journal days {r.journalDays}/7</p>
              </Tip>
            );
          }}
        />
        <Bar dataKey="table" name="Table hours" stackId="h" fill={S1} stroke="#fcfcfb" strokeWidth={2} isAnimationActive={false} />
        <Bar dataKey="physical" name="Physical hours" stackId="h" fill={S2} stroke="#fcfcfb" strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
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
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg width={w} height={h} aria-label={`Trend ${low ? "(lower is better)" : ""}`} role="img">
      {target != null && <line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke="#c3c2b7" strokeDasharray="2 3" />}
      <polyline points={pts} fill="none" stroke={S1} strokeWidth={1.75} strokeLinejoin="round" />
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
        <Line type="monotone" dataKey="score" stroke={S1} strokeWidth={2} dot={{ r: 4, fill: S1, stroke: "#fcfcfb", strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
