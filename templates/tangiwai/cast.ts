// Our cast as lit flat sprites in the 3D world (the bridge short's card system: pooled canvases, cardShade lighting,
// contact blobs, blinks, reaction lead) staged for the Molasses Flood. stage() returns everything with a face, plus
// effect cards, for shot `id` at time t.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxPuff, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts, fxSmoke, fxSplash, fxRock, fxSpark,
  ELLIS, DRIVER53, FIREMAN53, GUARD53, pass53, kid53, HOLMAN, HIVIS, DRIVER07, local07, fxBeam, fxGlow, fxShards, fxSandTub,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, W, Ws, setAt, lightAt, trainAt, D0, CAR_INT, BATH, C, MAST, SIGNAL_X, TRAIN07_X, TRUCK, ELLIS_X, ELLIS_Z, ellisX,
  T_PASS, REST6, T_FALL6, cruiseX, INT_AT, CAR_IN_AT, FALL_AT, NOERUPT_AT, LAHAR16_AT, T_IMPACT,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import {
  hAt, rc, bedY, waterY, zfAt, T_HIT, T_RIP, PIERS, LOST_PIER, EDGE_X, RAIL_Y, ROAD_Z, roadY, frontS, pathXZ, pathY, carOffset, CARS, SIXTH,
  S_SETTLED, LAKE_R, RIM_R, lakeLevel, craterH, T_EDGE,
} from "./terrain";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; glowM: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null; add = false;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    // additive glow cards (headlight / torch beams, lamp halos): HDR so the bloom picks them up
    this.glowM = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.6, 1.6), fog: false });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else if (this.add) { this.glowM.map = t; this.mesh.material = this.glowM; this.mesh.renderOrder = 2; }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
  /** draw the card this far (m) toward the lens (scaled to keep its size on screen), so seats, cab walls or the car it
   *  stands in never slice through the flat card */
  pull?: number;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; add?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "night" | "lamp" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "night" | "lamp", [number, number, number]> = { day: [0.2, 0.21, 0.33], night: [0.3, 0.3, 0.42], lamp: [0.3, 0.24, 0.26] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
/** a burst of real droplets: n drops leave (x, y, z) at time t0 with speeds up to v (m/s), spread = horizontal share */
export type Burst = { x: number; y: number; z: number; t0: number; n: number; v: number; spread: number; size: number; seed: number; dx?: number; dz?: number };
export type Stage = { places: Place[]; fx: FxPlace[]; bursts: Burst[] };
const G = D0;
const W1 = (i: number) => Ws(i) - LEAD; // reaction lands just before the word
const P = (i: number, o: Outfit, okey: string): Who => ({ i, o, okey });
/** front-facing card; `blobK` 0 = no ground shadow (in molasses / behind furniture) */
const front = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, t: number, scale = 1, blobK = 1) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: fo.expr === "shock" ? 0 : lidAt(t, who.i), ...fo }, {}, scale));
  if (blobK > 0) blob(out, x, y, z, scale, blobK);
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft });
const breath = (out: Stage, t: number, x: number, y: number, z: number, i: number) => {
  const u = q(((t * 0.55 + hh(i, 3)) % 1), 20);
  if (u < 0.6) fxCard(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u / 0.6), x + 0.12 + 0.2 * u, y + 0.1 * u, z, 0.35 + 0.3 * u, 0.35 + 0.3 * u, 0, true);
};



// ======================================================================= Tangiwai staging
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** world point of the train path at s (rail height) */
const pathPt = (s: number): V3 => { const [x, z] = pathXZ(s); return [x, pathY(s), z]; };
/** time at which the front parameter reaches s (frontS is increasing) */
const timeAtS = (s: number) => { let a = 20, b = 50; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (frontS(m) < s) a = m; else b = m; } return (a + b) / 2; };
const glowCard = (out: Stage, key: string, rgb: string, x: number, y: number, z: number, size: number, a0 = 0.9) =>
  out.fx.push({ key: `glow|${rgb}|${q(a0, 10)}${key}`, cw: 256, ch: 256, draw: (p) => fxGlow(p, rgb, a0), x, y, z, w: size, h: size, add: true });
const soft = (out: Stage, cam: CamInfo, key: string, rgb: string, u: number, a: number, x: number, y: number, z: number, s: number, minD = 10) => {
  if (Math.hypot(cam.pos.x - x, cam.pos.y - y, cam.pos.z - z) < s * 0.5 + minD) return;
  const uq = q(u, 12);
  out.fx.push({ key: `smk|${rgb}|${uq}|${q(a, 10)}${key}`, cw: 300, ch: 300, draw: (pp) => fxSmoke(pp, uq, rgb, a), x, y, z, w: s, h: s * 0.85, soft: true });
};
/** exhaust from the Ka's chimney: puffs left behind where they were emitted, rising and spreading */
const exhaust = (out: Stage, cam: CamInfo, chim: (te: number) => V3, t: number, night: boolean) => {
  for (let k = 0; k < 12; k++) {
    const age = k * 0.2 + ((t * 5) % 1) * 0.2, te = t - age;
    const [x, y, z] = chim(te), s = 1.4 + 2.2 * age;
    soft(out, cam, "ex", night ? "86,90,108" : "120,120,128", Math.min(1, age / 2.6), 0.75 * (1 - age / 2.6), x + 1.2 * age, y + 2.0 * age, z + 0.6 * age, s, 6);
  }
};
const lampAt = (t: number, mode: "cruise" | "run"): V3 => (mode === "cruise" ? [cruiseX(t) - 0.95, RAIL_Y + 3.48, 0] : add3(pathPt(frontS(t) + 0.95), [0, 3.48, 0]));
const chimAt = (mode: "cruise" | "run") => (te: number): V3 => (mode === "cruise" ? [cruiseX(te) + 1.9, RAIL_Y + 3.8, 0] : add3(pathPt(frontS(te) - 1.9), [0, 3.8, 0]));
/** the bore's front: a line of foam and spray across the channel */
const frontSpray = (out: Stage, cam: CamInfo, lt: number, t: number, night: boolean) => {
  if (lt < -1e8 || lt > 1e8) return;
  const zf = zfAt(lt);
  for (let k = 0; k < 7; k++) {
    const u = -24 + k * 8 + 3 * Math.sin(k * 2.3), z = zf + 4 + 2 * Math.sin(k), x = rc(z) + u, y = waterY(x, z, lt) + 1.6;
    if (y - bedY(z) < 1.5) continue;
    const ph = ((t * 1.3 + k * 0.37) % 1);
    for (let g2 = 0; g2 < 2; g2++) { const per = 0.7, ph2 = ((t + k * 0.13 + g2 * per / 2) % per); out.bursts.push({ x, y: y - 1.2, z: z - 1, t0: -ph2, n: 40, v: 6.5, spread: 0.5, size: 0.07, seed: k * 17 + g2 * 5 + Math.floor((t + k * 0.13 + g2 * per / 2) / per) * 101, dz: -3 }); }
  }
};
/** an impact splash: a crown of real droplets (instanced, ballistic) plus a muddy mist that hangs and drifts */
const splashAt = (out: Stage, cam: CamInfo, key: string, u: number, x: number, y: number, z: number, s: number, dur = 1) => {
  if (u < 0 || u > 1.6) return;
  const t0 = -u * dur; // relative: world converts with the frame time
  out.bursts.push({ x, y, z, t0, n: Math.round(60 + 9 * s), v: 2.2 * Math.sqrt(s) + 3, spread: 0.55, size: 0.05 + 0.012 * s, seed: key.length * 31 + Math.round(x * 7 + z * 3) });
  if (u < 1) soft(out, cam, "spm" + key, LNAME === "night" ? "96,100,118" : "200,192,180", Math.min(1, u * 1.2), 0.22 * (1 - u * 0.6), x, y + s * 0.25 + s * 0.15 * u, z, s * (0.7 + 0.6 * u), 4);
  void fxSplash;
};
const seatedAt = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, t: number, scale = 1, pull = 0.45) => {
  front(out, cam, who, x, y, z, { mode: "sit", ...fo }, t, scale, 0);
  out.places[out.places.length - 1].pull = pull;
};
const pullLast = (out: Stage, d: number) => { out.places[out.places.length - 1].pull = d; };

export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], bursts: [] };
  const s = SHOTS[id - 1], set = setAt(id, f), light = lightAt(id, f), night = light === "night";
  LNAME = light;
  findSun(cam, SUN);
  const lt = s.lahar(t);
  // the express: headlight halo + exhaust whenever it is running
  const tm = set === "valley" ? trainAt(id, f) : "none";
  if (tm === "cruise" || (tm === "run" && frontS(t) < 1)) {
    const mode = tm === "cruise" ? "cruise" : "run", L = lampAt(t, mode);
    glowCard(out, "hl", "255,236,190", L[0] - 0.3, L[1], L[2], id === 8 ? 5 : 3.2, 0.95);
    exhaust(out, cam, chimAt(mode), t, night);
  }
  if (set === "valley" && night) frontSpray(out, cam, lt, t, true);
  switch (s.crowd) {
    case "hook": case "hit": {
      if (set !== "valley") break;
      for (const x of PIERS) {
        const u = (lt - T_HIT - 0.05 - (x + 30) * 0.004) / 1.0;
        splashAt(out, cam, `p${x}`, u, x, waterY(x, 3, lt) - 0.5, 3.2, 9);
      }
      splashAt(out, cam, "rip", (lt - T_RIP) / 1.2, LOST_PIER, -2.5, -2, 14);
      splashAt(out, cam, "span", (lt - T_RIP - 0.9) / 1.1, 37, -2.5, 0.5, 13);
      break;
    }
    case "express": {
      if (set === "car") {
        // passengers going home for Christmas: one bay (rows k = 1 facing +z, k = 2 facing -z), seen from the aisle
        const [x, , z] = CAR_INT, row = (k: number) => z - 8.2 + 0.9 + k * 1.3;
        seatedAt(out, cam, P(20, pass53(1), "w1"), x - 0.95, 0, row(1) + 0.05, { expr: "smile", prop: "present", look: 1 }, t, 0.97);
        seatedAt(out, cam, P(21, kid53(0), "k1"), x - 0.55, 0, row(1) + 0.08, { expr: "grin", prop: "present", look: 1 }, t, 0.92);
        seatedAt(out, cam, P(22, pass53(0), "m1"), x - 0.75, 0, row(2) - 0.05, { expr: "laugh", look: -1 }, t);
      }
      break;
    }
    case "crater": case "breach": case "breach07": {
      if (set !== "crater") { if (set === "valley") frontSpray(out, cam, lt, t, false); break; }
      const b = s.breach ? s.breach(t) : 0, [cx, , cz] = C, ll = lakeLevel(b);
      // steam wisps off the warm lake
      for (let k = 0; k < 5; k++) { const a = k * 1.3, r = 60 + 30 * k, ph = ((t * 0.08 + k * 0.21) % 1);
        soft(out, cam, "st", night ? "150,164,196" : "246,246,248", ph, 0.14, cx + r * Math.cos(a), ll + 8 + 14 * ph, cz + r * Math.sin(a), 40 + 20 * ph, 30); }
      if (b > 0.01) {
        // the dam bursting: spray, flying rock, the torrent's cloud down the gully
        for (let k = 0; k < 9; k++) {
          const ph = ((t * 1.1 + k * 0.29) % 1), u = RIM_R - 6 + k * 18 * Math.min(1, b * 1.4), v = -0.08 * Math.max(0, u - RIM_R) + 10 * Math.sin(k * 1.7) * b;
          if (false) soft(out, cam, "br", night ? "150,156,176" : "240,236,228", ph, 0.22 * Math.min(1, b * 3), cx + u, craterH(u, v, b) + 5 + 8 * ph, cz + v, (14 + 10 * (k % 3)) * (0.6 + 0.6 * b), 15);
        }
        // water bursting through the notch: droplets thrown up where it pours over the broken face
        for (let g2 = 0; g2 < 4; g2++) { const per = 0.8, ph = ((t + g2 * per / 4) % per), uu = RIM_R + 4 + g2 * 14 * b;
          out.bursts.push({ x: cx + uu, y: craterH(uu, 0, b) + 1.5 + 2 * b, z: cz, t0: -ph, n: Math.round(40 + 60 * b), v: 7 + 6 * b, spread: 0.6, size: 0.18 + 0.2 * b, seed: g2 * 13 + Math.floor((t + g2 * per / 4) / per) * 97, dx: 6 * b }); }
      }
      break;
    }
    case "arrive": break;
    case "ellis": {
      if (f < W(101) - 3) {
        const y = roadY(TRUCK[0] - 2.5, "night");
        front(out, cam, P(1, ELLIS, "ellis"), TRUCK[0] - 2.4, y, TRUCK[2] + 1.9, { mode: "stand", expr: t < W1(99) ? "nervous" : "shock", look: -1 }, t);
        for (const dz of [-0.78, 0.78]) glowCard(out, "tl", "255,240,200", TRUCK[0] + 0.25, y + 1.2, TRUCK[2] + dz, 1.2, 0.85);
      } else {
        const x = ellisX(t), y = hAt(x, ELLIS_Z), run = t < T_PASS - 0.25, wv = Math.sin(t * 9);
        front(out, cam, P(1, ELLIS, "ellis"), x, y, ELLIS_Z, { mode: run ? "march" : "stand", phase: run ? (t * 2.3) % 1 : 0, expr: "shock", prop: "torch", wave: q(wv, 6), look: 1 }, t);
        // the torch: a lit lens and its beam swinging over his head
        const R = cam.right, up = new THREE.Vector3(0, 1, 0), hand = new THREE.Vector3(x, y + 1.62, ELLIS_Z).addScaledVector(R, 0.2 + 0.05 * wv);
        const rot = -0.55 - 0.3 * wv, dir = R.clone().multiplyScalar(-Math.sin(rot)).addScaledVector(up, Math.cos(rot));
        const ctr = hand.clone().addScaledVector(dir, 1.5);
        out.fx.push({ key: "beam|torch", cw: 300, ch: 600, draw: (pp) => fxBeam(pp, "255,238,180", 0.8), x: ctr.x, y: ctr.y, z: ctr.z, w: 1.5, h: 3.0, rot, add: true });
        glowCard(out, "tc", "255,242,200", hand.x, hand.y + 0.15, hand.z, 0.55, 0.95);
        // the headlight's glare growing on him as the engine comes
        const d = EDGE_X - frontS(t) - x;
        if (d > 10 && d < 160) glowCard(out, "glare", "255,236,190", x + d, RAIL_Y + 3.48, 0, 4.5, 0.9);
      }
      break;
    }
    case "brake": {
      // the cab: the driver at the brake, the fireman behind him; sparks at the wheels once the brakes bite
      const sF = frontS(t);
      if (f < W(111) - 3) {
        const [x, y, z] = pathPt(sF - 11.6), yy = y + 1.42, braking = t > T_BRAKE_C;
        // driver at the brake (front-right of the cab, clear of the backhead), fireman behind him at the cab's back
        front(out, cam, P(2, DRIVER53, "drv"), x - 0.15, yy, z + 0.45, { mode: "stand", expr: braking ? "shock" : "nervous", prop: "point", look: -1, tilt: braking ? -6 : 0 }, t, 1, 0); pullLast(out, 0.3);
        front(out, cam, P(3, FIREMAN53, "fire"), x + 1.0, yy, z - 0.3, { mode: "stand", expr: braking ? "shock" : "neutral", look: -1 }, t, 1, 0); pullLast(out, 0.3);
      }
      if (t > T_BRAKE_C) for (const wx of [4.1, 5.75, 7.4, 9.05]) for (const sd of [-1, 1]) {
        const [x, y, z] = pathPt(sF - wx), fl = (f * 7 + wx * 13 + sd * 5) % 3;
        if (fl === 0) continue;
        out.fx.push({ key: "spark", cw: 200, ch: 200, draw: fxSpark, x: x + 0.5, y: y + 0.15, z: z + sd * 0.72, w: 0.55, h: 0.55, rot: f * 0.7, add: true });
      }
      if (t > T_BRAKE_C) { const [x, y, z] = pathPt(sF - 6.5); soft(out, cam, "bs", "200,206,222", ((t * 2) % 1), 0.6, x + 1.5, y + 0.6, z + 1.6, 2.2, 3); }
      break;
    }
    case "plunge": {
      // splashes where each vehicle meets the water, a burst of steam from the engine
      for (let i = 0; i < 7; i++) {
        const ti = timeAtS(carOffset(i) + 8.2);
        splashAt(out, cam, `c${i}`, (t - ti) / 1.0, 36.5, -1.8, 0.5, i < 2 ? 15 : 11);
      }
      const te = timeAtS(9);
      if (f < W(122) - 3) for (let k = 0; k < 5; k++) { const u = (t - te - k * 0.12) / 2.2; if (u < 0 || u > 1) continue; soft(out, cam, "steam", "150,160,190", u, 0.4 * (1 - u * 0.7), 34 - 2 * k, 0 + 7 * u, -2 + 3 * Math.sin(k), 9 + 9 * u, 8); }
      if (false) for (let k = 0; k < 4; k++) { const ph = ((t * 0.05 + k * 0.25) % 1); soft(out, cam, "mist", "110,124,170", 0.5, 0.16, 10 + 14 * k - 8 * ph, -0.6, -12 - 8 * k, 26, 12); }
      void T_IMPACT; void T_EDGE;
      break;
    }
    case "edge": {
      if (set === "car") {
        // inside the sixth carriage: Ellis comes in at the far end shouting the warning, the guard behind him
        const [x, , z] = CAR_INT, k = clamp01((t - Ws(138)) / 2.6), wv = Math.sin(t * 7);
        front(out, cam, P(1, ELLIS, "ellis"), x + 0.05, 0, z - 7.4 + 3.2 * smooth(k), { mode: k < 0.98 ? "march" : "stand", phase: (t * 1.8) % 1, expr: "shock", prop: "armsUp", look: 0 }, t, 1, 0); pullLast(out, 0.25);
        front(out, cam, P(4, GUARD53, "guard"), x - 0.35, 0, z - 7.9 + 2.0 * smooth(k), { mode: "stand", expr: "stern", prop: "lantern", look: 1 }, t, 1, 0); pullLast(out, 0.25);
        glowCard(out, "lan", "255,214,140", x - 0.12, 1.08, z - 7.75 + 2.0 * smooth(k), 0.5, 0.8);
        const row = (kk: number) => z - 8.2 + 0.9 + kk * 1.3, alarm = t > W1(143);
        seatedAt(out, cam, P(30, pass53(5), "p5"), x - 0.5, 0, row(3) + 0.05, { expr: alarm ? "shock" : "nervous", look: 1 }, t);
        seatedAt(out, cam, P(31, kid53(2), "k3"), x + 0.52, 0, row(4) - 0.05, { expr: alarm ? "shock" : "neutral", prop: "present", look: -1 }, t, 0.92);
        seatedAt(out, cam, P(32, pass53(6), "p6"), x - 0.5, 0, row(5) + 0.05, { expr: alarm ? "shock" : "nervous", look: 1 }, t);
        seatedAt(out, cam, P(33, pass53(7), "p7"), x + 0.5, 0, row(6) - 0.05, { expr: "nervous", look: -1 }, t);
        void wv;
      } else if (f >= FALL_AT) {
        const y0 = hAt(REST6[0], REST6[2]);
        splashAt(out, cam, "f6", (t - T_FALL6 - 0.55) / 1.1, REST6[0] - 2, y0 - 0.5, REST6[2] - 1.5, 16);
        splashAt(out, cam, "f6b", (t - T_FALL6 - 0.75) / 1.0, REST6[0] + 4, y0 - 0.5, REST6[2] - 2.5, 12);
      }
      break;
    }
    case "rescue": {
      const g = hAt(REST6[0], REST6[2]), top = g + 2.3, zc = REST6[2] - 1.4;
      if (f < W(157) - 3) {
        const k = 0.5 + 0.5 * Math.cos((t - Ws(151) + 0.1) * 10), hit = t > Ws(151) - 0.1;
        front(out, cam, P(1, ELLIS, "ellis"), REST6[0] + 0.6, top, zc, { mode: "stand", expr: "stern", prop: ["torch", hit ? q(k, 6) : 0], look: 1 }, t); pullLast(out, 0.2);
        const u = (t - Ws(151) - 0.15) / 0.7;
        if (u > 0 && u < 1) out.fx.push({ key: `shards${q(u, 14)}`, cw: 400, ch: 400, draw: (pp) => fxShards(pp, q(u, 14)), x: REST6[0] + 1.35, y: top + 0.25, z: REST6[2] - 2.3, w: 1.2, h: 1.2 });
      } else {
        const pull = smooth((t - Ws(158)) / 1.4);
        front(out, cam, P(1, ELLIS, "ellis"), REST6[0] + 1.6, top, zc, { mode: "stand", expr: "stern", prop: "reach", look: 1 }, t); pullLast(out, 0.2);
        front(out, cam, P(40, pass53(9), "pw"), REST6[0] + 2.4, top, REST6[2] - 1.2 - 0.3 * (1 - pull), { mode: "stand", expr: pull > 0.6 ? "relief" : "pained", prop: "armsUp", look: -1 }, t, 1, 0); pullLast(out, 0.2);
        front(out, cam, P(41, HOLMAN, "holman"), REST6[0] + 3.6, top, REST6[2] - 1.0, { mode: "stand", expr: "stern", prop: "reach", look: -1 }, t, 1, 0); pullLast(out, 0.2);
        seatedAt(out, cam, P(42, pass53(10), "h1"), REST6[0] - 1.2, top, zc + 0.3, { expr: "dazed", look: 1 }, t);
        seatedAt(out, cam, P(43, kid53(3), "h2"), REST6[0] - 2.1, top, zc - 0.2, { expr: "pained", look: 1 }, t, 0.95);
        seatedAt(out, cam, P(44, pass53(11), "h3"), REST6[0] - 3.2, top, zc + 0.2, { expr: "nervous", look: 1 }, t);
        seatedAt(out, cam, P(45, pass53(12), "h4"), REST6[0] - 4.3, top, zc - 0.1, { expr: "dazed", look: 1 }, t);
        front(out, cam, P(46, pass53(13), "h5"), REST6[0] - 5.5, top, zc, { mode: "stand", expr: "nervous", look: 1 }, t); pullLast(out, 0.2);
      }
      for (let k = 0; k < 3; k++) { const ph = ((t * 0.06 + k * 0.33) % 1); soft(out, cam, "mist", "110,124,170", 0.5, 0.14, REST6[0] - 14 + 9 * k, -0.5, REST6[2] - 8 - 5 * ph, 20, 10); }
      break;
    }
    case "tub": {
      if (set === "bath") {
        // the bath is real geometry (world.ts poseTub); a few droplets fly where the water pours into the drain
        void fxSandTub;
      }
      break;
    }
    case "mast": {
      const y = hAt(MAST[0] + 1, MAST[2] - 0.7, "today"), k = 0.5 + 0.5 * Math.cos(t * 7);
      front(out, cam, P(50, HIVIS(0), "hv0"), MAST[0] + 1.1, y, MAST[2] - 0.75, { mode: "stand", expr: "stern", prop: ["hammer", q(k, 6)], look: -1 }, t);
      front(out, cam, P(51, HIVIS(1), "hv1"), MAST[0] - 1.3, hAt(MAST[0] - 1.3, MAST[2] - 1.0, "today"), MAST[2] - 1.0, { mode: "stand", expr: "grin", prop: "point", look: 1 }, t);
      break;
    }
    case "alarm": {
      frontSpray(out, cam, lt, t, false);
      const flash = Math.floor(t * 2.4) % 2 === 0;
      const my = hAt(MAST[0], MAST[2], "today") + 7.15;
      if (flash) glowCard(out, "bc", "255,170,40", MAST[0], my, MAST[2], 1.6, 0.95);
      glowCard(out, "sig", "255,60,40", SIGNAL_X + 0.18, hAt(SIGNAL_X, -3.4, "today") + 4.6, -3.4, 0.9, 0.9);
      if (f >= W(214) - 3 && f < W(217) - 3) seatedAt(out, cam, P(52, DRIVER07, "drv07"), TRAIN07_X + 2.9, RAIL_Y + 1.75, -0.4, { expr: "smile_closed", prop: "mug", look: -1 }, t, 0.95, 0.25);
      if (f >= W(217) - 3) {
        // onlookers on the east bank, safely back from the river, watching the wave go under the bridge
        const who: [number, number, number, Expr, FrontOpts["prop"]][] = [[49.5, -27.5, 0, "smile", null], [50.8, -28.6, 1, "grin", "point"], [52.0, -27.2, 5, "laugh", "point"], [53.4, -29.0, 2, "smile_closed", "phone"]];
        who.forEach(([x, z, v, e, pr], i) => front(out, cam, P(60 + i, local07(v), "l" + i), x, hAt(x, z, "today"), z, { mode: "stand", expr: e, prop: pr, look: -1 }, t, v === 5 ? 0.9 : 1));
      }
      break;
    }
    default: break;
  }
  return out;
};
const T_BRAKE_C = Ws(109) - 0.15;
void bodySide; void fxPuff; void D0; void TRAIN07_X; void INT_AT; void CAR_IN_AT; void NOERUPT_AT; void LAHAR16_AT; void ELLIS_X; void T_HIT; void EDGE_X; void CARS; void SIXTH; void S_SETTLED; void LAKE_R; void ROAD_Z; void MAST;
