"use client";
import { useRef, useState } from "react";
import { newId, put, remove, saveError } from "@/lib/store";
import { compressImage } from "@/lib/image";
import { ConfirmButton, Field, Toast, useToast } from "../ui";
import { useSponsorLog, useSponsors, type SponsorDoc, type SponsorLogDoc } from "../sponsors/useSponsors";

const fmtWhen = (t: number) =>
  new Date(t).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

async function readLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    if (file.size > 300_000) throw new Error("SVG logo is too large (max 300 KB).");
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("Could not read the logo"));
      r.readAsDataURL(file);
    });
  }
  return compressImage(file);
}

type Draft = { id: string | null; name: string; url: string; logo: string };
const EMPTY: Draft = { id: null, name: "", url: "", logo: "" };

export function SponsorsManager() {
  const sponsors = useSponsors();
  const log = useSponsorLog();
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = d.id ? sponsors?.find((s) => s.id === d.id) : null;

  const record = (entry: SponsorLogDoc) => put("sponsorLog", newId(), entry);

  async function pick(f?: File) {
    if (!f) return;
    try {
      const logo = await readLogo(f);
      setD((x) => ({ ...x, logo }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not read the logo");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    const name = d.name.trim();
    const url = d.url.trim();
    if (!name) return showToast("Add the brand name.");
    if (!d.logo) return showToast("Upload the brand logo.");
    if (url && !/^https?:\/\//i.test(url)) return showToast("Website must start with http:// or https://");
    setBusy(true);
    try {
      const now = Date.now();
      if (editing) {
        const changes: string[] = [];
        if (editing.name !== name) changes.push(`name "${editing.name}" → "${name}"`);
        if (editing.logo !== d.logo) changes.push("logo replaced");
        if ((editing.url ?? "") !== url) changes.push(url ? `website ${url}` : "website removed");
        if (!changes.length) {
          setD(EMPTY);
          setBusy(false);
          return showToast("No changes to save.");
        }
        await put("sponsors", editing.id, { ...stripId(editing), name, logo: d.logo, url, updatedAt: now });
        await record({ at: now, action: "edited", name, detail: changes.join(", ") });
        showToast(`${name} updated`);
      } else {
        const order = (sponsors?.reduce((m, s) => Math.max(m, s.order), 0) ?? 0) + 1;
        const doc: SponsorDoc = { name, logo: d.logo, url, order, createdAt: now };
        await put("sponsors", newId(), doc);
        await record({ at: now, action: "added", name, detail: url || undefined });
        showToast(`${name} added`);
      }
      setD(EMPTY);
    } catch (e) {
      showToast(saveError(e));
    }
    setBusy(false);
  }

  async function del(s: SponsorDoc & { id: string }) {
    try {
      await remove("sponsors", s.id);
      await record({ at: Date.now(), action: "deleted", name: s.name });
      if (d.id === s.id) setD(EMPTY);
      showToast(`${s.name} removed`);
    } catch (e) {
      showToast(saveError(e));
    }
  }

  async function move(i: number, dir: -1 | 1) {
    if (!sponsors) return;
    const a = sponsors[i];
    const b = sponsors[i + dir];
    if (!a || !b) return;
    try {
      await put("sponsors", a.id, { ...stripId(a), order: b.order === a.order ? a.order + dir : b.order });
      await put("sponsors", b.id, { ...stripId(b), order: a.order });
    } catch (e) {
      showToast(saveError(e));
    }
  }

  return (
    <div className="space-y-6">
      <Toast text={toast} />
      <section className="card p-5">
        <h2 className="font-display text-xl font-bold uppercase">{editing ? `Edit ${editing.name}` : "Add a sponsor"}</h2>
        <p className="text-sm text-muted">Logos show on Home in the “Proudly supported by” section. Hovering a logo shows the brand name.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px] [&>*]:min-w-0">
          <Field label="Brand name">
            <input className="field w-full px-3 py-2 text-sm" placeholder="e.g. Stag" value={d.name} maxLength={60} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="Website" hint="optional, opens when the logo is clicked">
            <input className="field w-full px-3 py-2 text-sm" placeholder="https://" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} />
          </Field>
          <Field label="Logo" hint="PNG, JPG or SVG">
            <div className="flex items-center gap-2">
              <div className="grid h-12 w-20 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.04] p-1.5">
                {d.logo ? <img src={d.logo} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-muted">none</span>}
              </div>
              <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                {d.logo ? "Replace" : "Upload"}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add sponsor"}
          </button>
          {d !== EMPTY && (
            <button className="btn btn-ghost" onClick={() => setD(EMPTY)}>
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl font-bold uppercase">Sponsors ({sponsors?.length ?? 0})</h2>
        {!sponsors ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : sponsors.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No sponsors yet. Home shows a “Your brand here” placeholder until you add one.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {sponsors.map((s, i) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-3 py-3 ${d.id === s.id ? "rounded-lg bg-ball/5" : ""}`}>
                <div className="grid h-12 w-20 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.04] p-1.5">
                  <img src={s.logo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted">{s.url || "No website"} · added {fmtWhen(s.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button aria-label="Move up" className="btn btn-ghost !px-2.5 !py-1 text-xs" disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button aria-label="Move down" className="btn btn-ghost !px-2.5 !py-1 text-xs" disabled={i === sponsors.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => setD({ id: s.id, name: s.name, url: s.url ?? "", logo: s.logo })}>
                    Edit
                  </button>
                  <ConfirmButton label="Delete" confirm={`Delete ${s.name}?`} onConfirm={() => del(s)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl font-bold uppercase">History</h2>
        <p className="text-sm text-muted">Every add, edit and delete, newest first. Only visible here in Studio.</p>
        {!log || log.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No changes yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Date and time</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Brand</th>
                  <th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-2">{fmtWhen(l.at)}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.action === "added" ? "bg-good/15 text-good" : l.action === "edited" ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad"}`}>{l.action}</span>
                    </td>
                    <td className="py-2 pr-3 font-medium">{l.name}</td>
                    <td className="py-2 text-ink-2">{l.detail || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function stripId<T extends { id: string }>(s: T): Omit<T, "id"> {
  const { id: _id, ...rest } = s;
  void _id;
  return rest;
}
