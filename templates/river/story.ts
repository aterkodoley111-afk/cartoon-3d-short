// Timeline of "The River That Caught Fire" (Cuyahoga River, Cleveland, 22 June 1969): shots timed to the narration
// (words.ts, generated from ~/river-fire/voice/words.json), the fire (spread from the spark's landing point, then put
// out by the fireboat), the train on the trestle, and the camera grammar of the bridge short: continuous slow
// push-ins, smootherstep glides, hard cuts on big jumps, 7-frame flip kicks on impacts, no hand-held float.
import { WORDS, VOICE_DUR } from "./words";
export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_DUR * FPS);
export const D0 = 2.6; // bank level (m); the river surface is at y = 0
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** start frame of word i (narration), minus the reaction lead */
export const W = (i: number, lead = 0) => Math.round(WORDS[i][1] * FPS) - lead;
export const Ws = (i: number) => WORDS[i][1];

// ---------------- places ----------------
export const BANK_N = -14, BANK_S = 14;          // bulkhead walls (river between them, flowing toward +x)
export const DECK = 6.0;                          // top of the rails on the wooden trestle (x = 0, spanning z)
export const OFFICE: V3 = [300, D0, 0];           // the magazine's newsroom
export const KITCHEN: V3 = [340, D0, 0];          // the explanation inserts
export const CAPITOL: V3 = [380, D0, 0];          // the signing
export const PIPE_OIL: V3 = [-34, 1.5, BANK_N + 0.9], PIPE_GREASE: V3 = [-41, 1.7, BANK_N + 0.9];
export const IGN: V3 = [-2.1, 0.12, -4.4];        // where the spark lands, on the debris jammed against the piles
export const SPARK_FROM: V3 = [-1.95, DECK - 0.35, -4.2];
export const FIREMAN_AT: V3 = [-14, D0, 15.4];
export const WORKER_AT: V3 = [10, D0, -19];
export const TALLY_AT: V3 = [34, D0 + 1.75, 21.1];  // chalk tally on the firehouse wall (faces the river, -z)
export const WATCH_AT: V3 = [-6, D0, 15.4];
export const PHOTO_AT: V3 = [-10, D0, 15.6];
export const STREET_AT: V3 = [-100, D0, 31];
export const FISH_AT: V3 = [-8, D0, 15.4];
export const GULL_AT: V3 = [-9.2, 0.42, -2.6];

// ---------------- the fire (tau = seconds since the spark landed) ----------------
export const SPARK_T0 = Ws(71) - 0.05;           // the spark leaves the wheel on "spark"
export const LAND_T = Ws(72) + 0.32;              // ... and lands during the pause after "dropped"
export const fireR = (tau: number) => (tau <= 0 ? 0 : 0.5 + 12 * smooth(tau / 1.6));
/** 0 burning .. 1 out: the fireboat works from downstream (+x) back upstream */
export const OUT_T0 = Ws(80) - 0.1, OUT_T1 = Ws(88) + 0.3;
export const outAt = (t: number, x: number) => smooth((t - OUT_T0 - (6 - x) * 0.07) / (OUT_T1 - OUT_T0 - 1.6));

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type SetName = "flats" | "today" | "office" | "kitchen" | "capitol";
export type Crowd = "hook" | "proud" | "pipes" | "raft" | "tally" | "train" | "spark" | "flames" | "boat" | "photog" | "editor"
  | "match" | "readers" | "signer" | "fisher" | "none";
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; crowd: Crowd;
  /** seconds since the spark landed at narration time t (undefined = no fire) */
  fire?: (t: number) => number; out?: (t: number) => number; smokeOnly?: boolean;
  /** z of the locomotive's front at time t (undefined = no train) */
  train?: (t: number) => number;
  sunAz?: number; sunEl?: number;
};
const C = (k: number) => W(k);
export const trainZ = (t: number) => -15 + 8.2 * (t - Ws(58));
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: C(15), light: "day", set: "flats", crowd: "hook", fire: (t) => 8 + t, out: () => 0 },
  { id: 2, a: C(15), b: C(31), light: "day", set: "flats", crowd: "proud" },
  { id: 3, a: C(31), b: C(49), light: "day", set: "flats", crowd: "pipes" },
  { id: 4, a: C(49), b: C(58), light: "day", set: "flats", crowd: "tally" },
  { id: 5, a: C(58), b: C(70), light: "day", set: "flats", crowd: "train", train: trainZ },
  { id: 6, a: C(70), b: C(73), light: "day", set: "flats", crowd: "spark", train: trainZ, fire: (t) => t - LAND_T },
  { id: 7, a: C(73), b: C(80), light: "day", set: "flats", crowd: "flames", train: trainZ, fire: (t) => t - LAND_T },
  { id: 8, a: C(80), b: C(89), light: "day", set: "flats", crowd: "boat", fire: (t) => t - LAND_T, out: (t) => t },
  { id: 9, a: C(89), b: C(99), light: "day", set: "flats", crowd: "photog", smokeOnly: true },
  { id: 10, a: C(99), b: C(118), light: "day", set: "office", crowd: "editor", sunAz: 150, sunEl: 60 },
  { id: 11, a: C(118), b: C(146), light: "day", set: "kitchen", crowd: "match", sunAz: 160, sunEl: 60 },
  { id: 12, a: C(146), b: C(164), light: "day", set: "flats", crowd: "readers", sunAz: 140, sunEl: 55 },
  { id: 13, a: C(164), b: TOTAL, light: "golden", set: "today", crowd: "fisher", sunAz: 140, sunEl: 14 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 10: 8, 11: 8, 12: 8, 13: 14 };
export const FLASH_AT = SHOTS[1].a;
// cut points inside shots that change set: shot 11 goes back to the river, shot 12 to Washington
export const RIVER_AT = C(135) - 3, SIGN_AT = C(150) - 3;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const setAt = (id: number, f: number): SetName => (id === 11 && f >= RIVER_AT ? "flats" : id === 12 && f >= SIGN_AT ? "capitol" : SHOTS[id - 1].set);

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

/** the spark's position at time t (falls from the wheel, drifting, lands at IGN at LAND_T) */
export const sparkAt = (t: number): V3 | null => {
  const u = (t - SPARK_T0) / (LAND_T - SPARK_T0);
  if (u < 0 || u > 1) return null;
  const e = u ** 1.7;
  return [SPARK_FROM[0] + (IGN[0] - SPARK_FROM[0]) * u + 0.15 * Math.sin(u * 9), SPARK_FROM[1] + (IGN[1] + 0.25 - SPARK_FROM[1]) * e, SPARK_FROM[2] + (IGN[2] - SPARK_FROM[2]) * u];
};
export const BOAT0: V3 = [34, 0, 10.6], BOAT1: V3 = [13, 0, 4.5];
export const boatAt = (t: number): V3 => { const k = smooth((t - Ws(80) + 0.6) / 2.6); return [BOAT0[0] + (BOAT1[0] - BOAT0[0]) * k, 0, BOAT0[2] + (BOAT1[2] - BOAT0[2]) * k]; };

// ---- framings ----
// 1 hook: low over the burning river, the trestle and the mills behind; then the bored fireman on the bank
const S1a = (f: number) => dolly([-33, 1.6, 9.5], [-4, 3.6, -5], pushK(f, 0, 0.0028), { fov: 46, roll: 0.03 });
const S1b = (f: number) => dolly(add(FIREMAN_AT, [1.1, 1.75, 4.6]), add(FIREMAN_AT, [0.1, 1.55, 0]), pushK(f, W(8, 3), 0.0025, 0.005, 30), { fov: 40 });
// 2 setting: aerial over the Flats, then the proud steelworker under the smokestacks
const S2a = (f: number) => zoom([-64, 50, 58], [4, 4, -24], 42, pushK(f, W(15), 0.0018));
const S2b = (f: number) => dolly(add(WORKER_AT, [0.9, 1.0, 5.6]), add(WORKER_AT, [-0.5, 4.2, -6]), pushK(f, W(24, 3), 0.0024, 0.005, 30), { fov: 56, roll: -0.04 });
// 3 the oil pipe, the grease pipe, the raft of junk at the trestle, the gull standing on the still water
const S3a = (f: number) => dolly(add(PIPE_OIL, [2.6, -0.5, 6.8]), add(PIPE_OIL, [0, -0.5, 0.2]), pushK(f, W(31), 0.0028), { fov: 40 });
const S3b = (f: number) => dolly(add(PIPE_GREASE, [-2.2, -0.7, 5.6]), add(PIPE_GREASE, [0, -0.6, 0.3]), pushK(f, W(37, 3), 0.003, 0.006, 25), { fov: 40, roll: 0.03 });
const S3c = (f: number) => dolly([-22, 4.2, 6.5], [-8, 0.6, -4.5], pushK(f, W(39, 3), 0.0022), { fov: 44 });
const S3d = (f: number) => dolly(add(GULL_AT, [-1.4, 0.75, 3.3]), add(GULL_AT, [0, 0.35, 0]), pushK(f, W(44, 3), 0.0035), { fov: 38 });
// 4 the firehouse wall: a dozen chalk marks
const S4a = (f: number) => dolly(add(TALLY_AT, [0.3, -0.15, -9.2]), add(TALLY_AT, [0.0, -0.45, 0]), pushK(f, W(49), 0.0026, 0.005, 25), { fov: 42 });
// 5 Sunday noon: the train rolls onto the wooden trestle (wide), then from under the deck
const S5a = (f: number) => dolly([40, 2.4, 4], [0, 6.5, -3], pushK(f, W(58), 0.0018), { fov: 40 });
const S5b = (f: number) => dolly([4.6, 0.9, -1.0], [0, DECK - 0.5, -4.5], pushK(f, W(65, 3), 0.003), { fov: 46, roll: 0.04 });
// 6 the spark: CU of the wheels, then tilt down with it to the oily junk
const S6a = (f: number) => {
  const sp = sparkAt(T(f)) ?? (T(f) < SPARK_T0 ? SPARK_FROM : IGN);
  return { pos: [-5.2, 4.6, -1.0] as V3, look: [sp[0] * 0.5 - 1.0, sp[1] + 0.1, sp[2]] as V3, fov: 40, roll: -0.03 };
};
// 7 the river goes up: wide from the south bank, then low on the water as the flames race
const S7a = (f: number) => dolly([-21, G + 5.6, 31], [-5, 1.6, -3], pushK(f, W(73), 0.0022), { fov: 44 });
const S7b = (f: number) => dolly([9, 1.1, 9.5], [-6, 2.6, -4], pushK(f, W(76, 3), 0.003, 0.007, 30), { fov: 48, roll: -0.04 });
// 8 the fireboat, then the fireman with his watch
const S8a = (f: number) => { const b = boatAt(T(f)); return dolly([b[0] + 22, 7.5, b[2] + 9], [b[0] - 9, 2.2, b[2] - 6], pushK(f, W(80), 0.0022), { fov: 44 }); };
const S8b = (f: number) => dolly(add(WATCH_AT, [0.8, 1.65, 4.3]), add(WATCH_AT, [0, 1.5, 0]), pushK(f, W(85, 3), 0.0026, 0.005, 25), { fov: 40, roll: 0.03 });
// 9 the photographer arrives too late
export const photogX = (t: number) => PHOTO_AT[0] + 5.5 * (1 - clamp01((t - Ws(89) + 0.3) / (Ws(93) - 0.2 - Ws(89) + 0.3)));
const S9a = (f: number) => { const x = photogX(T(f)); return dolly([x + 1.2, G + 1.65, PHOTO_AT[2] + 6.0], [x - 0.5, G + 1.4, PHOTO_AT[2] - 0.5], pushK(f, W(89), 0.0022, 0.0045, 30), { fov: 42 }); };
const S9b = (f: number) => dolly(add(PHOTO_AT, [0.5, 1.75, 3.0]), add(PHOTO_AT, [0, 1.65, 0]), pushK(f, W(94, 3), 0.003, 0.006, 25), { fov: 38, roll: -0.03 });
// 10 the newsroom: the editor, then the old photo insert
const S10a = (f: number) => dolly(add(OFFICE, [1.0, 1.75, 0.5]), add(OFFICE, [0.15, 1.5, 3.2]), pushK(f, W(99), 0.0022), { fov: 42 });
const S10b = (f: number) => dolly(add(OFFICE, [0.0, 1.3, 1.62]), add(OFFICE, [0, 1.27, 2.85]), pushK(f, W(109, 3), 0.0022, 0.006, 25), { fov: 38 });
// 11 kitchen: water + match, the soup; then the river under its blanket
const S11a = (f: number) => dolly(add(KITCHEN, [0.05, 1.3, 1.6]), add(KITCHEN, [0, 1.27, 2.95]), pushK(f, W(118), 0.0025), { fov: 38 });
const S11b = (f: number) => dolly(add(KITCHEN, [0.05, 1.55, 1.95]), add(KITCHEN, [0, 1.05, 2.95]), pushK(f, W(124, 3), 0.0025, 0.005, 25), { fov: 38, roll: 0.03 });
const S11c = (f: number) => dolly([-12, 8.5, 12.5], [-24, 0, -6], pushK(f, W(135, 3), 0.0022), { fov: 46 });
// 12 the readers, then the signing (desk), then the bill insert
const S12a = (f: number) => dolly(add(STREET_AT, [0.6, 1.7, -6.2]), add(STREET_AT, [0, 1.6, 0.5]), pushK(f, W(146), 0.0024, 0.005, 25), { fov: 44 });
const S12b = (f: number) => dolly(add(CAPITOL, [1.2, 1.8, -0.5]), add(CAPITOL, [0.1, 1.45, 2.8]), pushK(f, W(150, 3), 0.0022), { fov: 42 });
const S12c = (f: number) => dolly(add(CAPITOL, [0.0, 1.32, 1.6]), add(CAPITOL, [0, 1.27, 2.85]), pushK(f, W(159, 3), 0.0025, 0.006, 25), { fov: 38 });
// 13 today: the clean river at sunset, then the fisherman and his friend's phone
const S13a = (f: number) => dolly([44, 10, 28], [-2, 1, -6], pushK(f, W(164), 0.0026), { fov: 44 });
const S13b = (f: number) => dolly(add(FISH_AT, [0.8, 1.6, 5.8]), add(FISH_AT, [-0.35, 1.5, 0.2]), pushK(f, W(173, 3), 0.0025, 0.005, 25), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W(8, 3), cut: true, s: S1b }],
  2: [{ f: W(15), s: S2a }, { f: W(24, 3), cut: true, s: S2b }],
  3: [{ f: W(31), s: S3a }, { f: W(37, 3), cut: true, s: S3b }, { f: W(39, 3), cut: true, s: S3c }, { f: W(44, 3), cut: true, s: S3d }],
  4: [{ f: W(49), s: S4a }],
  5: [{ f: W(58), s: S5a }, { f: W(65, 3), cut: true, s: S5b }],
  6: [{ f: W(70), s: S6a }],
  7: [{ f: W(73), s: S7a }, { f: W(76, 3), cut: true, s: S7b }],
  8: [{ f: W(80), s: S8a }, { f: W(85, 3), cut: true, s: S8b }],
  9: [{ f: W(89), s: S9a }, { f: W(94, 3), cut: true, s: S9b }],
  10: [{ f: W(99), s: S10a }, { f: W(109, 3), cut: true, s: S10b }],
  11: [{ f: W(118), s: S11a }, { f: W(124, 3), cut: true, s: S11b }, { f: W(135, 3), cut: true, s: S11c }],
  12: [{ f: W(146), s: S12a }, { f: W(150, 3), cut: true, s: S12b }, { f: W(159, 3), cut: true, s: S12c }],
  13: [{ f: W(164), s: S13a }, { f: W(173, 3), cut: true, s: S13b }],
};

// impact kicks: the spark lands, the flames go up, the photo flash, the dust off the 1952 photo, the seal, the phone flash
export const FLASH_T = Ws(98) - 0.04, DUST_T = Ws(116) - 0.05, SEAL_T = Ws(163) - 0.06, PHONE_T = Ws(180) + 0.12;
const KICKS: [number, number][] = [[LAND_T + 0.05, 0.5], [Ws(79) - 0.05, 1.4], [Ws(76) - 0.05, 0.6], [FLASH_T, 0.6], [DUST_T, 0.7], [SEAL_T, 0.9], [Ws(123) - 0.03, 0.4], [PHONE_T, 0.4]];
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
  { f: 0, cInf: 0 },                        // hook wide
  { f: W(8, 3), cInf: 12 },                 // bored fireman
  { f: W(15), cInf: 0 },                    // aerial
  { f: W(24, 3), cInf: 0 },                 // steelworker
  { f: W(31), cInf: 13 },                   // oil pipe CU
  { f: W(39, 3), cInf: 0 },                 // the raft
  { f: W(44, 3), cInf: 12 },                // gull
  { f: W(49), cInf: 11 },                   // tally wall
  { f: W(58), cInf: 0 },                    // train wide
  { f: W(65, 3), cInf: 8 },                 // under the deck
  { f: W(70), cInf: 10, focus: (f) => sparkAt(f / FPS) ?? IGN }, // the spark
  { f: W(73), cInf: 0 },                    // flames wide
  { f: W(80), cInf: 0 },                    // fireboat
  { f: W(85, 3), cInf: 12 },                // watch
  { f: W(89), cInf: 10 },                   // photographer
  { f: W(94, 3), cInf: 12 },
  { f: W(99), cInf: 10 },                   // editor
  { f: W(109, 3), cInf: 14 },               // old photo insert
  { f: W(118), cInf: 14 },                  // match
  { f: W(124, 3), cInf: 14 },               // soup
  { f: W(135, 3), cInf: 0 },                // blanket
  { f: W(146), cInf: 10 },                  // readers
  { f: W(150, 3), cInf: 10 },               // signer
  { f: W(159, 3), cInf: 13 },               // bill insert
  { f: W(164), cInf: 0 },                   // today wide
  { f: W(173, 3), cInf: 11 },               // fisherman
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
