"use client";
import { useEffect, useState } from "react";
import { ConfirmButton, Field, Toggle, Toast, useToast } from "../ui";
import { VideoThumb, VideoModal } from "../Media";
import { youtubeId } from "@/lib/plan";
import { newId, put, remove, subscribe, type VideoDoc, saveError } from "@/lib/store";
import { fmtDate, todayIso } from "@/lib/analytics";

const blank = () => ({ url: "", title: "", recordedOn: todayIso(), description: "", published: true });

export function VideoManager() {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState<VideoDoc | null>(null);
  const [toast, showToast] = useToast();
  useEffect(() => subscribe<VideoDoc>("videos", (rows) => setVideos(rows.sort((a, b) => b.order - a.order))), []);
  const id = youtubeId(form.url);

  const submit = async () => {
    if (!id) return setErr("Paste a YouTube link, e.g. https://youtu.be/abc123XYZ00 or a youtube.com/watch link.");
    if (!form.title.trim()) return setErr("Add a title.");
    setErr(null);
    const existing = editing ? videos.find((v) => v.id === editing) : null;
    const doc: VideoDoc = {
      id: existing?.id ?? newId(),
      url: form.url.trim(),
      youtubeId: id,
      title: form.title.trim(),
      recordedOn: form.recordedOn || "",
      description: form.description.trim(),
      published: form.published,
      order: existing?.order ?? (videos.length ? Math.max(...videos.map((v) => v.order)) + 1 : 1),
      createdAt: existing?.createdAt ?? Date.now(),
    };
    try {
      await put("videos", doc.id, doc);
      showToast(editing ? "Video updated" : form.published ? "Video published to Home" : "Video saved as draft");
      setForm(blank());
      setEditing(null);
    } catch (e) {
      console.error(e);
      setErr(saveError(e));
    }
  };
  const swap = async (i: number, j: number) => {
    const a = videos[i],
      b = videos[j];
    if (!a || !b) return;
    await Promise.all([put("videos", a.id, { ...a, order: b.order }), put("videos", b.id, { ...b, order: a.order })]);
  };

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold uppercase">{editing ? "Edit video" : "Add a video"}</h2>
        <p className="text-sm text-muted">Upload to Tintin&apos;s YouTube channel (Public or Unlisted), then paste the link here. Published videos appear in the Memories carousel on Home.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            <Field label="YouTube link">
              <input className="field w-full px-3 py-2 text-sm" placeholder="https://youtu.be/…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <Field label="Title">
                <input className="field w-full px-3 py-2 text-sm" placeholder="e.g. Falkenberg drill, first clean 9/9" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Recorded on">
                <input type="date" className="field w-full px-3 py-2 text-sm" value={form.recordedOn} onChange={(e) => setForm({ ...form, recordedOn: e.target.value })} />
              </Field>
            </div>
            <Field label="Description" hint="optional">
              <textarea rows={2} className="field w-full px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} label="Publish to Home" />
          </div>
          <div>
            <p className="eyebrow mb-2">Preview</p>
            {id ? (
              <VideoThumb v={{ youtubeId: id } as VideoDoc} className="aspect-video rounded-xl border border-line" />
            ) : (
              <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Thumbnail appears here</div>
            )}
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-bad">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={submit}>
            {editing ? "Save changes" : form.published ? "Publish" : "Save draft"}
          </button>
          {editing && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm(blank());
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold uppercase">Memories ({videos.length})</h2>
        <p className="text-sm text-muted">Top of the list shows first in the carousel.</p>
        <div className="mt-4 space-y-2">
          {videos.length === 0 && <p className="text-sm text-muted">No videos yet.</p>}
          {videos.map((v, i) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card-2/40 p-2">
              <button onClick={() => setPlaying(v)} className="shrink-0" aria-label={`Play ${v.title}`}>
                <VideoThumb v={v} className="aspect-video w-32 rounded-lg" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.title}</p>
                <p className="text-xs text-muted">{v.recordedOn ? fmtDate(v.recordedOn, { day: "numeric", month: "short", year: "numeric" }) : "No date"}</p>
              </div>
              <Toggle checked={v.published} onChange={(p) => put("videos", v.id, { ...v, published: p })} label={<span className={`text-xs ${v.published ? "text-good" : "text-muted"}`}>{v.published ? "Published" : "Hidden"}</span>} />
              <div className="flex items-center gap-1">
                <button aria-label="Move up" disabled={i === 0} className="rounded px-2 py-1 text-ink-2 hover:bg-card-3 disabled:opacity-30" onClick={() => swap(i, i - 1)}>
                  ↑
                </button>
                <button aria-label="Move down" disabled={i === videos.length - 1} className="rounded px-2 py-1 text-ink-2 hover:bg-card-3 disabled:opacity-30" onClick={() => swap(i, i + 1)}>
                  ↓
                </button>
                <button
                  className="btn btn-ghost !px-3 !py-1 text-xs"
                  onClick={() => {
                    setEditing(v.id);
                    setForm({ url: v.url, title: v.title, recordedOn: v.recordedOn ?? "", description: v.description ?? "", published: v.published });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </button>
                <ConfirmButton label="Delete" onConfirm={() => remove("videos", v.id)} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <VideoModal video={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}
