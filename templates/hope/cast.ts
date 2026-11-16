// Our cast as lit flat sprites in the 3D world (the bridge short's card system: pooled canvases, cardShade lighting,
// contact blobs, blinks, reaction lead) staged for the Molasses Flood. stage() returns everything with a face, plus
// effect cards, for shot `id` at time t.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxPuff, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts, fxSmoke, fxSplash,
  DRIVER65, PASS_W, PASS_M, TRUCKER, HAYMAN, BUSDRIVER, OFFICIAL, SCIENTIST, CREW, DRIVER_NOW,
  fxWatchAt, fxSeismo, fxChart, fxTub, fxCookie, fxCracks, fxRock,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, W, Ws, setAt, D0, LANE_E, LANE_W, CONV_X, tankX, hayX, BUS_X, OFFICIAL_AT, ROOM, BATH, KITCHEN,
  CRACK_AT, WATCH_AT, MOUND, COOKIE_T, SQUIG_T, carNowX, CAR_NOW_Z, carNowZ, TUB_AT, OFFICIAL_IN, SCI_IN, COOKIE_AT,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { bumpAt, hAt, xp, RELEASE, LAKE, passT, PEAK_T, roadNewY, ROAD_NEW_Z, SLIDE_X } from "./terrain";

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
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
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
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
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
let LNAME: "day" | "golden" = "day";
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
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
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
export type Stage = { places: Place[]; fx: FxPlace[] };
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



// ---------------- the slide: dust along the front, the lake throwing its water, tumbling rocks ----------------
const DUST = "196,178,160";
const slideDust = (out: Stage, cam: CamInfo, st: number) => {
  const b = bumpAt(st);
  const fade = b.on ? 1 : st > PEAK_T ? Math.max(0, 1 - (st - (Ws(96) + 0.7)) / 4) : 0;
  if (fade <= 0) return;
  for (let i = 0; i < 12; i++) {
    const x = SLIDE_X - 150 + i * 27 + 8 * (hh(i, 41) - 0.5);
    if (xp(x) < 0.25) continue;
    for (const [lag, sz, a] of [[8, 40, 0.62], [-60, 70, 0.4]] as [number, number, number][]) {
      const z = b.zc + b.dir * lag + 10 * (hh(i, 42) - 0.5), u = q(((st * 0.35 + hh(i, 43) + lag * 0.01) % 1), 12);
      const y = hAt(x, z, "slide", st) + sz * 0.32 + 14 * u;
      if (Math.hypot(cam.pos.x - x, cam.pos.y - y, cam.pos.z - z) < sz + 25) continue;
      const s = sz * (0.8 + 0.4 * u) * (b.on ? 1 : 1.3);
      fxCard(out, `dust${u}|${a}|${q(fade, 6)}`, 300, 300, (pp) => fxSmoke(pp, u, DUST, a * fade), x, y, z, s, s * 0.85, 0, true);
    }
  }
};
const lakeSplash = (out: Stage, cam: CamInfo, st: number) => {
  const t0 = passT(LAKE.z + LAKE.rz) - 0.3, u = (st - t0) / 1.6;
  if (u < 0 || u > 1) return;
  for (let i = 0; i < 6; i++) {
    const x = LAKE.x - 40 + i * 16, z = LAKE.z + 18 + 6 * hh(i, 51), uu = clamp01(u * 1.1 - i * 0.03), s = 34 + 18 * hh(i, 52);
    if (Math.hypot(cam.pos.x - x, cam.pos.z - z) < s + 15) continue;
    fxCard(out, `lsplash${q(uu, 16)}`, 800, 800, (pp) => fxSplash(pp, q(uu, 16)), x, s * 0.42 + 4 + 10 * uu, z, s, s);
  }
};
const rocks = (out: Stage, st: number, t0: number) => {
  for (let i = 0; i < 9; i++) {
    const u = (st - t0 - 0.12 * i) / 1.6;
    if (u < 0 || u > 1) continue;
    const z = -255 + 70 * u + 10 * hh(i, 61), x = SLIDE_X - 70 + 18 * i;
    const y = hAt(x, z, "pre") + 6 + 14 * Math.abs(Math.sin(u * 9 + i));
    fxCard(out, `rock${i % 3}`, 200, 200, (pp) => fxRock(pp, i % 3), x, y, z + 12, 9 + 3 * (i % 3), 9 + 3 * (i % 3), u * 12 + i);
  }
};
const snowSlide = (out: Stage, cam: CamInfo, t: number) => {
  const t0 = Ws(31) - 0.2, t1 = Ws(35) + 0.3;
  for (let k = 0; k < 7; k++) {
    const u = (t - t0 - 0.16 * k) / (t1 - t0);
    if (u < 0 || u > 1.5) continue;
    const uu = Math.min(1, u), z = -78 * (1 - uu) + 1, x = MOUND[0] + 4 * Math.sin(k * 1.7);
    const y = hAt(x, z, "pre") + 1.6 + 0.6 * k * (1 - uu), s = 3.2 + 1.6 * (k % 3) + 3 * Math.max(0, u - 1);
    if (Math.hypot(cam.pos.x - x, cam.pos.z - z) < s + 6) continue;
    const ph = q((t * 0.8 + hh(k, 71)) % 1, 10), a = u > 1 ? 0.85 * (1 - (u - 1) / 0.5) : 0.9;
    fxCard(out, `snow${ph}|${q(a, 10)}`, 300, 300, (pp) => fxSmoke(pp, ph, "244,247,252", a), x, y, z, s, s * 0.85, 0, true);
  }
};

/** someone sitting in a vehicle cab (card behind the glass, feet hidden by the body) */
const seated = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, t: number, scale = 0.62) =>
  front(out, cam, who, x, y, z, { mode: "sit", ...fo }, t, scale, 0);

export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const set = setAt(id, f);
  const st = s.slide ? s.slide(t) : 0;
  if ((set === "valley") && s.era === "slide") { slideDust(out, cam, st); lakeSplash(out, cam, st); }
  switch (s.crowd) {
    case "avalanche": snowSlide(out, cam, t); break;
    case "conv": case "watch": {
      if (set !== "valley") break;
      const stuck = t >= W1(44), spin = t < Ws(48);
      // the three in the convertible (driver on the left), puzzled once they are stuck
      seated(out, cam, P(1, DRIVER65, "drv"), CONV_X - 2.75, 0.74, LANE_E - 0.42, { expr: stuck ? "nervous" : "neutral", look: -1 }, t);
      seated(out, cam, P(2, PASS_W, "pw"), CONV_X - 2.75, 0.74, LANE_E + 0.42, { expr: stuck ? "pained" : "smile_closed", look: 1 }, t);
      seated(out, cam, P(3, PASS_M, "pm"), CONV_X - 3.5, 0.78, LANE_E + 0.1, { expr: stuck ? "nervous" : "neutral", look: 1 }, t, 0.6);
      if (id === 4 && spin && stuck) for (let k = 0; k < 2; k++) { const u = q(((t * 2.2 + k * 0.5) % 1), 10); fxCard(out, `spin${u}`, 300, 300, (pp) => fxSmoke(pp, u, "240,244,250", 0.9), CONV_X - 4.25 - 0.8 * u, 0.35 + 0.5 * u, LANE_E + (k ? 0.9 : -0.9), 0.7 + 0.9 * u, 0.6 + 0.8 * u, 0, true); }
      const tx = id === 4 ? tankX(t) : 70.3, hx = id === 4 ? hayX(t) : 57.6;
      if (id > 4 || t > Ws(48) - 0.4) seated(out, cam, P(4, TRUCKER, "trk"), tx - 1.25, 1.3, LANE_E - 0.5, { expr: id === 4 && t < Ws(51) + 0.4 ? "neutral" : "stern", look: 1 }, t, 0.7);
      if (id > 4 || t > Ws(54) - 0.3) seated(out, cam, P(5, HAYMAN, "hay"), hx - 1.2, 1.25, LANE_E - 0.5, { expr: id === 4 && t > Ws(57) + 0.1 ? "dazed" : "neutral", look: 1 }, t, 0.7);
      if (id === 5 && f < W(63) - 3) fxCard(out, "watch658", 400, 460, (pp) => fxWatchAt(pp, 6, 58), WATCH_AT[0], WATCH_AT[1], WATCH_AT[2], 0.26, 0.3);
      if (id === 5 && f >= W(63) - 3) {
        const k = smooth((t - Ws(63) + 0.2) / 0.9);
        rocks(out, st, RELEASE - 0.3);
      }
      break;
    }
    case "collapse": case "forest": rocks(out, st, RELEASE - 0.3); break;
    case "climb": {
      if (set === "bath") {
        const u = t - Ws(97) + 0.2, sl = Math.sin(u * 3.0) * Math.exp(-u * 0.25) * 0.9, sp = clamp01(Math.abs(sl) - 0.55) * 2.2;
        fxCard(out, `tub${q(sl, 30)}|${q(sp, 8)}`, 900, 640, (pp) => fxTub(pp, q(sl, 30), q(sp, 8)), BATH[0], 0.165, BATH[2] + 2.95, 0.46, 0.33);
      }
      break;
    }
    case "bus": {
      const relief = t >= W1(108);
      seated(out, cam, P(6, BUSDRIVER, "bus"), BUS_X + 0.6, 1.5, LANE_W + 0.55, { expr: relief ? "relief" : "shock", look: -1 }, t, 0.8);
      if (relief && t < Ws(108) + 0.9) breath(out, t, BUS_X + 0.35, 2.4, LANE_W + 0.55, 6);
      break;
    }
    case "seismo": {
      if (set === "room" && f < OFFICIAL_IN) {
        const u = clamp01((t - Ws(126) + 0.3) / (Ws(132) - Ws(126) + 0.3)) * 0.82, uq = clamp01((SQUIG_T - Ws(126) + 0.3) / (Ws(132) - Ws(126) + 0.3)) * 0.82;
        fxCard(out, `seis${q(u, 60)}|${t >= SQUIG_T ? 1 : 0}`, 1000, 720, (pp) => fxSeismo(pp, q(u, 60), t >= SQUIG_T ? uq : -1), ROOM[0], 0.95 + 0.165, ROOM[2] + 2.85, 0.46, 0.33);
      } else if (set === "valley") {
        front(out, cam, P(7, OFFICIAL, "off"), OFFICIAL_AT[0], hAt(OFFICIAL_AT[0], OFFICIAL_AT[2], "after"), OFFICIAL_AT[2], { mode: "stand", expr: t >= W1(134) ? "grin" : "stern", prop: "photo", look: -1, headTilt: t >= W1(134) ? 5 : 0 }, t);
        breath(out, t, OFFICIAL_AT[0] + 0.1, 2.0, OFFICIAL_AT[2] + 0.1, 7);
      } else if (f < W(142) - 3) {
        const e: Expr = t < W1(138) ? "neutral" : t < W1(140) ? "nervous" : "shock";
        front(out, cam, P(8, SCIENTIST, "sci"), ROOM[0] + 0.25, 0, ROOM[2] + 3.6, { mode: "stand", expr: e, prop: "photo", look: -1 }, t, 1, 0);
      } else {
        const k = smooth((t - Ws(143) + 0.1) / (Ws(146) + 0.4 - Ws(143)));
        fxCard(out, `chart${q(k, 24)}`, 900, 640, (pp) => fxChart(pp, q(k, 24)), ROOM[0] - 1.6, 1.6, ROOM[2] + 5.8, 0.5, 0.356);
      }
      break;
    }
    case "cracks": {
      if (set === "valley") {
        // the cracks are painted into the terrain (world.ts / crackAt)
      } else {
        const split = smooth((t - Ws(162) + 0.15) / 0.55), fall = clamp01((t - COOKIE_T + 0.35) / 0.7);
        fxCard(out, `cookie${q(split, 12)}|${q(fall, 30)}`, 900, 700, (pp) => fxCookie(pp, q(split, 12), q(fall, 30) ** 1.4), KITCHEN[0], 0.98, KITCHEN[2] + 2.85, 0.5, 0.39);
      }
      break;
    }
    case "build": {
      const x1 = 64, x2 = 61.6, y1 = roadNewY(x1) + 0.12, y2 = roadNewY(x2) + 0.12, top = t >= W1(181);
      front(out, cam, P(9, CREW(0), "crew0"), x1, y1, ROAD_NEW_Z - 1.4, { mode: "stand", expr: top ? "grin" : "smile_closed", prop: top ? "point" : null, look: 1 }, t);
      front(out, cam, P(10, CREW(1), "crew1"), x2, y2, ROAD_NEW_Z + 0.6, { mode: "stand", expr: top ? "laugh" : "neutral", prop: top ? "armsUp" : null, look: -1 }, t);
      break;
    }
    case "now": {
      const x = carNowX(t);
      if (f < W(189) - 3) seated(out, cam, P(11, DRIVER_NOW, "now"), x + 2.25, roadNewY(x) + 0.78, CAR_NOW_Z + 0.4, { expr: "smile_closed", look: -1 }, t, 0.6);
      break;
    }
    default: break;
  }
  return out;
};
void bodySide; void fxBurst; void fxPuff; void D0; void TUB_AT; void SCI_IN; void COOKIE_AT; void BUS_X; void tankX; void hayX; void ROAD_NEW_Z;
