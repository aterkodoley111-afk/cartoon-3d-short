// Tangiwai on Christmas Eve 1953 (and on 18 March 2007) as height functions (metres, y up). The North Island Main
// Trunk runs along x at z = 0 (Waiouru and the oncoming express at +x, Ohakune and Auckland at -x); the Whangaehu
// River runs along z, downstream toward -z, with Mount Ruapehu far upstream (+z). The rail bridge: concrete piers every
// 15 m (x = -30..30), abutments at x = +-45, deck (rail level) at RAIL_Y. The lahar is a bore running down the channel:
// its front zf(lt) is driven by a per-shot "lahar clock" lt (narration seconds; the front passes z = 0 at T_HIT).
// The crater set (Ruapehu's summit, Crater Lake behind the 1945 tephra dam) lives far away at CRATER.
// Shared by world.ts (meshes), story.ts (cameras, train), cast.ts (feet on the ground).
import { WORDS } from "./words";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const sstep = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const Ws = (i: number) => WORDS[i][1];
/** integer-ish hash for value noise (sin hash is fine on a lattice of integers) */
const hash2 = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
const vnoise = (x: number, z: number) => {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, z: number) => vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 7, z * 2.1 + 3) * 0.3 + vnoise(x * 4.3 + 1, z * 4.3 + 9) * 0.15;

// ---------------- the valley ----------------
export const RAIL_Y = 1.2;                 // top of rail on the bridge and the embankment
export const ABUT = 45;                    // abutments at x = +-45
export const PIERS = [-30, -15, 0, 15, 30];
export const LOST_PIER = 30;               // the pier the lahar takes
export const EDGE_X = 45;                  // where the deck ends after the two eastern spans drop (the east abutment)
export const ROAD_Z = -140;                // State Highway 49 and its low road bridge, downstream
export const BED_HW = 27, BANK_HW = 40;
/** river centre line: straight through the bridges, meandering up- and downstream */
export const rc = (z: number) => 26 * Math.sin(z / 210) * sstep(170, 320, Math.abs(z));
/** the plain rises upstream into a shallow gorge (shot 6) */
export const plainY = (z: number) => 11 * sstep(170, 520, z);
export const bedY = (z: number) => -6.5 + 0.45 * plainY(z);
/** natural ground (no embankment / road cutting) */
const ground = (x: number, z: number) => {
  const d = Math.abs(x - rc(z)), P = plainY(z), B = bedY(z);
  const bank = sstep(BED_HW, BANK_HW, d + 2.5 * (fbm(z / 30, x / 30) - 0.5));
  let h = B + (P - B) * bank;
  // a shallow groove the normal stream runs in, and gravel bumps on the bed
  h -= 0.45 * (1 - sstep(3.5, 8, d)) * (1 - bank);
  h += 0.35 * (fbm(x / 6, z / 6) - 0.5) * (1 - bank);
  // tussock plain: gentle undulation, low hills far off
  const far = sstep(BANK_HW, BANK_HW + 30, d);
  h += far * (1.0 * (fbm(x / 40, z / 40) - 0.5) + 60 * sstep(700, 1500, Math.hypot(x, z * 0.8)) * fbm(x / 300, z / 300) * sstep(25, 160, Math.abs(z)));
  return h;
};
/** the road deck at x (1953 low bridge at -1.8 m, the 2007 raised one at +0.3) */
export const roadY = (x: number, era: Era) => (era === "today" ? 0.3 : -1.8 + 1.8 * sstep(40, 75, Math.abs(x)));
export type Era = "night" | "today";
/** ground height including the rail embankment and the road cutting */
export const hAt = (x: number, z: number, era: Era = "night") => {
  let h = ground(x, z);
  const ax = Math.abs(x);
  // rail embankment (outside the bridge): formation 0.45 m under the rail, 3 m crest, 1:1.5 sides
  if (ax > ABUT - 1) {
    const emb = RAIL_Y - 0.45 - Math.max(0, Math.abs(z) - 2.6) / 1.5;
    h = Math.max(h, emb);
  }
  // road: cut down to the old low bridge (1953) or carried on a raised fill (2007)
  if (Math.abs(z - ROAD_Z) < 14 && ax > 40) {
    const ry = roadY(x, era) - 0.05, side = Math.max(0, Math.abs(z - ROAD_Z) - 4);
    const target = ry + (era === "today" ? -side / 1.5 : side / 3.5);
    h = era === "today" ? Math.max(h, Math.min(target, ry)) : Math.min(h, Math.max(target, ry));
    if (Math.abs(z - ROAD_Z) <= 4) h = ry;
  }
  return h;
};

// ---------------- the lahar ----------------
export const T_HIT = Ws(81);                // "hit": the front reaches the bridge
export const T_RIP = Ws(86) + 0.05;          // "ripped": the pier goes
export const LAHAR_V = 14;                  // m/s, bore speed on screen
export const FLOOD_D = 4.9;                 // flood depth over the bed behind the front
/** front position (z) at lahar clock lt */
export const zfAt = (lt: number) => LAHAR_V * (T_HIT - lt);
/** water surface at (x, z) for lahar clock lt (Infinity = long after: the steady flood). Below the ground = dry. */
export const waterY = (x: number, z: number, lt: number, era: Era = "night", t = 0) => {
  const B = bedY(z), stream = B - 0.32;
  if (lt < -1e8) return stream + 0.03 * Math.sin(z * 1.7 + x * 0.6 + t * 3.1) + 0.02 * Math.sin(x * 2.3 - t * 2.2);
  const s = lt > 1e8 ? 1e9 : z - zfAt(lt);        // > 0: behind (upstream of) the front
  if (s < 0) return stream;
  const rise = Math.sqrt(sstep(0, 7, s)), crest = 1.6 * Math.exp(-(((s - 6) / 6) ** 2));
  // turbulent surface carried downstream at ~6 m/s: boils (noise), cross-running waves, standing waves behind the piers
  const zz = z + t * 6.5;
  let chop = 0.5 * (fbm((x + 3) / 5, zz / 5) - 0.5) + 0.22 * (fbm(x / 1.8 + 11, zz / 1.8) - 0.5) + 0.12 * Math.sin(zz * 0.8 + x * 0.35) * Math.sin(x * 0.5 - t * 1.3);
  if (Math.abs(z) < 30) for (const p of PIERS) {
    if (p === LOST_PIER && lt > T_RIP) continue;
    const dx = x - p;
    chop += 0.7 * Math.exp(-(dx * dx) / 6 - ((z - 3.5) ** 2) / 4) - 0.35 * Math.exp(-(dx * dx) / 3 - ((z + 4) ** 2) / 10)
      + 0.25 * Math.exp(-(dx * dx) / 12) * Math.sin((z + t * 6.5) * 1.6) * Math.exp(-Math.max(0, -z - 3) / 12) * (z < 0 ? 1 : 0);
  }
  const depth = era === "today" ? FLOOD_D * 0.85 : FLOOD_D;
  return stream + (depth + chop) * rise + crest * (lt > 1e8 ? 0 : 1);
};

// ---------------- the bridge falling ----------------
/** 0..1 the lost pier toppling downstream; spans 0..1 the two eastern spans dropping (hinged at x = 15 and x = 45) */
export const pierFall = (lt: number) => sstep(T_RIP, T_RIP + 0.9, lt);
export const spanDrop = (lt: number) => sstep(T_RIP + 0.35, T_RIP + 1.25, lt);

// ---------------- the train: path into the river ----------------
// Path parameter s: 0 at the edge (x = EDGE_X), negative back along the track (x = EDGE_X - s), positive into the gap:
// a 9 m-radius dive, then along the river bed, turning downstream (-z) with radius 15.
export const TRAIN_W = 2.6;
/** vehicle lengths (coupler to coupler): KA engine, tender, eleven 17.4 m carriages; 0.6 m gaps */
export const CARS: number[] = [13.6, 8.4, ...Array(11).fill(17.4)];
export const GAP = 0.6;
export const carOffset = (i: number) => { let o = 0; for (let k = 0; k < i; k++) o += CARS[k] + GAP; return o; };
export const SIXTH = 7;                      // index of the sixth carriage (engine 0, tender 1, carriages 2..12)
const TURN_AT = 13, TURN_R = 15;
/** xz of the path at s */
export const pathXZ = (s: number): [number, number] => {
  if (s <= TURN_AT) return [EDGE_X - s, 0];
  const a = Math.min((s - TURN_AT) / TURN_R, Math.PI / 2), cx = EDGE_X - TURN_AT, cz = -TURN_R;
  const x = cx - TURN_R * Math.sin(a), z = cz + TURN_R * Math.cos(a);
  if (s - TURN_AT <= (TURN_R * Math.PI) / 2) return [x, z];
  return [cx - TURN_R, cz - (s - TURN_AT - (TURN_R * Math.PI) / 2)];
};
/** rail height of the path: the deck, then the dive, never below the river bed (sunk 0.4 m into the gravel) */
export const pathY = (s: number) => {
  if (s <= 0) return RAIL_Y;
  const R = 9, a = Math.min(s / R, 1.1);
  const dive = RAIL_Y - R * (1 - Math.cos(a)) - Math.max(0, s - R * 1.1) * 0.95;
  const [x, z] = pathXZ(s);
  return Math.max(dive, hAt(x, z) - 0.4);
};
// train clock: cruising 24 m/s, braking from T_BRAKE at 2 m/s^2, the front reaches the edge at T_EDGE and keeps going
export const T_EDGE = Ws(118) - 0.3;        // just before "plunged"
export const T_BRAKE = Ws(109) - 0.15;      // "driver"
const V0 = 24, DEC = 2;
/** front path parameter s(t) (negative = still on the track east of the edge) */
export const frontS = (t: number) => {
  const vAt = (u: number) => (u < T_BRAKE ? V0 : Math.max(8, V0 - DEC * (u - T_BRAKE)));
  // integrate v from t to T_EDGE (analytic piecewise)
  const dist = (a: number, b: number) => { // integral of v over [a, b], a <= b
    let d = 0; const N = 40, h = (b - a) / N; for (let i = 0; i < N; i++) d += vAt(a + (i + 0.5) * h) * h; return d;
  };
  return t <= T_EDGE ? -dist(t, T_EDGE) : dist(T_EDGE, t);
};
/** where the front is (s) once everything has settled: the sixth carriage's front 1.1 m over the edge */
export const S_SETTLED = carOffset(SIXTH) + 1.1;

// ---------------- Mount Ruapehu (backdrop) and its crater (the summit set) ----------------
export const RUAPEHU = { x: -1100, z: 5600, h: 1250, r: 3600 };
/** the summit set, far from the valley: crater lake behind the ash dam, the outlet gully runs toward +u (east) */
export const CRATER = { x: 30000, z: 0 };
export const LAKE_Y = 90, RIM_R = 250, LAKE_R = 212;
const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
/** breach 0..1 (b) carves the notch through the dam and lowers the lake a little */
export const lakeLevel = (b: number) => LAKE_Y - 2.5 * b;
export const craterH = (u: number, v: number, b: number) => {
  const r = Math.hypot(u, v), th = Math.atan2(v, u), dA = Math.abs(angDiff(th, 0));
  const dam = 1 - sstep(0.3, 0.7, dA);                 // the ash dam sector (toward +u)
  const rimH = 128 - 32 * dam + 6 * (fbm(th * 3 + 5, 1) - 0.5) * (1 - dam);
  let h: number;
  if (r < LAKE_R) h = LAKE_Y - 30 * (1 - (r / LAKE_R) ** 2);          // the lake floor (under water)
  else if (r < RIM_R) h = LAKE_Y + (rimH - LAKE_Y) * sstep(LAKE_R - 6, RIM_R, r) - 4 * (1 - sstep(LAKE_R, LAKE_R + 14, r));
  else h = rimH - (r - RIM_R) * (0.5 + 0.12 * sstep(400, 900, r)) - 18 * sstep(RIM_R, RIM_R + 60, r) * (1 - dam) * 0;
  // the outlet gully down the outer slope (toward +u), and the notch through the dam
  const lat = Math.abs(v + 0.08 * Math.max(0, u - RIM_R)), gw = 22 + 0.05 * Math.max(0, u - RIM_R);
  if (u > RIM_R - 10) h -= 9 * (1 - sstep(gw * 0.4, gw, lat)) * sstep(RIM_R - 10, RIM_R + 40, u);
  const nw = 10 + 16 * b;
  if (b > 0 && u > LAKE_R - 5 && lat < nw) {
    const floor = lakeLevel(b) - 1 - 6 * b - Math.max(0, u - RIM_R) * 0.5;
    h = Math.min(h, floor + (h - floor) * sstep(nw * 0.35, nw, lat) * (1 - b * 0.6));
  }
  h += 2.2 * (fbm(u / 18, v / 18) - 0.5) * sstep(LAKE_R, LAKE_R + 10, r);
  return h;
};
/** is (u, v) on the ash dam (grey) rather than the snowy rim? */
export const damK = (u: number, v: number) => { const th = Math.atan2(v, u); return (1 - sstep(0.55, 0.95, Math.abs(angDiff(th, 0)))) * sstep(LAKE_R - 4, LAKE_R + 6, Math.hypot(u, v)) * (1 - sstep(RIM_R + 160, RIM_R + 260, Math.hypot(u, v))); };
