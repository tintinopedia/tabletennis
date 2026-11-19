"use client";
import Link from "next/link";
import { monthKey, monthLabel, type PostDoc } from "@/lib/blog";
import { fmtDate } from "@/lib/analytics";

export function BlogSidebar({ posts, activeId, canEdit, bare }: { posts: PostDoc[]; activeId?: string | null; canEdit: boolean; bare?: boolean }) {
  // year -> month -> posts (already newest first)
  const years = new Map<string, Map<string, PostDoc[]>>();
  for (const p of posts) {
    const y = p.date.slice(0, 4);
    const m = monthKey(p.date);
    if (!years.has(y)) years.set(y, new Map());
    const ym = years.get(y)!;
    if (!ym.has(m)) ym.set(m, []);
    ym.get(m)!.push(p);
  }
  const active = posts.find((p) => p.id === activeId);
  const openMonth = active ? monthKey(active.date) : posts[0] ? monthKey(posts[0].date) : null;
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort();

  return (
    <aside className={`space-y-5 ${bare ? "" : "lg:sticky lg:top-24"}`}>
      {canEdit && (
        <Link href="/blog/edit" className="btn btn-primary block text-center">
          + Create post
        </Link>
      )}
      <div className={bare ? "p-1" : "card p-4"}>
        <p className="eyebrow mb-2">Archive</p>
        {posts.length === 0 && <p className="text-sm text-muted">No posts yet.</p>}
        <div className="space-y-3">
          {[...years.entries()].map(([y, months]) => (
            <div key={y}>
              <p className="font-display text-lg font-bold">{y}</p>
              <div className="mt-1 space-y-1">
                {[...months.entries()].map(([m, ps]) => (
                  <details key={m} open={m === openMonth} className="group rounded-lg">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-card-2">
                      <span className="text-muted transition group-open:rotate-90">›</span>
                      <span className="flex-1 font-medium">{monthLabel(m)}</span>
                      <span className="num rounded-full bg-card-3 px-2 text-xs text-ink-2">{ps.length}</span>
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-6">
                      {ps.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/blog?post=${p.id}`}
                            className={`block rounded-md px-2 py-1 text-sm transition ${p.id === activeId ? "bg-table/15 text-ink" : "text-ink-2 hover:bg-card-2 hover:text-ink"}`}
                          >
                            <span className="num mr-1.5 text-xs text-muted">{fmtDate(p.date, { day: "2-digit" })}</span>
                            {p.title || "Untitled"}
                            {!p.published && <span className="ml-1 text-[10px] uppercase text-warn">draft</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {tags.length > 0 && (
        <div className={bare ? "p-1" : "card p-4"}>
          <p className="eyebrow mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-card-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-card-3 hover:text-ink">
                #{t}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
