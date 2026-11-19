import planData from "@/data/plan.json";

/* ------------------------------------------------------------------ */
/* Built-in Season 1 plan (Ahaan-Table-Tennis-Training-Plan xlsx)      */
/* ------------------------------------------------------------------ */
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

export const PLAN_DAYS: PlanDay[] = (planData as { days: PlanDay[] }).days;
export const DRILL_CARDS: Record<string, DrillCard> = (planData as { drills: Record<string, DrillCard> }).drills;
export const PLAN_LENGTH = PLAN_DAYS.length;

export const LEVELS = ["Foundation", "Competitor", "Advanced"] as const;
export type Level = (typeof LEVELS)[number];

/* ------------------------------------------------------------------ */
/* Catalog model: every code (built-in or custom) the planner can use */
/* ------------------------------------------------------------------ */
export const SECTIONS = ["Warm-up", "Table drills", "Physical", "Cooldown", "Mental", "Other"] as const;
export type Section = (typeof SECTIONS)[number];
export type Kind = "table" | "physical" | "mental";
export type Step = { k: string; v: string };
export type VideoRef = { label: string; url: string };
export type TestDef = {
  code: string;
  name: string;
  counts: string;
  target: number | null;
  direction: "high" | "low";
  max?: number | null;
  step?: number;
  unit?: string;
  levels: boolean;
};
export type Exhibit = { src: string; title: string };
/** Uploaded reference image; the pixels live in Firestore `images/{id}` */
export type ImageRef = { id: string; title: string };
export type CodeDef = {
  code: string;
  name: string;
  section: Section;
  kind: Kind;
  minutes: number;
  hr: boolean;
  steps: Step[];
  videos: VideoRef[];
  images: ImageRef[];
  tests: TestDef[];
  refs?: string;
  exhibits: Exhibit[];
  builtin: boolean;
};
/** What is stored in Firestore `codes/{code}`: a full custom code, or edits to a built-in */
export type CodeDoc = Partial<Omit<CodeDef, "builtin" | "exhibits">> & { code: string; updatedAt?: number };
export type Catalog = Record<string, CodeDef>;

/** Mirrors the "Codes" sheet of Progress-Tracker-v1.0.xlsx */
const T = (code: string, name: string, counts: string, target: number | null, direction: "high" | "low", extra: Partial<TestDef> = {}): TestDef => ({
  code,
  name,
  counts,
  target,
  direction,
  levels: !code.startsWith("P-"),
  ...extra,
});
export const BUILTIN_TESTS: TestDef[] = [
  T("D1-FH", "Slide-ball topspin, forehand", "10 rolled balls: clean deep topspins", 8, "high", { max: 10 }),
  T("D1-BH", "Slide-ball topspin, backhand", "10 rolled balls: clean deep topspins", 8, "high", { max: 10 }),
  T("D2", "BH flick + long BH topspin", "5 pairs: both shots land", 4, "high", { max: 5 }),
  T("D3", "FH flick + long FH topspin", "5 pairs: both shots land", 4, "high", { max: 5 }),
  T("D4", "Three-point backhand", "9 balls in sequence, on with real spin", 8, "high", { max: 9 }),
  T("D5", "Three-point forehand", "9 balls in sequence", 8, "high", { max: 9 }),
  T("D6", "The Falkenberg", "9 balls, clean", 8, "high", { max: 9 }),
  T("D7", "Random-placement multiball", "Unforced errors in a 60-s series (lower = better)", 3, "low", { max: 30 }),
  T("D8-A", "Combination A (serve + 3rd, short to FH)", "10 serves: attacks launched as planned", 10, "high", { max: 10 }),
  T("D8-B", "Combination B (serve + 3rd, short to BH)", "10 serves: attacks launched as planned", 10, "high", { max: 10 }),
  T("D9", "Short-short, open on long push", "10 long pushes offered: openings launched", 8, "high", { max: 10 }),
  T("P-505", "5-0-5 change of direction", "Time in seconds (lower = better)", null, "low", { step: 0.01, unit: "s" }),
  T("P-HEX", "Hexagon jump test", "3 revolutions, seconds (lower = better)", null, "low", { step: 0.01, unit: "s" }),
  T("P-SLIDE", "3-m side-slide, 30 s", "Count of line touches", null, "high", { step: 1, unit: "touches" }),
  T("P-SLJ", "Standing long jump", "Distance in cm", null, "high", { step: 1, unit: "cm" }),
  T("P-CMJ", "Countermovement jump", "Height in cm", null, "high", { step: 1, unit: "cm" }),
];
const BT = Object.fromEntries(BUILTIN_TESTS.map((t) => [t.code, t]));
function builtinTests(code: string): TestDef[] {
  if (code === "D1") return [BT["D1-FH"], BT["D1-BH"]];
  if (code === "D8") return [BT["D8-A"], BT["D8-B"]];
  if (code === "Physical Battery") return BUILTIN_TESTS.filter((t) => t.code.startsWith("P-"));
  return BT[code] ? [BT[code]] : [];
}
export const isPhysicalTest = (code: string) => code.startsWith("P-");

const EX = (f: string, title: string): Exhibit => ({ src: `/exhibits/${f}.jpg`, title });
const EXHIBITS: Record<string, Exhibit[]> = {
  W0: [EX("w0-raise", "1. Raise (2 to 3 min)"), EX("w0-activate", "2. Activate (2 to 3 min)"), EX("w0-mobilize", "3. Mobilize (3 min, dynamic only)"), EX("w0-potentiate", "4. Potentiate (2 min)")],
  C1: [EX("c1-pulse-down", "Step 1: Pulse-down walk and breathing"), EX("c1-stretches", "Step 2: Six held static stretches")],
  "Physical Battery": [EX("battery-agility", "Part 1: Agility and lateral footwork tests"), EX("battery-power", "Part 2: Explosive power tests")],
  P1: [EX("p1-p2", "P1 and P2 court-endurance circuits")],
  P2: [EX("p1-p2", "P1 and P2 court-endurance circuits")],
  P3: [EX("p3-p4", "P3 agility ladder and P4 shadow footwork")],
  P4: [EX("p3-p4", "P3 agility ladder and P4 shadow footwork")],
  P5: [EX("p5-p6", "P5 med-ball power and P6 strength foundation")],
  P6: [EX("p5-p6", "P5 med-ball power and P6 strength foundation")],
};

const EXTRA_STEPS: Record<string, Step[]> = {
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
  "Serve Bucket": [{ k: "Method", v: "20-ball blocks per serve. Pick a target, serve the whole bucket, count how many land with the intended spin and placement." }],
  "Match Analysis Sheet": [{ k: "After", v: "Fill in the Match Analysis Sheet for each match: what worked, what didn't, and one tactical change for next time." }],
  M1: [{ k: "Journal", v: "Training journal entry: Effort, Success, Progress (E-S-P) plus 2 targets for next session." }],
  M1a: [{ k: "Evening", v: "90-second evening review: one Effort, one Success, one Progress deposit." }],
  M1b: [{ k: "Post-session", v: "Write E-S-P for today plus 2 targets for the next session." }],
  M2: [{ k: "Mantra", v: "Listen to (or record) your personal mantra on the Mantra page." }],
  M3: [{ k: "Visualize", v: "5 min eyes-closed mental movie of Combinations A and B and a comeback from 5-8." }],
  M4: [{ k: "Reset", v: "Stop, Park, Replace: after every lost point, stop, park the mistake, replace it with the next plan." }],
  M5: [{ k: "Routine", v: "The fixed 25 min pre-match sequence: warm-up, mantra, visualization, banker serves." }],
};

const NAMES: Record<string, string> = {
  W0: "Session Warm-Up (RAMP)",
  W1: "Warm-Up: Backhand-Anchor Pattern",
  W2: "Warm-Up: Forehand-Anchor Mirror",
  W3: "Warm-Up: Counter-Topspin Drift",
  C1: "Cooldown + Static Stretching",
  M1: "Training Journal",
  M1a: "Evening E-S-P Deposits",
  M1b: "Post-Session Training Journal",
  M2: "Personal Mantra",
  M3: "Visualization",
  M4: "Stop, Park, Replace",
  M5: "Pre-Match Routine",
  "Serve Bucket": "Serve Bucket (The Bucket Method)",
  "Match Analysis Sheet": "Match Analysis Sheet & Tactics",
  "Physical Battery": "Physical Testing Battery",
};

function sectionOf(code: string): Section {
  if (/^W\d/.test(code)) return "Warm-up";
  if (/^D\d/.test(code)) return "Table drills";
  if (/^P\d/.test(code) || code === "Physical Battery") return "Physical";
  if (/^C\d/.test(code)) return "Cooldown";
  if (/^M\d/.test(code)) return "Mental";
  return "Other";
}
function kindOf(code: string): Kind {
  if (/^M\d/.test(code)) return "mental";
  if (code === "W0" || /^C\d/.test(code) || /^P\d/.test(code) || code === "Physical Battery") return "physical";
  return "table";
}
const HR_DEFAULT = new Set(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "W1", "W2", "W3"]);

function buildBuiltinCatalog(): Catalog {
  const cat: Catalog = {};
  const minutes: Record<string, number[]> = {};
  for (const d of PLAN_DAYS) {
    for (const it of d.items) (minutes[it.code] ??= []).push(it.minutes);
    for (const v of d.videos) {
      const c = cat[v.code];
      if (c && !c.videos.some((x) => x.url === v.url)) c.videos.push({ label: v.label, url: v.url });
    }
    for (const it of d.items) {
      if (cat[it.code]) continue;
      const card = DRILL_CARDS[it.code];
      cat[it.code] = {
        code: it.code,
        name: card?.title ?? NAMES[it.code] ?? it.label.replace(/^[^(]*\(/, "").replace(/\)$/, ""),
        section: sectionOf(it.code),
        kind: kindOf(it.code),
        minutes: it.minutes,
        hr: HR_DEFAULT.has(it.code),
        steps: card?.fields ?? EXTRA_STEPS[it.code] ?? [],
        videos: d.videos.filter((v) => v.code === it.code).map((v) => ({ label: v.label, url: v.url })),
        tests: builtinTests(it.code),
        refs: it.refs,
        images: [],
        exhibits: EXHIBITS[it.code] ?? [],
        builtin: true,
      };
    }
  }
  // typical minutes = most common value in the plan
  for (const [code, arr] of Object.entries(minutes)) {
    const counts = new Map<number, number>();
    arr.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1));
    cat[code].minutes = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return cat;
}
export const BUILTIN_CATALOG = buildBuiltinCatalog();

export function mergeCatalog(docs: CodeDoc[]): Catalog {
  const out: Catalog = {};
  for (const [k, v] of Object.entries(BUILTIN_CATALOG)) out[k] = { ...v, videos: [...v.videos], steps: [...v.steps], images: [...v.images] };
  for (const d of docs) {
    const base = out[d.code];
    if (base) {
      // built-in: allow edits to presentation fields, never to scoring definitions
      out[d.code] = {
        ...base,
        name: d.name ?? base.name,
        section: d.section ?? base.section,
        kind: d.kind ?? base.kind,
        minutes: d.minutes ?? base.minutes,
        hr: d.hr ?? base.hr,
        steps: d.steps ?? base.steps,
        videos: d.videos ?? base.videos,
        images: d.images ?? base.images,
      };
    } else {
      out[d.code] = {
        code: d.code,
        name: d.name ?? d.code,
        section: d.section ?? "Other",
        kind: d.kind ?? "table",
        minutes: d.minutes ?? 10,
        hr: d.hr ?? false,
        steps: d.steps ?? [],
        videos: d.videos ?? [],
        images: d.images ?? [],
        tests: (d.tests ?? []).map((t) => ({ ...t, code: d.code })),
        exhibits: [],
        builtin: false,
      };
    }
  }
  return out;
}

/** Index of every scored test in the catalog (tracker test code -> definition + owning drill code) */
export function testIndex(cat: Catalog): Record<string, TestDef & { owner: string }> {
  const out: Record<string, TestDef & { owner: string }> = {};
  for (const c of Object.values(cat)) for (const t of c.tests) out[t.code] = { ...t, owner: c.code };
  return out;
}

/* ------------------------------------------------------------------ */
/* Unified day model: built-in plan days + custom planned sessions    */
/* ------------------------------------------------------------------ */
export type DayItem = { code: string; minutes: number; hr: boolean; note?: string; refs?: string };
export type Day = {
  day: number;
  plannedDate?: string;
  phase: string;
  week?: string;
  sessionType: string;
  duration: number;
  warmup?: string;
  cooldown?: string;
  main: string[];
  items: DayItem[];
  custom: boolean;
};
export type CustomDayDoc = {
  day: number;
  plannedDate?: string;
  sessionType: string;
  main?: string[];
  items: DayItem[];
  createdAt?: number;
};

export function allDays(custom: CustomDayDoc[], cat: Catalog): Day[] {
  const base: Day[] = PLAN_DAYS.map((d) => ({
    day: d.day,
    plannedDate: d.plannedDate,
    phase: d.phase,
    week: d.week,
    sessionType: d.sessionType,
    duration: d.duration,
    warmup: d.warmup,
    cooldown: d.cooldown,
    main: d.main,
    items: d.items.map((it) => ({ code: it.code, minutes: it.minutes, refs: it.refs, hr: cat[it.code]?.hr ?? false })),
    custom: false,
  }));
  const extra = custom
    .filter((c) => c.day > PLAN_LENGTH)
    .sort((a, b) => a.day - b.day)
    .map<Day>((c) => ({
      day: c.day,
      plannedDate: c.plannedDate || undefined,
      phase: "Custom sessions",
      sessionType: c.sessionType || "Training session",
      duration: c.items.reduce((a, i) => a + (i.minutes || 0), 0),
      main: c.main ?? [],
      items: c.items,
      custom: true,
    }));
  // keep numbering contiguous: stop at the first gap
  const out = [...base];
  for (const e of extra) {
    if (e.day !== out.length + 1) break;
    out.push(e);
  }
  return out;
}

export function phaseList(days: Day[]) {
  const out: { name: string; start: number; end: number }[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (last && last.name === d.phase) last.end = d.day;
    else out.push({ name: d.phase, start: d.day, end: d.day });
  }
  return out;
}

const YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/;
export function youtubeId(url: string): string | null {
  const m = (url || "").match(YT);
  return m ? m[1] : null;
}
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
