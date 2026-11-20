"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useSponsorPage } from "@/components/sponsor/useSponsorPage";
import { PostBody } from "@/components/blog/PostView";
import { fmtDate } from "@/lib/analytics";

export default function SponsorPage() {
  const page = useSponsorPage();
  const { user } = useAuth();
  if (page === undefined) return <p className="py-20 text-center text-muted">Loading…</p>;
  if (!page)
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <p className="font-semibold">This page isn&apos;t ready yet.</p>
        {user && (
          <Link href="/studio?tab=sponsor" className="btn btn-primary mt-4 inline-block">
            Write it in Studio
          </Link>
        )}
      </div>
    );
  const updated = new Date(page.updatedAt);
  const iso = `${updated.getFullYear()}-${String(updated.getMonth() + 1).padStart(2, "0")}-${String(updated.getDate()).padStart(2, "0")}`;
  return (
    <div className="mx-auto max-w-4xl pt-6">
      <article className="card overflow-hidden">
        <div className="court-bg !rounded-none !border-0 !border-b !border-line p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2">♥ Sponsor me</p>
          <h1 className="font-display mt-2 text-4xl font-bold uppercase leading-none sm:text-6xl">{page.title || "Sponsor Tintin"}</h1>
          <p className="mt-3 text-sm text-muted">
            Updated {fmtDate(iso, { day: "numeric", month: "long", year: "numeric" })}
            {!page.published && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">Hidden</span>}
          </p>
        </div>
        <div className="p-5 sm:p-10">
          <PostBody content={page.content} />
        </div>
      </article>
      {user && (
        <div className="mt-4 text-right">
          <Link href="/studio?tab=sponsor" className="btn btn-ghost">
            Edit this page
          </Link>
        </div>
      )}
    </div>
  );
}
