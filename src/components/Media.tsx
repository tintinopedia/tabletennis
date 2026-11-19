"use client";
import { useEffect, useRef, useState } from "react";
import { youtubeId, ytThumb, type Exhibit, type ImageRef, type VideoRef } from "@/lib/plan";
import { getImage, type VideoDoc } from "@/lib/store";
import { fmtDate } from "@/lib/analytics";

const PlayIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function YouTubeFrame({ id, title, autoplay }: { id: string; title: string; autoplay?: boolean }) {
  return (
    <iframe
      className="h-full w-full"
      src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}`}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}

export function VideoEmbed({ v }: { v: VideoRef }) {
  const id = youtubeId(v.url);
  if (id)
    return (
      <figure className="overflow-hidden rounded-xl border border-line bg-card-2">
        <div className="aspect-video bg-paper">
          <YouTubeFrame id={id} title={v.label} />
        </div>
        <figcaption className="px-3 py-2 text-xs text-ink-2">{v.label}</figcaption>
      </figure>
    );
  return (
    <a href={v.url} target="_blank" rel="noreferrer" className="court-bg group flex aspect-video flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ball text-white shadow transition group-hover:scale-105">
        <PlayIcon />
      </span>
      <span className="text-sm font-semibold">{v.label}</span>
      <span className="text-[11px] text-ink-2">Opens in a new tab · add a YouTube link in Studio to play it here</span>
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
          <button key={ex.src} onClick={() => setOpen(i)} className="group overflow-hidden rounded-xl border border-line bg-card-2 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ex.src} alt={ex.title} loading="lazy" className="aspect-[1376/768] w-full object-cover transition group-hover:scale-[1.01]" />
            <span className="block px-3 py-2 text-xs font-medium text-ink-2">{ex.title} · tap to enlarge</span>
          </button>
        ))}
      </div>
      {open != null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/95 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[open].src} alt={items[open].title} className="max-h-[85vh] max-w-full rounded-lg" />
          <p className="mt-3 text-sm text-ink">
            {items[open].title} {items.length > 1 && `(${open + 1}/${items.length})`}
          </p>
        </div>
      )}
    </>
  );
}

export function VideoModal({ video, onClose }: { video: VideoDoc | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [video, onClose]);
  if (!video) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 p-4" onClick={onClose} role="dialog" aria-label={video.title}>
      <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-card">
          <YouTubeFrame id={video.youtubeId} title={video.title} autoplay />
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{video.title}</p>
            {video.recordedOn && <p className="text-xs text-muted">{fmtDate(video.recordedOn, { day: "numeric", month: "long", year: "numeric" })}</p>}
            {video.description && <p className="mt-1 text-sm text-ink-2">{video.description}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoThumb({ v, className = "" }: { v: VideoDoc; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-gradient-to-br from-table-deep to-card-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ytThumb(v.youtubeId)}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
    </span>
  );
}

export function VideoCarousel({ videos }: { videos: VideoDoc[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState<VideoDoc | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(onScroll, [videos.length]);
  const slide = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setPlaying(v)}
            className="group w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card text-left sm:w-[46%] lg:w-[31.5%]"
          >
            <span className="relative block">
              <VideoThumb v={v} className="aspect-video" />
              <span className="absolute inset-0 bg-gradient-to-t from-paper/80 via-transparent to-transparent" />
              <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ball/95 text-white shadow-lg transition group-hover:scale-110">
                <PlayIcon size={22} />
              </span>
            </span>
            <span className="block p-3">
              <span className="block truncate font-semibold">{v.title}</span>
              <span className="block text-xs text-muted">{v.recordedOn ? fmtDate(v.recordedOn, { day: "numeric", month: "short", year: "numeric" }) : "Training video"}</span>
            </span>
          </button>
        ))}
      </div>
      {videos.length > 1 && (
        <>
          <button
            aria-label="Previous videos"
            onClick={() => slide(-1)}
            disabled={edge.start}
            className="absolute -left-3 top-[38%] hidden h-10 w-10 place-items-center rounded-full border border-line-2 bg-card-2/95 text-ink shadow-lg disabled:hidden sm:grid"
          >
            ‹
          </button>
          <button
            aria-label="More videos"
            onClick={() => slide(1)}
            disabled={edge.end}
            className="absolute -right-3 top-[38%] hidden h-10 w-10 place-items-center rounded-full border border-line-2 bg-card-2/95 text-ink shadow-lg disabled:hidden sm:grid"
          >
            ›
          </button>
        </>
      )}
      <VideoModal video={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}

/** Uploaded reference images, fetched only when shown */
export function StoredImageGrid({ images }: { images: ImageRef[] }) {
  const [items, setItems] = useState<Exhibit[] | null>(null);
  const key = images.map((i) => i.id).join(",");
  useEffect(() => {
    let on = true;
    Promise.all(images.map(async (i) => ({ src: (await getImage(i.id)) ?? "", title: i.title || "Reference image" }))).then((r) => on && setItems(r.filter((x) => x.src)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!items) return <div className="h-24 animate-pulse rounded-xl bg-card-2" />;
  return items.length ? <ExhibitGrid items={items} /> : null;
}
