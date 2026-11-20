"use client";
import { ageOf, fmtHeight, fmtWeight, useMatches, useMeasurements, useProfile, winRates } from "@/lib/player";

const LABEL: Record<string, string> = { "Practice Match": "Practice", "Competitive Match": "Competitive", "Professional Match": "Professional" };

export function ProfileCard() {
  const profile = useProfile();
  const ms = useMeasurements();
  const matches = useMatches();
  const latest = ms?.[0];
  const age = ageOf();
  const rates = winRates(matches ?? []);
  const facts: [string, string][] = [
    ["Age", `${age.years} yrs ${age.months} mos`],
    ["Height", fmtHeight(latest?.heightIn)],
    ["Weight", fmtWeight(latest?.weightKg)],
    ["Grip", profile?.grip || "-"],
    ["Style", profile?.style || "-"],
    ["Playing hand", profile?.hand || "-"],
  ];
  return (
    <section className="court-bg overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">Player profile</p>
              <h1 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Tintin</h1>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl border border-white/5 bg-paper/40 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{k}</dt>
                <dd className="num truncate text-sm font-semibold sm:text-base" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {latest && <p className="mt-2 text-[11px] text-muted">Height and weight as of {new Date(latest.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">Win rate</p>
          <div className="mt-2 space-y-2">
            {rates.map((r) => (
              <div key={r.level} className="rounded-xl border border-white/5 bg-paper/40 px-3 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 text-sm font-semibold">{LABEL[r.level]} matches</span>
                  <span className="font-display num text-2xl font-bold">{r.rate == null ? "-" : `${Math.round(r.rate * 100)}%`}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-3">
                  <div className="h-full rounded-full bg-good" style={{ width: `${(r.rate ?? 0) * 100}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">{r.played ? `${r.wins} won · ${r.losses} lost · ${r.played} played` : "No matches yet"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
