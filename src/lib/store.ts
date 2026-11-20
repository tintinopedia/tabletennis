"use client";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { fb } from "./firebase";
import type { Level } from "./plan";

/* ------------------------------ types ------------------------------ */
export type ItemStatus = "done" | "skipped";
export type TestEntry = { level: Level; score: number | null };
export type SessionEntry = {
  day: number;
  status: "draft" | "complete";
  trainingDate: string;
  items: Record<string, ItemStatus>; // key = item index in the day
  tests: Record<string, TestEntry>; // key = test code
  hr: Record<string, number | null>; // key = drill code
  matches: number;
  notes: string;
  updatedAt?: number;
  completedAt?: number;
};
export type SessionMap = Record<number, SessionEntry>;
export type VideoDoc = { id: string; url: string; youtubeId: string; title: string; recordedOn?: string; description?: string; published: boolean; order: number; createdAt: number };
export type MantraPoint = { id: string; text: string };
export type MantraSection = { id: string; title: string; hint?: string; points: MantraPoint[]; kind?: "element" | "info" };
export type MantraDoc = { sections: MantraSection[]; updatedAt?: number };
export type RecordingDoc = { id: string; createdAt: number; mime: string; duration: number; data: string };

export type Coll = "sessions" | "customDays" | "codes" | "videos" | "recordings" | "mantra" | "images" | "posts" | "products";
export type ImageDoc = { data: string; createdAt: number };

/* --------------------------- demo storage -------------------------- */
const lsKey = (c: Coll) => `tintin-demo-${c}-v2`;
const listeners: Record<string, Set<() => void>> = {};
let seedFn: ((c: Coll) => Record<string, unknown> | null) | null = null;
export function setDemoSeed(fn: (c: Coll) => Record<string, unknown> | null) {
  seedFn = fn;
}
function readLocal(c: Coll): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(lsKey(c));
    if (raw) return JSON.parse(raw);
    const seeded = seedFn?.(c) ?? {};
    localStorage.setItem(lsKey(c), JSON.stringify(seeded));
    return seeded;
  } catch {
    return {};
  }
}
function writeLocal(c: Coll, m: Record<string, unknown>) {
  localStorage.setItem(lsKey(c), JSON.stringify(m));
  listeners[c]?.forEach((l) => l());
}

/* ----------------------------- generic ----------------------------- */
export function subscribe<T>(c: Coll, cb: (rows: (T & { id: string })[]) => void, opts: { publishedOnly?: boolean } = {}): () => void {
  const f = fb();
  if (!f) {
    const emit = () => {
      let rows = Object.entries(readLocal(c)).map(([id, v]) => ({ ...(v as T), id }));
      if (opts.publishedOnly) rows = rows.filter((r) => (r as unknown as VideoDoc).published);
      cb(rows);
    };
    (listeners[c] ??= new Set()).add(emit);
    emit();
    return () => {
      listeners[c].delete(emit);
    };
  }
  const ref = opts.publishedOnly ? query(collection(f.db, c), where("published", "==", true)) : collection(f.db, c);
  return onSnapshot(
    ref,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))),
    (err) => {
      console.warn(`${c} listener`, err.code);
      cb([]);
    }
  );
}

export async function put(c: Coll, id: string, data: object): Promise<void> {
  // never store the synthetic id field
  const { id: _omit, ...clean } = data as { id?: string };
  void _omit;
  const f = fb();
  if (!f) {
    writeLocal(c, { ...readLocal(c), [id]: clean });
    return;
  }
  await setDoc(doc(f.db, c, id), clean);
}

const imgCache = new Map<string, Promise<string | null>>();
/** Read one uploaded image (data URL), cached per page load */
export function getImage(id: string): Promise<string | null> {
  if (!imgCache.has(id)) {
    const f = fb();
    const p = f
      ? getDoc(doc(f.db, "images", id)).then((d) => (d.exists() ? ((d.data() as ImageDoc).data ?? null) : null))
      : Promise.resolve(((readLocal("images")[id] as ImageDoc | undefined)?.data) ?? null);
    imgCache.set(id, p.catch(() => null));
  }
  return imgCache.get(id)!;
}

export async function remove(c: Coll, id: string): Promise<void> {
  const f = fb();
  if (!f) {
    const m = { ...readLocal(c) };
    delete m[id];
    writeLocal(c, m);
    return;
  }
  await deleteDoc(doc(f.db, c, id));
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------------------------- sessions ----------------------------- */
export function subscribeSessions(cb: (m: SessionMap) => void) {
  return subscribe<SessionEntry>("sessions", (rows) => {
    const m: SessionMap = {};
    rows.forEach((r) => (m[r.day] = r));
    cb(m);
  });
}
export const saveSession = (e: SessionEntry) => put("sessions", String(e.day), { ...e, updatedAt: Date.now() });

/** Human-readable reason a save failed */
export function saveError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("permission-denied"))
    return "Not allowed by the database rules. Publish the latest firestore.rules in Firebase (Firestore > Rules) and make sure you are signed in with Ahaan's account.";
  if (code.includes("not-found") || code.includes("failed-precondition")) return "The Firestore database was not found. Create it in Firebase (Firestore Database > Create database).";
  if (code.includes("unavailable")) return "Can't reach the database. Check your internet connection.";
  if (code.includes("invalid-argument") || code.includes("resource-exhausted")) return "The data is too large to save.";
  return `Could not save${code ? ` (${code})` : ""}.`;
}
