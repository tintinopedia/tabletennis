"use client";
import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";
import { sortPosts, type PostDoc } from "@/lib/blog";
import { useAuth } from "../AuthProvider";

/** Signed in: every post including drafts. Visitors: published posts only. */
export function usePosts() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<PostDoc[] | null>(null);
  useEffect(() => {
    if (loading) return;
    return subscribe<PostDoc>("posts", (rows) => setPosts(rows.filter((p) => user || p.published).sort(sortPosts)), { publishedOnly: !user });
  }, [user, loading]);
  return posts;
}
