"use client";
import { useState, type ReactNode } from "react";

export function ConfirmButton({ label, confirm = "Delete?", onConfirm, className = "", disabled }: { label: ReactNode; confirm?: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [ask, setAsk] = useState(false);
  if (ask)
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-bad">{confirm}</span>
        <button
          className="rounded-full bg-critical px-2.5 py-1 font-semibold text-white"
          onClick={() => {
            setAsk(false);
            onConfirm();
          }}
        >
          Yes
        </button>
        <button className="rounded-full px-2.5 py-1 text-ink-2 hover:bg-card-2" onClick={() => setAsk(false)}>
          No
        </button>
      </span>
    );
  return (
    <button disabled={disabled} onClick={() => setAsk(true)} className={className || "btn btn-ghost !px-3 !py-1 text-xs"}>
      {label}
    </button>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-table" : "bg-card-3"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="fixed inset-x-0 top-20 z-50 mx-auto w-fit rounded-full bg-good px-5 py-2.5 text-sm font-semibold text-paper shadow-lg" role="status">
      {text}
    </div>
  );
}

export function useToast(): [string | null, (t: string) => void] {
  const [t, setT] = useState<string | null>(null);
  return [
    t,
    (s: string) => {
      setT(s);
      setTimeout(() => setT(null), 3000);
    },
  ];
}
