"use client";
import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";
import { useAuth } from "../AuthProvider";

export type PageDoc = { id: string; title: string; content: string; published: boolean; updatedAt: number };

/** The single Sponsor page (pages/sponsor). Visitors only receive it once published. */
export function useSponsorPage() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<PageDoc | null | undefined>(undefined);
  useEffect(() => {
    if (loading) return;
    return subscribe<PageDoc>("pages", (rows) => setPage(rows.find((r) => r.id === "sponsor" && (user || r.published)) ?? null), { publishedOnly: !user });
  }, [user, loading]);
  return page; // undefined = loading, null = none
}
