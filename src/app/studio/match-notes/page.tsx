"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Gate } from "@/components/Gate";
import { Toolbar } from "@/components/blog/Toolbar";
import { safeParse } from "@/components/blog/PostView";
import { blogExtensions } from "@/lib/blog";
import { put, saveError, subscribe } from "@/lib/store";
import { fmtDate } from "@/lib/analytics";
import { useMatches, type MatchDoc } from "@/lib/player";

type NoteDoc = { id: string; content: string; updatedAt: number };

export default function MatchNotesPage() {
  return (
    <Gate title="Match notes">
      <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
        <Loader />
      </Suspense>
    </Gate>
  );
}

function Loader() {
  const id = useSearchParams().get("id");
  const matches = useMatches();
  const [note, setNote] = useState<NoteDoc | null | undefined>(undefined);
  useEffect(() => subscribe<NoteDoc>("matchNotes", (rows) => setNote(rows.find((r) => r.id === id) ?? null)), [id]);
  if (!matches || note === undefined) return <p className="py-20 text-center text-muted">Loading…</p>;
  const match = matches.find((m) => m.id === id);
  if (!match) return <p className="py-20 text-center text-muted">Match not found.</p>;
  return <Editor match={match} note={note} />;
}

function Editor({ match, note }: { match: MatchDoc; note: NoteDoc | null }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extensions] = useState(() => blogExtensions("What worked? What didn't? What will you change next time?"));
  const [initial] = useState(() => (note?.content ? safeParse(note.content) : ""));
  const editor = useEditor(
    { extensions, content: initial, immediatelyRender: false, shouldRerenderOnTransaction: true, editorProps: { attributes: { class: "prose-tt min-h-[320px] outline-none" } } },
    []
  );
  const won = match.scoreFor > match.scoreAgainst;
  const save = async () => {
    if (!editor) return;
    setBusy(true);
    setErr(null);
    try {
      await put("matchNotes", match.id, { content: JSON.stringify(editor.getJSON()), updatedAt: Date.now() });
      if (!match.hasNotes) await put("matches", match.id, { ...match, hasNotes: true, updatedAt: Date.now() });
      router.push("/studio?tab=games");
    } catch (e) {
      setErr(saveError(e));
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl pt-6">
      <Link href="/studio?tab=games" className="text-sm text-ink-2 hover:text-ink">
        ‹ Back to Game stats
      </Link>
      <div className="card mt-4 p-5 sm:p-6">
        <p className="eyebrow">Match notes · {match.level}</p>
        <h1 className="font-display mt-1 text-3xl font-bold uppercase sm:text-4xl">Tintin vs {match.opponent}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {fmtDate(match.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
          <b className={won ? "text-good" : "text-bad"}>
            {match.scoreFor} / {match.scoreAgainst} {won ? "won" : match.scoreFor < match.scoreAgainst ? "lost" : "draw"}
          </b>
        </p>
      </div>
      <div className="card mt-4">
        {editor && <Toolbar editor={editor} onError={setErr} />}
        <div className="p-5 sm:p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-4 md:bottom-3">
        <div className="card flex items-center gap-3 p-3 shadow-2xl shadow-black/50">
          <span className="flex-1 text-sm text-muted">{note ? `Last saved ${new Date(note.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "New notes"}</span>
          <button className="btn btn-primary" disabled={busy || !editor} onClick={save}>
            {busy ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
