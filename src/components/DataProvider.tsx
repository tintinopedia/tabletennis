"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { subscribe, subscribeSessions, setDemoSeed, type SessionMap } from "@/lib/store";
import { allDays, mergeCatalog, testIndex, type Catalog, type CodeDoc, type CustomDayDoc, type Day, type TestDef } from "@/lib/plan";
import { DEMO_MODE } from "@/lib/firebase";
import { demoSessions } from "@/lib/demo";

if (DEMO_MODE) setDemoSeed((c) => (c === "sessions" ? demoSessions() : null));

type Data = {
  ready: boolean;
  sessions: SessionMap;
  customDays: CustomDayDoc[];
  codeDocs: CodeDoc[];
  catalog: Catalog;
  tests: Record<string, TestDef & { owner: string }>;
  days: Day[];
};
const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionMap | null>(null);
  const [customDays, setCustomDays] = useState<CustomDayDoc[] | null>(null);
  const [codeDocs, setCodeDocs] = useState<CodeDoc[] | null>(null);
  useEffect(() => subscribeSessions(setSessions), []);
  useEffect(() => subscribe<CustomDayDoc>("customDays", setCustomDays), []);
  useEffect(() => subscribe<CodeDoc>("codes", (rows) => setCodeDocs(rows.map((r) => ({ ...r, code: r.code ?? r.id })))), []);

  const value = useMemo<Data>(() => {
    const catalog = mergeCatalog(codeDocs ?? []);
    return {
      ready: !!sessions && !!customDays && !!codeDocs,
      sessions: sessions ?? {},
      customDays: customDays ?? [],
      codeDocs: codeDocs ?? [],
      catalog,
      tests: testIndex(catalog),
      days: allDays(customDays ?? [], catalog),
    };
  }, [sessions, customDays, codeDocs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData outside provider");
  return c;
}
