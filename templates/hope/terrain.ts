// The Nicolum Valley as height functions (metres, y up): Highway 3 runs along x at z = 0, Johnson Peak rises to the
// north (-z), Mount Coulter to the south (+z), Outram Lake sits at the foot of Johnson Peak. The 1965 slide is
// analytic: the scar sinks into the peak's south face, a rounded mass (the "bump") runs down, across the valley, up
// Mount Coulter and back, leaving the final deposit (55 m deep over the road). Shared by world.ts (mesh), story.ts
// (cameras above ground) and cast.ts (feet on the surface).
import { WORDS } from "./words";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sstep = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const Ws = (i: number) => WORDS[i][1];
const hash2 = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
/** smooth value noise */
const vnoise = (x: number, z: number) => {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, z: number) => vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 7, z * 2.1 + 3) * 0.3 + vnoise(x * 4.3 + 1, z * 4.3 + 9) * 0.15;

// ---------------- the valley before the slide ----------------
export const LAKE = { x: -70, z: -42, rx: 48, rz: 15, y: -0.55 };
export const SLIDE_X = 10;                 // centre line of the slide lobe
/** Johnson Peak (north) and Mount Coulter (south) over a flat valley floor */
export const H0 = (x: number, z: number) => {
  let h = 0;
  if (z < -62) {
    const d = -z - 62, ridge = 0.38 + 0.62 * Math.exp(-(((x - 10) / 360) ** 2)) + 0.05 * Math.sin(x / 90);
    h = 410 * Math.pow(d / 410, 1.3) * ridge;
    h += 70 * Math.exp(-(((x - 10) / 120) ** 2) - (((z + 430) / 90) ** 2)); // the summit
    h += 9 * (fbm(x / 60, z / 60) - 0.5) * sstep(0, 60, d);
  } else if (z > 90) {
    const d = z - 90, ridge = 0.45 + 0.55 * Math.exp(-(((x + 120) / 420) ** 2));
    h = 300 * Math.pow(d / 420, 1.25) * ridge;
    h += 8 * (fbm(x / 55 + 30, z / 55) - 0.5) * sstep(0, 60, d);
  }
  // a gentle floor away from the road, the lake hollow
  const far = sstep(12, 30, Math.abs(z - 10));
  h += 1.2 * (fbm(x / 25, z / 25) - 0.5) * far;
  const ld = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2;
  if (ld < 1.6) h -= 2.6 * sstep(1.6, 0.4, ld);
  return h;
};

// ---------------- the slide (absolute narration time t, seconds) ----------------
export const RELEASE = Ws(65) + 0.05;                 // "let go"
const SETTLE = Ws(96) + 0.6;                          // "back down,"
/** lobe cross-profile: full across the centre, a rounded toe at |x - 10| ~ 114..186 m */
export const xp = (x: number) => Math.pow(clamp01((186 - Math.abs(x - SLIDE_X)) / 72), 0.6);
/** the scar: up to 120 m taken off the south face */
const scar = (x: number, z: number) => 120 * Math.exp(-0.5 * ((z + 300) / 95) ** 2) * Math.sqrt(clamp01((150 - Math.abs(x - SLIDE_X)) / 60)) * sstep(-150, -200, z);
export const srcAt = (t: number) => sstep(RELEASE, RELEASE + 2.4, t);
/** final deposit: 55 m over the road, hummocky, tapering up the Johnson Peak foot and onto Mount Coulter's toe */
export const dep = (x: number, z: number, graded = 0) => {
  const k = xp(x);
  if (k <= 0) return 0;
  let d = 0;
  if (z < -60) d = 52 * sstep(-210, -60, z);
  else if (z < 36) d = 55;
  else d = 55 * (1 - sstep(36, 92, z));
  const hum = (fbm(x / 22, z / 22) - 0.5) * 9 + (fbm(x / 7 + 4, z / 7) - 0.5) * 2.5;
  const g = graded ? sstep(8, 22, Math.abs(z - graded)) : 1;
  return Math.max(0, (d + hum * g * Math.min(1, d / 10)) * k);
};
type Key = [number, number];
const ZC: Key[] = [[RELEASE, -300], [Ws(76), -140], [Ws(80), -78], [Ws(83) + 0.1, -22], [Ws(85), 6], [Ws(89), 120], [Ws(92) + 0.25, 228], [Ws(94), 196], [SETTLE - 0.2, 22]];
const interp = (keys: Key[], t: number) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], u = (t - t0) / (t1 - t0);
    return v0 + (v1 - v0) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5);
  }
  return keys[keys.length - 1][1];
};
export const PEAK_T = Ws(92) + 0.25;
/** centre of the moving mass, its direction (+1 out across the valley, -1 sloshing back) and size */
export const bumpAt = (t: number) => {
  const zc = interp(ZC, t), dir = t < PEAK_T ? 1 : -1;
  const A = 46 * sstep(RELEASE, RELEASE + 0.9, t) * (1 - sstep(Ws(93), SETTLE, t)) * (t < PEAK_T ? 1 : 0.85);
  return { zc, dir, A, on: t > RELEASE && t < SETTLE + 0.1 };
};
/** furthest the front has reached so far (the deposit exists behind it) */
export const reachAt = (t: number) => (t < RELEASE ? -1e9 : t < PEAK_T ? interp(ZC, t) : 1e9);
/** slide surface added on top of the bare (scarred) ground at (x, z) at time t */
const slideLayer = (x: number, z: number, t: number) => {
  if (t < RELEASE) return 0;
  const b = bumpAt(t), k = xp(x);
  const reach = reachAt(t);
  let d = dep(x, z) * sstep(reach + 10, reach - 50, z) * sstep(RELEASE + 0.5, RELEASE + 3.5, t);
  if (b.on && k > 0) {
    const u = (z - b.zc) * b.dir;
    const nose = 34, tail = 75;
    const s = u > 0 ? Math.sqrt(clamp01(1 - (u / nose) ** 2)) : Math.exp(-0.5 * (u / tail) ** 2);
    const lumps = 1 + 0.18 * (fbm(x / 18 + t * 0.7, z / 18) - 0.5);
    d = Math.max(d, b.A * s * k * lumps);
    // a thin film left on Mount Coulter while the mass is up there, drained as it comes back
    if (t >= PEAK_T && z > 80 && z < 232) d = Math.max(d, 6 * k * (1 - sstep(PEAK_T, SETTLE, t)) * sstep(b.zc - 10, b.zc + 20, z));
  }
  if (t >= SETTLE) d = dep(x, z);
  return d;
};

export type Era = "pre" | "slide" | "after" | "today";
/** the new highway (today): along z = ROAD_NEW_Z on the deposit, ramping down to the valley floor east and west */
export const ROAD_NEW_Z = 60;
export const roadNewY = (x: number) => 56.5 * (1 - sstep(130, 380, Math.abs(x - SLIDE_X)));
/** ground height for an era at time t (t only matters for "slide") */
export const hAt = (x: number, z: number, era: Era, t = 0) => {
  const base = H0(x, z);
  if (era === "pre") return base;
  const tt = era === "slide" ? t : 1e9;
  const g = base - scar(x, z) * (era === "slide" ? srcAt(t) : 1);
  if (era !== "today") return g + slideLayer(x, z, tt);
  const top = base - scar(x, z) + dep(x, z, ROAD_NEW_Z);
  const emb = roadNewY(x) - 0.25 - Math.max(0, Math.abs(z - ROAD_NEW_Z) - 6.5) * 1.4;
  return Math.max(top, emb);
};
/** how far (m) the surface was lowered by the scar or raised by debris at (x, z): for vertex colours */
export const scarAt = (x: number, z: number) => scar(x, z);
export const lakeIn = (x: number, z: number) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1;
/** narration-time when the moving mass passed z (trees there are gone after it) */
export const passT = (z: number) => {
  if (z < -300) return RELEASE + 0.3;
  for (let i = 1; i < ZC.length; i++) if (ZC[i][1] >= z && ZC[i - 1][1] < z) {
    const [t0, v0] = ZC[i - 1], [t1, v1] = ZC[i];
    return t0 + ((z - v0) / (v1 - v0)) * (t1 - t0);
  }
  return Infinity;
};

/** cracks on Johnson Peak's south face (world x, z polylines); k 0..1 how far they have spread */
export const CRACKS: [number, number][][] = [
  [[-40, -360], [-30, -320], [-48, -285], [-30, -245], [-42, -205], [-25, -170]],
  [[25, -380], [15, -335], [32, -300], [18, -260], [35, -220], [22, -185]],
  [[80, -350], [66, -310], [82, -270], [64, -230], [76, -195]],
  [[-30, -245], [0, -250], [18, -260], [48, -248], [64, -230]],
  [[-48, -285], [-72, -270], [-85, -245]],
  [[32, -300], [55, -312], [66, -310]],
];
export const crackDist = (x: number, z: number, k: number) => {
  let best = 1e9;
  CRACKS.forEach((l, i) => {
    const kk = clamp01(k * 1.6 - i * 0.12);
    if (kk <= 0) return;
    const n = (l.length - 1) * kk;
    for (let j = 0; j < Math.ceil(n); j++) {
      const fr = Math.min(1, n - j), [ax, az] = l[j], bx = ax + (l[j + 1][0] - ax) * fr, bz = az + (l[j + 1][1] - az) * fr;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = clamp01(((x - ax) * dx + (z - az) * dz) / L2);
      best = Math.min(best, Math.hypot(x - ax - u * dx, z - az - u * dz));
    }
  });
  return best;
};
