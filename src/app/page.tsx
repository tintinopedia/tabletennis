"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { VolumeChart, DrillPeriodChart, HrPeriodChart, HrReadingsChart, Sparkline, MiniLine, Empty } from "@/components/Charts";
import { VideoCarousel } from "@/components/Media";
import { IngredientCarousel } from "@/components/ingredients/IngredientCarousel";
import { useProducts } from "@/components/ingredients/useProducts";
import { phaseList, isPhysicalTest } from "@/lib/plan";
import { subscribe, type VideoDoc } from "@/lib/store";
import {
  drillStats,
  totals,
  heartRates,
  currentDay,
  fmtDate,
  volumeByPeriod,
  drillByPeriod,
  hrByPeriod,
  periodKey,
  periodLabel,
  PERIODS,
  PERIOD_LABEL,
  type Period,
} from "@/lib/analytics";

const pct = (v: number | null) => (v == null ? "-" : `${Math.round(v * 100)}%`);

export default function Home() {
  const { ready, sessions, days, catalog, tests } = useData();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  useEffect(() => subscribe<VideoDoc>("videos", (rows) => setVideos(rows.filter((v) => v.published).sort((a, b) => b.order - a.order)), { publishedOnly: true }), []);
  const [period, setPeriod] = useState<Period>("month");
  const ingredients = useProducts({ publishedOnly: true });
  const [drill, setDrill] = useState<string | null>(null);
  const [hrCode, setHrCode] = useState<string | null>(null);

  const data = useMemo(() => {
    const stats = drillStats(sessions, tests);
    return { stats, tot: totals(sessions, days, catalog, tests), hr: heartRates(sessions), cur: currentDay(sessions, days) };
  }, [sessions, days, catalog, tests]);
  const volume = useMemo(() => volumeByPeriod(sessions, days, catalog, period), [sessions, days, catalog, period]);

  if (!ready) return <p className="py-20 text-center text-muted">Loading the journal…</p>;
  const { stats, tot, hr, cur } = data;
  const drillStatsOnly = stats.filter((s) => !isPhysicalTest(s.code));
  const physStats = stats.filter((s) => isPhysicalTest(s.code));
  const withData = drillStatsOnly.filter((s) => s.attempts);
  const selCode = drill && stats.some((s) => s.code === drill) ? drill : (withData.find((s) => s.code === "D4") ?? withData[0] ?? drillStatsOnly[0])?.code;
  const sel = stats.find((s) => s.code === selCode);
  const hrCodes = Object.keys(hr)
    .filter((c) => hr[c].length)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const activeHr = hrCode && hr[hrCode]?.length ? hrCode : hrCodes[0] ?? null;
  const hrRows = activeHr ? hr[activeHr] : [];
  const spikes = Object.values(hr)
    .flat()
    .filter((r) => r.spike)
    .sort((a, b) => b.date.localeCompare(a.date) || b.day - a.day);
  const levelUps = drillStatsOnly.filter((s) => s.levelUp);
  const next = days[cur - 1];

  // heatmap: last 8 periods
  const hmKeys = [...new Set(withData.flatMap((s) => s.series.map((r) => periodKey(r.date, period))))].sort().slice(-8);
  const hmRows = withData
    .filter((s) => s.def.target != null)
    .map((s) => ({
      s,
      cells: hmKeys.map((k) => {
        const rs = s.series.filter((r) => periodKey(r.date, period) === k && r.met != null);
        return rs.length ? { v: rs.filter((r) => r.met).length / rs.length, n: rs.length } : null;
      }),
    }));

  return (
    <div className="space-y-6 pt-6">
      {/* Hero */}
      <section className="court-bg relative overflow-hidden rounded-3xl p-4 sm:p-5">
        <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
          <HeroTile label="Sessions logged" value={String(tot.sessions)} sub={`${days.length} planned so far`} bar={tot.sessions / Math.max(days.length, 1)} />
          <HeroTile
            label="Training since"
            value={tot.firstDate ? fmtDate(tot.firstDate, { month: "short", year: "numeric" }) : "Not started"}
            sub={tot.firstDate ? `${tot.trainingDays} days on court and in the gym` : "Season 1 starts with Day 1"}
          />
          <HeroTile label="Up next" value={next ? `Day ${next.day}` : "Plan more"} sub={next ? `${next.sessionType} · ${next.phase}` : "All planned sessions are logged"} />
        </div>
      </section>

      {/* Videos */}
      {(videos.length > 0 || user) && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <Head title="My videos" sub="Swipe through, tap to watch." />
            {user && (
              <Link href="/studio?tab=videos" className="text-sm font-medium text-[#8fbcf3] hover:underline">
                Manage
              </Link>
            )}
          </div>
          {videos.length ? <VideoCarousel videos={videos} /> : <Empty text="No published videos yet. Add YouTube links in Studio, My videos." />}
        </section>
      )}

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Training hours" value={tot.hours.toFixed(1)} sub={`${tot.sessions} sessions`} />
        <Kpi label="Day streak" value={String(tot.streak)} sub={tot.lastDate ? `Last logged ${fmtDate(tot.lastDate)}` : "No sessions yet"} />
        <Kpi label="Tests at target" value={pct(tot.passRate)} sub={`${tot.tests} graded tests`} />
        <Kpi label="Ready to level up" value={String(levelUps.length)} sub={levelUps.length ? levelUps.map((l) => l.code).join(", ") : "Pass twice in a row to move up"} />
      </section>

      {/* Period switch */}
      <div className="no-scrollbar sticky top-[53px] z-20 -mx-1 flex items-center gap-3 overflow-x-auto md:top-[68px] md:flex-wrap rounded-2xl border border-line bg-paper/90 px-3 py-2 backdrop-blur">
        <span className="eyebrow">Trends</span>
        <div className="flex shrink-0 gap-1 md:flex-wrap" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${period === p ? "bg-ink text-paper" : "text-ink-2 hover:bg-card-2"}`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <section className="card p-5">
        <Head title={`${PERIOD_LABEL[period]} training volume`} sub="Hours from completed steps, split into table work and physical work." />
        <div className="mt-3">
          <VolumeChart rows={volume} />
        </div>
        {volume.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <Stat label={`Avg sessions per ${period === "half" ? "half-year" : period}`} value={(volume.reduce((a, w) => a + w.sessions, 0) / volume.length).toFixed(1)} />
            <Stat label={`Avg hours per ${period === "half" ? "half-year" : period}`} value={(volume.reduce((a, w) => a + w.table + w.physical, 0) / volume.length).toFixed(1)} />
            <Stat label="Matches played" value={String(volume.reduce((a, w) => a + w.matches, 0))} />
          </div>
        )}
      </section>

      {/* Drill trends */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <Head title="Drill progress" sub={sel ? `${sel.code} · ${sel.name} · ${sel.def.counts}` : "No scored drills yet"} />
          <Chips options={drillStatsOnly.map((s) => s.code)} value={selCode ?? ""} onChange={setDrill} dim={(c) => !stats.find((s) => s.code === c)?.attempts} />
          <div className="mt-3">{sel && <DrillPeriodChart rows={drillByPeriod(sel.series, sel.def, period)} target={sel.def.target} max={sel.def.max} low={sel.def.direction === "low"} unit={sel.def.unit} />}</div>
          {sel && sel.attempts > 1 && (
            <p className="mt-2 text-sm text-ink-2">
              First test <b className="num text-ink">{sel.first}</b> → latest <b className="num text-ink">{sel.latest}</b> · best <b className="num text-ink">{sel.best}</b>
              {sel.def.direction === "low" ? " (fewer is better)" : ""}.
            </p>
          )}
        </div>
        <div className="card p-5">
          <Head title="Drills at target" sub={`Share of tests at target, ${PERIOD_LABEL[period].toLowerCase()}. Brighter is better.`} />
          {hmRows.length && hmKeys.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th />
                    {hmKeys.map((k) => (
                      <th key={k} className="px-1 pb-1 text-center font-medium text-muted">
                        {periodLabel(k, period)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hmRows.map(({ s, cells }) => (
                    <tr key={s.code}>
                      <td className="font-display pr-2 text-sm font-bold whitespace-nowrap">{s.code}</td>
                      {cells.map((c, i) => (
                        <td
                          key={i}
                          title={c ? `${s.code} ${periodLabel(hmKeys[i], period)}: ${Math.round(c.v * 100)}% of ${c.n} tests at target` : "No tests"}
                          className="num h-8 min-w-11 rounded-md text-center"
                          style={{ background: c ? `rgba(57,135,229,${0.1 + 0.8 * c.v})` : "rgba(255,255,255,0.03)", color: c && c.v > 0.55 ? "#fff" : "#b7c0cf" }}
                        >
                          {c ? `${Math.round(c.v * 100)}` : "·"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted">Numbers are % of tests at target. Empty dot = not tested in that period.</p>
            </div>
          ) : (
            <div className="mt-3 h-60">
              <Empty />
            </div>
          )}
        </div>
      </section>

      {/* Heart rate */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <Head title="Heart rate" sub="Peak bpm after each drill. Lower at the same work means fitter. ▲ marks a spike: 12+ bpm (or 8%+) above that drill's usual reading." />
          </div>
          {spikes.length > 0 && (
            <span className="rounded-full bg-bad-soft px-3 py-1 text-sm font-semibold text-bad">
              ▲ {spikes.length} spike{spikes.length > 1 ? "s" : ""} logged
            </span>
          )}
        </div>
        {hrCodes.length ? (
          <>
            <Chips options={hrCodes} value={activeHr!} onChange={setHrCode} badge={(c) => hr[c].filter((r) => r.spike).length} />
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-2">
                  {activeHr} · {PERIOD_LABEL[period].toLowerCase()} average and peak
                </p>
                <HrPeriodChart rows={hrByPeriod(hrRows, period)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-2">{activeHr} · every reading</p>
                <HrReadingsChart rows={hrRows} />
              </div>
            </div>
            {spikes.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow mb-2">Recent spikes</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {spikes.slice(0, 6).map((r) => (
                    <button
                      key={`${r.code}-${r.day}`}
                      onClick={() => setHrCode(r.code)}
                      className="flex items-center gap-3 rounded-xl border border-critical/30 bg-bad-soft px-3 py-2 text-left text-sm"
                    >
                      <span className="text-bad">▲</span>
                      <span className="flex-1">
                        <b>{r.code}</b> · Day {r.day} · {fmtDate(r.date)}
                      </span>
                      <span className="num font-semibold">
                        {r.hr} <span className="text-xs font-normal text-ink-2">(+{r.delta ?? "?"})</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-3 h-52">
            <Empty text="Heart-rate readings will appear here once logged." />
          </div>
        )}
      </section>

      {/* Season map */}
      <section className="card p-5">
        <Head title="Season map" sub="One square per planned day. Filled squares are logged sessions." />
        <div className="mt-4 space-y-3">
          {phaseList(days).map((p) => (
            <div key={p.name} className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted">
                  Days {p.start}–{p.end} · {days.slice(p.start - 1, p.end).filter((d) => sessions[d.day]?.status === "complete").length}/{p.end - p.start + 1} logged
                </p>
              </div>
              <div className="flex flex-wrap gap-[3px]">
                {days.slice(p.start - 1, p.end).map((d) => {
                  const done = sessions[d.day]?.status === "complete";
                  const rest = d.duration === 0;
                  return (
                    <span
                      key={d.day}
                      title={`Day ${d.day} · ${d.sessionType}${done ? ` · logged ${fmtDate(sessions[d.day].trainingDate)}` : ""}`}
                      className={`h-4 w-4 rounded-[4px] ${
                        done ? (rest ? "bg-[#6aa5ec]/55" : "bg-table") : d.day === cur ? "bg-ball ring-2 ring-ball/30" : rest ? "border border-dashed border-line-2" : "bg-card-3"
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
          <Key cls="bg-[#6aa5ec]/55" label="Rest day logged" />
          <Key cls="bg-ball" label="Next session" />
          <Key cls="bg-card-3" label="Upcoming" />
          <Key cls="border border-dashed border-line-2" label="Upcoming rest day" />
        </div>
      </section>

      {/* Scoreboard */}
      <section className="card overflow-hidden">
        <div className="p-5 pb-3">
          <Head title="Drill scoreboard" sub="Target met twice in a row at one level means move up." />
        </div>
        <div className="divide-y divide-line border-t border-line md:hidden">
          {drillStatsOnly.map((s) => (
            <button key={s.code} onClick={() => setDrill(s.code)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selCode === s.code ? "bg-table/10" : ""}`}>
              <span className="font-display w-12 shrink-0 text-lg font-bold">{s.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink-2">{s.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  {s.attempts ? (
                    <>
                      <span className="num">
                        Latest <b className="text-ink">{s.latest}</b>
                        {s.def.max ? `/${s.def.max}` : ""}
                      </span>
                      <span className="num">· {pct(s.passRate)} at target</span>
                    </>
                  ) : (
                    "Not tested"
                  )}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Sparkline values={s.series.map((r) => r.score)} target={s.def.target} low={s.def.direction === "low"} />
                {s.levelUp && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-semibold text-good">▲ Level up</span>}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-card-2/50 text-left text-xs text-muted">
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
              {drillStatsOnly.map((s) => (
                <tr key={s.code} onClick={() => setDrill(s.code)} className={`cursor-pointer border-b border-line/70 transition hover:bg-card-2/60 ${selCode === s.code ? "bg-table/10" : ""}`}>
                  <td className="px-5 py-2.5">
                    <span className="font-display mr-2 inline-block w-12 text-base font-bold">{s.code}</span>
                    <span className="text-ink-2">{s.name}</span>
                  </td>
                  <td className="num px-2 text-right">{s.attempts || "-"}</td>
                  <td className="num px-2 text-right font-semibold">
                    {s.latest ?? "-"}
                    {s.latest != null && s.def.max ? <span className="font-normal text-muted">/{s.def.max}</span> : ""}
                  </td>
                  <td className="px-2 text-ink-2">{s.latestLevel ?? "-"}</td>
                  <td className="num px-2 text-right">{s.best ?? "-"}</td>
                  <td className="num px-2 text-right text-ink-2">{s.def.target == null ? "-" : `${s.def.direction === "low" ? "≤" : "≥"}${s.def.target}`}</td>
                  <td className="px-2">
                    {s.passRate == null ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-card-3">
                          <span className="block h-full rounded-full bg-series-1" style={{ width: `${s.passRate * 100}%` }} />
                        </span>
                        <span className="num text-xs">{pct(s.passRate)}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2">
                    <Sparkline values={s.series.map((r) => r.score)} target={s.def.target} low={s.def.direction === "low"} />
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Physical battery */}
      <section className="card p-5">
        <Head title="Physical battery" sub="Retested every 6–8 weeks. Best of 2–3 trials." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {physStats.map((s) => {
            const t = s.def;
            const change = s.first != null && s.latest != null && s.attempts > 1 ? s.latest - s.first : null;
            const better = change == null ? null : t.direction === "low" ? change < 0 : change > 0;
            return (
              <div key={s.code} className="rounded-xl border border-line bg-card-2/40 p-3">
                <p className="text-xs font-semibold text-ink-2">{t.name}</p>
                <p className="font-display num text-3xl font-bold">
                  {s.latest ?? "-"} <span className="font-sans text-xs font-normal text-muted">{t.unit}</span>
                </p>
                <p className={`text-xs ${better == null ? "text-muted" : better ? "text-good" : "text-warn"}`}>
                  {change == null ? (t.direction === "low" ? "Lower is better" : "Higher is better") : `${better ? "▲" : "▼"} ${Math.abs(+change.toFixed(2))} ${t.unit} since first test`}
                </p>
                <div className="mt-2 h-[110px]">
                  <MiniLine rows={s.series} unit={t.unit} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Training ingredients */}
      {((ingredients && ingredients.length > 0) || user) && (
        <section id="ingredients" className="scroll-mt-24">
          <div className="mb-3 flex items-end justify-between gap-3">
            <Head title="Training ingredients" sub="The kit and gear behind every session." />
            {user ? (
              <Link href="/studio?tab=ingredients" className="shrink-0 text-sm font-medium text-[#8fbcf3] hover:underline">
                Manage
              </Link>
            ) : (
              <Link href="/ingredients" className="shrink-0 text-sm font-medium text-[#8fbcf3] hover:underline">
                See all
              </Link>
            )}
          </div>
          {ingredients && ingredients.length ? <IngredientCarousel items={ingredients} /> : <Empty text="No ingredients yet. Add them in Studio, Ingredients." />}
        </section>
      )}
    </div>
  );
}

function HeroTile({ label, value, sub, bar }: { label: string; value: string; sub: string; bar?: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-paper/40 p-3 sm:p-4">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-[11px]">{label}</p>
      <p className="font-display num truncate text-xl font-bold leading-tight sm:text-3xl">{value}</p>
      <p className="line-clamp-2 text-[11px] leading-snug text-ink-2 sm:truncate sm:text-xs">{sub}</p>
      {bar != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-3">
          <div className="h-full rounded-full bg-ball" style={{ width: `${Math.min(1, bar) * 100}%` }} />
        </div>
      )}
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
      <p className="font-display num mt-1 text-3xl font-bold sm:text-4xl">{value}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card-2/60 p-3">
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
function Chips({ options, value, onChange, dim, badge }: { options: string[]; value: string; onChange: (v: string) => void; dim?: (c: string) => boolean; badge?: (c: string) => number }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {options.map((o) => {
        const b = badge?.(o) ?? 0;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${value === o ? "bg-ink text-paper" : "bg-card-2 text-ink-2 hover:bg-card-3"} ${dim?.(o) ? "opacity-50" : ""}`}
          >
            {o}
            {b > 0 && <span className="ml-1 text-bad">▲{b}</span>}
          </button>
        );
      })}
    </div>
  );
}
