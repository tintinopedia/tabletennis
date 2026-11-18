"use client";
import { useEffect, useState } from "react";
import { subscribeSessions, type SessionMap } from "@/lib/store";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMap | null>(null);
  useEffect(() => subscribeSessions(setSessions), []);
  return sessions;
}
