"use client";
import { useState } from "react";
import { Gate } from "@/components/Gate";
import { useAuth } from "@/components/AuthProvider";
import { GitHubMark } from "@/components/LoginButtons";
import { SessionPlanner } from "@/components/studio/SessionPlanner";
import { DrillLibrary } from "@/components/studio/DrillLibrary";
import { VideoManager } from "@/components/studio/VideoManager";

const TABS = [
  ["sessions", "Plan sessions"],
  ["library", "Drill library"],
  ["videos", "My videos"],
] as const;

export default function StudioPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("sessions");
  const { user, githubLinked, connectGithub } = useAuth();
  return (
    <Gate title="Studio">
      <div className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <p className="eyebrow">Studio</p>
            <h1 className="font-display text-4xl font-bold uppercase">Build the journey</h1>
          </div>
          {user && !githubLinked && (
            <button onClick={connectGithub} className="btn btn-ghost flex items-center gap-2">
              <GitHubMark /> Connect GitHub login
            </button>
          )}
          <div className="flex gap-1 rounded-full border border-line bg-card p-1" role="tablist">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === k ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          {tab === "sessions" && <SessionPlanner />}
          {tab === "library" && <DrillLibrary />}
          {tab === "videos" && <VideoManager />}
        </div>
      </div>
    </Gate>
  );
}
