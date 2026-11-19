"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Gate } from "@/components/Gate";
import { ConfirmButton, Toggle } from "@/components/ui";
import { usePosts } from "@/components/blog/usePosts";
import { safeParse } from "@/components/blog/PostView";
import { blogExtensions, summarize, type PostDoc } from "@/lib/blog";
import { compressImage } from "@/lib/image";
import { newId, put, remove, saveError } from "@/lib/store";
import { todayIso } from "@/lib/analytics";
import { youtubeId } from "@/lib/plan";

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

      <div className="card mt-4 overflow-hidden">
        {editor && <Toolbar editor={editor} onError={setErr} />}
        <div className="p-5 sm:p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      <div className="sticky bottom-3 z-20 mt-4">
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

function TB({ on, onClick, label, children, disabled }: { on?: boolean; onClick: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm transition disabled:opacity-30 ${on ? "bg-table/25 text-ink" : "text-ink-2 hover:bg-card-3 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px bg-line-2" />;

function Toolbar({ editor, onError }: { editor: Editor; onError: (s: string | null) => void }) {
  const [panel, setPanel] = useState<null | "link" | "video">(null);
  const [val, setVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = () => editor.chain().focus();
  const block = editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";
  useEffect(() => {
    if (panel === "link") setVal(editor.getAttributes("link").href ?? "");
    else setVal("");
  }, [panel, editor]);

  // after inserting an image/video, put the cursor in a paragraph below it so typing doesn't replace it
  const caretAfter = () => {
    const { to } = editor.state.selection;
    const next = editor.state.doc.nodeAt(to);
    if (next?.type.name === "paragraph") editor.chain().setTextSelection(to + 1).focus().run();
    else editor.chain().insertContentAt(to, { type: "paragraph" }).setTextSelection(to + 1).focus().run();
  };

  const apply = () => {
    const v = val.trim();
    if (panel === "link") {
      if (!v) c().extendMarkRange("link").unsetLink().run();
      else c().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/.test(v) ? v : `https://${v}` }).run();
    } else if (panel === "video") {
      if (!youtubeId(v)) return onError("That doesn't look like a YouTube link.");
      c().setYoutubeVideo({ src: v }).run();
      caretAfter();
    }
    onError(null);
    setPanel(null);
  };

  const onFile = async (f: File) => {
    setUploading(true);
    try {
      const data = await compressImage(f);
      const id = newId();
      await put("images", id, { data, createdAt: Date.now() });
      c().insertContent({ type: "storedImage", attrs: { id, caption: "" } }).run();
      caretAfter();
      onError(null);
    } catch (e) {
      onError((e as { code?: string }).code ? saveError(e) : (e as Error).message);
    }
    setUploading(false);
  };

  return (
    <div className="sticky top-[68px] z-10 border-b border-line bg-card-2/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-0.5 p-2">
        <select
          aria-label="Text style"
          value={block}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") c().setParagraph().run();
            else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
          }}
          className="field mr-1 px-2 py-1 text-sm"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <TB label="Bold" on={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
          <b>B</b>
        </TB>
        <TB label="Italic" on={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
          <i className="font-serif">I</i>
        </TB>
        <TB label="Underline" on={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
          <u>U</u>
        </TB>
        <TB label="Strikethrough" on={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}>
          <s>S</s>
        </TB>
        <Sep />
        <TB label="Bulleted list" on={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>
          •≡
        </TB>
        <TB label="Numbered list" on={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>
          1.
        </TB>
        <TB label="Quote" on={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>
          ❝
        </TB>
        <TB label="Divider" onClick={() => c().setHorizontalRule().run()}>
          ―
        </TB>
        <Sep />
        {(["left", "center", "right"] as const).map((a) => (
          <TB key={a} label={`Align ${a}`} on={editor.isActive({ textAlign: a })} onClick={() => c().setTextAlign(a).run()}>
            <AlignIcon a={a} />
          </TB>
        ))}
        <Sep />
        <TB label="Link" on={editor.isActive("link") || panel === "link"} onClick={() => setPanel(panel === "link" ? null : "link")}>
          🔗
        </TB>
        <TB label="Insert image" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "…" : "🖼"}
        </TB>
        <TB label="Embed YouTube video" on={panel === "video"} onClick={() => setPanel(panel === "video" ? null : "video")}>
          ▶
        </TB>
        <Sep />
        <TB label="Undo" disabled={!editor.can().undo()} onClick={() => c().undo().run()}>
          ↶
        </TB>
        <TB label="Redo" disabled={!editor.can().redo()} onClick={() => c().redo().run()}>
          ↷
        </TB>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
      </div>
      {panel && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
          <span className="text-xs text-muted">{panel === "link" ? "Link URL" : "YouTube link"}</span>
          <input
            autoFocus
            className="field min-w-0 flex-1 px-2 py-1 text-sm"
            placeholder={panel === "link" ? "https://… (select text first)" : "https://youtu.be/…"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
              if (e.key === "Escape") setPanel(null);
            }}
          />
          <button className="btn btn-primary !px-3 !py-1 text-xs" onClick={apply}>
            {panel === "link" ? (val ? "Apply" : "Remove link") : "Embed"}
          </button>
          <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => setPanel(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function AlignIcon({ a }: { a: "left" | "center" | "right" }) {
  const x = a === "left" ? [2, 2, 2] : a === "center" ? [4, 2, 5] : [6, 2, 8];
  const w = [10, 14, 8];
  return (
    <svg width="16" height="14" viewBox="0 0 18 14" aria-hidden>
      {[1, 6, 11].map((y, i) => (
        <rect key={y} x={x[i]} y={y} width={w[i]} height="2" rx="1" fill="currentColor" />
      ))}
    </svg>
  );
}
