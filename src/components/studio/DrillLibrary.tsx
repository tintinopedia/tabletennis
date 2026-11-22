"use client";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../DataProvider";
import { ConfirmButton, Field, Toggle, Toast, useToast } from "../ui";
import { KIND_STYLE, codeBadge } from "../ItemPanel";
import { BUILTIN_CATALOG, SECTIONS, youtubeId, ytThumb, type CodeDoc, type Kind, type Section, type Step, type TestDef, type VideoRef } from "@/lib/plan";
import { getImage, newId, put, remove, saveError } from "@/lib/store";
import { compressImage } from "@/lib/image";
import { DrillDrawer, InfoButton, NovaFilterBar, novaVisible, useNovaFilter } from "./DrillDrawer";

/** Image in the editor: existing (id) or freshly picked (data, uploaded on save) */
type DraftImage = { id?: string; title: string; data?: string };
const MAX_IMAGES = 2;

function StoredThumb({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    getImage(id).then((d) => on && setSrc(d));
    return () => {
      on = false;
    };
  }, [id]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null;
}

type Draft = {
  isNew: boolean;
  builtin: boolean;
  code: string;
  name: string;
  section: Section;
  kind: Kind;
  minutes: number;
  hr: boolean;
  steps: Step[];
  videos: VideoRef[];
  images: DraftImage[];
  scored: boolean;
  test: Omit<TestDef, "code" | "name"> & { name: string };
};
const emptyTest = () => ({ name: "", counts: "", target: null, direction: "high" as const, max: 10, step: 1, unit: "", levels: true });
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,15}$/;

export function DrillLibrary() {
  const { catalog, codeDocs, customDays } = useData();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const [info, setInfo] = useState<string | null>(null);
  const [nova, setNova] = useNovaFilter();
  const edited = new Set(codeDocs.map((d) => d.code));
  const usedCodes = useMemo(() => new Set(customDays.flatMap((d) => d.items.map((i) => i.code))), [customDays]);

  const open = (code?: string) => {
    setErr(null);
    if (!code) {
      setDraft({ isNew: true, builtin: false, code: "", name: "", section: "Table drills", kind: "table", minutes: 10, hr: false, steps: [], videos: [], images: [], scored: false, test: emptyTest() });
    } else {
      const c = catalog[code];
      const t = c.tests[0];
      setDraft({
        isNew: false,
        builtin: c.builtin,
        code: c.code,
        name: c.name,
        section: c.section,
        kind: c.kind,
        minutes: c.minutes,
        hr: c.hr,
        steps: c.steps.map((s) => ({ ...s })),
        videos: c.videos.map((v) => ({ ...v })),
        images: c.images.map((i) => ({ ...i })),
        scored: !c.builtin && !!t,
        test: t ? { name: t.name, counts: t.counts, target: t.target, direction: t.direction, max: t.max ?? null, step: t.step ?? 1, unit: t.unit ?? "", levels: t.levels } : emptyTest(),
      });
    }
    setTimeout(() => document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const save = async () => {
    if (!draft) return;
    const code = draft.code.trim();
    if (!CODE_RE.test(code)) return setErr("Code must start with a letter or number and use up to 16 letters, numbers, spaces, - or _.");
    if (draft.isNew && catalog[code]) return setErr(`${code} already exists.`);
    if (!draft.name.trim()) return setErr("Give the drill a name.");
    const badVideo = draft.videos.find((v) => v.url.trim() && !/^https?:\/\//.test(v.url.trim()));
    if (badVideo) return setErr("Video links must start with https://");
    const doc: CodeDoc = {
      code,
      name: draft.name.trim(),
      section: draft.section,
      kind: draft.kind,
      minutes: Number(draft.minutes) || 0,
      hr: draft.hr,
      steps: draft.steps.filter((s) => s.v.trim()).map((s) => ({ k: s.k.trim(), v: s.v.trim() })),
      videos: draft.videos.filter((v) => v.url.trim()).map((v) => ({ label: v.label.trim() || draft.name.trim(), url: v.url.trim() })),
      updatedAt: Date.now(),
    };
    const before = catalog[code]?.images ?? [];
    if (!draft.builtin) {
      doc.tests = draft.scored
        ? [
            {
              code,
              name: draft.test.name.trim() || draft.name.trim(),
              counts: draft.test.counts.trim() || "Score",
              target: draft.test.target == null || Number.isNaN(draft.test.target) ? null : Number(draft.test.target),
              direction: draft.test.direction,
              max: draft.test.max ? Number(draft.test.max) : null,
              step: Number(draft.test.step) || 1,
              unit: draft.test.unit?.trim() || "",
              levels: draft.test.levels,
            },
          ]
        : [];
    }
    try {
      setErr(null);
      const images = [];
      for (const im of draft.images) {
        if (im.id) images.push({ id: im.id, title: im.title.trim() });
        else if (im.data) {
          const id = newId();
          await put("images", id, { data: im.data, createdAt: Date.now() });
          images.push({ id, title: im.title.trim() });
        }
      }
      doc.images = images;
      await put("codes", code, doc);
      for (const old of before) if (!images.some((i) => i.id === old.id)) remove("images", old.id).catch(() => {});
      showToast(`${code} saved`);
      setDraft(null);
    } catch (e) {
      console.error(e);
      setErr(saveError(e));
    }
  };

  const term = q.trim().toLowerCase();
  const list = Object.values(catalog).filter((c) => (!term || c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)) && novaVisible(c.code, nova));
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <DrillDrawer
        code={info}
        onClose={() => setInfo(null)}
        onEdit={(c) => {
          setInfo(null);
          open(c);
        }}
      />
      <section className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <h2 className="font-display text-2xl font-bold uppercase">Drill library</h2>
            <p className="text-sm text-muted">Every code you can put in a session. Add YouTube links here and they play on the Training page.</p>
          </div>
          <input className="field min-w-0 flex-1 px-3 py-2 text-sm sm:w-48 sm:flex-none" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" onClick={() => open()}>
            + New code
          </button>
        </div>
        <div className="mt-4 space-y-5">
          {SECTIONS.map((s) => {
            const codes = list.filter((c) => c.section === s).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
            if (!codes.length && s !== "Nova robot") return null;
            return (
              <div key={s}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="flex-1 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    {s}
                    {s === "Nova robot" && <span className="ml-2 normal-case tracking-normal text-muted">Pongbot Nova S Pro presets ({codes.length} shown)</span>}
                  </p>
                  {s === "Nova robot" && <NovaFilterBar value={nova} onChange={setNova} />}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {codes.map((c) => (
                    <div key={c.code} className="flex min-w-0 items-center gap-1 rounded-xl border border-line bg-card-2/40 pr-1.5 transition hover:border-line-2 hover:bg-card-2">
                    <button onClick={() => open(c.code)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                      <span className={`font-display grid h-10 min-w-10 place-items-center rounded-lg px-1.5 text-sm font-bold ${KIND_STYLE[c.kind]}`}>{codeBadge(c.code)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="flex flex-wrap gap-1.5 text-[11px] text-muted">
                          <span>{c.minutes} min</span>
                          {c.hr && <span className="text-bad">♥ HR</span>}
                          {c.tests.length > 0 && <span>scored</span>}
                          {c.images.length > 0 && <span>{c.images.length} image{c.images.length > 1 ? "s" : ""}</span>}
                          {c.videos.length > 0 && <span>{c.videos.filter((v) => youtubeId(v.url)).length}/{c.videos.length} on YouTube</span>}
                          {!c.builtin ? <span className="text-[#8fbcf3]">custom</span> : edited.has(c.code) ? <span className="text-warn">edited</span> : null}
                        </span>
                      </span>
                    </button>
                    <InfoButton code={c.code} onOpen={setInfo} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {draft && (
        <section id="editor" className="card scroll-mt-24 p-5">
          <h2 className="font-display text-2xl font-bold uppercase">{draft.isNew ? "New code" : `Edit ${draft.code}`}</h2>
          {draft.builtin && <p className="text-sm text-muted">Built-in Season 1 drill. You can change its name, steps, videos, images and heart-rate default. Its scoring stays as in the Progress Tracker.</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <Field label="Code">
              <input className="field w-full px-3 py-2 text-sm uppercase" disabled={!draft.isNew} value={draft.code} placeholder="e.g. D10" onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Name">
              <input className="field w-full px-3 py-2 text-sm" value={draft.name} placeholder="e.g. Pendulum serve, short to FH" onChange={(e) => set({ name: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field label="Section">
              <select className="field w-full px-3 py-2 text-sm" value={draft.section} onChange={(e) => set({ section: e.target.value as Section })}>
                {SECTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Counts toward">
              <select className="field w-full px-3 py-2 text-sm" value={draft.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
                <option value="table">Table hours</option>
                <option value="physical">Physical hours</option>
                <option value="mental">Mental</option>
              </select>
            </Field>
            <Field label="Default minutes">
              <input type="number" min={0} className="field num w-full px-3 py-2 text-sm" value={draft.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} />
            </Field>
            <div className="flex items-end pb-2">
              <Toggle checked={draft.hr} onChange={(v) => set({ hr: v })} label="Track heart rate" />
            </div>
          </div>

          {/* steps */}
          <div className="mt-6">
            <p className="eyebrow">Step-by-step instructions</p>
            <div className="mt-2 space-y-2">
              {draft.steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className="field w-28 px-2 py-2 text-sm" placeholder={`Step ${i + 1}`} value={s.k} onChange={(e) => set({ steps: draft.steps.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })} />
                  <input className="field min-w-0 flex-1 px-2 py-2 text-sm" placeholder="What to do" value={s.v} onChange={(e) => set({ steps: draft.steps.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })} />
                  <button aria-label="Remove step" className="rounded px-2 text-bad hover:bg-card-2" onClick={() => set({ steps: draft.steps.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost !py-1 text-xs" onClick={() => set({ steps: [...draft.steps, { k: "", v: "" }] })}>
                + Add step
              </button>
            </div>
          </div>

          {/* videos */}
          <div className="mt-6">
            <p className="eyebrow">Reference videos (YouTube links play inside the Training page)</p>
            <div className="mt-2 space-y-2">
              {draft.videos.map((v, i) => {
                const id = youtubeId(v.url);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="h-10 w-16 shrink-0 overflow-hidden rounded bg-card-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {id && <img src={ytThumb(id)} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <input className="field w-44 px-2 py-2 text-sm" placeholder="Label" value={v.label} onChange={(e) => set({ videos: draft.videos.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input className="field min-w-0 flex-1 px-2 py-2 text-sm" placeholder="https://youtu.be/…" value={v.url} onChange={(e) => set({ videos: draft.videos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                    <span className={`w-20 text-xs ${id ? "text-good" : v.url ? "text-warn" : "text-muted"}`}>{id ? "✓ YouTube" : v.url ? "Link only" : ""}</span>
                    <button aria-label="Remove video" className="rounded px-2 text-bad hover:bg-card-2" onClick={() => set({ videos: draft.videos.filter((_, j) => j !== i) })}>
                      ✕
                    </button>
                  </div>
                );
              })}
              <button className="btn btn-ghost !py-1 text-xs" onClick={() => set({ videos: [...draft.videos, { label: "", url: "" }] })}>
                + Add video link
              </button>
            </div>
          </div>

          {/* images */}
          <div className="mt-6">
            <p className="eyebrow">Reference images (optional, up to {MAX_IMAGES}, PNG or JPG)</p>
            <div className="mt-2 space-y-2">
              {draft.images.map((im, i) => (
                <div key={im.id ?? i} className="flex flex-wrap items-center gap-2">
                  <span className="h-12 w-20 shrink-0 overflow-hidden rounded bg-card-3">
                    {im.data ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={im.data} alt="" className="h-full w-full object-cover" />
                    ) : im.id ? (
                      <StoredThumb id={im.id} />
                    ) : null}
                  </span>
                  <input className="field min-w-0 flex-1 px-2 py-2 text-sm" placeholder="Caption (optional)" value={im.title} onChange={(e) => set({ images: draft.images.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                  {!im.id && <span className="text-xs text-warn">uploads on save</span>}
                  <button aria-label="Remove image" className="rounded px-2 text-bad hover:bg-card-2" onClick={() => set({ images: draft.images.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
              {draft.images.length < MAX_IMAGES && (
                <label className="btn btn-ghost inline-block cursor-pointer !py-1 text-xs">
                  + Add image
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        const data = await compressImage(f);
                        setDraft((d) => (d && d.images.length < MAX_IMAGES ? { ...d, images: [...d.images, { title: f.name.replace(/\.[^.]+$/, ""), data }] } : d));
                      } catch (er) {
                        setErr((er as Error).message);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* scoring */}
          <div className="mt-6">
            <p className="eyebrow">Scoring</p>
            {draft.builtin ? (
              <p className="mt-2 text-sm text-ink-2">
                {catalog[draft.code].tests.length
                  ? catalog[draft.code].tests.map((t) => `${t.code} (${t.counts}${t.target != null ? `, target ${t.direction === "low" ? "≤" : "≥"} ${t.target}` : ""})`).join(" · ")
                  : "Not scored (Done / Skipped only)."}
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                <Toggle checked={draft.scored} onChange={(v) => set({ scored: v })} label="Log a score for this drill" />
                {draft.scored && (
                  <div className="grid gap-3 rounded-xl border border-line bg-card-2/40 p-3 sm:grid-cols-3">
                    <Field label="What is counted" className="sm:col-span-3">
                      <input className="field w-full px-2 py-2 text-sm" placeholder="e.g. 10 serves: landed short with backspin" value={draft.test.counts} onChange={(e) => set({ test: { ...draft.test, counts: e.target.value } })} />
                    </Field>
                    <Field label="Out of (max)" hint="blank = open">
                      <input type="number" className="field num w-full px-2 py-2 text-sm" value={draft.test.max ?? ""} onChange={(e) => set({ test: { ...draft.test, max: e.target.value === "" ? null : Number(e.target.value) } })} />
                    </Field>
                    <Field label="Target" hint="optional">
                      <input type="number" className="field num w-full px-2 py-2 text-sm" value={draft.test.target ?? ""} onChange={(e) => set({ test: { ...draft.test, target: e.target.value === "" ? null : Number(e.target.value) } })} />
                    </Field>
                    <Field label="Better is">
                      <select className="field w-full px-2 py-2 text-sm" value={draft.test.direction} onChange={(e) => set({ test: { ...draft.test, direction: e.target.value as "high" | "low" } })}>
                        <option value="high">Higher</option>
                        <option value="low">Lower</option>
                      </select>
                    </Field>
                    <Field label="Unit" hint="optional">
                      <input className="field w-full px-2 py-2 text-sm" placeholder="e.g. s, cm, balls" value={draft.test.unit ?? ""} onChange={(e) => set({ test: { ...draft.test, unit: e.target.value } })} />
                    </Field>
                    <Field label="Decimals">
                      <select className="field w-full px-2 py-2 text-sm" value={String(draft.test.step ?? 1)} onChange={(e) => set({ test: { ...draft.test, step: Number(e.target.value) } })}>
                        <option value="1">Whole numbers</option>
                        <option value="0.1">0.1</option>
                        <option value="0.01">0.01</option>
                      </select>
                    </Field>
                    <div className="flex items-end pb-2">
                      <Toggle checked={draft.test.levels} onChange={(v) => set({ test: { ...draft.test, levels: v } })} label="Track level" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {err && <p className="mt-4 text-sm text-bad">{err}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={save}>
              Save {draft.code || "code"}
            </button>
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <span className="flex-1" />
            {!draft.isNew && draft.builtin && edited.has(draft.code) && (
              <ConfirmButton
                label="Reset to original"
                confirm="Undo all edits?"
                onConfirm={async () => {
                  await remove("codes", draft.code);
                  showToast(`${draft.code} reset`);
                  setDraft(null);
                }}
              />
            )}
            {!draft.isNew && !draft.builtin && !BUILTIN_CATALOG[draft.code] && (
              <ConfirmButton
                label={usedCodes.has(draft.code) ? "In use by a session" : "Delete code"}
                disabled={usedCodes.has(draft.code)}
                onConfirm={async () => {
                  await remove("codes", draft.code);
                  showToast(`${draft.code} deleted`);
                  setDraft(null);
                }}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
