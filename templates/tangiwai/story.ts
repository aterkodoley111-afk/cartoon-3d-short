// Timeline of "The Volcano That Didn't Erupt" (Tangiwai, Christmas Eve 1953): shots keyed to the narration
// (words.ts), the lahar clock (terrain.ts zfAt: the front passes the bridge at T_HIT; the hook replays it), the
// train clock (frontS: braking, the dive), the crater breach clock, and the camera grammar of the bridge short:
// continuous slow push-ins, smootherstep glides, hard cuts on big jumps, damped impact shakes, no hand-held float.
import { WORDS, VOICE_DUR } from "./words";
import { T_HIT, T_RIP, EDGE_X, RAIL_Y, ROAD_Z, CRATER, RIM_R, RUAPEHU, frontS, T_EDGE, zfAt, rc, plainY, bedY, hAt, craterH, Era, pathXZ, pathY, S_SETTLED, carOffset, SIXTH } from "./terrain";
export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_DUR * FPS);
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** start frame of word i (narration), minus the reaction lead */
export const W = (i: number, lead = 0) => Math.round(WORDS[i][1] * FPS) - lead;
export const Ws = (i: number) => WORDS[i][1];

// ---------------- places ----------------
export const CAR_INT: V3 = [4000, 0, 0];      // inside the sixth carriage (car Z) and its twin for the setting insert
export const BATH: V3 = [4060, 0, 0];         // the bathtub insert
export const C: V3 = [CRATER.x, 0, CRATER.z];
export const MAST: V3 = [-50, 0, 34];        // the lahar alarm mast on the west bank, upstream of the bridge (2007)
export const SIGNAL_X = EDGE_X + 72;          // the 2007 home signal east of the bridge
export const TRAIN07_X = SIGNAL_X + 9;        // front of the stopped 2007 train
export const TRUCK: V3 = [64, 0, ROAD_Z];     // Ellis's truck, stopped short of the drowned road bridge
/** the train passes Ellis at T_PASS; he stands 3.4 m north of the track */
export const T_PASS = Ws(107) + 0.12;
export const ELLIS_X = EDGE_X - frontS(T_PASS);
export const ELLIS_Z = 3.4;
/** Ellis running east toward the train (x at t) */
export const ellisX = (t: number) => ELLIS_X - 5.5 * (1 - smooth((t - Ws(101) + 0.1) / (T_PASS - 0.25 - Ws(101) + 0.1)));
/** where the sixth carriage comes to rest on its side (east bank shallows, downstream of the bridge) */
export const REST6: V3 = [35.5, 0, -10];
export const T_FALL6 = Ws(148) - 0.3;         // "fell"

// ---------------- shots ----------------
export type Light = "night" | "day" | "lamp";
export type SetName = "valley" | "crater" | "car" | "bath";
export type Crowd = "hook" | "mountain" | "express" | "calm" | "crater" | "breach" | "run" | "hit" | "arrive" | "ellis" | "brake" | "plunge"
  | "edge" | "rescue" | "tub" | "mast" | "breach07" | "alarm";
/** train pose: none, "cruise" (shot 2: whole train on the plain, front x), "run" (live frontS), "settled", "fall6" */
export type TrainMode = "none" | "cruise" | "run" | "settled" | "fall6" | "rest6";
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; crowd: Crowd; era: Era;
  /** lahar clock at narration time t (-1e9 = the normal stream, 1e9 = the steady flood after the front) */
  lahar: (t: number) => number;
  /** crater breach 0..1 */
  breach?: (t: number) => number;
  train: TrainMode;
  sunAz?: number; sunEl?: number;
};
const Cf = (k: number) => W(k);
const CALM = () => -1e9, FLOOD = () => 1e9, LIVE = (t: number) => t;
/** the hook replays the hit: the front reaches the bridge 0.9 s in, the pier goes at ~2.3 s */
export const hookLahar = (t: number) => T_HIT - 0.9 + t;
const runLahar = (t0: number, z0: number) => (t: number) => T_HIT - z0 / 14 + (t - t0);
const breachAt = (a: number, b: number) => (t: number) => smooth((t - a) / (b - a));
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: Cf(13), light: "night", set: "valley", crowd: "hook", era: "night", lahar: hookLahar, train: "none" },
  { id: 2, a: Cf(13), b: Cf(29), light: "night", set: "valley", crowd: "express", era: "night", lahar: CALM, train: "cruise" },
  { id: 3, a: Cf(29), b: Cf(38), light: "night", set: "valley", crowd: "calm", era: "night", lahar: CALM, train: "none" },
  { id: 4, a: Cf(38), b: Cf(59), light: "night", set: "crater", crowd: "crater", era: "night", lahar: CALM, breach: () => 0, train: "none" },
  { id: 5, a: Cf(59), b: Cf(65), light: "night", set: "crater", crowd: "breach", era: "night", lahar: CALM, breach: breachAt(Ws(63) - 0.15, Ws(64) + 0.9), train: "none" },
  { id: 6, a: Cf(65), b: Cf(80), light: "night", set: "valley", crowd: "run", era: "night", lahar: runLahar(Ws(65), 440), train: "none" },
  { id: 7, a: Cf(80), b: Cf(90), light: "night", set: "valley", crowd: "hit", era: "night", lahar: LIVE, train: "none" },
  { id: 8, a: Cf(90), b: Cf(96), light: "night", set: "valley", crowd: "arrive", era: "night", lahar: FLOOD, train: "run" },
  { id: 9, a: Cf(96), b: Cf(108), light: "night", set: "valley", crowd: "ellis", era: "night", lahar: FLOOD, train: "run" },
  { id: 10, a: Cf(108), b: Cf(113), light: "night", set: "valley", crowd: "brake", era: "night", lahar: FLOOD, train: "run" },
  { id: 11, a: Cf(113), b: Cf(128), light: "night", set: "valley", crowd: "plunge", era: "night", lahar: FLOOD, train: "run" },
  { id: 12, a: Cf(128), b: Cf(150), light: "night", set: "valley", crowd: "edge", era: "night", lahar: FLOOD, train: "settled" },
  { id: 13, a: Cf(150), b: Cf(162), light: "night", set: "valley", crowd: "rescue", era: "night", lahar: FLOOD, train: "rest6" },
  { id: 14, a: Cf(162), b: Cf(190), light: "lamp", set: "bath", crowd: "tub", era: "night", lahar: CALM, train: "none" },
  { id: 15, a: Cf(190), b: Cf(198), light: "day", set: "valley", crowd: "mast", era: "today", lahar: CALM, train: "none", sunAz: 125, sunEl: 40 },
  { id: 16, a: Cf(198), b: Cf(209), light: "day", set: "crater", crowd: "breach07", era: "today", lahar: runLahar(Ws(204), 420), breach: breachAt(Ws(201) - 0.1, Ws(203) + 0.6), train: "none", sunAz: 115, sunEl: 42 },
  { id: 17, a: Cf(209), b: TOTAL, light: "day", set: "valley", crowd: "alarm", era: "today", lahar: (t) => T_HIT + (t - 64.2), train: "none", sunAz: 120, sunEl: 38 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 10, 6: 8, 14: 10, 15: 14 };
export const FLASH_AT = SHOTS[1].a;
// cut points inside shots
export const MTN_AT = W(10) - 2, INT_AT = W(20) - 3, LAHAR16_AT = W(204) - 3, NOERUPT_AT = W(187) - 3, CAR_IN_AT = W(137) - 3, FALL_AT = W(146) - 3;
export const setAt = (id: number, f: number): SetName => {
  if (id === 2 && f >= INT_AT) return "car";
  if (id === 12 && f >= CAR_IN_AT && f < FALL_AT) return "car";
  if (id === 14 && f >= NOERUPT_AT) return "valley";
  if (id === 16 && f >= LAHAR16_AT) return "valley";
  return SHOTS[id - 1].set;
};
export const lightAt = (id: number, f: number): Light => {
  const set = setAt(id, f);
  if (set === "car") return "lamp";
  if (id === 14 && set === "valley") return "night";
  return SHOTS[id - 1].light;
};
export const eraAt = (id: number, _f: number): Era => SHOTS[id - 1].era;
export const trainAt = (id: number, f: number): TrainMode => {
  const t = f / FPS;
  if (id === 12 && f >= FALL_AT) return t >= T_FALL6 ? "fall6" : "settled";
  return SHOTS[id - 1].train;
};

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the train in shot 2 (cruising across the plain toward the bridge) ----------------
export const cruiseX = (t: number) => 980 - 24 * (t - Ws(13));
/** world position of the loco cab floor (for the cab camera / driver) */
export const locoAt = (t: number): V3 => { const s = frontS(t) - 11.8; const [x, z] = pathXZ(s); return [x, pathY(s), z]; };

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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const MTN: V3 = [RUAPEHU.x, RUAPEHU.h * 0.62, RUAPEHU.z];

// ---- framings ----
// 1 hook: the bore hits the bridge (wide from the downstream east bank), then the mountain, quiet
const S1a = (f: number) => dolly([58, 7, -44], [12, -2, 12], pushK(f, 0, 0.0028, 0.006, 30), { fov: 50, roll: 0.02 });
const S1b = (f: number) => dolly([70, 3.0, -30], lerp3([60, 3, -30], MTN, 0.05), pushK(f, MTN_AT, 0.003), { fov: 38 });
// 2 the express on the plain (aerial, tracking the engine), then inside a carriage
const S2a = (f: number) => { const x = cruiseX(T(f)); return { pos: [x + 34, 34, -92] as V3, look: [x + 4, 2, 10] as V3, fov: 46, roll: -0.02 }; };
const S2b = (f: number) => dolly(add(CAR_INT, [1.25, 1.22, -5.35]), add(CAR_INT, [-0.6, 0.9, -5.28]), pushK(f, INT_AT, 0.0015, 0.003, 25), { fov: 80 });
// 3 the river under the bridge: a trickle, a clear sky
const S3a = (f: number) => dolly([4, -4.6, -26], [-3, 3.5, 40], pushK(f, W(29), 0.0026), { fov: 50, roll: 0.03 });
// 4 the summit: the lake behind its wall of ash, then the wall
const S4a = (f: number) => { const k = glide((f - W(38)) / (W(52) - W(38) + 20)); return { pos: lerp3(add(C, [-520, 330, -260]), add(C, [-330, 230, -170]), k), look: add(C, [90, 92, 0]), fov: 44 } as Shot; };
const S4b = (f: number) => dolly(add(C, [290, 106, -62]), add(C, [248, 93, 0]), pushK(f, W(52, 3), 0.003, 0.006, 25), { fov: 44, roll: -0.03 });
// 5 the wall gives way (from down the gully)
const S5a = (f: number) => dolly(add(C, [480, 150, -110]), add(C, [285, 78, 0]), pushK(f, W(59), 0.0026, 0.006, 25), { fov: 46 });
// 6 the lahar racing down the gorge: the camera keeps ahead of the front
const lead = (zf: number, ahead: number, side: number, up: number): V3 => { const z = zf - ahead; return [rc(z) + side, plainY(z) + up, z]; };
const S6a = (f: number) => { const zf = zfAt(SHOTS[5].lahar(T(f))); return { pos: lead(zf, 46, 38, 7), look: [rc(zf + 6), bedY(zf) + 4, zf + 6] as V3, fov: 46, roll: 0.03 }; };
const S6b = (f: number) => { const zf = zfAt(SHOTS[5].lahar(T(f))); return { pos: lead(zf, 20, 16, -6.5), look: [rc(zf + 3) - 2, bedY(zf) + 3.2, zf + 3] as V3, fov: 44, roll: -0.03 }; };
// 7 the hit: the east spans side-on from the downstream bank
const S7a = (f: number) => dolly([36, -3.4, -36], [27, -1.2, 3], pushK(f, W(80), 0.0026, 0.006, 25), { fov: 50 });
// 8 ten minutes later: from the stub of the bridge, the headlight coming down the line
const S8a = (f: number) => dolly([6, 4.6, -4.0], [160, 0.6, 0.5], pushK(f, W(90), 0.003), { fov: 42, roll: 0.02 });
// 9 Ellis at his truck by the drowned road bridge, then running down the tracks into the headlight
const S9a = (f: number) => dolly(add(TRUCK, [19, 1.9, 9]), add(TRUCK, [-10, -1.0, -1]), pushK(f, W(96), 0.003, 0.005, 25), { fov: 46 });
const S9b = (f: number) => { const x = ellisX(T(f)); return { pos: [x + 9.5, 1.75, ELLIS_Z + 3.4] as V3, look: [x - 0.6, 1.25, ELLIS_Z - 0.2] as V3, fov: 42, roll: -0.03 }; };
// 10 the cab (riding with the engine), then "too late": the train runs onto the bridge
const S10a = (f: number) => { const [x, y, z] = locoAt(T(f)); return { pos: [x + 1.2, y + 3.05, z + 4.6] as V3, look: [x - 0.4, y + 2.75, z] as V3, fov: 44, roll: 0.03 }; };
const S10b = (f: number) => dolly([96, 7, 42], [44, 0, 0], pushK(f, W(111, 3), 0.003, 0.006, 25), { fov: 46 });
// 11 the plunge (wide from downstream), then the quiet river
const S11a = (f: number) => dolly([28, 0.8, -24], [45, -0.5, -1], pushK(f, W(113), 0.0024), { fov: 52 });
const S11b = (f: number) => dolly([-18, 7, -86], [36, -1, -6], pushK(f, W(122, 3), 0.0016), { fov: 44 });
// 12 the sixth carriage on the edge (from the water below), inside it, then it goes
const S12a = (f: number) => dolly([33, -0.9, -15], [47, 2.2, -0.5], pushK(f, W(128), 0.0026, 0.005, 25), { fov: 48, roll: 0.05 });
const S12b = (f: number) => dolly(add(CAR_INT, [0.15, 1.5, 2.6]), add(CAR_INT, [-0.25, 1.2, -3.0]), pushK(f, CAR_IN_AT, 0.003, 0.006, 25), { fov: 46, roll: 0.06 + 0.012 * Math.sin(T(f) * 3.1) });
const S12c = (f: number) => dolly([52, 1.4, -26], [39, 0, -6], pushK(f, FALL_AT, 0.003), { fov: 52 });
// 13 on top of the carriage lying in the river: the window, then the passengers out on its side
const S13a = (f: number) => dolly(add(REST6, [-1.6, 3.6, -7.2]), add(REST6, [1.0, 2.4, -1.8]), pushK(f, W(150), 0.003, 0.006, 25), { fov: 44, roll: 0.03 });
const S13b = (f: number) => dolly(add(REST6, [-4, 4.6, -12.5]), add(REST6, [-0.5, 2.3, -1.6]), pushK(f, W(157, 3), 0.0024), { fov: 48 });
// 14 the bathtub, then the mountain (no smoke)
const S14a = (f: number) => dolly(add(BATH, [-1.75, 1.45, 4.25]), add(BATH, [0.45, 0.22, 4.0]), pushK(f, W(162), 0.0022, 0.005, 25), { fov: 46 });
/** the analogy: a bath held by a plug of sand. level 1 full .. 0 empty; erode 0..1 the water wearing through; drain 0..1 */
export const tubState = (t: number) => ({
  erode: smooth((t - Ws(176)) / (Ws(179) - Ws(176) + 0.3)), drain: smooth((t - Ws(180) + 0.1) / 0.5),
  level: 1 - smooth((t - Ws(181)) / (Ws(186) + 0.4 - Ws(181))),
});
const S14b = (f: number) => dolly([70, 3.0, -30], lerp3([60, 3, -30], MTN, 0.05), pushK(f, NOERUPT_AT, 0.0035), { fov: 40, roll: -0.02 });
// 15 the alarm mast going up on the bank (day)
const S15a = (f: number) => dolly(add(MAST, [7.5, 2.2, -8.5]), add(MAST, [0, 3.0, 0]), pushK(f, W(190), 0.003, 0.006, 25), { fov: 44 });
// 16 2007: the dam goes again, the bigger wave in the gorge
const S16a = (f: number) => dolly(add(C, [490, 155, 105]), add(C, [285, 78, 0]), pushK(f, W(198), 0.0026, 0.006, 25), { fov: 48 });
const S16b = (f: number) => { const zf = zfAt(SHOTS[15].lahar(T(f))); return { pos: lead(zf, 48, -38, 8), look: [rc(zf + 6), bedY(zf) + 4, zf + 6] as V3, fov: 46, roll: -0.03 }; };
// 17 the alarm, the train held at the signal, the wave passing under the bridges with everyone safe
const S17a = (f: number) => dolly(add(MAST, [4.2, 5.4, -5.2]), add(MAST, [0, 5.6, 0]), pushK(f, W(209), 0.003, 0.006, 25), { fov: 42 });
const S17b = (f: number) => dolly([SIGNAL_X - 12, 3.2, -12], [SIGNAL_X + 6, 3.6, -1], pushK(f, W(214, 3), 0.003), { fov: 44 });
const S17c = (f: number) => dolly([67, 10, -50], [16, -3.5, 4], pushK(f, W(217, 3), 0.0018, 0.004, 30), { fov: 50 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: MTN_AT, cut: true, s: S1b }],
  2: [{ f: W(13), s: S2a }, { f: INT_AT, cut: true, s: S2b }],
  3: [{ f: W(29), s: S3a }],
  4: [{ f: W(38), s: S4a }, { f: W(52, 3), cut: true, s: S4b }],
  5: [{ f: W(59), s: S5a }],
  6: [{ f: W(65), s: S6a }, { f: W(75, 3), cut: true, s: S6b }],
  7: [{ f: W(80), s: S7a }],
  8: [{ f: W(90), s: S8a }],
  9: [{ f: W(96), s: S9a }, { f: W(101, 3), cut: true, s: S9b }],
  10: [{ f: W(108), s: S10a }, { f: W(111, 3), cut: true, s: S10b }],
  11: [{ f: W(113), s: S11a }, { f: W(122, 3), cut: true, s: S11b }],
  12: [{ f: W(128), s: S12a }, { f: CAR_IN_AT, cut: true, s: S12b }, { f: FALL_AT, cut: true, s: S12c }],
  13: [{ f: W(150), s: S13a }, { f: W(157, 3), cut: true, s: S13b }],
  14: [{ f: W(162), s: S14a }, { f: NOERUPT_AT, cut: true, s: S14b }],
  15: [{ f: W(190), s: S15a }],
  16: [{ f: W(198), s: S16a }, { f: LAHAR16_AT, cut: true, s: S16b }],
  17: [{ f: W(209), s: S17a }, { f: W(214, 3), cut: true, s: S17b }, { f: W(217, 3), cut: true, s: S17c }],
};

// impact shakes: damped cosine, 4-frame period over 10 frames
export const T_IMPACT = T_EDGE + 0.75;
const KICKS: [number, number][] = [
  [0.9 - 0.04, 0.7], [T_RIP - T_HIT + 0.9 - 0.04, 0.6],
  [Ws(63) - 0.05, 0.8], [T_HIT - 0.04, 0.8], [T_RIP - 0.03, 0.6], [T_IMPACT, 1.0], [T_FALL6 + 0.85, 0.8], [Ws(151) + 0.1, 0.35],
  [Ws(201) - 0.05, 0.6], [Ws(212), 0.25],
];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = (t - t0) * FPS;
    if (n >= 0 && n < 10) a += g * Math.cos((Math.PI * 2 * n) / 4) * (1 - n / 10) ** 1.5;
  }
  return a;
};
/** keep outdoor lenses at least 0.9 m above the ground (and the water) under them */
const keepUp = (id: number, f: number, c: Cam): Cam => {
  const set = setAt(id, f);
  if (set === "valley") {
    const g = hAt(c.pos[0], c.pos[2], eraAt(id, f)) + 0.9;
    return c.pos[1] >= g ? c : { ...c, pos: [c.pos[0], g, c.pos[2]] };
  }
  if (set === "crater") {
    const g = craterH(c.pos[0] - C[0], c.pos[2] - C[2], 0) + 3;
    return c.pos[1] >= g ? c : { ...c, pos: [c.pos[0], g, c.pos[2]] };
  }
  return c;
};
export const camAt = (id: number, f: number): Cam => {
  const c = keepUp(id, f, run(CAMS[id], f)), a = kickAt(T(f));
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
  { f: W(13), cInf: 0 },
  { f: INT_AT, cInf: 12 },                   // inside the carriage
  { f: W(29), cInf: 0 },                     // river bed
  { f: W(52, 3), cInf: 0 },
  { f: W(65), cInf: 0 },
  { f: W(75, 3), cInf: 8 },                  // close on the front
  { f: W(80), cInf: 0 },
  { f: W(96), cInf: 10 },                    // the truck
  { f: W(101, 3), cInf: 12 },                // Ellis running
  { f: W(108), cInf: 11 },                   // the cab
  { f: W(111, 3), cInf: 0 },
  { f: W(128), cInf: 9 },                    // the carriage on the edge
  { f: CAR_IN_AT, cInf: 12 },                // inside
  { f: FALL_AT, cInf: 0 },
  { f: W(150), cInf: 11 },                   // the window
  { f: W(157, 3), cInf: 7 },
  { f: W(162), cInf: 14 },                   // the tub
  { f: NOERUPT_AT, cInf: 0 },
  { f: W(190), cInf: 10 },                   // the mast
  { f: W(198), cInf: 0 },
  { f: W(209), cInf: 10 },                   // the beacon
  { f: W(214, 3), cInf: 9 },                 // the signal
  { f: W(217, 3), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
void RAIL_Y; void RIM_R; void S_SETTLED; void carOffset; void SIXTH; void T_EDGE;
/** every camera setup start (shot id, frame): shadow frames are locked per setup */
export const SETUPS: [number, number][] = Object.entries(CAMS).flatMap(([id, ks]) => ks.map((k) => [Number(id), k.f] as [number, number]));
