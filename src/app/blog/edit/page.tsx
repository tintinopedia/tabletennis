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

      <div className="card mt-4">
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

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72];
const TEXT_COLORS = ["#eef2f8", "#b7c0cf", "#7b879b", "#ff6b6b", "#f26a35", "#fab219", "#ffe066", "#2fbf4a", "#3ddbb0", "#3987e5", "#8fbcf3", "#9085e9", "#e87ba4", "#e0302e"];
const FILL_COLORS = ["#3a1d1d", "#3d2a12", "#3b3510", "#173a20", "#123738", "#15325c", "#2a2552", "#3a1c32", "#222e47", "#ffe066", "#8fbcf3", "#ffa27c"];
const BORDER_COLORS = ["#2d3b58", "#7b879b", "#eef2f8", "#3987e5", "#f26a35", "#2fbf4a", "#fab219", "#e0302e", "#9085e9"];

function Swatches({ colors, current, onPick, onClear, clearLabel = "Default" }: { colors: string[]; current?: string | null; onPick: (c: string) => void; onClear: () => void; clearLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((col) => (
        <button
          key={col}
          type="button"
          title={col}
          aria-label={`Colour ${col}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(col)}
          className={`h-6 w-6 rounded-md border ${current?.toLowerCase() === col ? "border-ink ring-2 ring-table" : "border-line-2"}`}
          style={{ background: col }}
        />
      ))}
      <label className="relative grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-line-2 bg-card-3 text-xs text-ink-2" title="Custom colour">
        +
        <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={current && /^#[0-9a-f]{6}$/i.test(current) ? current : "#3987e5"} onChange={(e) => onPick(e.target.value)} />
      </label>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="rounded-md px-2 py-0.5 text-xs text-ink-2 hover:bg-card-3">
        {clearLabel}
      </button>
    </div>
  );
}

function Toolbar({ editor, onError }: { editor: Editor; onError: (s: string | null) => void }) {
  const [panel, setPanel] = useState<null | "link" | "video" | "color" | "highlight">(null);
  const [val, setVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = () => editor.chain().focus();
  const block = editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";
  const fontSize = String(editor.getAttributes("textStyle").fontSize ?? "").replace("pt", "");
  const color = editor.getAttributes("textStyle").color as string | undefined;
  const hl = editor.getAttributes("highlight").color as string | undefined;
  const inTable = editor.isActive("table");
  const sel = editor.state.selection as unknown as { node?: { type: { name: string }; attrs: Record<string, string> } };
  const media = sel.node && (sel.node.type.name === "storedImage" || sel.node.type.name === "youtube") ? sel.node : null;
  useEffect(() => {
    if (panel === "link") setVal(editor.getAttributes("link").href ?? "");
    else if (panel === "video") setVal("");
  }, [panel, editor]);

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

  const setMedia = (attrs: Record<string, string>) => {
    const { from } = editor.state.selection;
    editor.chain().command(({ tr }) => {
      const node = tr.doc.nodeAt(from);
      if (!node) return false;
      tr.setNodeMarkup(from, undefined, { ...node.attrs, ...attrs });
      return true;
    }).setNodeSelection(from).run();
  };

  return (
    <div className="sticky top-[68px] z-10 rounded-t-2xl border-b border-line bg-card-2/95 backdrop-blur">
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
        <select
          aria-label="Font size"
          title="Font size (pt)"
          value={fontSize}
          onChange={(e) => (e.target.value ? c().setFontSize(`${e.target.value}pt`).run() : c().unsetFontSize().run())}
          className="field mr-1 w-[4.6rem] px-2 py-1 text-sm"
        >
          <option value="">Size</option>
          {fontSize && !FONT_SIZES.includes(Number(fontSize)) && <option value={fontSize}>{fontSize}</option>}
          {FONT_SIZES.map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
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
        <TB label="Text colour" on={panel === "color"} onClick={() => setPanel(panel === "color" ? null : "color")}>
          <span className="flex flex-col items-center leading-none">
            <span className="font-semibold">A</span>
            <span className="mt-0.5 h-1 w-4 rounded" style={{ background: color ?? "#eef2f8" }} />
          </span>
        </TB>
        <TB label="Highlight colour" on={panel === "highlight"} onClick={() => setPanel(panel === "highlight" ? null : "highlight")}>
          <span className="rounded px-1 text-xs font-bold" style={{ background: hl ?? "#ffe066", color: "#111" }}>
            ab
          </span>
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
        <TB label="Insert table" on={inTable} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon />
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

      {(panel === "link" || panel === "video") && (
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
      {panel === "color" && (
        <div className="flex items-center gap-3 border-t border-line px-3 py-2">
          <span className="text-xs text-muted">Text colour</span>
          <Swatches colors={TEXT_COLORS} current={color} onPick={(col) => c().setColor(col).run()} onClear={() => c().unsetColor().run()} />
        </div>
      )}
      {panel === "highlight" && (
        <div className="flex items-center gap-3 border-t border-line px-3 py-2">
          <span className="text-xs text-muted">Highlight</span>
          <Swatches colors={FILL_COLORS.slice(0, 9)} current={hl} onPick={(col) => c().setHighlight({ color: col }).run()} onClear={() => c().unsetHighlight().run()} clearLabel="None" />
        </div>
      )}

      {media && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-table/10 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">{media.type.name === "youtube" ? "Video" : "Image"}</span>
          <span className="text-muted">Wrap text</span>
          <div className="flex overflow-hidden rounded-full border border-line-2">
            {(["none", "left", "right"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMedia({ float: f, size: f !== "none" && (media.attrs.size ?? "100") === "100" ? "40" : media.attrs.size ?? "100" })}
                className={`px-2.5 py-1 ${((media.attrs.float as string) ?? "none") === f ? "bg-table text-white" : "text-ink-2 hover:bg-card-3"}`}
              >
                {f === "none" ? "No wrap" : f === "left" ? "Image left" : "Image right"}
              </button>
            ))}
          </div>
          <span className="text-muted">Size</span>
          <div className="flex overflow-hidden rounded-full border border-line-2">
            {["25", "40", "60", "100"].map((sz) => (
              <button
                key={sz}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMedia({ size: sz })}
                className={`px-2.5 py-1 ${((media.attrs.size as string) ?? "100") === sz ? "bg-table text-white" : "text-ink-2 hover:bg-card-3"}`}
              >
                {sz}%
              </button>
            ))}
          </div>
          {media.type.name === "storedImage" && (
            <input
              className="field min-w-40 flex-1 px-2 py-1 text-xs"
              placeholder="Caption (optional)"
              defaultValue={media.attrs.caption ?? ""}
              key={editor.state.selection.from}
              onBlur={(e) => setMedia({ caption: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          )}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteSelection().run()} className="ml-auto rounded-full px-2.5 py-1 text-bad hover:bg-card-3">
            Remove
          </button>
        </div>
      )}

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-t border-line bg-table/10 px-3 py-2 text-xs">
          <span className="mr-1 font-semibold text-ink">Table</span>
          {(
            [
              ["+ Row above", () => c().addRowBefore().run()],
              ["+ Row below", () => c().addRowAfter().run()],
              ["+ Column left", () => c().addColumnBefore().run()],
              ["+ Column right", () => c().addColumnAfter().run()],
              ["− Row", () => c().deleteRow().run()],
              ["− Column", () => c().deleteColumn().run()],
              ["Header row", () => c().toggleHeaderRow().run()],
              ["Merge cells", () => c().mergeCells().run()],
              ["Split cell", () => c().splitCell().run()],
            ] as [string, () => void][]
          ).map(([label, fn]) => (
            <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn} className="rounded-full border border-line-2 px-2.5 py-1 text-ink-2 hover:bg-card-3 hover:text-ink">
              {label}
            </button>
          ))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteTable().run()} className="rounded-full px-2.5 py-1 text-bad hover:bg-card-3">
            Delete table
          </button>
          <div className="mt-2 flex w-full flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="text-muted">Line colour</span>
              <Swatches
                colors={BORDER_COLORS}
                current={editor.getAttributes("table").borderColor}
                onPick={(col) => c().updateAttributes("table", { borderColor: col }).run()}
                onClear={() => c().updateAttributes("table", { borderColor: null }).run()}
              />
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted">Cell fill</span>
              <Swatches
                colors={FILL_COLORS}
                current={editor.getAttributes(editor.isActive("tableHeader") ? "tableHeader" : "tableCell").backgroundColor}
                onPick={(col) => c().setCellAttribute("backgroundColor", col).run()}
                onClear={() => c().setCellAttribute("backgroundColor", null).run()}
                clearLabel="None"
              />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <path d="M1.5 6h13M1.5 10h13M6 2v12M10.5 2v12" />
    </svg>
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
