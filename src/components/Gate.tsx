"use client";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { LoginOptions } from "./LoginButtons";
import { useData } from "./DataProvider";

export function Gate({ title, children }: { title: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  const { ready } = useData();
  if (loading || (user && !ready)) return <p className="py-20 text-center text-muted">Loading…</p>;
  if (!user)
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="" className="mx-auto h-24 w-24" />
        <p className="font-display mt-2 text-3xl font-bold uppercase">{title}</p>
        <p className="mt-2 text-sm text-ink-2">Only Tintin can sign in here.</p>
        <div className="mx-auto mt-6 max-w-xs">
          <LoginOptions />
        </div>
      </div>
    );
  return <>{children}</>;
}
