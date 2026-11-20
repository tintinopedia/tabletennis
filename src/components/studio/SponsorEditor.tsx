"use client";
import Link from "next/link";
import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Toolbar } from "../blog/Toolbar";
import { safeParse } from "../blog/PostView";
import { Toggle, Toast, useToast } from "../ui";
import { useSponsorPage, type PageDoc } from "../sponsor/useSponsorPage";
import { blogExtensions } from "@/lib/blog";
import { put, saveError } from "@/lib/store";

export function SponsorEditor() {
  const page = useSponsorPage();
  if (page === undefined) return <p className="py-10 text-center text-muted">Loading…</p>;
  return <Editor key={page?.updatedAt ?? "new"} page={page} />;
}

function Editor({ page }: { page: PageDoc | null }) {
  const [title, setTitle] = useState(page?.title ?? "Sponsor my table tennis journey");
  const [published, setPublished] = useState(page?.published ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const [extensions] = useState(() => blogExtensions("Tell sponsors who you are, what you're training for, and how their support helps…"));
  const [initial] = useState(() => (page?.content ? safeParse(page.content) : ""));
  const editor = useEditor(
    { extensions, content: initial, immediatelyRender: false, shouldRerenderOnTransaction: true, editorProps: { attributes: { class: "prose-tt min-h-[320px] outline-none" } } },
    []
  );
  const save = async () => {
    if (!editor) return;
    if (!title.trim()) return setErr("Add a page title.");
    setErr(null);
    setBusy(true);
    try {
      await put("pages", "sponsor", { title: title.trim(), content: JSON.stringify(editor.getJSON()), published, updatedAt: Date.now() });
      showToast(published ? "Sponsor page published" : "Saved (hidden)");
    } catch (e) {
      setErr(saveError(e));
    }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <Toast text={toast} />
      <section className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <h2 className="font-display text-2xl font-bold uppercase">Sponsor page</h2>
            <p className="text-sm text-muted">Opens when visitors tap the blinking “Sponsor me” ribbon in the bottom-right corner.</p>
          </div>
          {page && (
            <Link href="/sponsor" className="btn btn-ghost w-full text-center sm:w-auto">
              View page
            </Link>
          )}
        </div>
        <input
          className="font-display mt-5 w-full bg-transparent text-3xl font-bold uppercase outline-none placeholder:text-muted/60 sm:text-4xl"
          placeholder="Page title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </section>
      <div className="card">
        {editor && <Toolbar editor={editor} onError={setErr} />}
        <div className="p-5 sm:p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
      {err && <p className="text-sm text-bad">{err}</p>}
      <div className="sticky bottom-[calc(94px+env(safe-area-inset-bottom))] z-20 md:bottom-12">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-2xl shadow-black/50">
          <Toggle checked={published} onChange={setPublished} label={published ? "Published: ribbon shows on the site" : "Hidden: ribbon and page are off"} />
          <span className="flex-1" />
          <button className="btn btn-primary" disabled={busy || !editor} onClick={save}>
            {busy ? "Saving…" : "Save page"}
          </button>
        </div>
      </div>
    </div>
  );
}
