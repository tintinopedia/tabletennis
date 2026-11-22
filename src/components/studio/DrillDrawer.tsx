"use client";
import { useEffect, useState } from "react";
import { useData } from "../DataProvider";
import { KIND_STYLE, codeBadge } from "../ItemPanel";
import { ExhibitGrid, StoredImageGrid, VideoEmbed } from "../Media";
import { LEVELS, type Level } from "@/lib/plan";
import { NOVA_LEVELS, parseNova, type NovaHand } from "@/lib/nova";
import { useProfile } from "@/lib/player";

export const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="6.2" r="1.1" fill="currentColor" />
  </svg>
);

export function InfoButton({ code, onOpen, className = "" }: { code: string; onOpen: (code: string) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Details for ${code}`}
      title="Details"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(code);
      }}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-card-3 hover:text-ink ${className}`}
    >
      <InfoIcon />
    </button>
  );
}

/** Right-hand drawer with everything known about a drill */
export function DrillDrawer({ code, onClose, onEdit }: { code: string | null; onClose: () => void; onEdit?: (code: string) => void }) {
  const { catalog } = useData();
  const def = code ? catalog[code] : null;
  useEffect(() => {
    if (!code) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[data-lightbox]") && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [code, onClose]);
  if (!code || !def) return null;

  const nova = parseNova(def.code);
  const levelStep = def.steps.find((s) => /^levels?$/i.test(s.k));
  const levelText: Partial<Record<Level, string>> = {};
  for (const part of (levelStep?.v ?? "").split(/\s·\s/)) {
    const m = part.match(/^(Foundation|Competitor|Advanced)\s*:\s*(.+)$/);
    if (m) levelText[m[1] as Level] = m[2].trim();
  }
  const steps = def.steps.filter((s) => s !== levelStep && !(nova && s.k === "Level"));
  const activeLevel = nova ? NOVA_LEVELS[nova.star].site : null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={def.name}>
      <div className="absolute inset-0 bg-black/60 [animation:fade-in_.2s_ease-out]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line-2 bg-card shadow-2xl [animation:drawer-in_.25s_ease-out]">
        <header className="flex items-start gap-3 border-b border-line p-4">
          <span className={`font-display grid h-11 min-w-11 place-items-center rounded-lg px-2 text-base font-bold ${KIND_STYLE[def.kind]}`}>{codeBadge(def.code)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug">{def.name}</h3>
            <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
              <span className="rounded-full bg-card-3 px-2 py-0.5">{def.code}</span>
              <span className="rounded-full bg-card-3 px-2 py-0.5">{def.section}</span>
              <span className="rounded-full bg-card-3 px-2 py-0.5">{def.minutes} min</span>
              {def.hr && <span className="rounded-full bg-card-3 px-2 py-0.5 text-bad">♥ heart rate</span>}
              {def.tests.length > 0 && <span className="rounded-full bg-card-3 px-2 py-0.5">scored</span>}
              {nova && <span className="rounded-full bg-ball/15 px-2 py-0.5 text-[#ffa27c]">{nova.hand === "RH" ? "Right-handed" : "Left-handed"} mode</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-card-3 hover:text-ink">
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* levels */}
          {(nova || Object.keys(levelText).length > 0) && (
            <div>
              <p className="eyebrow mb-2">Level</p>
              <div className="space-y-1.5">
                {nova
                  ? [1, 2, 3].map((s) => {
                      const l = NOVA_LEVELS[s];
                      const on = s === nova.star;
                      return (
                        <div key={s} className={`rounded-lg border p-2.5 text-sm ${on ? "border-ball/50 bg-ball/10" : "border-line opacity-60"}`}>
                          <span className={`font-semibold ${on ? "text-[#ffa27c]" : ""}`}>
                            {l.stars} {l.label} <span className="font-normal text-muted">= {l.site}</span>
                          </span>
                          {on && <span className="ml-2 rounded-full bg-ball/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#ffa27c]">this preset</span>}
                          <p className="text-xs text-ink-2">{l.text}</p>
                        </div>
                      );
                    })
                  : LEVELS.filter((l) => levelText[l]).map((l) => (
                      <div key={l} className={`rounded-lg border p-2.5 text-sm ${activeLevel === l ? "border-ball/50 bg-ball/10" : "border-line"}`}>
                        <span className="font-semibold text-[#8fbcf3]">{l}</span>
                        <p className="text-xs text-ink-2">{levelText[l]}</p>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {(def.exhibits.length > 0 || def.images.length > 0) && (
            <div className="space-y-3">
              <p className="eyebrow">Images</p>
              {def.exhibits.length > 0 && <ExhibitGrid items={def.exhibits} />}
              {def.images.length > 0 && <StoredImageGrid images={def.images} />}
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <p className="eyebrow mb-2">How to do it</p>
              <ol className="space-y-2">
                {steps.map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-display mt-0.5 w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-ball">{f.k || `Step ${i + 1}`}</span>
                    <span className="text-ink-2">{f.v}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <p className="eyebrow mb-2">Videos</p>
            {def.videos.length > 0 ? (
              <div className="grid gap-3">
                {def.videos.map((v) => (
                  <VideoEmbed key={v.url} v={v} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No video yet. Add a YouTube link with Edit.</p>
            )}
          </div>

          {def.tests.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Scoring</p>
              <ul className="space-y-1 text-sm text-ink-2">
                {def.tests.map((t) => (
                  <li key={t.code}>
                    <b className="text-ink">{t.code}</b> {t.counts}
                    {t.target != null && ` · target ${t.direction === "low" ? "≤" : "≥"} ${t.target}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {def.refs && <p className="text-xs text-muted">Reference: {def.refs}</p>}
        </div>

        {onEdit && (
          <footer className="flex gap-2 border-t border-line p-4">
            <button className="btn btn-primary" onClick={() => onEdit(def.code)}>
              Edit {def.code}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

/** Hand + star filter for the 264 Nova presets; defaults to Ahaan's playing hand */
export type NovaFilter = { hand: NovaHand | "all"; star: number | 0 };
export function useNovaFilter(): [NovaFilter, (f: NovaFilter) => void] {
  const profile = useProfile();
  const [f, setF] = useState<NovaFilter | null>(null);
  const auto: NovaFilter = { hand: profile?.hand === "Left" ? "LH" : profile?.hand === "Right" ? "RH" : "all", star: 0 };
  return [f ?? auto, setF];
}
export function novaVisible(code: string, f: NovaFilter) {
  const p = parseNova(code);
  if (!p) return true;
  return (f.hand === "all" || p.hand === f.hand) && (!f.star || p.star === f.star);
}
export function NovaFilterBar({ value, onChange }: { value: NovaFilter; onChange: (f: NovaFilter) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Nova handedness" className="field px-2 py-1 text-xs" value={value.hand} onChange={(e) => onChange({ ...value, hand: e.target.value as NovaFilter["hand"] })}>
        <option value="RH">Right-handed</option>
        <option value="LH">Left-handed</option>
        <option value="all">Both hands</option>
      </select>
      <select aria-label="Nova level" className="field px-2 py-1 text-xs" value={value.star} onChange={(e) => onChange({ ...value, star: Number(e.target.value) })}>
        <option value={0}>All levels</option>
        {[1, 2, 3].map((s) => (
          <option key={s} value={s}>
            {NOVA_LEVELS[s].stars} {NOVA_LEVELS[s].label} ({NOVA_LEVELS[s].site})
          </option>
        ))}
      </select>
    </div>
  );
}
