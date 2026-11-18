"use client";
import { useEffect, useState } from "react";
import { youtubeId, videoUrl, type PlanVideo, type Exhibit } from "@/lib/plan";

export function VideoEmbed({ v }: { v: PlanVideo }) {
  const url = videoUrl(v);
  const id = youtubeId(url);
  if (id) {
    return (
      <figure className="overflow-hidden rounded-xl border border-line bg-black">
        <div className="aspect-video">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
            title={v.label}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <figcaption className="bg-card px-3 py-2 text-xs text-ink-2">{v.label}</figcaption>
      </figure>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="court-bg group flex aspect-video flex-col items-center justify-center gap-2 rounded-xl p-4 text-center text-white"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-table-deep shadow transition group-hover:scale-105">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="text-sm font-semibold">{v.label}</span>
      <span className="text-[11px] opacity-80">Opens video in a new tab</span>
    </a>
  );
}

export function ExhibitGrid({ items }: { items: Exhibit[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open == null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o == null ? o : (o + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o == null ? o : (o - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, items.length]);
  return (
    <>
      <div className={`grid gap-3 ${items.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {items.map((ex, i) => (
          <button key={ex.src} onClick={() => setOpen(i)} className="group overflow-hidden rounded-xl border border-line bg-white text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ex.src} alt={ex.title} loading="lazy" className="aspect-[1376/768] w-full object-cover transition group-hover:scale-[1.01]" />
            <span className="block px-3 py-2 text-xs font-medium text-ink-2">{ex.title} · tap to enlarge</span>
          </button>
        ))}
      </div>
      {open != null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/90 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[open].src} alt={items[open].title} className="max-h-[85vh] max-w-full rounded-lg bg-white" />
          <p className="mt-3 text-sm text-white">
            {items[open].title} {items.length > 1 && `(${open + 1}/${items.length})`}
          </p>
        </div>
      )}
    </>
  );
}
