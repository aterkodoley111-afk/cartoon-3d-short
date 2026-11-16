// Timeline of "The 250-Metre Monster Hiding Under London" (Whitechapel fatberg, September 2017): shots timed to the
// narration (words.ts, generated from fatberg-short/voice/words.json), the CCTV crawler, the flood behind the plug,
// the eight workers, the inserts (soap, sink, bath, wipes, the ban, the museum, biodiesel) and the golden ending bus.
// Camera grammar of the bridge short: continuous slow push-ins, smootherstep glides, hard cuts on big jumps, 7-frame
// flip kicks on impacts, no hand-held float.
import { WORDS, VOICE_DUR } from "./words";
export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_DUR * FPS);
export const D0 = 0; // street level
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** start frame of word i (narration), minus the reaction lead */
export const W = (i: number, lead = 0) => Math.round(WORDS[i][1] * FPS) - lead;
export const Ws = (i: number) => WORDS[i][1];

// ---------------- places ----------------
// Whitechapel Road runs along x; the road is z -6..6, pavements to +-10, terraces beyond. The Victorian sewer runs
// under the middle of the road (z = 0), its axis 3.5 m down. The fatberg fills it from FACE_X to END_X (250 m).
export const SEW_Y = -3.5, SEW_R = 1.0, FLOOR_Y = SEW_Y - 0.72;
export const FACE_X = -125, END_X = 125;
export const MH_CAM: V3 = [-160, 0, 0];    // where the CCTV crawler goes in
export const MH_FLOOD: V3 = [-131, 0, 0];  // the manhole over the backed-up stretch
export const LANE_OUT = -3, LANE_IN = 3;   // left-hand traffic: +x traffic in z = -3, -x traffic in z = +3
export const KITCHEN: V3 = [300, 0, 0], BATH: V3 = [340, 0, 0], OFFICE: V3 = [380, 0, 0], MUSEUM: V3 = [420, 0, 0], LAB: V3 = [460, 0, 0];
export const TABLE_H = 0.9; // insert tables
export const CASE_AT: V3 = [MUSEUM[0], 0, MUSEUM[2] + 2.8];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type SetName = "street" | "cut" | "sewer" | "kitchen" | "bath" | "office" | "museum" | "lab";
export type Crowd = "hook" | "setting" | "crawl" | "length" | "flood" | "crew" | "concrete" | "soap" | "bath" | "ban" | "museum" | "fuel" | "bus" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: SetName; crowd: Crowd; sunAz?: number; sunEl?: number };
const C = (k: number) => W(k);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: C(13), light: "day", set: "street", crowd: "hook" },
  { id: 2, a: C(13), b: C(24), light: "day", set: "street", crowd: "setting" },
  { id: 3, a: C(24), b: C(40), light: "day", set: "sewer", crowd: "crawl", sunAz: 165, sunEl: 25 },
  { id: 4, a: C(40), b: C(61), light: "day", set: "cut", crowd: "length", sunAz: 150, sunEl: 40 },
  { id: 5, a: C(61), b: C(74), light: "day", set: "cut", crowd: "flood", sunAz: 150, sunEl: 40 },
  { id: 6, a: C(74), b: C(85), light: "day", set: "street", crowd: "crew" },
  { id: 7, a: C(85), b: C(98), light: "day", set: "cut", crowd: "concrete", sunAz: 150, sunEl: 40 },
  { id: 8, a: C(98), b: C(136), light: "day", set: "kitchen", crowd: "soap", sunAz: 160, sunEl: 55 },
  { id: 9, a: C(136), b: C(145), light: "day", set: "office", crowd: "ban", sunAz: 150, sunEl: 60 },
  { id: 10, a: C(145), b: C(164), light: "day", set: "museum", crowd: "museum", sunAz: 160, sunEl: 60 },
  { id: 11, a: C(164), b: C(170), light: "day", set: "lab", crowd: "fuel", sunAz: 160, sunEl: 60 },
  { id: 12, a: C(170), b: TOTAL, light: "golden", set: "street", crowd: "bus", sunAz: 4, sunEl: 12 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 8: 8, 9: 8, 10: 8, 11: 8, 12: 14 };
export const FLASH_AT = SHOTS[1].a;
// cut points that change set inside a shot
export const SEWER1_AT = W(7, 3);      // hook: street -> under the street
export const SEWER_IN_AT = W(24);      // (shot 3 is all sewer)
export const LEN_BUS_AT = W(55, 3);    // shot 4: cutaway -> the eleven buses on the street
export const FLOOD_ST_AT = W(66, 3);   // shot 5: cutaway -> the manhole on the street
export const JET_AT = W(79, 3);        // shot 6: street -> the jet hoses (cutaway)
export const WEEKS_AT = W(93, 3);      // shot 7: cutaway -> the street, weeks later
export const SINK_AT = W(107, 3), TUB_AT = W(117, 3), WIPES_AT = W(126, 3);
export const FLIES_AT = W(156, 3);
export const setAt = (id: number, f: number): SetName => {
  if (id === 1) return f >= SEWER1_AT ? "sewer" : "street";
  if (id === 4) return f >= LEN_BUS_AT ? "street" : "cut";
  if (id === 5) return f >= FLOOD_ST_AT ? "street" : "cut";
  if (id === 6) return f >= JET_AT ? "cut" : "street";
  if (id === 7) return f >= WEEKS_AT ? "street" : "cut";
  if (id === 8) return f >= TUB_AT ? "bath" : "kitchen";
  return SHOTS[id - 1].set;
};

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- moving things ----------------
/** the CCTV crawler's x in the sewer (three setups, cut between, so it jumps ahead) */
export const crawlX = (t: number) => {
  if (t < Ws(27) - 0.1) return -157 + 0.9 * (t - Ws(24));
  if (t < Ws(30) - 0.1) return -146 + 0.9 * (t - Ws(27));
  return Math.min(FACE_X - 1.05, -131.5 + 1.6 * (t - Ws(30)));
};
/** the crawler lowered into the manhole on its cable (shot 2b), y of its body */
export const crawlDrop = (t: number) => 0.6 - 1.95 * smooth((t - Ws(20)) / (Ws(23) + 0.4 - Ws(20)));
/** water level behind the plug (shot 5): floor -> just under the crown */
export const floodY = (t: number) => FLOOR_Y + 0.02 + (SEW_Y + 0.82 - FLOOR_Y) * smooth((t - Ws(61) + 0.2) / (Ws(65) + 0.6 - Ws(61)));
/** the eleven buses pop in near -> far on "eleven double-decker buses" */
export const BUS_L = 11.2;
export const busIn = (i: number) => Ws(58) - 0.1 + i * ((Ws(60) + 0.25 - Ws(58)) / 10);
/** the eight workers walk toward the lens */
export const crewX = (t: number) => -126.5 - 1.2 * (t - Ws(74));
/** tankers passing in the "nine weeks" time-lapse (x of the front) */
export const tankerX = (t: number, k: number) => -131.5 + 7 * (t - Ws(93)) - k * 400;
/** the ending bus (golden): -x traffic, toward the camera */
export const busEndX = (t: number) => 2 - 9.5 * (t - Ws(170));
/** the shovel strike: 0 raised .. 1 struck (on "concrete") */
export const STRIKE_T = Ws(92) + 0.02;
export const strikeAt = (t: number) => (t < STRIKE_T - 0.13 ? 0 : t < STRIKE_T ? smooth((t - STRIKE_T + 0.13) / 0.13) : 1 - 0.5 * smooth((t - STRIKE_T - 0.06) / 0.3));

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
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---- framings ----
// 1 hook: Whitechapel Road, a bus going by; then down below: the plug's face in the dark pipe
const S1a = (f: number) => dolly([-52, 1.5, 7.6], [-14, 3.2, -2.5], pushK(f, 0, 0.0026), { fov: 44, roll: 0.03 });
const S1b = (f: number) => dolly([FACE_X - 4.6, SEW_Y + 0.15, 0.3], [FACE_X, SEW_Y - 0.1, 0], pushK(f, SEWER1_AT, 0.004, 0.008, 30), { fov: 56 });
// 2 setting: high over Whitechapel Road, then the crawler going down the manhole
const S2a = (f: number) => zoom([-238, 40, 50], [-150, 2, -4], 42, pushK(f, W(13), 0.0018));
const S2b = (f: number) => dolly(add(MH_CAM, [3.3, 1.55, 4.5]), add(MH_CAM, [-0.1, 0.45, -0.2]), pushK(f, W(16, 3), 0.0024, 0.005, 30), { fov: 42, roll: -0.03 });
// 3 the crawler's ride: behind it, low, the lamp lighting the walls
const behind = (t: number, f: number, f0: number): Shot => { const x = crawlX(t); return { ...dolly([x - 1.75, SEW_Y + 0.32, 0.2], [x + 2.6, SEW_Y - 0.28, 0], pushK(f, f0, 0.0015)), fov: 52 }; };
const S3a = (f: number) => behind(T(f), f, W(24));
const S3b = (f: number) => ({ ...behind(T(f), f, W(27, 3)), roll: 0.04 });
const S3c = (f: number) => behind(T(f), f, W(30, 3));
// 4 the length: the cutaway receding along the pipe; closer on the mass; the eleven buses on the street above
const S4a = (f: number) => dolly([FACE_X - 6.5, -1.6, 6.2], [FACE_X + 30, -3.4, -2.2], pushK(f, W(40), 0.0022), { fov: 46 });
const S4b = (f: number) => dolly([FACE_X + 9, -1.3, 9.2], [FACE_X + 9, -1.7, 0], pushK(f, W(48, 3), 0.0024, 0.006, 25), { fov: 42 });
const S4c = (f: number) => dolly([FACE_X - 24, 11, 4.5], [FACE_X + 40, 1.0, -3], pushK(f, LEN_BUS_AT, 0.002), { fov: 42 });
// 5 blocked: the water backing up behind the plug (cutaway); then the manhole on the street
const S5a = (f: number) => dolly([FACE_X - 1.3, -2.0, 9.8], [FACE_X - 1.3, -1.9, 0], pushK(f, W(61), 0.0026, 0.005, 30), { fov: 42 });
const S5b = (f: number) => dolly(add(MH_FLOOD, [2.4, 0.75, 3.3]), add(MH_FLOOD, [-0.3, 0.55, -0.8]), pushK(f, FLOOD_ST_AT, 0.0026, 0.006, 25), { fov: 42, roll: 0.03 });
// 6 the crew walking up the road from the tanker; then the jet hose at the face (cutaway)
const S6a = (f: number) => dolly([-135.5, 1.55, 1.6], [-122, 1.4, -0.5], pushK(f, W(74), 0.0022), { fov: 40 });
const S6b = (f: number) => dolly([FACE_X - 1.75, -3.1, 4.7], [FACE_X - 1.5, -3.45, 0], pushK(f, JET_AT, 0.0024, 0.005, 25), { fov: 42 });
// 7 the clang (cutaway CU), then the street weeks later: a worn-out flusher and tankers going by
const S7a = (f: number) => dolly([FACE_X - 1.35, -3.25, 3.9], [FACE_X - 1.2, -3.35, 0], pushK(f, W(85), 0.0024, 0.007, 30), { fov: 40, roll: -0.03 });
const S7b = (f: number) => dolly(add(MH_FLOOD, [1.9, 0.75, 4.6]), add(MH_FLOOD, [-0.4, 0.75, -0.8]), pushK(f, WEEKS_AT, 0.0024), { fov: 42 });
// 8 the explanation inserts: soap, the sink, the bath ring, the wipes
const INS = (c: V3, dz: number, y: number, h0: number, f: number, f0: number, rate: number, punch = 0, dx = 0) =>
  dolly(add(c, [0.04 + dx, y + 0.05, dz - 1.32]), add(c, [dx, y, dz]), pushK(f, f0, rate, punch, 25), { fov: 38 + h0 });
export const CARD_Z = 3.0, SOAP_DX = -1.2;
const S8a = (f: number) => INS(KITCHEN, CARD_Z, TABLE_H + 0.2, 0, f, W(98), 0.0025, 0.006, SOAP_DX);
const S8b = (f: number) => INS(KITCHEN, CARD_Z, TABLE_H + 0.2, 0, f, SINK_AT, 0.0025, 0.005, 0.9);
export const TUB_AT3: V3 = [BATH[0] - 0.8, 0, BATH[2] + 3.4];
const S8c = (f: number) => dolly(add(TUB_AT3, [0.25, 1.75, -1.75]), add(TUB_AT3, [0, 0.35, 0.15]), pushK(f, TUB_AT, 0.0028, 0.006, 25), { fov: 42, roll: 0.03 });
const S8d = (f: number) => INS(BATH, CARD_Z, TABLE_H + 0.2, 0, f, WIPES_AT, 0.0025, 0, 1.4);
// 9 the ban (desk insert)
const S9a = (f: number) => dolly(add(OFFICE, [0.02, TABLE_H + 1.5, CARD_Z - 1.0]), add(OFFICE, [0, TABLE_H + 0.05, CARD_Z + 0.03]), pushK(f, W(136), 0.0028, 0.006, 25), { fov: 38 });
// 10 the museum: the gallery, then the case close up
const S10a = (f: number) => dolly(add(CASE_AT, [0.35, 1.55, -4.2]), add(CASE_AT, [0, 1.05, 0]), pushK(f, W(145), 0.0022), { fov: 42 });
const S10b = (f: number) => dolly(add(CASE_AT, [0.06, 1.33, -1.25]), add(CASE_AT, [0, 1.2, 0]), pushK(f, FLIES_AT, 0.003, 0.006, 25), { fov: 38 });
// 11 biodiesel (bench insert)
const S11a = (f: number) => INS(LAB, CARD_Z, TABLE_H + 0.2, 0, f, W(164), 0.003, 0.006);
// 12 golden: the bus coming down Whitechapel Road, then passing the lens
const S12a = (f: number) => dolly([-62, 1.45, 8.2], [-22, 2.8, 0.5], pushK(f, W(170), 0.0024), { fov: 44, roll: 0.03 });
const S12b = (f: number) => dolly([-61, 0.95, 6.1], [-36, 2.5, 2.6], pushK(f, W(178, 3), 0.0026, 0.005, 30), { fov: 40, roll: -0.03 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: SEWER1_AT, cut: true, s: S1b }],
  2: [{ f: W(13), s: S2a }, { f: W(16, 3), cut: true, s: S2b }],
  3: [{ f: W(24), s: S3a }, { f: W(27, 3), cut: true, s: S3b }, { f: W(30, 3), cut: true, s: S3c }],
  4: [{ f: W(40), s: S4a }, { f: W(48, 3), cut: true, s: S4b }, { f: LEN_BUS_AT, cut: true, s: S4c }],
  5: [{ f: W(61), s: S5a }, { f: FLOOD_ST_AT, cut: true, s: S5b }],
  6: [{ f: W(74), s: S6a }, { f: JET_AT, cut: true, s: S6b }],
  7: [{ f: W(85), s: S7a }, { f: WEEKS_AT, cut: true, s: S7b }],
  8: [{ f: W(98), s: S8a }, { f: SINK_AT, cut: true, s: S8b }, { f: TUB_AT, cut: true, s: S8c }, { f: WIPES_AT, cut: true, s: S8d }],
  9: [{ f: W(136), s: S9a }],
  10: [{ f: W(145), s: S10a }, { f: FLIES_AT, cut: true, s: S10b }],
  11: [{ f: W(164), s: S11a }],
  12: [{ f: W(170), s: S12a }, { f: W(178, 3), cut: true, s: S12b }],
};

// impact kicks: the plug looming, "tonnes", the manhole lid, the shovel's clang, the soap pop, the seal, the fly
export const LID_T = Ws(71) - 0.04, SEAL_T = Ws(144) - 0.1, SOAP_T = Ws(106) - 0.05;
const KICKS: [number, number][] = [[Ws(54) - 0.04, 0.6], [LID_T, 0.5], [STRIKE_T, 0.8], [SOAP_T, 0.3], [SEAL_T, 0.5], [Ws(36) - 0.03, 0.3]];
/** impact shake: a damped oscillation with a 4-frame period over 10 frames (a sign flip every frame strobes) */
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const x = (t - t0) * FPS;
    if (x >= 0 && x < 10) a += g * Math.cos((x * Math.PI) / 2) * (1 - x / 10) ** 1.5;
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
/** every camera setup start (for checks): [shot, first frame] */
export const SETUPS: [number, number][] = Object.entries(CAMS).flatMap(([id, ks]) => ks.map((k) => [Number(id), Math.max(k.f, SHOTS[Number(id) - 1].a)] as [number, number]));

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                       // hook street
  { f: SEWER1_AT, cInf: 10 },              // the face in the dark
  { f: W(13), cInf: 0 },                   // aerial
  { f: W(16, 3), cInf: 10 },               // manhole
  { f: W(24), cInf: 9, focus: (f) => [crawlX(f / FPS), SEW_Y - 0.2, 0] }, // crawler ride
  { f: W(40), cInf: 0 },                   // cutaway receding
  { f: W(48, 3), cInf: 0 },
  { f: LEN_BUS_AT, cInf: 0 },              // buses
  { f: W(61), cInf: 0 },                   // flood cutaway
  { f: FLOOD_ST_AT, cInf: 12 },            // manhole lid
  { f: W(74), cInf: 8 },                   // crew walking
  { f: JET_AT, cInf: 0 },                  // jet cutaway
  { f: W(85), cInf: 10 },                  // clang CU
  { f: WEEKS_AT, cInf: 11 },               // worn-out flusher
  { f: W(98), cInf: 14 },                  // inserts
  { f: TUB_AT, cInf: 12 },
  { f: WIPES_AT, cInf: 14 },
  { f: W(136), cInf: 14 },
  { f: W(145), cInf: 10 },                 // museum
  { f: FLIES_AT, cInf: 13 },
  { f: W(164), cInf: 14 },
  { f: W(170), cInf: 0 },                  // golden street
  { f: W(178, 3), cInf: 7 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
