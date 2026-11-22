import novaData from "@/data/nova.json";
import type { CodeDef, Level, Step } from "./plan";

/* Pongbot Nova S Pro: 44 base patterns x RH/LH x 1-3 stars = 264 presets */
type Pattern = { n: number; position: "standard" | "near"; category: string; name: string; shots: number };
export const NOVA_PATTERNS = novaData as Pattern[];
export type NovaHand = "RH" | "LH";
export const NOVA_STARS = [1, 2, 3] as const;

export const NOVA_LEVELS: Record<number, { stars: string; label: string; site: Level; text: string }> = {
  1: { stars: "★", label: "Beginner", site: "Foundation", text: "Lower ball speed, lighter spin and slower feed frequency to lock in stroke mechanics." },
  2: { stars: "★★", label: "Intermediate", site: "Competitor", text: "Moderate match pace, spin and rhythm for footwork transitions and consistency." },
  3: { stars: "★★★", label: "Advanced", site: "Advanced", text: "High speed, heavy spin and rapid feed frequency simulating competitive rally pressure." },
};

const SPIN: Record<string, { what: string; answer: string }> = {
  Drive: { what: "topspin", answer: "counter-drive, block or loop it" },
  Push: { what: "light backspin", answer: "push it back with touch, or open with a topspin" },
  Loop: { what: "heavy backspin", answer: "lift it with a strong upward brush and wrist acceleration" },
};
const PLACE: Record<string, string> = { F: "forehand", B: "backhand", M: "middle" };

/** Season 1 drill cards each preset pairs well with (from the robot vs drill-card comparison) */
const PAIRS: Record<number, string> = {
  32: "D4 Three-point backhand (play every ball on the backhand) and D5 Three-point forehand. Also W1/W2 anchor warm-ups.",
  33: "D7 Random-placement multiball (Competitor level).",
  34: "D7 Random-placement multiball (Foundation level).",
  35: "D7 Random-placement multiball (Advanced level).",
  19: "D6 The Falkenberg (backhand, backhand, forehand).",
  41: "D2 Backhand flick (short ball part).",
  38: "D3 Forehand flick (short ball part).",
  11: "D2 long backhand topspin after the push.",
  16: "D3 long forehand topspin after the push.",
  5: "D1 Slide-ball topspin, forehand (heavy backspin trains the same lift).",
  6: "D1 Slide-ball topspin, backhand.",
  9: "W1/W2 anchor warm-ups (forehand to backhand switch).",
  4: "W3 Counter-topspin drift.",
  31: "W3 Counter-topspin drift.",
};

export const novaCode = (n: number, hand: NovaHand, star: number) => `NV${n}-${hand[0]}${star}`;
export const NOVA_RE = /^NV(\d+)-([RL])([123])$/;
export function parseNova(code: string) {
  const m = code.match(NOVA_RE);
  return m ? { n: Number(m[1]), hand: (m[2] === "R" ? "RH" : "LH") as NovaHand, star: Number(m[3]) } : null;
}

function feedSteps(p: Pattern, hand: NovaHand): Step[] {
  const handWord = hand === "RH" ? "right-handed" : "left-handed";
  if (p.n === 33) return [{ k: "Feed", v: `Topspin balls to random spots across the whole table. Read each ball early, move, then counter-drive or loop.` }];
  if (p.n === 34) return [{ k: "Feed", v: `Topspin balls to random spots inside about two-thirds of the table. Check the zone in the Nova app; recover to the ready position after every ball.` }];
  if (p.n === 35) return [{ k: "Feed", v: `Random placement and random spin (topspin, light and heavy backspin). Read the spin from the robot's contact before you move.` }];
  const tokens = p.n === 32 ? ["Drive (F)", "Drive (M)", "Drive (B)"] : p.name.split(" - ");
  const out: Step[] = tokens.map((t, i) => {
    const m = t.match(/^(Push|Drive|Loop) \(([FBM])\)$/)!;
    const s = SPIN[m[1]];
    const depth = p.position === "near" ? "short, near the net" : "long";
    return { k: `Ball ${i + 1}`, v: `${m[1]} (${s.what}) to your ${PLACE[m[2]]}, ${depth}. ${s.answer[0].toUpperCase()}${s.answer.slice(1)}.` };
  });
  if (tokens.length > 1) out.push({ k: "Repeat", v: `The ${tokens.length}-ball sequence loops. Recover to the ready position between balls. Placements are mirrored for ${handWord} mode.` });
  return out;
}

function build(p: Pattern, hand: NovaHand, star: number): CodeDef {
  const lv = NOVA_LEVELS[star];
  const preset = (p.n - 1) * 6 + (hand === "RH" ? 0 : 3) + star;
  const code = novaCode(p.n, hand, star);
  const posName = p.position === "near" ? "Near-net position" : "Standard position";
  const steps: Step[] = [
    { k: "Level", v: `${lv.stars} ${lv.label} (site level: ${lv.site}). ${lv.text}` },
    { k: "Robot", v: `${posName}: ${p.position === "near" ? "place Nova on the table right behind the net, on the far half" : "place Nova on the table, centred at the far end line (no stand needed)"}. In the Nova app choose ${p.category}, pattern #${p.n}, ${hand === "RH" ? "Right-handed" : "Left-handed"} mode, ${lv.stars}. Preset #${preset} of 264.` },
    ...feedSteps(p, hand),
  ];
  if (PAIRS[p.n]) steps.push({ k: "Pairs with", v: PAIRS[p.n] });
  steps.push({ k: "Levels", v: `Foundation: ${NOVA_LEVELS[1].stars} ${NOVA_LEVELS[1].text} · Competitor: ${NOVA_LEVELS[2].stars} ${NOVA_LEVELS[2].text} · Advanced: ${NOVA_LEVELS[3].stars} ${NOVA_LEVELS[3].text}` });
  return {
    code,
    name: `Nova #${p.n} ${lv.stars} ${hand} · ${p.position === "near" ? "Near-net " : ""}${p.name}`,
    section: "Nova robot",
    kind: "table",
    minutes: 10,
    hr: true,
    steps,
    videos: [],
    images: [],
    tests: [],
    refs: `Pongbot Nova S Pro preset #${preset} (${p.category}, ${hand}, ${lv.stars} ${lv.label})`,
    exhibits: [
      { src: `/nova/pos-${p.position}.svg`, title: `Robot position: ${posName}` },
      { src: `/nova/p${p.n}-${hand.toLowerCase()}.svg`, title: `Ball path and landing spots (${hand})` },
    ],
    builtin: true,
  };
}

export function novaCatalog(): Record<string, CodeDef> {
  const out: Record<string, CodeDef> = {};
  for (const p of NOVA_PATTERNS) for (const hand of ["RH", "LH"] as NovaHand[]) for (const star of NOVA_STARS) {
    const d = build(p, hand, star);
    out[d.code] = d;
  }
  return out;
}
