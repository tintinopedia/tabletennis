"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { usePosts } from "@/components/blog/usePosts";
import { BlogSidebar } from "@/components/blog/Sidebar";
import { PostBody, CoverThumb } from "@/components/blog/PostView";
import { fmtDate } from "@/lib/analytics";
import type { PostDoc } from "@/lib/blog";

export default function BlogPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
      <Blog />
    </Suspense>
  );
}

const longDate = (iso: string) => fmtDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-table/15 px-2.5 py-0.5 text-xs text-[#8fbcf3] hover:bg-table/25">
          #{t}
        </Link>
      ))}
    </div>
  );
}

function Blog() {
  const { user } = useAuth();
  const posts = usePosts();
  const params = useSearchParams();
  const postId = params.get("post");
  const tag = params.get("tag");
  if (!posts) return <p className="py-20 text-center text-muted">Loading the blog…</p>;
  const post = postId ? posts.find((p) => p.id === postId) : null;
  const list = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;

  return (
    <div className="pt-6">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="eyebrow">Blog</p>
          <h1 className="font-display text-4xl font-bold uppercase">Tintin&apos;s table tennis diary</h1>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="order-2 lg:order-1">
          <BlogSidebar posts={posts} activeId={post?.id} canEdit={!!user} />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          {postId ? post ? <FullPost post={post} posts={posts} canEdit={!!user} /> : <Missing /> : <PostList list={list} tag={tag} canEdit={!!user} />}
        </div>
      </div>
    </div>
  );
}

function Missing() {
  return (
    <div className="card p-8 text-center">
      <p className="font-semibold">This post isn&apos;t available.</p>
      <Link href="/blog" className="mt-3 inline-block text-sm text-[#8fbcf3] hover:underline">
        Back to all posts
      </Link>
    </div>
  );
}

function PostList({ list, tag, canEdit }: { list: PostDoc[]; tag: string | null; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      {tag && (
        <div className="flex items-center gap-2 text-sm text-ink-2">
          Showing posts tagged <b className="text-ink">#{tag}</b>
          <Link href="/blog" className="text-[#8fbcf3] hover:underline">
            clear
          </Link>
        </div>
      )}
      {list.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl font-bold uppercase">No posts yet</p>
          <p className="mt-1 text-sm text-muted">{canEdit ? "Write the first one." : "Check back soon."}</p>
          {canEdit && (
            <Link href="/blog/edit" className="btn btn-primary mt-4 inline-block">
              + Create post
            </Link>
          )}
        </div>
      )}
      {list.map((p) => (
        <Link key={p.id} href={`/blog?post=${p.id}`} className="card group flex gap-4 overflow-hidden p-4 transition hover:border-line-2 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {longDate(p.date)}
              {!p.published && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">Draft</span>}
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold uppercase leading-tight group-hover:text-[#8fbcf3]">{p.title || "Untitled"}</h2>
            {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-ink-2">{p.excerpt}</p>}
            <div className="mt-3">
              <Tags tags={p.tags} />
            </div>
          </div>
          {p.cover && (
            <span className="hidden aspect-[4/3] w-44 shrink-0 overflow-hidden rounded-xl border border-line sm:block">
              <CoverThumb id={p.cover} />
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function FullPost({ post, posts, canEdit }: { post: PostDoc; posts: PostDoc[]; canEdit: boolean }) {
  const i = posts.findIndex((p) => p.id === post.id);
  const newer = posts[i - 1];
  const older = posts[i + 1];
  return (
    <article className="card p-5 sm:p-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {longDate(post.date)}
            {!post.published && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">Draft</span>}
          </p>
          <h1 className="font-display mt-1 text-4xl font-bold uppercase leading-none sm:text-5xl">{post.title || "Untitled"}</h1>
        </div>
        {canEdit && (
          <Link href={`/blog/edit?id=${post.id}`} className="btn btn-ghost">
            Edit
          </Link>
        )}
      </div>
      <div className="mt-3">
        <Tags tags={post.tags} />
      </div>
      <div className="mt-6 border-t border-line pt-6">
        <PostBody content={post.content} />
      </div>
      <nav className="mt-10 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
        {older ? (
          <Link href={`/blog?post=${older.id}`} className="rounded-xl border border-line p-3 hover:bg-card-2">
            <span className="text-xs text-muted">‹ Older</span>
            <span className="block truncate font-semibold">{older.title || "Untitled"}</span>
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link href={`/blog?post=${newer.id}`} className="rounded-xl border border-line p-3 text-right hover:bg-card-2">
            <span className="text-xs text-muted">Newer ›</span>
            <span className="block truncate font-semibold">{newer.title || "Untitled"}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
