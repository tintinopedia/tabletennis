"use client";
import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";
import { useAuth } from "../AuthProvider";

export type ProductDoc = {
  id: string;
  name: string;
  imageId: string;
  description: string; // TipTap JSON, stringified (same editor as the blog)
  excerpt: string;
  published: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
};

/** Signed in: all ingredients (drafts too). Visitors: published only. Highest order first. */
export function useProducts(opts: { publishedOnly?: boolean } = {}) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ProductDoc[] | null>(null);
  const pubOnly = opts.publishedOnly || !user;
  useEffect(() => {
    if (loading) return;
    return subscribe<ProductDoc>("products", (r) => setRows(r.filter((p) => !pubOnly || p.published).sort((a, b) => b.order - a.order)), { publishedOnly: pubOnly });
  }, [loading, pubOnly]);
  return rows;
}
