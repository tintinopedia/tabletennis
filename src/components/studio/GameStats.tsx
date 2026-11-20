"use client";
import Link from "next/link";
import { useState } from "react";
import { ConfirmButton, Toast, useToast } from "../ui";
import { VideoModal } from "../Media";
import { newId, put, remove, saveError, type VideoDoc } from "@/lib/store";
import { fmtDate, todayIso } from "@/lib/analytics";
import { youtubeId } from "@/lib/plan";
import { LEVELS_MATCH, useMatches, winRates, type MatchDoc, type MatchLevel } from "@/lib/player";

type Draft = { id: string; isNew: boolean; date: string; opponent: string; a: string; b: string; level: MatchLevel; video: string; createdAt?: number; hasNotes?: boolean };
const LEVEL_SHORT: Record<MatchLevel, string> = { "Practice Match": "Practice", "Competitive Match": "Competitive", "Professional Match": "Professional" };

export function GameStats() {
  const matches = useMatches() ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState<VideoDoc | null>(null);
  const [toast, showToast] = useToast();
  const rates = winRates(matches);

  const add = () => {
    setErr(null);
    setDraft({ id: newId(), isNew: true, date: todayIso(), opponent: "", a: "", b: "", level: "Practice Match", video: "" });
  };
  const edit = (m: MatchDoc) => {
    setErr(null);
    setDraft({ id: m.id, isNew: false, date: m.date, opponent: m.opponent, a: String(m.scoreFor), b: String(m.scoreAgainst), level: m.level, video: m.video ?? "", createdAt: m.createdAt, hasNotes: m.hasNotes });
  };
  const save = async () => {
    if (!draft) return;
    const a = Number(draft.a),
      b = Number(draft.b);
    if (!draft.date) return setErr("Pick the match date.");
    if (draft.date > todayIso()) return setErr("The date can't be in the future.");
    if (!draft.opponent.trim()) return setErr("Enter the opponent's name.");
    if (draft.a === "" || draft.b === "" || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return setErr("Enter the score as two whole numbers, e.g. 3 / 1.");
    if (draft.video.trim() && !youtubeId(draft.video)) return setErr("The video must be a YouTube link (or leave it empty).");
    setErr(null);
    const doc: Omit<MatchDoc, "id"> = {
      date: draft.date,
      opponent: draft.opponent.trim(),
      scoreFor: a,
      scoreAgainst: b,
      level: draft.level,
      video: draft.video.trim(),
      hasNotes: !!draft.hasNotes,
      createdAt: draft.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await put("matches", draft.id, doc);
      showToast(draft.isNew ? "Match added" : "Match updated");
      setDraft(null);
    } catch (e) {
      setErr(saveError(e));
    }
  };
  const del = async (m: MatchDoc) => {
    await remove("matches", m.id);
    if (m.hasNotes) remove("matchNotes", m.id).catch(() => {});
  };

  const row = (d: Draft) => (
    <div className="grid gap-2 rounded-xl border border-table/40 bg-table/5 p-3 md:grid-cols-[140px_minmax(0,1fr)_120px_170px_minmax(0,1fr)_auto] md:items-center">
      <input type="date" max={todayIso()} aria-label="Date" className="field px-2 py-2 text-sm" value={d.date} onChange={(e) => setDraft({ ...d, date: e.target.value })} />
      <input aria-label="Opponent" className="field px-2 py-2 text-sm" placeholder="Opponent" value={d.opponent} onChange={(e) => setDraft({ ...d, opponent: e.target.value })} />
      <div className="flex items-center gap-1">
        <input aria-label="Tintin's score" type="number" inputMode="numeric" min={0} className="field num w-full px-2 py-2 text-center text-sm" placeholder="3" value={d.a} onChange={(e) => setDraft({ ...d, a: e.target.value })} />
        <span className="text-muted">/</span>
        <input aria-label="Opponent's score" type="number" inputMode="numeric" min={0} className="field num w-full px-2 py-2 text-center text-sm" placeholder="1" value={d.b} onChange={(e) => setDraft({ ...d, b: e.target.value })} />
      </div>
      <select aria-label="Level" className="field px-2 py-2 text-sm" value={d.level} onChange={(e) => setDraft({ ...d, level: e.target.value as MatchLevel })}>
        {LEVELS_MATCH.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <input aria-label="YouTube video (optional)" className="field px-2 py-2 text-sm" placeholder="YouTube link (optional)" value={d.video} onChange={(e) => setDraft({ ...d, video: e.target.value })} />
      <div className="flex gap-1">
        <button className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={save}>
          Save
        </button>
        <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <section className="grid grid-cols-3 gap-3">
        {rates.map((r) => (
          <div key={r.level} className="card p-3 sm:p-4">
            <p className="eyebrow truncate">{LEVEL_SHORT[r.level]}</p>
            <p className="font-display num text-2xl font-bold sm:text-3xl">{r.rate == null ? "-" : `${Math.round(r.rate * 100)}%`}</p>
            <p className="text-xs text-muted">
              {r.played ? `${r.wins} won · ${r.losses} lost` : "No matches yet"}
            </p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <h2 className="font-display text-2xl font-bold uppercase">Game stats</h2>
            <p className="text-sm text-muted">Every match Tintin plays. Score is Tintin first, then the opponent (games won / lost). Newest first.</p>
          </div>
          <button className="btn btn-primary w-full sm:w-auto" onClick={add} disabled={!!draft?.isNew}>
            + Add match
          </button>
        </div>

        <div className="mt-4 hidden grid-cols-[140px_minmax(0,1fr)_120px_170px_minmax(0,1fr)_auto] gap-2 px-3 text-xs text-muted md:grid">
          <span>Date</span>
          <span>Opponent</span>
          <span className="text-center">Score</span>
          <span>Level</span>
          <span>Video / Notes</span>
          <span className="text-right">Actions</span>
        </div>
        {err && <p className="mt-3 text-sm text-bad">{err}</p>}
        <div className="mt-2 space-y-2">
          {draft?.isNew && row(draft)}
          {matches.length === 0 && !draft && <p className="py-3 text-sm text-muted">No matches yet. Tap Add match after a game.</p>}
          {matches.map((m) => {
            if (draft && !draft.isNew && draft.id === m.id) return <div key={m.id}>{row(draft)}</div>;
            const won = m.scoreFor > m.scoreAgainst,
              lost = m.scoreFor < m.scoreAgainst;
            const vid = m.video ? youtubeId(m.video) : null;
            return (
              <div key={m.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-xl border border-line bg-card-2/40 p-3 md:grid-cols-[140px_minmax(0,1fr)_120px_170px_minmax(0,1fr)_auto] md:items-center">
                <span className="text-sm text-ink-2 md:order-none">{fmtDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="col-span-2 truncate font-semibold md:col-span-1">vs {m.opponent}</span>
                <span className="flex items-center gap-2 md:justify-center">
                  <span className="num font-display text-xl font-bold">
                    {m.scoreFor} / {m.scoreAgainst}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${won ? "bg-good-soft text-good" : lost ? "bg-bad-soft text-bad" : "bg-card-3 text-ink-2"}`}>{won ? "Won" : lost ? "Lost" : "Draw"}</span>
                </span>
                <span className="text-sm text-ink-2">{m.level}</span>
                <span className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                  {vid && (
                    <button
                      className="rounded-full bg-ball/15 px-2.5 py-1 text-xs font-semibold text-[#ffa27c] hover:bg-ball/25"
                      onClick={() => setPlaying({ id: m.id, url: m.video!, youtubeId: vid, title: `vs ${m.opponent}`, recordedOn: m.date, published: true, order: 0, createdAt: m.createdAt })}
                    >
                      ▶ Video
                    </button>
                  )}
                  <Link href={`/studio/match-notes?id=${m.id}`} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.hasNotes ? "bg-table/20 text-[#8fbcf3]" : "border border-line-2 text-ink-2"}`}>
                    {m.hasNotes ? "📝 Notes" : "+ Notes"}
                  </Link>
                </span>
                <span className="col-span-2 flex justify-end gap-1 md:col-span-1">
                  <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => edit(m)}>
                    Edit
                  </button>
                  <ConfirmButton label="Delete" confirm="Delete match?" onConfirm={() => del(m)} />
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <VideoModal video={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}
