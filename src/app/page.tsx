"use client";
import { useMemo, useState } from "react";
import { useSessions } from "@/components/useSessions";
import { ScoreChart, HrChart, VolumeChart, Sparkline, MiniLine, Empty } from "@/components/Charts";
import { DAYS, TOTAL_DAYS, TOURNAMENT_DATE, TEST_BY_CODE, HR_CODES, DRILL_CARDS, phaseList } from "@/lib/plan";
import { drillStats, weeklyVolume, totals, heartRates, currentDay, daysUntil, fmtDate } from "@/lib/analytics";

const pct = (v: number | null) => (v == null ? "-" : `${Math.round(v * 100)}%`);

export default function Dashboard() {
  const sessions = useSessions();
  const data = useMemo(() => {
    if (!sessions) return null;
    return {
      stats: drillStats(sessions),
      weeks: weeklyVolume(sessions),
      tot: totals(sessions),
      hr: heartRates(sessions),
      cur: currentDay(sessions),
    };
  }, [sessions]);
  const [drill, setDrill] = useState("D4");
  const [hrCode, setHrCode] = useState<string | null>(null);

  if (!sessions || !data) return <p className="py-20 text-center text-muted">Loading the journal…</p>;
  const { stats, weeks, tot, hr, cur } = data;
  const drillStatsOnly = stats.filter((s) => s.code.startsWith("D"));
  const physStats = stats.filter((s) => s.code.startsWith("P-"));
  const sel = stats.find((s) => s.code === drill)!;
  const hrWithData = HR_CODES.filter((c) => hr[c].length);
  const activeHr = hrCode && hr[hrCode]?.length ? hrCode : hrWithData[0] ?? null;
  const hrRows = activeHr ? hr[activeHr] : [];
  const hrDelta = hrRows.length >= 2 ? hrRows[hrRows.length - 1].hr - hrRows[0].hr : null;
  const daysLeft = daysUntil(TOURNAMENT_DATE);
  const phase = DAYS[Math.min(cur, TOTAL_DAYS) - 1].phase;
  const levelUps = drillStatsOnly.filter((s) => s.levelUp);

  return (
    <div className="space-y-6 pt-6">
      {/* Hero */}
      <section className="court-bg relative overflow-hidden rounded-3xl p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-ball/90 shadow-[inset_-18px_-18px_0_rgba(0,0,0,0.12)] sm:h-64 sm:w-64" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">The Table Tennis Journal</p>
          <h1 className="font-display mt-2 text-5xl font-bold uppercase leading-[0.9] sm:text-7xl">
            Ahaan
            <br />
            Basu Mojumdar
          </h1>
          <p className="mt-4 max-w-lg text-white/85">
            A 164-day road from first baselines to the May 2027 tournament. Every drill, score and heartbeat is logged here.
          </p>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Tournament</p>
            <p className="font-display num text-4xl font-bold">{daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? "Today!" : "Done"}</p>
            <p className="text-xs text-white/70">{fmtDate(TOURNAMENT_DATE, { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Current phase</p>
            <p className="font-display text-3xl font-bold leading-tight">{cur > TOTAL_DAYS ? "Season complete" : phase}</p>
            <p className="text-xs text-white/70">{cur > TOTAL_DAYS ? "All sessions logged" : `Next up: Day ${cur}, ${DAYS[cur - 1].sessionType}`}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Plan progress</p>
            <p className="font-display num text-4xl font-bold">
              {tot.sessions}
              <span className="text-xl text-white/60">/{TOTAL_DAYS}</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-ball" style={{ width: `${(tot.sessions / TOTAL_DAYS) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Training hours" value={tot.hours.toFixed(1)} sub={`${tot.trainingSessions} training sessions`} />
        <Kpi label="Day streak" value={String(tot.streak)} sub={tot.lastDate ? `Last logged ${fmtDate(tot.lastDate)}` : "No sessions yet"} />
        <Kpi label="Tests at target" value={pct(tot.passRate)} sub={`${tot.tests} graded tests`} />
        <Kpi label="Ready to level up" value={String(levelUps.length)} sub={levelUps.length ? levelUps.map((l) => l.code).join(", ") : "Pass twice in a row to move up"} />
      </section>

      {/* Season map */}
      <section className="card p-5">
        <Head title="Season map" sub="One square per planned day. Filled squares are logged sessions." />
        <div className="mt-4 space-y-3">
          {phaseList().map((p) => (
            <div key={p.name} className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted">
                  Days {p.start}–{p.end} · {DAYS.slice(p.start - 1, p.end).filter((d) => sessions[d.day]?.status === "complete").length}/{p.end - p.start + 1} logged
                </p>
              </div>
              <div className="flex flex-wrap gap-[3px]">
                {DAYS.slice(p.start - 1, p.end).map((d) => {
                  const done = sessions[d.day]?.status === "complete";
                  const isCur = d.day === cur;
                  const rest = d.duration === 0;
                  return (
                    <span
                      key={d.day}
                      title={`Day ${d.day} · ${d.sessionType}${done ? ` · logged ${fmtDate(sessions[d.day].trainingDate)}` : ""}`}
                      className={`h-4 w-4 rounded-[4px] ${
                        done ? (rest ? "bg-[#86b6ef]" : "bg-table") : isCur ? "bg-ball ring-2 ring-ball/30" : rest ? "border border-dashed border-line bg-transparent" : "bg-line"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-2">
          <Key cls="bg-table" label="Training logged" />
          <Key cls="bg-[#86b6ef]" label="Rest day logged" />
          <Key cls="bg-ball" label="Next session" />
          <Key cls="bg-line" label="Upcoming" />
          <Key cls="border border-dashed border-line" label="Upcoming rest day" />
        </div>
      </section>

      {/* Drill scoreboard */}
      <section className="card overflow-hidden">
        <div className="p-5 pb-3">
          <Head title="Drill scoreboard" sub="10-ball tests from the Progress Tracker. 8/10 (or the drill's target) twice in a row at one level means move up." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-paper/60 text-left text-xs text-muted">
                <th className="px-5 py-2 font-medium">Drill</th>
                <th className="px-2 py-2 text-right font-medium">Tests</th>
                <th className="px-2 py-2 text-right font-medium">Latest</th>
                <th className="px-2 py-2 font-medium">Level</th>
                <th className="px-2 py-2 text-right font-medium">Best</th>
                <th className="px-2 py-2 text-right font-medium">Target</th>
                <th className="px-2 py-2 font-medium">At target</th>
                <th className="px-2 py-2 font-medium">Trend</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {drillStatsOnly.map((s) => {
                const max = TEST_BY_CODE[s.code].max;
                return (
                  <tr
                    key={s.code}
                    onClick={() => setDrill(s.code)}
                    className={`cursor-pointer border-b border-line/70 transition hover:bg-paper/70 ${drill === s.code ? "bg-[#e3eefb]/50" : ""}`}
                  >
                    <td className="px-5 py-2.5">
                      <span className="font-display mr-2 inline-block w-12 text-base font-bold">{s.code}</span>
                      <span className="text-ink-2">{s.name}</span>
                    </td>
                    <td className="num px-2 text-right">{s.attempts || "-"}</td>
                    <td className="num px-2 text-right font-semibold">{s.latest ?? "-"}{s.latest != null && max ? <span className="font-normal text-muted">/{max}</span> : ""}</td>
                    <td className="px-2 text-ink-2">{s.latestLevel ?? "-"}</td>
                    <td className="num px-2 text-right">{s.best ?? "-"}</td>
                    <td className="num px-2 text-right text-ink-2">{s.direction === "low" ? "≤" : "≥"}{s.target}</td>
                    <td className="px-2">
                      {s.passRate == null ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                            <span className="block h-full rounded-full bg-series-1" style={{ width: `${s.passRate * 100}%` }} />
                          </span>
                          <span className="num text-xs">{pct(s.passRate)}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-2">
                      <Sparkline values={s.series.map((r) => r.score)} target={s.target} low={s.direction === "low"} />
                    </td>
                    <td className="px-5">
                      {s.levelUp ? (
                        <span className="rounded-full bg-good-soft px-2 py-1 text-xs font-semibold text-good">▲ Level up</span>
                      ) : s.attempts ? (
                        <span className="text-xs text-ink-2">Keep going</span>
                      ) : (
                        <span className="text-xs text-muted">Not tested</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill detail + HR */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <Head title={`${sel.code} progress`} sub={`${DRILL_CARDS[sel.code.slice(0, 2)]?.title ?? sel.name} · ${TEST_BY_CODE[sel.code].counts}`} />
          <Chips options={drillStatsOnly.map((s) => s.code)} value={drill} onChange={setDrill} />
          <div className="mt-3">
            <ScoreChart rows={sel.series} target={sel.target} max={TEST_BY_CODE[sel.code].max} low={sel.direction === "low"} />
          </div>
          {sel.attempts > 1 && sel.first != null && sel.latest != null && (
            <p className="mt-2 text-sm text-ink-2">
              From <b className="num">{sel.first}</b> on the first test to <b className="num">{sel.latest}</b> now
              {sel.direction === "low" ? " (fewer is better)." : "."}
            </p>
          )}
        </div>
        <div className="card p-5">
          <Head title="Heart rate" sub="Peak bpm logged after D1–D9 and W1–W3. Lower at the same work means better fitness." />
          {hrWithData.length ? (
            <>
              <Chips options={hrWithData} value={activeHr!} onChange={setHrCode} />
              <div className="mt-3">
                <HrChart rows={hrRows} />
              </div>
              {hrDelta != null && (
                <p className="mt-2 text-sm text-ink-2">
                  {activeHr}: <b className="num">{hrRows[0].hr}</b> → <b className="num">{hrRows[hrRows.length - 1].hr}</b> bpm ({hrDelta > 0 ? "+" : ""}
                  {hrDelta} bpm across {hrRows.length} readings).
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 h-60">
              <Empty text="Heart-rate readings will appear here once logged." />
            </div>
          )}
        </div>
      </section>

      {/* Weekly volume */}
      <section className="card p-5">
        <Head title="Weekly training volume" sub="Hours from completed steps, split into table work and physical work (warm-up, circuits, cooldown)." />
        <div className="mt-3">
          <VolumeChart rows={weeks} />
        </div>
        {weeks.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <Stat label="Avg hours / week" value={(weeks.reduce((a, w) => a + w.table + w.physical, 0) / weeks.length).toFixed(1)} />
            <Stat label="Matches played" value={String(weeks.reduce((a, w) => a + w.matches, 0))} />
            <Stat label="Avg journal days / week" value={(weeks.reduce((a, w) => a + w.journalDays, 0) / weeks.length).toFixed(1)} />
          </div>
        )}
      </section>

      {/* Physical battery */}
      <section className="card p-5">
        <Head title="Physical battery" sub="Retested at Day 1, Day 30 and every 6–8 weeks. Best of 2–3 trials." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {physStats.map((s) => {
            const t = TEST_BY_CODE[s.code];
            const change = s.first != null && s.latest != null && s.attempts > 1 ? s.latest - s.first : null;
            const better = change == null ? null : s.direction === "low" ? change < 0 : change > 0;
            return (
              <div key={s.code} className="rounded-xl border border-line p-3">
                <p className="text-xs font-semibold text-ink-2">{t.name}</p>
                <p className="font-display num text-3xl font-bold">
                  {s.latest ?? "-"} <span className="font-sans text-xs font-normal text-muted">{t.unit}</span>
                </p>
                <p className={`text-xs ${better == null ? "text-muted" : better ? "text-good" : "text-warn"}`}>
                  {change == null ? (s.direction === "low" ? "Lower is better" : "Higher is better") : `${better ? "▲" : "▼"} ${Math.abs(+change.toFixed(2))} ${t.unit} since first test`}
                </p>
                <div className="mt-2 h-[110px]">
                  <MiniLine rows={s.series} unit={t.unit} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold uppercase leading-tight">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="font-display num mt-1 text-4xl font-bold">{value}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="font-display num text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
function Key({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-[3px] ${cls}`} /> {label}
    </span>
  );
}
function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${value === o ? "bg-ink text-white" : "bg-paper text-ink-2 hover:bg-line"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
