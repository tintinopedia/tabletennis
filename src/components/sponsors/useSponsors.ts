"use client";
import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";

export type SponsorDoc = { name: string; logo: string; url?: string; order: number; createdAt: number; updatedAt?: number };
export type SponsorLogDoc = { at: number; action: "added" | "edited" | "deleted"; name: string; detail?: string };

export function useSponsors() {
  const [rows, setRows] = useState<(SponsorDoc & { id: string })[] | null>(null);
  useEffect(() => subscribe<SponsorDoc>("sponsors", (r) => setRows(r.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt))), []);
  return rows;
}
export function useSponsorLog() {
  const [rows, setRows] = useState<(SponsorLogDoc & { id: string })[] | null>(null);
  useEffect(() => subscribe<SponsorLogDoc>("sponsorLog", (r) => setRows(r.sort((a, b) => b.at - a.at))), []);
  return rows;
}
