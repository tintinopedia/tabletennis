"use client";
import { useEffect, useState } from "react";
import { subscribe } from "./store";

export const DOB = "2018-03-11";
export const LEVELS_MATCH = ["Practice Match", "Competitive Match", "Professional Match"] as const;
export type MatchLevel = (typeof LEVELS_MATCH)[number];

export type CoachDoc = { id: string; name: string; from: string; to: string; createdAt: number }; // to "" = still coaching
export type ProfileDoc = { grip: string; style: string; hand: "Right" | "Left" | ""; updatedAt?: number };
export type Measurement = { id: string; date: string; heightIn: number; weightKg: number; createdAt: number };
export type MatchDoc = {
  id: string;
  date: string;
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  level: MatchLevel;
  video?: string;
  hasNotes?: boolean;
  createdAt: number;
  updatedAt: number;
};

/** "4' 2.5\"" from total inches */
export function fmtHeight(inches: number | null | undefined) {
  if (inches == null || !(inches > 0)) return "-";
  const ft = Math.floor(inches / 12);
  const rest = +(inches - ft * 12).toFixed(1);
  return `${ft}' ${rest % 1 === 0 ? rest.toFixed(0) : rest}"`;
}
export const fmtWeight = (kg: number | null | undefined) => (kg == null || !(kg > 0) ? "-" : `${+kg.toFixed(1)} kg`);

/** Years and months between dob and today */
export function ageOf(dob = DOB, today = new Date()) {
  const b = new Date(dob + "T00:00:00");
  let months = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
  if (today.getDate() < b.getDate()) months -= 1;
  return { years: Math.floor(months / 12), months: months % 12 };
}

export function winRates(matches: MatchDoc[]) {
  return LEVELS_MATCH.map((level) => {
    const ms = matches.filter((m) => m.level === level);
    const wins = ms.filter((m) => m.scoreFor > m.scoreAgainst).length;
    const losses = ms.filter((m) => m.scoreFor < m.scoreAgainst).length;
    return { level, played: ms.length, wins, losses, rate: ms.length ? wins / ms.length : null };
  });
}

function useColl<T>(c: "measurements" | "matches" | "profile" | "coaches") {
  const [rows, setRows] = useState<(T & { id: string })[] | null>(null);
  useEffect(() => subscribe<T>(c, setRows), [c]);
  return rows;
}
export function useMeasurements() {
  const rows = useColl<Measurement>("measurements");
  return rows ? [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) : null;
}
export function useMatches() {
  const rows = useColl<MatchDoc>("matches");
  return rows ? [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) : null;
}
export function useProfile(): ProfileDoc | null {
  const rows = useColl<ProfileDoc>("profile");
  if (!rows) return null;
  return rows.find((r) => r.id === "main") ?? { grip: "", style: "", hand: "" };
}

/** Coaches, most recent first (current coach, i.e. no end date, before past ones) */
export function useCoaches() {
  const rows = useColl<CoachDoc>("coaches");
  return rows ? [...rows].sort((a, b) => Number(!a.to) === Number(!b.to) ? b.from.localeCompare(a.from) || b.createdAt - a.createdAt : a.to ? 1 : -1) : null;
}
