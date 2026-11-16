// Our cast as lit flat sprites in the 3D world (the bridge short's card system: pooled canvases, cardShade lighting,
// contact blobs, blinks, reaction lead) staged for the Molasses Flood. stage() returns everything with a face, plus
// effect cards, for shot `id` at time t.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxPuff, fxContact, fxShadow, fxDrip, fxThermo, fxWatch, fxRivet, fxBlameBubble, fxSmell, fxSpoon, fxHoney,
  Outfit, Expr, FrontOpts, SideOpts, worker, woman, kid1919, sailor, modernKid, JELL, EXEC, PAINTER, JUDGE, ENGINEER, OLD_LOCAL,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, smooth, clamp01, frontX, molH, W, Ws, setAt, TANK, ROOM, COURT, OFFICE, JELL_AT, HOSE_AT, SEAM_AT, LADDER_AT, THERMO_AT,
  LUNCH_AT, EXEC_AT, BENCH_AT, RUN_Z, RIVET_POPS, GAVEL_T, SEAL_T, SPLIT_T,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

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
const WK = [0, 1, 2, 3, 4].map((v) => worker(v)), WOM = [0, 1, 2, 3].map((v) => woman(v)), KIDS = [0, 1, 2].map((v) => kid1919(v));
const SAIL = [0, 1, 2, 3].map((v) => sailor(v)), MOD = [0, 1, 2, 3, 4, 5].map((v) => modernKid(v));
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
/** depth of molasses at a spot (0 before the flood) */
const depth = (id: number, t: number, x: number, z: number) => { const fl = SHOTS[id - 1].flood; return fl ? molH(x, z, fl(t)) : 0; };

// ---- runners fleeing down Commercial Street ahead of the wave (shots 1, 9, 10) ----
const runners = (out: Stage, cam: CamInfo, id: number, t: number, n = 7) => {
  const fl = SHOTS[id - 1].flood!, fx = frontX(fl(t));
  for (let i = 0; i < n; i++) {
    const lead = 2.6 + i * 2.3 + hh(i, 2) * 1.2, x = fx + lead, z = RUN_Z + (hh(i, 4) - 0.5) * 6.5;
    if (z < -11 || z > -0.6 || Math.hypot(cam.pos.x - x, cam.pos.z - z) < 5) continue;
    const kind = i % 4, o = kind === 1 ? WOM[i % 4] : kind === 3 ? KIDS[i % 3] : WK[i % 5];
    const ph = q((t * 2.6 + hh(i)) % 1, 30), up = i % 2 === 0;
    front(out, cam, P(i + 10, o, `r${kind}${i % 5}`), x, G, z, { mode: "march", phase: ph, lift: 90, expr: "shock", prop: up ? "armsUp" : null, tilt: -6 }, t, kind === 3 ? 0.72 : 1);
  }
};
// ---- people stuck in the molasses (waist-deep: the syrup surface hides their legs) ----
const STUCK: [number, number, number][] = [[17.6, -7.4, 0], [15.4, -8.6, 1], [20.3, -9.3, 2], [13.2, -6.2, 3], [22.4, -5.4, 4]];
const stuck = (out: Stage, cam: CamInfo, id: number, t: number, cold: number) => {
  STUCK.forEach(([x, z, k]) => {
    const kind = k % 3, o = kind === 1 ? WOM[k % 4] : WK[k % 5];
    const strug = Math.sin(t * (3 - 2.6 * cold) + k * 1.7);
    const expr: Expr = cold > 0.5 ? (k % 2 ? "pained" : "nervous") : k % 2 ? "shock" : "nervous";
    front(out, cam, P(40 + k, o, `st${kind}${k}`), x, G + 0.25, z, { mode: "stand", expr, prop: k % 2 ? "armsUp" : null, tilt: 4 * strug * (1 - 0.8 * cold) }, t, 1, 0);
    if (cold > 0.2) breath(out, t, x, G + 1.95, z, k);
  });
};

export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const set = setAt(id, f);
  switch (s.crowd) {
    case "run": runners(out, cam, id, t, 9); break;
    case "wharf": {
      front(out, cam, P(1, WK[0], "w0"), 4.6, G, -10.6, { mode: "stand", expr: "neutral", look: -1 }, t);
      front(out, cam, P(2, WK[1], "w1"), -22.6, G, -36.6, { mode: "stand", expr: "smile", look: 1 }, t);
      front(out, cam, P(3, WK[3], "w3"), -19.8, G, -35.4, { mode: "march", phase: q((t * 1.2) % 1, 30), lift: 40, expr: "neutral" }, t);
      for (let i = 0; i < 6; i++) front(out, cam, P(20 + i, i % 2 ? WOM[i % 4] : WK[i % 5], `p${i}`), -30 + i * 9 + ((t * 1.1 + i) % 3), G, -1.4 - (i % 3) * 0.8,
        { mode: "stroll", phase: q((t * 0.9 + hh(i)) % 1, 30), expr: "neutral" }, t);
      break;
    }
    case "jell": {
      if (t < Ws(49) - 0.1) {
        const e: Expr = t < W1(46) ? "smile_closed" : "nervous";
        front(out, cam, P(5, JELL, "jell"), JELL_AT[0], G, JELL_AT[2], { mode: "stand", expr: e, look: t < W1(46) ? 0 : -1 }, t);
      } else {
        front(out, cam, P(5, JELL, "jell"), HOSE_AT[0] + 1.5, G, HOSE_AT[2] + 1.0, { mode: "stand", expr: t < W1(53) ? "neutral" : "smile", prop: "watch" }, t);
        fxCard(out, "trickle", 120, 300, (p) => { p.ell(60, 150, 10, 140, "#9fd0f6", 0); }, HOSE_AT[0] - 0.05, G + 0.25, HOSE_AT[2] + 0.42, 0.05, 0.25);
        out.fx.push({ key: "puddle", cw: 300, ch: 150, draw: (p) => { p.ell(150, 75, 140, 58, "#8fbfe6", 0); p.ell(120, 62, 60, 16, "#cfe6f8", 0); }, x: HOSE_AT[0] + 0.1, y: G + 0.02, z: HOSE_AT[2] + 0.55, w: 0.45, h: 0.22, flat: true });
      }
      break;
    }
    case "leak": {
      for (let k = 0; k < 5; k++) {
        const u = q(((t * 0.7 + hh(k, 5)) % 1), 24), x = SEAM_AT[0] - 0.7 + k * 0.35, top = G + 1.2 + hh(k, 6) * 2.6;
        fxCard(out, `drip${u}`, 120, 300, (p) => fxDrip(p, u), x, top - 0.6 * u * u, SEAM_AT[2] + 0.05 * k, 0.17, 0.42);
      }
      if (t >= W1(60)) {
        front(out, cam, P(30, WOM[0], "n0"), SEAM_AT[0] - 0.9, G, SEAM_AT[2] + 0.9, { mode: "stand", expr: "smile", prop: "bucket" }, t);
        front(out, cam, P(31, WOM[2], "n1"), SEAM_AT[0] + 0.85, G, SEAM_AT[2] + 1.3, { mode: "stand", expr: "grin", prop: "bucket", facing: -1 }, t);
        front(out, cam, P(32, KIDS[0], "n2"), SEAM_AT[0] + 0.05, G, SEAM_AT[2] + 1.9, { mode: "stand", expr: "smile_closed", prop: "bucket" }, t, 0.72);
      }
      break;
    }
    case "paint": {
      if (t < Ws(69) - 0.1) {
        front(out, cam, P(5, JELL, "jell"), JELL_AT[0], G, JELL_AT[2], { mode: "stand", expr: "stern", look: -1 }, t);
        for (let k = 0; k < 3; k++) { const u = q(((t * 0.7 + hh(k, 5)) % 1), 24); fxCard(out, `drip${u}`, 120, 300, (p) => fxDrip(p, u), JELL_AT[0] - 3.2 + k * 0.5, G + 2 + k * 0.6 - 0.6 * u * u, JELL_AT[2] - 1.0, 0.1, 0.25); }
      } else {
        const p = smooth((f - W(69)) / (W(72) + 22 - W(69)));
        const stroke = Math.max(0, Math.sin(t * 9));
        front(out, cam, P(6, PAINTER, "painter"), LADDER_AT[0], G + 0.9 + 4.2 * p, LADDER_AT[2] + 0.75 - 0.5 * p, { mode: "stand", expr: "smile_closed", prop: ["brush", q(stroke, 10)] }, t, 1, 0);
        front(out, cam, P(5, JELL, "jell"), LADDER_AT[0] + 3.4, G, LADDER_AT[2] + 2.4, { mode: "stand", expr: "smile", look: -1 }, t);
      }
      break;
    }
    case "cold": {
      const warm = t >= W1(83) + 0.2;
      const folk: [number, number, Outfit, string][] = [[-12.6, -2.2, WK[2], "c0"], [-10.8, -3.4, WOM[1], "c1"], [-14.4, -4.1, WK[4], "c2"], [-9.4, -1.6, KIDS[1], "c3"], [-16.2, -2.6, WOM[3], "c4"]];
      folk.forEach(([x, z, o, k], i) => {
        const shiver = warm ? 0 : 1.5 * Math.sin(t * 40 + i);
        front(out, cam, P(60 + i, o, k), x, G, z, { mode: "stand", expr: warm ? (i % 2 ? "relief" : "smile") : "nervous", tilt: shiver }, t, o.build === "kid" ? 0.72 : 1);
        if (!warm) breath(out, t, x, G + 1.95 * (o.build === "kid" ? 0.72 : 1), z, i);
      });
      const k = 0.08 + 0.8 * smooth((f - W(78)) / (W(83) + 12 - W(78)));
      fxCard(out, `thermo${q(k, 40)}`, 300, 800, (p) => fxThermo(p, q(k, 40)), THERMO_AT[0], THERMO_AT[1], THERMO_AT[2], 0.42, 1.12);
      break;
    }
    case "lunch": {
      if (t < Ws(88) - 0.1) {
        for (let i = 0; i < 3; i++) front(out, cam, P(70 + i, WK[i + 1], `l${i}`), LUNCH_AT[0] - 1.2 + i * 1.1, G, LUNCH_AT[2] - 0.6, { mode: "sit", expr: i === 1 ? "laugh" : "smile" }, t);
        front(out, cam, P(73, WK[0], "lw"), LUNCH_AT[0] + 0.35, G, LUNCH_AT[2] + 0.5, { mode: "stand", expr: "neutral", prop: "watch" }, t);
        fxCard(out, "watch", 400, 460, fxWatch, LUNCH_AT[0] + 0.7, G + 1.0, LUNCH_AT[2] + 1.6, 0.36, 0.41);
      } else if (t < SPLIT_T - 0.35) {
        RIVET_POPS.forEach((tp, k) => {
          const u = (t - tp) / 0.5;
          if (u < 0 || u >= 1) return;
          const x = SEAM_AT[0] - 0.5 + k * 0.28, y = G + 3.2 + (k % 3) * 0.35, z = SEAM_AT[2] + 0.05;
          fxCard(out, `rburst${q(u, 20)}`, 500, 500, (p) => fxBurst(p, q(u, 20), "#ffc04a", 8, 20), x, y, z + 0.05, 0.5, 0.5);
          fxCard(out, "rivet", 100, 100, fxRivet, x + 0.6 * u, y + 0.4 * u - 0.8 * u * u, z + 1.8 * u, 0.09, 0.09, u * 9);
        });
      } else {
        const u = (t - SPLIT_T) / 0.6;
        if (u > -0.2 && u < 1) fxCard(out, `bigburst${q(clamp01(u), 20)}`, 500, 500, (p) => fxBurst(p, q(clamp01(u), 20), "#fff3b0", 14), TANK[0] + 4, G + 8, TANK[2] + 14, 9, 9);
        runners(out, cam, id, Math.max(t, SPLIT_T + 0.8), 0);
      }
      break;
    }
    case "spoon": {
      const u = clamp01((t - Ws(98)) / (Ws(103) - Ws(98)));
      front(out, cam, P(80, KIDS[2], "sk"), ROOM[0] + 0.42, G, ROOM[2] + 3.75, { mode: "stand", expr: u < 0.6 ? "neutral" : "nervous", look: -1, headTilt: -6 }, t, 0.72, 0);
      fxCard(out, `spoon${q(u, 30)}`, 800, 900, (p) => fxSpoon(p, q(u, 30) * 0.45), ROOM[0] - 0.05, G + 1.08, ROOM[2] + 2.95, 0.5, 0.56);
      break;
    }
    case "wave": runners(out, cam, id, t, 7); break;
    case "el": {
      if (t < Ws(119) - 0.1) runners(out, cam, id, t, 5);
      else stuck(out, cam, id, t, 0);
      break;
    }
    case "honey": {
      if (t < Ws(132) - 0.1) {
        front(out, cam, P(81, KIDS[2], "hk"), ROOM[0] + 1.55, G, ROOM[2] + 4.0, { mode: "stand", expr: "neutral", prop: "jar", look: -1 }, t, 0.72);
      } else {
        const warm = t >= Ws(140) - 0.1 ? 1 : 0, u = warm ? clamp01((t - Ws(140)) / 1.0) : clamp01((t - Ws(132)) / 2);
        fxCard(out, `honey${warm}${q(u, 20)}`, 700, 900, (p) => fxHoney(p, warm, q(u, 20)), ROOM[0], G + 1.22, ROOM[2] + 3.0, 0.46, 0.59, warm ? 0 : 0.02 * Math.sin(t * 30));
      }
      break;
    }
    case "flow": {
      const cold = s.cold ? s.cold(t) : 0;
      if (t < Ws(152) - 0.1) runners(out, cam, id, t, 4);
      else stuck(out, cam, id, t, cold);
      break;
    }
    case "rescue": {
      const t0 = Ws(164);
      for (let i = 0; i < 3; i++) {
        const x = -42.2 + i * 0.95 + (t - t0) * 0.3, z = -6.4 + (i % 2) * 0.9;
        const so: SideOpts = { mode: "march", phase: q(((t - t0) * 0.45 + i * 0.3) % 1, 30), expr: i === 1 ? "pained" : "stern", stomp: 0.5, stride: 0.45 };
        out.places.push(person(cam, P(90 + i, SAIL[i], `sail${i}`), x, G + 0.2, z, { side: true, mirror: false }, {}, { ...so, blink: lidAt(t, 90 + i) }));
        breath(out, t, x + 0.15, G + 1.9, z, i + 5);
      }
      front(out, cam, P(95, WK[4], "rs"), -39.2, G + 0.2, -7.4, { mode: "stand", expr: "nervous", prop: "armsUp" }, t, 1, 0);
      break;
    }
    case "blame": {
      if (set === "town") {
        front(out, cam, P(100, EXEC, "exec"), EXEC_AT[0], G, EXEC_AT[2], { mode: "stand", expr: "stern", prop: t >= W1(171) ? "point" : null, look: 1 }, t);
        const u = clamp01((t - W1(172)) / 0.6);
        if (u > 0) fxCard(out, `blame${q(u, 20)}${q(t % 1, 6)}`, 600, 520, (p) => fxBlameBubble(p, q(u, 20) + q(t % 1, 6) * 0.01), EXEC_AT[0] + 0.85, G + 2.55, EXEC_AT[2], 1.0, 0.87);
      } else {
        const n = (t - GAVEL_T) * FPS, k = n >= -11 && n < -7 ? 1 - smooth((n + 11) / 4) : n >= -7 && n < 0 ? 0 : 1;
        const pre = t < GAVEL_T - 0.6;
        front(out, cam, P(101, JUDGE, "judge"), COURT[0], G + 0.62, COURT[2] + 4.7, { mode: "stand", expr: pre ? "stern" : "stern", prop: ["hammer", q(pre ? 1 : k, 20)], facing: 1 }, t, 1.05, 0);
        if (t >= GAVEL_T && t < GAVEL_T + 5 / FPS) { const u = (t - GAVEL_T) / (5 / FPS); fxCard(out, `burst${q(u, 20)}`, 500, 500, (p) => fxBurst(p, q(u, 20)), COURT[0] + 0.55, G + 1.55, COURT[2] + 3.5, 0.8, 0.8); }
      }
      break;
    }
    case "engineer": {
      const writing = t >= Ws(186) - 0.1;
      front(out, cam, P(110, ENGINEER, "eng"), OFFICE[0] + 0.35, G, OFFICE[2] + 3.6, { mode: "stand", expr: writing ? "smile_closed" : "neutral", prop: ["pen", q(0.7 + 0.15 * Math.sin(t * 7), 20)], look: -1 }, t, 1, 0);
      if (t >= SEAL_T && t < SEAL_T + 6 / FPS) { const u = (t - SEAL_T) / (6 / FPS); fxCard(out, `burst${q(u, 20)}`, 500, 500, (p) => fxBurst(p, q(u, 20), "#ffd0c0"), OFFICE[0] - 0.45, G + 1.02, OFFICE[2] + 3.15, 0.4, 0.4); }
      break;
    }
    case "field": {
      const kids: [number, number, string][] = [[0, -16.6, "bat"], [0, -24, "pitch"], [7.2, -22.6, "1b"], [-7.2, -22.6, "3b"], [3.5, -30, "ss"], [-1.2, -14.6, "catch"]];
      kids.forEach(([dx, z, role], i) => {
        const swing = role === "bat" ? q(Math.max(0, Math.sin(t * 2.2)) ** 3, 20) : 0;
        front(out, cam, P(120 + i, MOD[i], `mk${i}`), TANK[0] + dx, G, z, { mode: "stand", expr: (["grin", "smile", "laugh", "smile_closed", "grin", "smile"] as Expr[])[i], prop: role === "bat" ? ["bat", swing] : role === "1b" || role === "3b" ? "armsUp" : null, wave: role === "ss" ? q(Math.sin(t * 6), 20) : undefined }, t, 0.72);
      });
      if (t >= Ws(206) - 0.2) {
        front(out, cam, P(130, OLD_LOCAL, "old"), BENCH_AT[0], G + 0.05, BENCH_AT[2] + 0.12, { mode: "sit", expr: t >= W1(216) ? "smile_closed" : "smile", headTilt: t >= W1(212) ? -8 : 0 }, t, 1, 0.8);
        for (let k = 0; k < 3; k++) { const u = q(((t * 0.35 + k / 3) % 1), 24); fxCard(out, `smell${u}`, 300, 600, (p) => fxSmell(p, u), BENCH_AT[0] + [-1.25, 1.2, 1.7][k], G + 0.55, BENCH_AT[2] + 0.6, 0.3, 0.6, 0, true); }
      }
      break;
    }
    default: break;
  }
  return out;
};
