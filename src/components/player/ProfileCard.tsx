"use client";
import { ageOf, fmtHeight, fmtWeight, useCoaches, useMatches, useMeasurements, useProfile, winRates } from "@/lib/player";

const LABEL: Record<string, string> = { "Practice Match": "Practice", "Competitive Match": "Competitive", "Professional Match": "Professional" };

export function ProfileCard() {
  const profile = useProfile();
  const ms = useMeasurements();
  const matches = useMatches();
  const coach = useCoaches()?.[0];
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
    ["Current coach", coach ? coach.name : "-"],
  ];
  return (
    <section className="court-bg relative overflow-hidden rounded-3xl">
      {/* neon streaks, echoing the photo's background */}
      <span aria-hidden className="pointer-events-none absolute -right-24 top-0 h-[140%] w-px rotate-[35deg] bg-gradient-to-b from-transparent via-[#3ddbe6]/60 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute right-24 top-0 h-[140%] w-px rotate-[35deg] bg-gradient-to-b from-transparent via-[#3ddbe6]/30 to-transparent" />
      <div className="relative grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        {/* photo */}
        <div className="relative h-[340px] sm:h-[420px] lg:h-auto lg:min-h-[480px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tintin-player.jpg"
            alt="Tintin playing a forehand"
            className="absolute inset-0 h-full w-full object-cover object-[50%_20%] [mask-image:linear-gradient(to_bottom,black_70%,transparent)] lg:[mask-image:linear-gradient(to_right,black_72%,transparent)]"
          />
        </div>

        {/* details */}
        <div className="relative -mt-16 p-4 sm:p-6 lg:mt-0 lg:py-8 lg:pl-0 lg:pr-8">
          <div className="rounded-2xl border border-[#3ddbe6]/45 bg-paper/55 p-4 shadow-[0_0_24px_rgba(61,219,230,0.18),inset_0_0_24px_rgba(61,219,230,0.06)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center gap-3 border-b border-[#3ddbe6]/25 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7fe6ee]">Player profile</p>
                <h1 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Tintin</h1>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className={`min-w-0 rounded-xl border border-white/5 bg-card/70 px-3 py-2 ${k === "Current coach" ? "col-span-2 sm:col-span-3" : ""}`}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#7fe6ee]/80">{k}</dt>
                  <dd className="num break-words text-sm font-semibold leading-snug sm:text-base" title={v}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            {latest && <p className="mt-2 text-[11px] text-muted">Height and weight as of {new Date(latest.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7fe6ee]">Win rate</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {rates.map((r) => (
                <div key={r.level} className="rounded-xl border border-white/5 bg-card/70 px-3 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 text-sm font-semibold">{LABEL[r.level]}</span>
                    <span className="font-display num text-2xl font-bold">{r.rate == null ? "-" : `${Math.round(r.rate * 100)}%`}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-3">
                    <div className="h-full rounded-full bg-good" style={{ width: `${(r.rate ?? 0) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{r.played ? `${r.wins} won · ${r.losses} lost` : "No matches yet"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
