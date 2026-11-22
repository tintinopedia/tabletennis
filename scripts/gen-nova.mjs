// Generates the Pongbot Nova S Pro diagrams in public/nova/
// node scripts/gen-nova.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const patterns = JSON.parse(readFileSync(new URL("../src/data/nova.json", import.meta.url)));
const OUT = new URL("../public/nova/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const W = 688, H = 384;
const T = { x1: 70, x2: 560, y1: 56, y2: 322 }; // table, robot end on the left
const NET = (T.x1 + T.x2) / 2;
const MID_Y = (T.y1 + T.y2) / 2;
const SPIN = {
  Drive: { color: "#ff7a45", label: "Drive = topspin" },
  Push: { color: "#8fbcf3", label: "Push = light backspin" },
  Loop: { color: "#b9a6ff", label: "Loop = heavy backspin" },
};
const ROBOT = { standard: { x: 38, y: MID_Y }, near: { x: NET - 26, y: MID_Y } };

const font = `font-family="Inter, Arial, sans-serif"`;
const head = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">` +
  `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>` +
  `<radialGradient id="glow"><stop offset="0" stop-color="#ffd23f" stop-opacity=".55"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="${W}" height="${H}" fill="#0b1220"/>`;

function table(hand) {
  const fhTop = hand === "RH"; // player stands on the right facing left: their right hand is the top edge
  return (
    `<rect x="${T.x1}" y="${T.y1}" width="${T.x2 - T.x1}" height="${T.y2 - T.y1}" rx="4" fill="#17427a" stroke="#e8eef8" stroke-width="3"/>` +
    `<line x1="${T.x1}" y1="${MID_Y}" x2="${T.x2}" y2="${MID_Y}" stroke="#e8eef8" stroke-width="1.2" opacity=".7"/>` +
    `<line x1="${NET}" y1="${T.y1 - 10}" x2="${NET}" y2="${T.y2 + 10}" stroke="#ffffff" stroke-width="4"/>` +
    `<text x="${NET}" y="${T.y1 - 16}" text-anchor="middle" ${font} font-size="11" fill="#9fb0c8">NET</text>` +
    // player
    `<circle cx="${T.x2 + 52}" cy="${MID_Y}" r="16" fill="#1f2a3d" stroke="#ffd23f" stroke-width="2"/>` +
    `<text x="${T.x2 + 52}" y="${MID_Y + 4}" text-anchor="middle" ${font} font-size="11" font-weight="700" fill="#ffd23f">YOU</text>` +
    `<text x="${T.x2 + 52}" y="${MID_Y + 34}" text-anchor="middle" ${font} font-size="10" fill="#9fb0c8">${hand === "RH" ? "Right-handed" : "Left-handed"}</text>` +
    `<text x="${T.x2 + 52}" y="${fhTop ? T.y1 + 14 : T.y2 - 4}" text-anchor="middle" ${font} font-size="12" font-weight="700" fill="#ff9a6b">FH side</text>` +
    `<text x="${T.x2 + 52}" y="${fhTop ? T.y2 - 4 : T.y1 + 14}" text-anchor="middle" ${font} font-size="12" font-weight="700" fill="#8fbcf3">BH side</text>`
  );
}

function robot(pos, big = false) {
  const { x, y } = ROBOT[pos];
  const r = big ? 20 : 15;
  return (
    (big ? `<circle cx="${x}" cy="${y}" r="46" fill="url(#glow)"/>` : "") +
    `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.45}" fill="#11161f" stroke="#ffd23f" stroke-width="2"/>` +
    `<circle cx="${x + r * 0.55}" cy="${y}" r="${r * 0.35}" fill="#ffd23f"/>` +
    `<text x="${x}" y="${y + r + 13}" text-anchor="middle" ${font} font-size="10" font-weight="700" fill="#ffd23f">NOVA</text>`
  );
}

/** landing point for a placement on the player's half */
function spot(place, hand, depth) {
  const fhY = hand === "RH" ? T.y1 + 50 : T.y2 - 50;
  const bhY = hand === "RH" ? T.y2 - 50 : T.y1 + 50;
  const y = place === "F" ? fhY : place === "B" ? bhY : MID_Y;
  const x = depth === "short" ? NET + 52 : T.x2 - 62;
  return { x, y };
}

function legend(spins, extra = "") {
  let x = T.x1;
  let s = "";
  for (const k of spins) {
    s += `<line x1="${x}" y1="${H - 20}" x2="${x + 22}" y2="${H - 20}" stroke="${SPIN[k].color}" stroke-width="3"/>`;
    s += `<text x="${x + 28}" y="${H - 16}" ${font} font-size="11" fill="#c8d3e3">${SPIN[k].label}</text>`;
    x += 170;
  }
  if (extra) s += `<text x="${x}" y="${H - 16}" ${font} font-size="11" fill="#9fb0c8">${extra}</text>`;
  return s;
}

function title(t, sub) {
  return `<text x="${T.x1}" y="24" ${font} font-size="15" font-weight="800" fill="#ffffff">${esc(t)}</text>` + (sub ? `<text x="${T.x2 + 90}" y="24" text-anchor="end" ${font} font-size="11" fill="#9fb0c8">${esc(sub)}</text>` : "");
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function feeds(p) {
  if (p.n === 32) return ["F", "M", "B"].map((place) => ({ spin: "Drive", place }));
  if (p.n >= 33 && p.n <= 35) return null;
  return p.name.split(" - ").map((t) => {
    const m = t.match(/^(Push|Drive|Loop) \(([FB])\)$/);
    if (!m) throw new Error("bad token " + t);
    return { spin: m[1], place: m[2] };
  });
}

function trajectory(p, hand) {
  const pos = p.position;
  const depth = pos === "near" ? "short" : "long";
  const r = ROBOT[pos];
  let s = head() + title(`Nova #${p.n} · ${pos === "near" ? "Near-net " : ""}${p.name}`, `Ball path and landing spots · ${hand}`) + table(hand) + robot(pos);
  const f = feeds(p);
  if (!f) {
    // random patterns: shaded landing zone
    const full = p.n !== 34;
    const bhEdge = hand === "RH" ? T.y2 : T.y1;
    const zoneH = (T.y2 - T.y1) * (full ? 1 : 2 / 3);
    const zy = full ? T.y1 : hand === "RH" ? T.y2 - zoneH : T.y1;
    s += `<rect x="${NET + 8}" y="${zy + 6}" width="${T.x2 - NET - 16}" height="${zoneH - 12}" rx="8" fill="#ff7a45" fill-opacity=".16" stroke="#ff7a45" stroke-dasharray="6 5"/>`;
    const targets = [0.18, 0.5, 0.82].map((t) => zy + zoneH * t);
    const spins = p.n === 35 ? ["Drive", "Push", "Loop"] : ["Drive", "Drive", "Drive"];
    targets.forEach((ty, i) => {
      const tx = T.x2 - 62 - (i % 2) * 70;
      s += `<path d="M${r.x + 18} ${r.y} Q ${(r.x + tx) / 2} ${(r.y + ty) / 2 - 30} ${tx} ${ty}" fill="none" stroke="${SPIN[spins[i]].color}" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#ah)" opacity=".9"/>`;
    });
    s += `<text x="${(NET + T.x2) / 2}" y="${zy + zoneH / 2 + 8}" text-anchor="middle" ${font} font-size="30" font-weight="800" fill="#ffffff" opacity=".85">?</text>`;
    const note = p.n === 33 ? "Random placement, topspin" : p.n === 34 ? "Random within 2/3 of the table (approx.)" : "Random placement and spin";
    s += `<text x="${(NET + T.x2) / 2}" y="${zy + zoneH / 2 + 30}" text-anchor="middle" ${font} font-size="11" fill="#ffd8c7">${note}</text>`;
    void bhEdge;
    s += legend([...new Set(spins)]);
    return s + "</svg>";
  }
  const seen = {};
  const total = {};
  f.forEach((b) => (total[b.place] = (total[b.place] ?? 0) + 1));
  f.forEach((b, i) => {
    const key = b.place;
    const k = (seen[key] = (seen[key] ?? 0) + 1) - 1;
    const t = spot(b.place, hand, depth);
    const n = total[key];
    const tx = t.x - (n > 1 ? (k % 2) * 30 : 0);
    const ty = t.y + (n > 1 ? (k - (n - 1) / 2) * 30 : 0);
    const bend = (i - (f.length - 1) / 2) * 26;
    s += `<path d="M${r.x + 18} ${r.y} Q ${(r.x + tx) / 2} ${(r.y + ty) / 2 - 24 + bend} ${tx - 12} ${ty}" fill="none" stroke="${SPIN[b.spin].color}" stroke-width="3" marker-end="url(#ah)"/>`;
    s += `<circle cx="${tx}" cy="${ty}" r="12" fill="${SPIN[b.spin].color}"/>`;
    s += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" ${font} font-size="12" font-weight="800" fill="#0b1220">${i + 1}</text>`;
  });
  s += legend([...new Set(f.map((b) => b.spin))], depth === "short" ? "Short balls near the net" : "Long balls, deep on your half");
  return s + "</svg>";
}

function position(pos) {
  let s = head() + title(pos === "near" ? "Nova robot position: Near-net" : "Nova robot position: Standard", "Where to set up the robot") + table("RH") + robot(pos, true);
  const r = ROBOT[pos];
  const note =
    pos === "near"
      ? ["Robot sits right behind the net", "on its own half. Balls land short:", "pushes, flicks, over-the-table attacks."]
      : ["Robot sits centred behind the far", "end line, like an opponent.", "Balls land long and deep."];
  const nx = pos === "near" ? T.x1 + 18 : T.x1 + 40;
  const ny = pos === "near" ? T.y1 + 26 : T.y1 + 30;
  s += `<rect x="${nx - 10}" y="${ny - 18}" width="214" height="66" rx="8" fill="#0b1220" fill-opacity=".82" stroke="#ffd23f" stroke-opacity=".5"/>`;
  note.forEach((l, i) => (s += `<text x="${nx}" y="${ny + i * 17}" ${font} font-size="11.5" fill="#e8eef8">${l}</text>`));
  s += `<path d="M${r.x + 20} ${r.y} L ${pos === "near" ? NET + 52 : T.x2 - 62} ${r.y}" stroke="#ffd23f" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#ah)" opacity=".8"/>`;
  s += `<text x="${T.x1}" y="${H - 16}" ${font} font-size="11" fill="#9fb0c8">${pos === "near" ? "Used by presets #37 to #44" : "Used by presets #1 to #36"} · switch RH / LH mode in the Nova app to mirror the placements</text>`;
  return s + "</svg>";
}

writeFileSync(new URL("pos-standard.svg", OUT), position("standard"));
writeFileSync(new URL("pos-near.svg", OUT), position("near"));
for (const p of patterns) for (const hand of ["RH", "LH"]) writeFileSync(new URL(`p${p.n}-${hand.toLowerCase()}.svg`, OUT), trajectory(p, hand));
console.log("wrote", 2 + patterns.length * 2, "files");
