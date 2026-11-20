"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Toolbar } from "@/components/blog/Toolbar";
import { Gate } from "@/components/Gate";
import { ConfirmButton, Toggle } from "@/components/ui";
import { usePosts } from "@/components/blog/usePosts";
import { safeParse } from "@/components/blog/PostView";
import { blogExtensions, summarize, type PostDoc } from "@/lib/blog";
import { newId, put, remove, saveError } from "@/lib/store";
import { todayIso } from "@/lib/analytics";

export default function EditPage() {
  return (
    <Gate title="Write a post">
      <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
        <Loader />
      </Suspense>
    </Gate>
  );
}

function Loader() {
  const id = useSearchParams().get("id");
  const posts = usePosts();
  if (!posts) return <p className="py-20 text-center text-muted">Loading…</p>;
  const existing = id ? posts.find((p) => p.id === id) : undefined;
  if (id && !existing) return <p className="py-20 text-center text-muted">Post not found.</p>;
  return <PostEditor key={id ?? "new"} existing={existing} />;
}

function PostEditor({ existing }: { existing?: PostDoc }) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [published, setPublished] = useState(existing?.published ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extensions] = useState(() => blogExtensions("Write about today's training, a match, a new skill…"));
  const [initial] = useState(() => (existing ? safeParse(existing.content) : ""));
  const editor = useEditor({
    extensions,
    content: initial,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: "prose-tt min-h-[340px] outline-none" } },
  }, []);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const save = async () => {
    if (!editor) return;
    if (!title.trim()) return setErr("Add a title.");
    if (!date) return setErr("Pick a date.");
    if (date > todayIso()) return setErr("The date can't be in the future.");
    setErr(null);
    setBusy(true);
    const json = editor.getJSON();
    const { excerpt, cover } = summarize(json);
    const id = existing?.id ?? newId();
    const doc: Omit<PostDoc, "id"> = {
      title: title.trim(),
      date,
      tags: tagInput.trim() ? [...new Set([...tags, tagInput.trim().toLowerCase()])] : tags,
      content: JSON.stringify(json),
      excerpt,
      cover,
      published,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await put("posts", id, doc);
      router.push(`/blog?post=${id}`);
    } catch (e) {
      setErr(saveError(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href={existing ? `/blog?post=${existing.id}` : "/blog"} className="text-sm text-ink-2 hover:text-ink">
          ‹ Back to blog
        </Link>
        <span className="flex-1" />
        {existing && (
          <ConfirmButton
            label="Delete post"
            confirm="Delete this post?"
            onConfirm={async () => {
              await remove("posts", existing.id);
              router.push("/blog");
            }}
          />
        )}
      </div>

      <div className="card p-5 sm:p-6">
        <input
          className="font-display w-full bg-transparent text-4xl font-bold uppercase outline-none placeholder:text-muted/60"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Date</span>
            <input type="date" max={todayIso()} className="field px-3 py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted">Tags</span>
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-table/15 px-2.5 py-0.5 text-xs text-[#8fbcf3]">
                #{t}
                <button aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-ink-2 hover:text-bad">
                  ×
                </button>
              </span>
            ))}
            <input
              className="field min-w-32 flex-1 px-2 py-1 text-sm"
              placeholder="add tag, press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
              }}
              onBlur={() => tagInput && addTag(tagInput)}
            />
          </div>
        </div>
      </div>

      <div className="card mt-4">
        {editor && <Toolbar editor={editor} onError={setErr} />}
        <div className="p-5 sm:p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-4 md:bottom-12">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-2xl shadow-black/50">
          <Toggle checked={published} onChange={setPublished} label={published ? "Published (visible to everyone)" : "Draft (only you can see it)"} />
          <span className="flex-1" />
          <button className="btn btn-primary" disabled={busy || !editor} onClick={save}>
            {busy ? "Saving…" : existing ? "Save changes" : published ? "Publish post" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
