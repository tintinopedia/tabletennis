"use client";
import { useEffect, useRef, useState } from "react";
import { Gate } from "@/components/Gate";
import { ConfirmButton, Toast, useToast } from "@/components/ui";
import { newId, put, remove, subscribe, type MantraDoc, type MantraSection, type RecordingDoc, saveError } from "@/lib/store";

const P = (text: string) => ({ id: newId(), text });
const EL = (n: number, title: string, hint: string): MantraSection => ({ id: `el${n}`, title: `${n}. ${title}`, hint, points: [P(hint)], kind: "element" });
const RULES = [
  "First person, present tense.",
  "Positive: what I DO, never what I avoid. 'I stay calm', never 'I don't get nervous'.",
  "Precise to MY game, and powerful.",
  "Written in the language my inner voice actually speaks.",
];
const CHECKLIST = [
  "Read the twelve sentences as one flowing text. Slow, confident voice, 60 to 120 seconds.",
  "Listen with headphones before EVERY match, as a fixed step of the M5 routine, and every night after the journal for the first two weeks.",
  "Re-record every season: my game grows, my identity statement grows with it.",
];

const DEFAULT_MANTRA: MantraDoc = {
  sections: [
    EL(1, "Work ethic", "I am a player who…"),
    EL(2, "Trust in preparation", "I trust…"),
    EL(3, "Emotional control", "I control… / I play calm when…"),
    EL(4, "Legs and positioning", "My legs are…"),
    EL(5, "Receive", "I am confident receiving… my answer is…"),
    EL(6, "Serve and third ball", "Every serve I make…"),
    EL(7, "Tempo", "I play at…"),
    EL(8, "Finishing the open ball", "I finish…"),
    EL(9, "My weapons (name them)", "My … and my … win me points."),
    EL(10, "Clarity and vision", "My mind is… I see…"),
    EL(11, "Resilience", "I am… when it is needed."),
    EL(12, "Identity (close with three)", "I am prepared. I am focused. I am…"),
  ],
};

export default function MantraPage() {
  return (
    <Gate title="My mantra">
      <Mantra />
    </Gate>
  );
}

function Mantra() {
  const [doc, setDoc] = useState<MantraDoc | null>(null);
  const [toast, showToast] = useToast();
  useEffect(() => subscribe<MantraDoc>("mantra", (rows) => setDoc(rows.find((r) => r.id === "main") ?? DEFAULT_MANTRA)), []);
  if (!doc) return <p className="py-20 text-center text-muted">Loading…</p>;

  const save = async (next: MantraDoc, msg?: string) => {
    setDoc(next);
    try {
      await put("mantra", "main", { ...next, updatedAt: Date.now() });
      if (msg) showToast(msg);
    } catch (e) {
      console.error(e);
      showToast(saveError(e));
    }
  };
  const setSection = (sid: string, fn: (s: MantraSection) => MantraSection) => save({ ...doc, sections: doc.sections.map((s) => (s.id === sid ? fn(s) : s)) });
  const elements = doc.sections.filter((s) => s.kind !== "info" && s.id !== "rules" && s.id !== "checklist");
  const flowing = elements.flatMap((s) => s.points.map((p) => p.text.trim())).filter(Boolean);

  return (
    <div className="pt-6">
      <Toast text={toast} />
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <p className="eyebrow">M2 · Mantra builder</p>
          <h1 className="font-display text-4xl font-bold uppercase">My mantra</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">One sentence per element, in order. Edit the lines below, then read the whole mantra aloud and record it.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="court-bg rounded-2xl p-6">
          <p className="eyebrow !text-ink-2">Read aloud</p>
          <p className="mt-3 font-serif text-xl leading-relaxed text-ink sm:text-2xl">{flowing.length ? flowing.join(" ") : "Write your lines below to build the mantra."}</p>
        </section>
        <Recorder onSaved={() => showToast("Recording saved")} />
      </div>

      <div className="mt-8 space-y-4">
        {elements.map((s) => (
          <SectionCard
            key={s.id}
            s={s}
            onChange={(fn) => setSection(s.id, fn)}
            onDelete={() => save({ ...doc, sections: elements.filter((x) => x.id !== s.id) }, "Section removed")}
          />
        ))}
        <button
          className="btn btn-ghost"
          onClick={() => {
            const sec: MantraSection = { id: newId(), title: `${elements.length + 1}. New element`, points: [P("")], kind: "element" };
            save({ ...doc, sections: [...elements, sec] }, "Section added");
          }}
        >
          + Add element
        </button>
      </div>

      <div className="mt-10 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        {(
          [
            ["Rules for writing", RULES],
            ["Recording checklist", CHECKLIST],
          ] as const
        ).map(([title, lines]) => (
          <div key={title}>
            <p className="eyebrow mb-2">{title}</p>
            <ul className="space-y-1.5 text-sm text-ink-2">
              {lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ s, onChange, onDelete }: { s: MantraSection; onChange: (fn: (s: MantraSection) => MantraSection) => void; onDelete: () => void }) {
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(s.title);
  return (
    <section className={`card p-4 ${s.kind === "info" ? "bg-card-2/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        {editTitle ? (
          <>
            <input className="field min-w-0 flex-1 px-2 py-1.5 text-sm font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button
              className="btn btn-primary !px-3 !py-1 text-xs"
              onClick={() => {
                onChange((x) => ({ ...x, title: title.trim() || x.title }));
                setEditTitle(false);
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display flex-1 text-xl font-bold uppercase">{s.title}</h2>
            <button className="text-xs text-muted hover:text-ink" onClick={() => setEditTitle(true)}>
              Rename
            </button>
            <ConfirmButton label="Remove" confirm="Remove section?" onConfirm={onDelete} className="text-xs text-muted hover:text-bad" />
          </>
        )}
      </div>
      {s.hint && <p className="text-xs text-muted">Starts like: {s.hint}</p>}
      <ul className="mt-3 space-y-2">
        {s.points.map((p) => (
          <PointRow
            key={p.id}
            text={p.text}
            onSave={(text) => onChange((x) => ({ ...x, points: x.points.map((q) => (q.id === p.id ? { ...q, text } : q)) }))}
            onDelete={() => onChange((x) => ({ ...x, points: x.points.filter((q) => q.id !== p.id) }))}
          />
        ))}
      </ul>
      <button className="mt-2 text-sm font-medium text-[#8fbcf3] hover:underline" onClick={() => onChange((x) => ({ ...x, points: [...x.points, P("")] }))}>
        + Add line
      </button>
    </section>
  );
}

function PointRow({ text, onSave, onDelete }: { text: string; onSave: (t: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(!text);
  const [val, setVal] = useState(text);
  useEffect(() => setVal(text), [text]);
  if (editing)
    return (
      <li className="flex flex-wrap items-start gap-2">
        <textarea autoFocus rows={2} className="field min-w-0 flex-1 px-3 py-2 text-sm" value={val} placeholder="Write the line…" onChange={(e) => setVal(e.target.value)} />
        <div className="flex gap-1">
          <button
            className="btn btn-primary !px-3 !py-1 text-xs"
            onClick={() => {
              onSave(val.trim());
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            className="btn btn-ghost !px-3 !py-1 text-xs"
            onClick={() => {
              if (!text) onDelete();
              setVal(text);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </li>
    );
  return (
    <li className="group flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-card-2/60">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ball" />
      <span className="flex-1 text-[15px] text-ink">{text}</span>
      <button className="text-xs text-muted hover:text-ink" onClick={() => setEditing(true)}>
        Edit
      </button>
      <ConfirmButton label="Delete" confirm="Delete line?" onConfirm={onDelete} className="text-xs text-muted hover:text-bad" />
    </li>
  );
}

/* ----------------------------- recorder ----------------------------- */
const MAX_SECONDS = 150;
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Recorder({ onSaved }: { onSaved: () => void }) {
  const [recs, setRecs] = useState<RecordingDoc[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "saving">("idle");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => subscribe<RecordingDoc>("recordings", (rows) => setRecs(rows.sort((a, b) => b.createdAt - a.createdAt))), []);

  const start = async () => {
    setErr(null);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) return setErr("This browser cannot record audio. Try Chrome or Safari.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return setErr("Microphone permission was blocked. Allow the microphone for this site and try again.");
    }
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
    const chunks: Blob[] = [];
    const t0 = Date.now();
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const duration = Math.round((Date.now() - t0) / 1000);
      if (duration < 1) return setState("idle");
      setState("saving");
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      const data: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(blob);
      });
      if (data.length > 980_000) {
        setErr("That recording is too large to save. Keep it under about 2 minutes.");
        return setState("idle");
      }
      const id = newId();
      try {
        await put("recordings", id, { createdAt: Date.now(), mime: blob.type, duration, data });
        onSaved();
      } catch (e) {
        console.error(e);
        setErr(saveError(e));
      }
      setState("idle");
    };
    rec.start(1000);
    mr.current = rec;
    setSecs(0);
    setState("recording");
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      setSecs(s);
      if (s >= MAX_SECONDS) rec.state === "recording" && rec.stop();
    }, 250);
  };
  const stop = () => mr.current?.state === "recording" && mr.current.stop();

  return (
    <section className="card p-5">
      <p className="eyebrow">Voice recordings</p>
      <div className="mt-3 flex items-center gap-4">
        {state === "recording" ? (
          <button onClick={stop} className="grid h-16 w-16 place-items-center rounded-full bg-critical text-white shadow-lg shadow-critical/30" aria-label="Stop recording">
            <span className="h-5 w-5 rounded-sm bg-white" />
          </button>
        ) : (
          <button onClick={start} disabled={state === "saving"} className="grid h-16 w-16 place-items-center rounded-full bg-ball text-white shadow-lg shadow-ball/30 transition hover:scale-105 disabled:opacity-50" aria-label="Start recording">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
            </svg>
          </button>
        )}
        <div>
          <p className="font-semibold">{state === "recording" ? "Recording…" : state === "saving" ? "Saving…" : "Record my mantra"}</p>
          <p className="num text-sm text-muted">
            {state === "recording" ? (
              <span className="text-bad">
                ● {fmtTime(secs)} / {fmtTime(MAX_SECONDS)}
              </span>
            ) : (
              "Tap, read the mantra aloud, tap again to stop. Saved automatically."
            )}
          </p>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      <div className="mt-5 space-y-3">
        {recs.length === 0 && <p className="text-sm text-muted">No recordings yet.</p>}
        {recs.map((r, i) => (
          <div key={r.id} className="rounded-xl border border-line bg-card-2/50 p-3">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-semibold">
                {new Date(r.createdAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                {i === 0 && <span className="ml-2 rounded-full bg-table/20 px-2 py-0.5 text-[11px] text-[#8fbcf3]">Latest</span>}
              </p>
              <span className="num text-xs text-muted">{fmtTime(r.duration)}</span>
              <ConfirmButton label="Delete" confirm="Delete recording?" onConfirm={() => remove("recordings", r.id)} className="text-xs text-muted hover:text-bad" />
            </div>
            <audio controls preload="none" src={r.data} className="mt-2 w-full [color-scheme:dark]" />
          </div>
        ))}
      </div>
    </section>
  );
}
