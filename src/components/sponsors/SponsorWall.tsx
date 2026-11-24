"use client";
import Link from "next/link";
import { useSponsors } from "./useSponsors";

/** Home: logos of brands backing Tintin. Hover or tap shows the brand name. */
export function SponsorWall() {
  const sponsors = useSponsors();
  if (!sponsors) return null;
  return (
    <section aria-labelledby="sponsors-title" className="scroll-mt-24" id="sponsors">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="sponsors-title" className="font-display text-2xl font-bold uppercase tracking-wide">
            Proudly supported by
          </h2>
          <p className="text-sm text-ink-2">The brands backing my table tennis journey.</p>
        </div>
        <Link href="/sponsor" className="shrink-0 text-sm font-medium text-[#8fbcf3] hover:underline">
          Become a sponsor
        </Link>
      </div>
      <div className="card p-4 sm:p-6">
        {sponsors.length === 0 ? (
          <Link href="/sponsor" className="grid h-24 place-items-center rounded-xl border border-dashed border-line-2 text-sm text-muted transition hover:border-ball/60 hover:text-ink">
            Your brand here. Tap to sponsor my journey.
          </Link>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-6 sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))] sm:gap-8">
            {sponsors.map((s) => {
              const inner = (
                <>
                  <img src={s.logo} alt={s.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105 group-focus-visible:scale-105" />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    {s.name}
                  </span>
                </>
              );
              const cls = "group relative grid aspect-square w-full place-items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ball/70";
              return (
                <li key={s.id}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" title={s.name} className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <div tabIndex={0} title={s.name} className={cls}>
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
