"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSponsorPage } from "./useSponsorPage";

// Private working pages keep their bottom-right controls clear
const HIDDEN_ON = ["/train", "/mantra", "/studio", "/blog/edit", "/sponsor"];

export function SponsorBadge({ force }: { force?: boolean }) {
  const path = usePathname();
  const page = useSponsorPage();
  if (HIDDEN_ON.some((p) => path.startsWith(p))) return null;
  if (!force && !page?.published) return null;
  return (
    <div className="sponsor-corner pointer-events-none fixed right-0 z-30 h-[132px] w-[132px] overflow-hidden" aria-hidden={false}>
      <Link
        href="/sponsor"
        className="sponsor-ribbon pointer-events-auto absolute flex items-center justify-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.08em] text-white"
      >
        <span aria-hidden className="text-[13px]">♥</span> Sponsor me
      </Link>
    </div>
  );
}
