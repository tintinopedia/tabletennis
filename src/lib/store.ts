"use client";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { fb, DEMO_MODE } from "./firebase";
import type { Level } from "./plan";
import { demoSeed } from "./demo";

export type ItemStatus = "done" | "skipped";
export type TestEntry = { level: Level; score: number | null };
export type SessionEntry = {
  day: number;
  status: "draft" | "complete";
  trainingDate: string;
  items: Record<string, ItemStatus>; // key = item index in the plan day
  tests: Record<string, TestEntry>; // key = tracker test code
  hr: Record<string, number | null>; // key = drill code (D1..D9, W1..W3)
  matches: number;
  notes: string;
  updatedAt?: number;
  completedAt?: number;
};
export type SessionMap = Record<number, SessionEntry>;

const LS_KEY = "ahaan-tt-demo-sessions-v1";
const listeners = new Set<(m: SessionMap) => void>();

function readLocal(): SessionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
    const seeded = demoSeed();
    localStorage.setItem(LS_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return demoSeed();
  }
}
function writeLocal(m: SessionMap) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(m));
  } catch {}
  listeners.forEach((l) => l(m));
}

export function subscribeSessions(cb: (m: SessionMap) => void): () => void {
  const f = fb();
  if (!f) {
    listeners.add(cb);
    cb(readLocal());
    return () => listeners.delete(cb);
  }
  return onSnapshot(
    collection(f.db, "sessions"),
    (snap) => {
      const m: SessionMap = {};
      snap.forEach((d) => {
        const v = d.data() as Omit<SessionEntry, "updatedAt"> & { updatedAt?: { toMillis?: () => number } };
        m[v.day] = { ...v, updatedAt: v.updatedAt?.toMillis?.() };
      });
      cb(m);
    },
    (err) => {
      console.error("sessions listener", err);
      cb({});
    }
  );
}

export async function saveSession(entry: SessionEntry): Promise<void> {
  const f = fb();
  if (!f) {
    const m = { ...readLocal(), [entry.day]: { ...entry, updatedAt: Date.now() } };
    writeLocal(m);
    return;
  }
  await setDoc(doc(f.db, "sessions", String(entry.day)), { ...entry, updatedAt: serverTimestamp() });
}

export function resetDemo() {
  if (!DEMO_MODE) return;
  localStorage.removeItem(LS_KEY);
  writeLocal(readLocal());
}
export function clearDemo() {
  if (!DEMO_MODE) return;
  writeLocal({});
}
