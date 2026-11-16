// Timeline of "The Mountain That Suddenly Disappeared" (the Hope Slide, Nicolum Valley BC, 9 January 1965): shots
// keyed to the narration (words.ts), the slide clock (terrain.ts: the mass runs on narration time; the hook replays
// it ~2x fast), the cars, tanker, hay truck and bus, and the camera grammar of the bridge short: continuous slow
// push-ins, smootherstep glides, hard cuts on big jumps, 7-frame flip kicks on impacts, no hand-held float.
import { WORDS, VOICE_DUR } from "./words";
import { RELEASE, PEAK_T, hAt, Era, roadNewY, ROAD_NEW_Z } from "./terrain";
export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_DUR * FPS);
export const D0 = 0; // valley floor / old road level
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** start frame of word i (narration), minus the reaction lead */
export const W = (i: number, lead = 0) => Math.round(WORDS[i][1] * FPS) - lead;
export const Ws = (i: number) => WORDS[i][1];

// ---------------- places ----------------
export const LANE_E = 1.9, LANE_W = -1.9;          // eastbound (toward Princeton, +x) / westbound lanes of the old road
export const MOUND: V3 = [83.2, 0, 0];             // the small snow avalanche across the road
export const CONV_X = 77.6;                        // front bumper of the stuck yellow convertible (eastbound)
export const TANK_X = 70.3, HAY_X = 57.6;          // fronts of the oil tanker and the hay truck once stopped
export const BUS_X = 206.0;                        // the Greyhound's front bumper (westbound), just short of the toe
export const TOWN: V3 = [-900, 0, 0];              // Hope, down the valley
export const OFFICIAL_AT: V3 = [212, 0, 5.4];
export const ROOM: V3 = [2400, 0, 0];              // the seismograph station / lab
export const BATH: V3 = [2440, 0, 0];
export const KITCHEN: V3 = [2480, 0, 0];
export const CRACK_AT: V3 = [12, 236, -262];       // crack card on the south face (camera-facing)

// ---------------- vehicles ----------------
/** front-bumper x of a vehicle arriving from the west and braking to a stop at x1 between t0 and t1 */
const arrive = (x1: number, t0: number, t1: number, run = 40) => (t: number) => { const u = clamp01((t - t0) / (t1 - t0)); return x1 - run * (1 - u) ** 2; };
export const tankX = arrive(TANK_X, Ws(48) - 0.4, Ws(51) + 0.35, 38);
export const hayX = arrive(HAY_X, Ws(54) - 0.3, Ws(57) + 0.15, 34);
/** today: the red car on the new road (westbound) */
export const carNowX = (t: number) => (t < Ws(189) - 0.1 ? 128 - 11.5 * (t - Ws(185)) : 150 + 13 * (t - Ws(189)));
export const CAR_NOW_Z = ROAD_NEW_Z - 1.9;
/** in the old-road shot the car is eastbound (other lane), crossing high above */
export const carNowZ = (t: number) => (t < Ws(189) - 0.1 ? ROAD_NEW_Z - 1.9 : ROAD_NEW_Z + 1.9);

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type SetName = "valley" | "build" | "today" | "room" | "bath" | "kitchen";
export type Crowd = "hook" | "dawn" | "town" | "avalanche" | "conv" | "tanker" | "hay" | "watch" | "letgo" | "collapse" | "forest" | "lake"
  | "climb" | "tub" | "bus" | "quiet" | "seismo" | "official" | "scientist" | "cracks" | "cookie" | "build" | "now" | "oldroad" | "end";
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; crowd: Crowd;
  /** slide clock (terrain.ts narration seconds) at narration time t */
  slide?: (t: number) => number; era?: Era;
  sunAz?: number; sunEl?: number;
};
const C = (k: number) => W(k);
const HOOK_SPAN = Ws(15) + 0.25;
/** the hook replays the slide ~2x fast: from the break to the mass high on Mount Coulter */
export const hookSlide = (t: number) => RELEASE + 0.15 + (t / HOOK_SPAN) * (PEAK_T + 0.15 - RELEASE);
const PRE = () => 0, AFTER = () => 1e9, LIVE = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: C(16), light: "golden", set: "valley", crowd: "hook", era: "slide", slide: hookSlide },
  { id: 2, a: C(16), b: C(30), light: "golden", set: "valley", crowd: "dawn", era: "pre", slide: PRE },
  { id: 3, a: C(30), b: C(41), light: "golden", set: "valley", crowd: "avalanche", era: "pre", slide: PRE },
  { id: 4, a: C(41), b: C(58), light: "golden", set: "valley", crowd: "conv", era: "pre", slide: PRE },
  { id: 5, a: C(58), b: C(67), light: "golden", set: "valley", crowd: "watch", era: "slide", slide: LIVE },
  { id: 6, a: C(67), b: C(75), light: "golden", set: "valley", crowd: "collapse", era: "slide", slide: LIVE },
  { id: 7, a: C(75), b: C(84), light: "golden", set: "valley", crowd: "forest", era: "slide", slide: LIVE },
  { id: 8, a: C(84), b: C(103), light: "golden", set: "valley", crowd: "climb", era: "slide", slide: LIVE },
  { id: 9, a: C(103), b: C(113), light: "golden", set: "valley", crowd: "bus", era: "after", slide: AFTER },
  { id: 10, a: C(113), b: C(126), light: "golden", set: "valley", crowd: "quiet", era: "after", slide: AFTER },
  { id: 11, a: C(126), b: C(147), light: "day", set: "room", crowd: "seismo", era: "after", slide: AFTER, sunAz: 150, sunEl: 55 },
  { id: 12, a: C(147), b: C(173), light: "day", set: "valley", crowd: "cracks", era: "pre", slide: PRE, sunAz: 120, sunEl: 40 },
  { id: 13, a: C(173), b: C(185), light: "day", set: "build", crowd: "build", era: "today", slide: AFTER, sunAz: 115, sunEl: 42 },
  { id: 14, a: C(185), b: TOTAL, light: "golden", set: "today", crowd: "now", era: "today", slide: AFTER, sunAz: 120, sunEl: 13 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 9: 8, 11: 10, 12: 10, 13: 10, 14: 14 };
export const FLASH_AT = SHOTS[1].a;
// cut points inside shots that change set
export const TUB_AT = C(97) - 3, OFFICIAL_IN = C(132) - 3, SCI_IN = C(136) - 3, COOKIE_AT = C(156) - 3, OLDROAD_AT = C(189) - 3, END_AT = C(195) - 3;
export const setAt = (id: number, f: number): SetName => {
  if (id === 8 && f >= TUB_AT) return "bath";
  if (id === 11 && f >= OFFICIAL_IN && f < SCI_IN) return "valley";
  if (id === 12 && f >= COOKIE_AT) return "kitchen";
  return SHOTS[id - 1].set;
};
/** light per frame (the official stands at the debris by day inside the room shot) */
export const lightAt = (id: number, _f: number): Light => SHOTS[id - 1].light;
export const eraAt = (id: number, _f: number): Era => SHOTS[id - 1].era ?? "pre";
/** how far the cracks on the south face have spread (terrain colours) */
export const crackAt = (id: number, t: number) => id === 5 ? smooth((t - Ws(63) + 0.25) / 0.9) : id === 12 ? smooth((t - Ws(149)) / (Ws(155) - Ws(149) + 0.4)) : 0;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

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

// ---- framings ----
// 1 hook: the south face lets go (wide from down-valley), then the mass climbing Mount Coulter (from the east)
const S1a = (f: number) => dolly([520, 70, 120], [10, 170, -250], pushK(f, 0, 0.0026), { fov: 46, roll: 0.02 });
const S1b = (f: number) => dolly([560, 45, 40], [0, 55, 105], pushK(f, W(7, 3), 0.003, 0.006, 30), { fov: 46, roll: -0.04 });
// 2 dawn: aerial over the quiet valley, then the edge of Hope with Johnson Peak up the road
const S2a = (f: number) => dolly([-560, 120, 30], [0, 150, -200], pushK(f, W(16), 0.0022), { fov: 48 });
const S2b = (f: number) => dolly([-1030, 6, 2.5], [-700, 50, -60], pushK(f, W(21, 3), 0.0024, 0.004, 30), { fov: 50, roll: 0.03 });
// 3 the snow avalanche comes down onto the road
const S3a = (f: number) => dolly([86, 4, 90], [80, 42, -150], pushK(f, W(30), 0.0009, 0.0018, 30), { fov: 60 });
// 4 the convertible nose-first in the snow, the tanker pulls up, the hay truck brakes in behind
const S4a = (f: number) => dolly([68.4, 1.75, 8.6], [74.8, 1.1, 1.9], pushK(f, W(41), 0.0026, 0.005, 25), { fov: 42, roll: 0.03 });
const S4b = (f: number) => dolly([80, 2.0, 12], [67, 2.0, 1.9], pushK(f, W(48, 3), 0.0026), { fov: 44 });
const S4c = (f: number) => dolly([35, 4.6, 15.5], [63, 6, -2], pushK(f, W(54, 3), 0.0024, 0.005, 25), { fov: 46, roll: -0.03 });
// 5 two minutes to seven (watch insert), then the face above the road starts to go
export const WATCH_AT: V3 = [50.6, 1.42, 6.05];
const S5a = (f: number) => dolly([50.9, 1.5, 7.05], WATCH_AT, pushK(f, W(58), 0.003, 0.006, 25), { fov: 38 });
const S5b = (f: number) => dolly([100, 1.6, 26], [30, 160, -260], pushK(f, W(63, 3), 0.0024, 0.006, 25), { fov: 54, roll: 0.04 });
// 6 the collapse, wide
const S6a = (f: number) => dolly([-560, 60, 50], [10, 140, -220], pushK(f, W(67), 0.0024), { fov: 44 });
// 7 the forest goes under, then the lake
const S7a = (f: number) => dolly([-420, 50, 70], [-20, 40, -100], pushK(f, W(75), 0.0026, 0.005, 25), { fov: 34, roll: -0.03 });
const S7b = (f: number) => dolly([-330, 42, 62], [-62, 2, -42], pushK(f, W(79, 3), 0.003, 0.006, 25), { fov: 30, roll: 0.03 });
// 8 profile across the valley: out, up Mount Coulter and back
const S8a = (f: number) => dolly([580, 75, 25], [0, 55, 90], pushK(f, W(84), 0.0022), { fov: 40 });
const S8b = (f: number) => dolly(add(BATH, [0.0, 0.62, 1.62]), add(BATH, [0, 0.2, 2.95]), pushK(f, W(97, 3), 0.0026, 0.006, 25), { fov: 38 });
// 9 the bus just short of the toe, then its relieved driver
const S9a = (f: number) => dolly([BUS_X + 16, 2.6, 4.5], [BUS_X - 16, 5, -9], pushK(f, W(103), 0.0024, 0.005, 25), { fov: 46 });
const S9b = (f: number) => dolly([BUS_X - 3.6, 2.45, 1.4], [BUS_X + 0.5, 2.3, -1.4], pushK(f, W(108, 3), 0.003), { fov: 40, roll: -0.03 });
// 10 the quiet field
const S10a = (f: number) => dolly([480, 90, 60], [10, 60, -60], pushK(f, W(113), 0.002), { fov: 46 });
// 11 the seismograph insert, the official at the toe, the scientist and his chart
const S11a = (f: number) => dolly(add(ROOM, [0.0, 1.4, 1.6]), add(ROOM, [0, 1.08, 2.85]), pushK(f, W(126), 0.0026, 0.006, 25), { fov: 38 });
const S11b = (f: number) => dolly([OFFICIAL_AT[0] + 3.5, 1.75, OFFICIAL_AT[2] + 6.5], [OFFICIAL_AT[0] - 1.0, 1.6, OFFICIAL_AT[2] - 0.5], pushK(f, W(132, 3), 0.003, 0.006, 25), { fov: 44 });
const S11c = (f: number) => dolly(add(ROOM, [1.0, 1.75, 0.4]), add(ROOM, [0.2, 1.5, 3.3]), pushK(f, W(136, 3), 0.0024), { fov: 42 });
const S11d = (f: number) => dolly(add(ROOM, [-1.6, 1.62, 3.9]), add(ROOM, [-1.6, 1.6, 5.85]), pushK(f, W(142, 3), 0.0026, 0.006, 25), { fov: 38 });
// 12 the cracked face (long ago), then the cookie
const S12a = (f: number) => dolly([110, 8, 40], [25, 165, -265], pushK(f, W(147), 0.0026), { fov: 54 });
const S12b = (f: number) => dolly(add(KITCHEN, [0.0, 1.38, 1.55]), add(KITCHEN, [0, 1.08, 2.85]), pushK(f, W(156, 3), 0.0022, 0.005, 25), { fov: 40 });
// 13 the crew on top, then the crane up: the road is ON the slide
const RY = roadNewY(60);
const S13a = (f: number) => dolly([75, RY + 2.6, ROAD_NEW_Z + 9.5], [62, RY + 1.6, ROAD_NEW_Z - 1], pushK(f, W(173), 0.0026, 0.005, 25), { fov: 44 });
const S13b = (f: number) => {
  const k = glide((f - W(177, 3)) / (W(184) - W(177, 3) + 10));
  return { pos: lerp3([118, RY + 14, ROAD_NEW_Z + 60], [300, RY + 150, ROAD_NEW_Z + 290], k), look: lerp3([60, RY + 2, ROAD_NEW_Z], [30, RY - 5, ROAD_NEW_Z - 30], k), fov: 46 } as Shot;
};
// 14 today: the red car cruising the new road, the old road far below, the mountain that is missing its face
const S14a = (f: number) => { const x = carNowX(T(f)), y = roadNewY(x); return { pos: [x + 6.5, y + 2.6, CAR_NOW_Z + 6.5] as V3, look: [x + 0.5, y + 1.1, CAR_NOW_Z] as V3, fov: 42, roll: 0.02 }; };
/** 14b: from far down the old road: it runs straight in under the slide while the new road climbs over it */
const S14b = (f: number) => {
  const k = glide((f - OLDROAD_AT) / 60);
  return { pos: [430 - 12 * k, 5 + 2 * k, -6] as V3, look: lerp3([230, 6, 2], [180, 26, 20], k), fov: 40, roll: 0.02 } as Shot;
};
const S14c = (f: number) => dolly([520, 70, 120], [10, 170, -250], 1 / pushK(f, END_AT, 0.0014), { fov: 46 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: W(7, 3), cut: true, s: S1b }],
  2: [{ f: W(16), s: S2a }, { f: W(21, 3), cut: true, s: S2b }],
  3: [{ f: W(30), s: S3a }],
  4: [{ f: W(41), s: S4a }, { f: W(48, 3), cut: true, s: S4b }, { f: W(54, 3), cut: true, s: S4c }],
  5: [{ f: W(58), s: S5a }, { f: W(63, 3), cut: true, s: S5b }],
  6: [{ f: W(67), s: S6a }],
  7: [{ f: W(75), s: S7a }, { f: W(79, 3), cut: true, s: S7b }],
  8: [{ f: W(84), s: S8a }, { f: TUB_AT, cut: true, s: S8b }],
  9: [{ f: W(103), s: S9a }, { f: W(108, 3), cut: true, s: S9b }],
  10: [{ f: W(113), s: S10a }],
  11: [{ f: W(126), s: S11a }, { f: OFFICIAL_IN, cut: true, s: S11b }, { f: SCI_IN, cut: true, s: S11c }, { f: W(142, 3), cut: true, s: S11d }],
  12: [{ f: W(147), s: S12a }, { f: COOKIE_AT, cut: true, s: S12b }],
  13: [{ f: W(173), s: S13a }, { f: W(177, 3), cut: true, s: S13b }],
  14: [{ f: W(185), s: S14a }, { f: OLDROAD_AT, cut: true, s: S14b }, { f: END_AT, cut: true, s: S14c }],
};

// impact kicks: the mountain lets go, the mass hits the valley floor, the slosh, the seismograph pen, the cookie lands
export const COOKIE_T = Ws(171) + 0.2, SQUIG_T = Ws(131) - 0.05;
const KICKS: [number, number][] = [[Ws(66) - 0.04, 1.3], [Ws(85) - 0.05, 1.0], [Ws(94) - 0.05, 0.6], [Ws(4) - 0.05, 1.1], [SQUIG_T, 0.5], [COOKIE_T + 0.28, 0.6], [Ws(51) + 0.3, 0.3], [Ws(57) + 0.15, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
/** keep outdoor lenses at least 1.2 m above the ground under them */
const keepUp = (id: number, f: number, c: Cam): Cam => {
  const set = setAt(id, f);
  if (set !== "valley" && set !== "today" && set !== "build") return c;
  const era = eraAt(id, f), s = SHOTS[id - 1], st = s.slide ? s.slide(f / FPS) : 0;
  const g = hAt(c.pos[0], c.pos[2], era, st) + 1.2;
  return c.pos[1] >= g ? c : { ...c, pos: [c.pos[0], g, c.pos[2]] };
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
  { f: 0, cInf: 0 },                         // hook wides
  { f: W(16), cInf: 0 },                     // dawn aerial
  { f: W(21, 3), cInf: 0 },                  // town edge
  { f: W(30), cInf: 0 },                     // avalanche
  { f: W(41), cInf: 11 },                    // convertible
  { f: W(48, 3), cInf: 10 },                 // tanker
  { f: W(54, 3), cInf: 0 },                  // queue wide
  { f: W(58), cInf: 14 },                    // watch insert
  { f: W(63, 3), cInf: 0 },                  // let go
  { f: W(84), cInf: 0 },
  { f: TUB_AT, cInf: 14 },                   // bathtub
  { f: W(103), cInf: 0 },                    // bus wide
  { f: W(108, 3), cInf: 12 },                // bus driver
  { f: W(113), cInf: 0 },                    // quiet field
  { f: W(126), cInf: 14 },                   // seismograph
  { f: OFFICIAL_IN, cInf: 10 },              // official
  { f: SCI_IN, cInf: 10 },                   // scientist
  { f: W(142, 3), cInf: 13 },                // chart
  { f: W(147), cInf: 0 },                    // cracked face
  { f: COOKIE_AT, cInf: 14 },                // cookie
  { f: W(173), cInf: 10 },                   // crew
  { f: W(177, 3), cInf: 0 },                 // crane up
  { f: W(185), cInf: 9 },                    // red car
  { f: OLDROAD_AT, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
void TOWN;
