// Timeline of "The Sweetest Disaster" (Great Molasses Flood, Boston, 15 Jan 1919): shots timed to the narration
// (words.ts, generated from ~/molasses-short/voice/words.json), the flood physics (front radius, depth, the bulging
// nose of the wave) and the camera grammar of the bridge short: continuous slow push-ins, symmetric smootherstep
// glides, hard cuts on big jumps, 7-frame flip kicks on impacts, no hand-held float.
import { WORDS, VOICE_DUR } from "./words";
export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_DUR * FPS);
export const D0 = 6.0; // street level (m); the harbour water is at y = 0
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** start frame of word i (narration), minus the reaction lead */
export const W = (i: number, lead = 0) => Math.round(WORDS[i][1] * FPS) - lead;
export const Ws = (i: number) => WORDS[i][1];

// ---------------- places ----------------
export const TANK: V3 = [0, D0, -26];
export const TANK_R = 13.7, TANK_H = 15;
export const FIRE: V3 = [31, D0, -28]; // Engine 31's firehouse on the wharf
export const QUAY_Z = -44;
export const EL_Z = -6, EL_Y = D0 + 5.6; // elevated railway along Commercial Street (deck underside)
export const ROOM: V3 = [300, D0, 0]; // kitchen set (insert shots)
export const COURT: V3 = [340, D0, 0];
export const OFFICE: V3 = [380, D0, 0];
export const PARKC: V3 = [0, D0, -24]; // today: the Little League field sits on the tank's old base

// ---------------- flood physics (tau = seconds since the tank split) ----------------
export const frontR = (tau: number) => (tau <= 0 ? 0 : TANK_R + 64 * (1 - Math.exp(-tau / 4.2)));
/** depth of molasses above the street at (x, z), tau seconds after the split. Volume-ish: a deep pool that spreads,
 *  a bulging nose at the front that shrinks as it travels ("as tall as a house" in the street), a collapsing column
 *  over the tank's base in the first second. */
export const molH = (x: number, z: number, tau: number) => {
  if (tau <= 0) return 0;
  const dx = x - TANK[0], dz = z - TANK[2], r = Math.hypot(dx, dz), th = Math.atan2(dz, dx);
  const Rf = frontR(tau) * (1 + 0.035 * Math.sin(5 * th + 1.3) + 0.02 * Math.sin(11 * th + 0.4));
  if (r > Rf + 0.05) return 0;
  const Dm = 1.0 + 3.0 * Math.exp(-tau / 1.0), B = 0.3 + 5.2 * Math.exp(-tau / 5.5), bw = 2.2 + 0.07 * Rf;
  let h = Dm * (1 - 0.3 * (r / Rf)) + B * Math.exp(-(((r - (Rf - bw)) / bw) ** 2));
  h += TANK_H * Math.exp(-tau / 0.35) * smooth((TANK_R + 1 - r) / 2);
  return h * Math.sqrt(smooth((Rf - r) / (0.6 + 0.5 * bw)));
};
/** x along the street (z = EL_Z) where the front is, on the +x side */
export const frontX = (tau: number) => { const R = frontR(tau), dz = EL_Z - TANK[2]; return R > Math.abs(dz) ? Math.sqrt(R * R - dz * dz) : 0; };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type SetName = "town" | "kitchen" | "court" | "office" | "today";
export type Crowd = "run" | "wharf" | "jell" | "hose" | "leak" | "buckets" | "paint" | "cold" | "lunch" | "rivets" | "split" | "spoon" | "wave"
  | "el" | "fire" | "stuck" | "none" | "honey" | "flow" | "glue" | "rescue" | "blame" | "judge" | "engineer" | "blueprint" | "field" | "sniff";
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; crowd: Crowd;
  /** seconds since the split at narration time t (undefined = before the flood) */
  flood?: (t: number) => number;
  paint?: number; leaks?: boolean; snow?: boolean; cold?: (t: number) => number; sunAz?: number; sunEl?: number;
};
const tB = Ws(96) - 0.08; // "split"
export const SPLIT_T = tB;
const C = (k: number) => W(k);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: C(20), light: "day", set: "town", crowd: "run", flood: (t) => 1.6 + t * 0.85, paint: 1 },
  { id: 2, a: C(20), b: C(42), light: "day", set: "town", crowd: "wharf", paint: 0 },
  { id: 3, a: C(42), b: C(56), light: "day", set: "town", crowd: "jell", paint: 0 },
  { id: 4, a: C(56), b: C(66), light: "day", set: "town", crowd: "leak", paint: 0, leaks: true },
  { id: 5, a: C(66), b: C(73), light: "day", set: "town", crowd: "paint", leaks: true },
  { id: 6, a: C(73), b: C(84), light: "day", set: "town", crowd: "cold", paint: 1, snow: true },
  { id: 7, a: C(84), b: C(98), light: "day", set: "town", crowd: "lunch", paint: 1, flood: (t) => t - tB },
  { id: 8, a: C(98), b: C(103), light: "day", set: "kitchen", crowd: "spoon", sunAz: 160, sunEl: 60 },
  { id: 9, a: C(103), b: C(108), light: "day", set: "town", crowd: "wave", paint: 1, flood: (t) => 1.4 + (t - Ws(103)) * 0.9 },
  { id: 10, a: C(108), b: C(126), light: "day", set: "town", crowd: "el", paint: 1, flood: (t) => (t < Ws(113) ? 0.7 + (t - Ws(108)) * 1.1 : t < Ws(119) ? 0.6 + (t - Ws(113)) * 1.3 : 9 + (t - Ws(119))) },
  { id: 11, a: C(126), b: C(129), light: "day", set: "town", crowd: "none", paint: 1, flood: () => 30 },
  { id: 12, a: C(129), b: C(145), light: "day", set: "kitchen", crowd: "honey", sunAz: 160, sunEl: 60 },
  { id: 13, a: C(145), b: C(164), light: "day", set: "town", crowd: "flow", paint: 1, flood: (t) => (t < Ws(152) ? 3.2 + (t - Ws(145)) : 14 + (t - Ws(152)) * 0.3),
    cold: (t) => smooth((t - Ws(152)) / 1.6) },
  { id: 14, a: C(164), b: C(169), light: "day", set: "town", crowd: "rescue", paint: 1, flood: () => 40, cold: () => 1 },
  { id: 15, a: C(169), b: C(178), light: "day", set: "town", crowd: "blame", paint: 1, flood: () => 60, cold: () => 1 },
  { id: 16, a: C(178), b: C(196), light: "day", set: "office", crowd: "engineer", sunAz: 150, sunEl: 62 },
  { id: 17, a: C(196), b: TOTAL, light: "golden", set: "today", crowd: "field" },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 2: 0, 8: 6, 9: 4, 12: 8, 13: 8, 16: 8, 17: 14 };
export const FLASH_AT = SHOTS[1].a;
// cut points inside shots (sub-sets): shot 15 cuts to the court, shot 12/16 to inserts
export const COURT_AT = C(173), BLUEPRINT_AT = C(186);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** which set a shot is in at frame f (shot 15 changes set at COURT_AT) */
export const setAt = (id: number, f: number): SetName => (id === 15 && f >= COURT_AT ? "court" : SHOTS[id - 1].set);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const G = D0;
const tauOf = (id: number, f: number) => SHOTS[id - 1].flood?.(T(f)) ?? -1;

// cast anchor points (cast.ts reads these)
export const JELL_AT: V3 = [7.2, G, -11.2];
export const HOSE_AT: V3 = [-4.5, G, -12.6]; // inlet at the tank's foot
export const SEAM_AT: V3 = [-5.6, G, -12.95]; // leaking seam (on the street side of the tank)
export const LADDER_AT: V3 = [3.4, G, -12.4];
export const THERMO_AT: V3 = [-14.2, G + 2.3, 0.86]; // on a shop front across the street
export const LUNCH_AT: V3 = [10.5, G, -11.0];
export const EXEC_AT: V3 = [16, G, -6];
export const BENCH_AT: V3 = [17, G, -10.5]; // today: the old local's bench at the field's edge
export const RUN_Z = -4.2;

// ---- framings ----
// 1 hook: low in Commercial Street looking back toward the tank; the wave chases the runners at the lens
const S1a = (f: number) => { const fx = frontX(tauOf(1, f)); return dolly([fx + 24, G + 1.7, -5.6], [fx - 1, G + 3.4, -6.0], pushK(f, 0, 0.002), { fov: 46 }); };
const S1b = (f: number) => { const fx = frontX(tauOf(1, f)); return dolly([fx + 14.5, G + 0.9, -6.0], [fx + 2, G + 2.8, -5.2], pushK(f, W(10, 3), 0.002), { fov: 44, roll: -0.04 }); };
const S1c = (f: number) => { const fx = frontX(tauOf(1, f)); return dolly([fx + 11, G + 1.0, -6.0], [fx, G + 3.2, -5.6], pushK(f, W(16, 3), 0.003, 0.006, 30), { fov: 48, roll: 0.04 }); };
// 2 setting: aerial from over the harbour, the tank looming over the street, barrels on the wharf
const S2a = (f: number) => zoom([58, 44, -96], [0, G + 4, -16], 42, pushK(f, W(20), 0.0018));
const S2b = (f: number) => dolly([27, G + 1.5, -4.5], [2, G + 12, -22], pushK(f, W(24, 3), 0.0022, 0.005, 30), { fov: 56, roll: 0.03 });
const S2c = (f: number) => dolly([-17.5, G + 1.8, -32.5], [-23, G + 1.3, -38.5], pushK(f, W(38, 3), 0.0025), { fov: 40 });
// 3 the man in charge, then the hose
const S3a = (f: number) => dolly(add(JELL_AT, [1.0, 1.75, 5.2]), add(JELL_AT, [0, 1.55, 0]), pushK(f, W(42), 0.0025, 0.005, 30), { fov: 38 });
const S3b = (f: number) => dolly(add(HOSE_AT, [3.4, 1.1, 4.6]), add(HOSE_AT, [0.6, 0.6, 0.2]), pushK(f, W(49, 3), 0.0025), { fov: 40, roll: -0.03 });
// 4 the leaking seam (drips), then the neighbours with buckets
const S4a = (f: number) => dolly(add(SEAM_AT, [0.9, 1.7, 2.4]), add(SEAM_AT, [0, 1.6, 0]), pushK(f, W(56), 0.003), { fov: 38 });
const S4b = (f: number) => dolly(add(SEAM_AT, [2.4, 1.6, 6.8]), add(SEAM_AT, [-0.3, 1.25, 0.2]), pushK(f, W(60, 3), 0.002, 0.005, 30), { fov: 42, roll: 0.03 });
// 5 the fix: Jell frowns at the drips, then the painter turns the tank brown (wide)
const S5a = (f: number) => dolly(add(JELL_AT, [-1.4, 1.7, 3.6]), add(JELL_AT, [-0.3, 1.6, 0]), pushK(f, W(66), 0.003), { fov: 36, roll: -0.03 });
const S5b = (f: number) => dolly([22, G + 2.2, 3.5], [1, G + 6.5, -15], pushK(f, W(69, 3), 0.002, 0.005, 25), { fov: 46 });
// 6 a frozen street, then the thermometer on the shop front
const S6a = (f: number) => dolly([-4, G + 2.0, -10.5], [-13, G + 1.6, -1], pushK(f, W(73), 0.0022), { fov: 44 });
const S6b = (f: number) => dolly(add(THERMO_AT, [0.35, 0.1, -2.3]), add(THERMO_AT, [0, 0, 0]), pushK(f, W(78, 3), 0.002, 0.005, 30), { fov: 36 });
// 7 noon: lunch at the tank's foot, the rivets, the split (wide)
const S7a = (f: number) => dolly(add(LUNCH_AT, [0.6, 1.25, 4.0]), add(LUNCH_AT, [0, 1.1, 0]), pushK(f, W(84), 0.0025), { fov: 38 });
const S7b = (f: number) => dolly(add(SEAM_AT, [1.2, 3.0, 3.4]), add(SEAM_AT, [0, 3.6, 0]), pushK(f, W(88, 3), 0.004), { fov: 36, roll: 0.03 });
const S7c = (f: number) => dolly([30, G + 6, 20], [0, G + 6, -22], pushK(f, W(92, 3), 0.0015), { fov: 46 });
// 8 the slow drip (kitchen insert)
const S8a = (f: number) => dolly(add(ROOM, [0.15, 1.45, 1.1]), add(ROOM, [0, 1.15, 3.0]), pushK(f, W(98), 0.0025), { fov: 40 });
// 9 nobody told this molasses: low in the street, the nose of the wave at the lens
const S9a = (f: number) => { const fx = frontX(tauOf(9, f)); return dolly([Math.max(fx + 13, 34), G + 0.9, -6.0], [fx - 2, G + 3.0, -5.8], pushK(f, W(103), 0.003, 0.007, 30), { fov: 50, roll: -0.04 }); };
// 10 the El bends, the firehouse slides, the flooded street
const S10a = (f: number) => dolly([36, G + 2.2, -1.0], [4, G + 5.0, -7], pushK(f, W(108), 0.002), { fov: 44, roll: 0.03 });
const S10b = (f: number) => dolly([19, G + 2.0, -9.6], [31, G + 3.6, -28], pushK(f, W(113, 3), 0.002, 0.005, 25), { fov: 44 });
const S10c = (f: number) => dolly([21.8, G + 1.6, -2.6], [17.2, G + 1.1, -7.6], pushK(f, W(119, 3), 0.0022), { fov: 42, roll: -0.03 });
// 11 aerial, quiet
const S11a = (f: number) => zoom([-40, 62, 70], [4, G, -16], 40, pushK(f, W(126), 0.0012));
// 12 kitchen: the kid at the icebox, then the cold jar, then the warm jar
const S12a = (f: number) => dolly(add(ROOM, [-1.2, 1.6, -1.2]), add(ROOM, [2.0, 1.1, 4.0]), pushK(f, W(129), 0.0025), { fov: 44 });
const S12b = (f: number) => dolly(add(ROOM, [0.0, 1.3, 1.6]), add(ROOM, [0, 1.25, 3.0]), pushK(f, W(132, 3), 0.002), { fov: 38 });
const S12c = (f: number) => dolly(add(ROOM, [0.05, 1.3, 1.6]), add(ROOM, [0, 1.25, 3.0]), pushK(f, W(140, 3), 0.003), { fov: 37, roll: 0.03 });
// 13 warm and fast -> the cold sets it -> glue
const S13a = (f: number) => dolly([34, G + 5.5, 6], [12, G + 0.5, -8], pushK(f, W(145), 0.002), { fov: 44 });
const S13b = (f: number) => dolly([22.5, G + 1.7, -1.0], [17.5, G + 1.2, -7.2], pushK(f, W(152, 3), 0.0022), { fov: 42 });
const S13c = (f: number) => dolly([19.2, G + 1.25, -3.2], [18.6, G + 1.15, -6.3], pushK(f, W(158, 3), 0.003, 0.006, 25), { fov: 36, roll: 0.035 });
// 14 rescuers wading (side view)
const S14a = (f: number) => dolly([-40.6, G + 1.7, -0.6], [-40.8, G + 1.2, -6.6], pushK(f, W(164), 0.002), { fov: 42 });
// 15 the company points elsewhere; the court
const S15a = (f: number) => dolly(add(EXEC_AT, [-1.0, 1.8, 3.6]), add(EXEC_AT, [0.5, 1.75, 0]), pushK(f, W(169), 0.0025, 0.005, 25), { fov: 40 });
const S15b = (f: number) => dolly(add(COURT, [0.4, 1.9, -1.8]), add(COURT, [0, 2.0, 3.3]), pushK(f, W(173, 3), 0.002, 0.006, 25), { fov: 40 });
// 16 the engineer signs; the blueprint insert
const S16a = (f: number) => dolly(add(OFFICE, [1.6, 1.8, -0.6]), add(OFFICE, [0, 1.3, 2.6]), pushK(f, W(178), 0.0022), { fov: 42 });
const S16b = (f: number) => dolly(add(OFFICE, [0.08, 2.15, 2.15]), add(OFFICE, [0, 0.98, 2.85]), pushK(f, W(186, 3), 0.002, 0.004, 25), { fov: 38 });
// 17 today: the field on the tank's base, the old local, the crane out
const S17a = (f: number) => dolly([30, G + 14, 14], [0, G + 0.5, -24], pushK(f, W(196), 0.0025), { fov: 44 });
const S17b = (f: number) => dolly(add(BENCH_AT, [-0.6, 1.4, 3.4]), add(BENCH_AT, [0, 1.25, 0]), pushK(f, W(206, 3), 0.002, 0.004, 25), { fov: 40 });
const CRANE: V3[] = [[24, G + 10, 8], [-18, G + 26, 26], [0, G + 2, -24]];
const S17c = (f: number): Shot => {
  const a = S17b(W(219, 3)), s = glide((f - W(219, 3)) / 52), r = 1 - s, [Cc, B, L] = CRANE;
  return { pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * Cc[i] + s * s * B[i]) as V3,
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s) as V3, fov: 40 + 6 * s, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W(10, 3), cut: true, s: S1b }, { f: W(16, 3), dur: 26, s: S1c }],
  2: [{ f: W(20), s: S2a }, { f: W(24, 3), cut: true, s: S2b }, { f: W(38, 3), cut: true, s: S2c }],
  3: [{ f: W(42), s: S3a }, { f: W(49, 3), cut: true, s: S3b }],
  4: [{ f: W(56), s: S4a }, { f: W(60, 3), cut: true, s: S4b }],
  5: [{ f: W(66), s: S5a }, { f: W(69, 3), cut: true, s: S5b }],
  6: [{ f: W(73), s: S6a }, { f: W(78, 3), cut: true, s: S6b }],
  7: [{ f: W(84), s: S7a }, { f: W(88, 3), cut: true, s: S7b }, { f: W(92, 3), cut: true, s: S7c }],
  8: [{ f: W(98), s: S8a }],
  9: [{ f: W(103), s: S9a }],
  10: [{ f: W(108), s: S10a }, { f: W(113, 3), cut: true, s: S10b }, { f: W(119, 3), cut: true, s: S10c }],
  11: [{ f: W(126), s: S11a }],
  12: [{ f: W(129), s: S12a }, { f: W(132, 3), cut: true, s: S12b }, { f: W(140, 3), cut: true, s: S12c }],
  13: [{ f: W(145), s: S13a }, { f: W(152, 3), cut: true, s: S13b }, { f: W(158, 3), dur: 22, s: S13c }],
  14: [{ f: W(164), s: S14a }],
  15: [{ f: W(169), s: S15a }, { f: W(173, 3), cut: true, s: S15b }],
  16: [{ f: W(178), s: S16a }, { f: W(186, 3), cut: true, s: S16b }],
  17: [{ f: W(196), s: S17a }, { f: W(206, 3), cut: true, s: S17b }, { f: W(219, 3), cut: true, s: S17c }],
};

// impact kicks: rivets popping (a burst of five), the split, the wave at the lens, the El, the gavel, the seal
export const RIVET_POPS = [Ws(89) - 0.03, Ws(90) + 0.02, Ws(91) - 0.03, Ws(91) + 0.17, Ws(91) + 0.33];
export const GAVEL_T = Ws(177) - 0.05, SEAL_T = Ws(195) - 0.06;
const KICKS: [number, number][] = [...RIVET_POPS.map((t) => [t, 0.6] as [number, number]), [tB + 0.05, 1.6], [Ws(105) - 0.05, 1.2],
  [Ws(109) - 0.05, 0.9], [Ws(113) - 0.05, 0.8], [GAVEL_T, 1.0], [SEAL_T, 0.7]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: W(10, 3), cInf: 12 },               // runners close, wave behind them
  { f: W(20), cInf: 0 },                    // aerial
  { f: W(42), cInf: 12 },                   // Jell MS
  { f: W(49, 3), cInf: 13 },                // hose CU
  { f: W(56), cInf: 14 },                   // seam CU
  { f: W(60, 3), cInf: 10 },                // neighbours
  { f: W(66), cInf: 12 },                   // Jell frowns
  { f: W(69, 3), cInf: 0 },                 // painting wide
  { f: W(78, 3), cInf: 14 },                // thermometer CU
  { f: W(84), cInf: 12 },                   // lunch MS
  { f: W(88, 3), cInf: 15 },                // rivets CU
  { f: W(92, 3), cInf: 0 },                 // split wide
  { f: W(98), cInf: 14 },                   // spoon insert
  { f: W(103), cInf: 8 },                   // wave at the lens
  { f: W(108), cInf: 0 },                   // El, firehouse
  { f: W(119, 3), cInf: 10 },               // flooded street
  { f: W(126), cInf: 0 },                   // aerial
  { f: W(129), cInf: 10 },                  // kitchen
  { f: W(132, 3), cInf: 15 },               // jars
  { f: W(145), cInf: 0 },                   // flow
  { f: W(152, 3), cInf: 11 },               // stuck
  { f: W(158, 3), dur: 22, cInf: 14 },      // glue CU
  { f: W(164), cInf: 8 },                   // rescuers
  { f: W(169), cInf: 12 },                  // exec
  { f: W(173, 3), cInf: 11 },               // judge
  { f: W(178), cInf: 10 },                  // engineer
  { f: W(186, 3), cInf: 12 },               // blueprint
  { f: W(196), cInf: 0 },                   // field
  { f: W(206, 3), cInf: 12 },               // old local
  { f: W(219, 3), dur: 30, cInf: 0 },       // crane out
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
