import planData from "@/data/plan.json";
import { VIDEO_OVERRIDES } from "@/data/videos";

export type PlanItem = { code: string; label: string; refs: string; minutes: number };
export type PlanVideo = { code: string; label: string; url: string };
export type PlanDay = {
  day: number;
  plannedDate: string;
  weekday: string;
  phase: string;
  week: string;
  sessionType: string;
  duration: number;
  warmup: string;
  main: string[];
  cooldown: string;
  items: PlanItem[];
  videos: PlanVideo[];
};
export type DrillCard = { title: string; fields: { k: string; v: string }[] };

export const DAYS: PlanDay[] = (planData as { days: PlanDay[] }).days;
export const DRILL_CARDS: Record<string, DrillCard> = (planData as { drills: Record<string, DrillCard> }).drills;
export const TOTAL_DAYS = DAYS.length;
export const TOURNAMENT_DATE = "2027-05-15";

export const LEVELS = ["Foundation", "Competitor", "Advanced"] as const;
export type Level = (typeof LEVELS)[number];

/** Mirrors the "Codes" sheet of Progress-Tracker-v1.0.xlsx */
export type TestCode = {
  code: string;
  name: string;
  counts: string;
  target: number | null;
  direction: "high" | "low";
  max?: number;
  step?: number;
  unit?: string;
};
export const TEST_CODES: TestCode[] = [
  { code: "D1-FH", name: "Slide-ball topspin, forehand", counts: "10 rolled balls: clean deep topspins", target: 8, direction: "high", max: 10 },
  { code: "D1-BH", name: "Slide-ball topspin, backhand", counts: "10 rolled balls: clean deep topspins", target: 8, direction: "high", max: 10 },
  { code: "D2", name: "BH flick + long BH topspin", counts: "5 pairs: both shots land", target: 4, direction: "high", max: 5 },
  { code: "D3", name: "FH flick + long FH topspin", counts: "5 pairs: both shots land", target: 4, direction: "high", max: 5 },
  { code: "D4", name: "Three-point backhand", counts: "9 balls in sequence, on with real spin", target: 8, direction: "high", max: 9 },
  { code: "D5", name: "Three-point forehand", counts: "9 balls in sequence", target: 8, direction: "high", max: 9 },
  { code: "D6", name: "The Falkenberg", counts: "9 balls, clean", target: 8, direction: "high", max: 9 },
  { code: "D7", name: "Random-placement multiball", counts: "Unforced errors in a 60-s series (lower = better)", target: 3, direction: "low", max: 30 },
  { code: "D8-A", name: "Combination A (serve+3rd, short to FH)", counts: "10 serves: attacks launched as planned", target: 10, direction: "high", max: 10 },
  { code: "D8-B", name: "Combination B (serve+3rd, short to BH)", counts: "10 serves: attacks launched as planned", target: 10, direction: "high", max: 10 },
  { code: "D9", name: "Short-short, open on long push", counts: "10 long pushes offered: openings launched", target: 8, direction: "high", max: 10 },
  { code: "P-505", name: "5-0-5 change of direction", counts: "Time in seconds (lower = better)", target: null, direction: "low", step: 0.01, unit: "s" },
  { code: "P-HEX", name: "Hexagon jump test", counts: "3 revolutions, seconds (lower = better)", target: null, direction: "low", step: 0.01, unit: "s" },
  { code: "P-SLIDE", name: "3-m side-slide, 30 s", counts: "Count of line touches", target: null, direction: "high", step: 1, unit: "touches" },
  { code: "P-SLJ", name: "Standing long jump", counts: "Distance in cm", target: null, direction: "high", step: 1, unit: "cm" },
  { code: "P-CMJ", name: "Countermovement jump", counts: "Height in cm", target: null, direction: "high", step: 1, unit: "cm" },
];
export const TEST_BY_CODE = Object.fromEntries(TEST_CODES.map((t) => [t.code, t]));
export const DRILL_TESTS = TEST_CODES.filter((t) => t.code.startsWith("D"));
export const PHYSICAL_TESTS = TEST_CODES.filter((t) => t.code.startsWith("P-"));

/** Which tracker tests a plan item produces */
export function testsForItem(code: string): string[] {
  if (code === "D1") return ["D1-FH", "D1-BH"];
  if (code === "D8") return ["D8-A", "D8-B"];
  if (code === "Physical Battery") return PHYSICAL_TESTS.map((t) => t.code);
  if (TEST_BY_CODE[code]) return [code];
  return [];
}

/** D1 to D9 and W1 to W3 allow an optional heart-rate entry */
export const HR_CODES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "W1", "W2", "W3"];
export const hasHeartRate = (code: string) => HR_CODES.includes(code);

export type Category = "table" | "physical" | "mental";
export function categoryOf(code: string): Category {
  if (/^M\d/.test(code)) return "mental";
  if (code === "W0" || code === "C1" || /^P\d/.test(code) || code === "Physical Battery") return "physical";
  return "table";
}
export const isJournalCode = (code: string) => /^M1/.test(code);

export type Exhibit = { src: string; title: string };
const EX = (f: string, title: string): Exhibit => ({ src: `/exhibits/${f}.jpg`, title });
export const EXHIBITS: Record<string, Exhibit[]> = {
  W0: [
    EX("w0-raise", "1. Raise (2 to 3 min)"),
    EX("w0-activate", "2. Activate (2 to 3 min)"),
    EX("w0-mobilize", "3. Mobilize (3 min, dynamic only)"),
    EX("w0-potentiate", "4. Potentiate (2 min)"),
  ],
  C1: [EX("c1-pulse-down", "Step 1: Pulse-down walk and breathing"), EX("c1-stretches", "Step 2: Six held static stretches")],
  "Physical Battery": [EX("battery-agility", "Part 1: Agility and lateral footwork tests"), EX("battery-power", "Part 2: Explosive power tests")],
  P1: [EX("p1-p2", "P1 and P2 court-endurance circuits")],
  P2: [EX("p1-p2", "P1 and P2 court-endurance circuits")],
  P3: [EX("p3-p4", "P3 agility ladder and P4 shadow footwork")],
  P4: [EX("p3-p4", "P3 agility ladder and P4 shadow footwork")],
  P5: [EX("p5-p6", "P5 med-ball power and P6 strength foundation")],
  P6: [EX("p5-p6", "P5 med-ball power and P6 strength foundation")],
};

/** Step-by-step text for codes that are not on the Drill Cards */
export const EXTRA_STEPS: Record<string, { k: string; v: string }[]> = {
  W0: [
    { k: "Raise", v: "2 to 3 min: jump rope, light jog or easy skips until warm and lightly sweating. Never tired." },
    { k: "Activate", v: "2 to 3 min: glute bridges x10, band pull-aparts x15, scapular push-ups x10, side plank 20 s per side." },
    { k: "Mobilize", v: "3 min, dynamic only: leg swings, walking lunge with rotation, hip openers, arm circles, thoracic twists, wrist and ankle circles." },
    { k: "Potentiate", v: "2 min: 10 quick split-steps, 5 full-intent shadow forehands + 5 backhands, or one P3 ladder pattern." },
  ],
  C1: [
    { k: "Pulse-down", v: "1 to 2 min slow walk around the court. Breathe in through the nose for 4 s, out for 6 s." },
    { k: "Stretch", v: "Hold 20 to 30 s each side, no bouncing: calf, seated hamstring, kneeling hip flexor, wall pec, cross-body shoulder, forearm and wrist flexors." },
  ],
  "Physical Battery": [
    { k: "When", v: "Fresh, right after W0. One practice trial, then 2 to 3 measured trials with 60 to 90 s rest. Log the best score." },
    { k: "Agility", v: "5-0-5 (seconds, lower is better), Hexagon jump (seconds, lower is better), 3 m side-slide in 30 s (touches, higher is better)." },
    { k: "Power", v: "Standing long jump (cm, measure to the rear heel) and countermovement jump (cm, hands on hips)." },
  ],
  "Serve Bucket": [
    { k: "Method", v: "20-ball blocks per serve. Pick a target, serve the whole bucket, count how many land with the intended spin and placement." },
  ],
  M1: [{ k: "Journal", v: "Training journal entry: Effort, Success, Progress (E-S-P) plus 2 targets for next session." }],
  M1a: [{ k: "Evening", v: "90-second evening review: one Effort, one Success, one Progress deposit." }],
  M1b: [{ k: "Post-session", v: "Write E-S-P for today plus 2 targets for the next session." }],
  M2: [{ k: "Mantra", v: "Listen to (or record) your personal mantra audio." }],
  M3: [{ k: "Visualize", v: "5 min eyes-closed mental movie of Combinations A and B and a comeback from 5-8." }],
  M4: [{ k: "Reset", v: "Stop, Park, Replace: after every lost point, stop, park the mistake, replace it with the next plan." }],
  M5: [{ k: "Routine", v: "The fixed 25 min pre-match sequence: warm-up, mantra, visualization, banker serves." }],
};

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
export function youtubeId(url: string): string | null {
  const m = url.match(YT);
  return m ? m[1] : null;
}
export function videoUrl(v: PlanVideo): string {
  const key = v.url.split("/tt/")[1] ?? v.code;
  return VIDEO_OVERRIDES[key] || v.url;
}

export function phaseList() {
  const out: { name: string; start: number; end: number }[] = [];
  for (const d of DAYS) {
    const last = out[out.length - 1];
    if (last && last.name === d.phase) last.end = d.day;
    else out.push({ name: d.phase, start: d.day, end: d.day });
  }
  return out;
}

export const isBreakDay = (d: PlanDay) => d.duration === 0;
