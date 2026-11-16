// Our cast as lit flat sprites in the 3D world (the bridge short's card system: pooled canvases, cardShade lighting,
// contact blobs, blinks, reaction lead) staged for the Molasses Flood. stage() returns everything with a face, plus
// effect cards, for shot `id` at time t.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxPuff, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts, fxSmoke, fxSplash,
  FLUSHER, londoner, SHOPKEEPER, CURATOR, modernKid,
} from "./toon";
import { fxSoap, fxSink, fxWipes, fxBan, fxFuel, fxFly, fxJet, fxDuck, fxSpurt } from "./fxfat";
import {
  FPS, SHOTS, V3, smooth, clamp01, W, Ws, setAt, D0, KITCHEN, BATH, OFFICE, LAB, MUSEUM, CASE_AT, TABLE_H, CARD_Z, SOAP_DX, MH_CAM, MH_FLOOD,
  FACE_X, FLOOR_Y, SEW_Y, crewX, strikeAt, STRIKE_T, SINK_AT, WIPES_AT, LID_T, SEAL_T, SOAP_T, TUB_AT3, FLIES_AT, crawlDrop,
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
const FL = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => FLUSHER(v)), LD = [0, 1, 2, 3, 4, 5].map((v) => londoner(v));
const KIDV: Outfit = modernKid(3), ADULTV: Outfit = { ...londoner(1) };
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


const lerpK = (t: number, pts: [number, number][]) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [a, u0] = pts[i - 1], [b, u1] = pts[i]; return u0 + (u1 - u0) * smooth((t - a) / (b - a)); }
  return pts[pts.length - 1][1];
};
/** someone walking along x at speed v (side view, faces the way they walk) */
const walker = (out: Stage, cam: CamInfo, who: Who, x: number, z: number, dir: number, t: number, expr: Expr = "neutral", scale = 1) => {
  const vw = viewOf(cam, x, z, dir, 0);
  const so: SideOpts = { mode: "march", phase: q(((t * 1.9 + who.i * 0.37) % 1), 30), expr, stomp: 0.6, stride: 0.7 * vw.fs };
  const fo: FrontOpts = { mode: "stroll", phase: q(((t * 1.9 + who.i * 0.37) % 1), 30), expr };
  out.places.push(person(cam, who, x, D0 + (Math.abs(z) > 6 ? 0.15 : 0), z, vw, { ...fo, blink: lidAt(t, who.i) }, { ...so, blink: lidAt(t, who.i) }, scale));
  blob(out, x, D0 + (Math.abs(z) > 6 ? 0.15 : 0), z, scale);
};
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number) => fxCard(out, key, cw, ch, draw, at[0], at[1], at[2], w, h);

export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const set = setAt(id, f), G = D0, PV = 0.15;
  switch (s.crowd) {
    case "hook": {
      if (set === "street") {
        walker(out, cam, P(1, LD[0], "ld0"), -36 + 1.2 * t, -7.8, 1, t);
        walker(out, cam, P(2, LD[1], "ld1"), -31 + 1.1 * t, -8.6, 1, t, "smile_closed");
        walker(out, cam, P(3, LD[2], "ld2"), -24 - 1.2 * t, -7.4, -1, t);
        front(out, cam, P(4, LD[3], "ld3"), -42, G + PV, -7.2, { mode: "stand", expr: "neutral", prop: "phone", look: -1 }, t);
      }
      break;
    }
    case "setting": {
      if (f >= W(16, 3)) {
        const watching = t >= W1(19);
        front(out, cam, P(5, FL[0], "fl0"), MH_CAM[0] - 0.55, G, MH_CAM[2] + 0.45, { mode: "stand", expr: "stern", prop: "point", look: 1, headTilt: 6 }, t);
        front(out, cam, P(6, FL[1], "fl1"), MH_CAM[0] + 0.45, G, MH_CAM[2] - 0.95, { mode: "stand", expr: watching ? "nervous" : "neutral", prop: "phone", look: -1 }, t);
        void crawlDrop;
      }
      break;
    }
    case "flood": {
      if (set === "street") {
        const e: Expr = t < W1(69) ? "neutral" : t < LID_T ? "nervous" : "shock";
        front(out, cam, P(7, SHOPKEEPER, "shop"), MH_FLOOD[0] - 0.85, G, MH_FLOOD[2] - 0.75, { mode: "stand", expr: e, look: 1, headTilt: e === "neutral" ? 0 : -4 }, t);
        if (t > Ws(69) - 0.2) { const u = q(clamp01((t - Ws(69) + 0.2) / 2.2), 20); card(out, `spurt${u}`, 600, 400, (pp) => fxSpurt(pp, u), [MH_FLOOD[0], 0.3, MH_FLOOD[2]], 1.0, 0.66); }
        if (t >= LID_T && t < LID_T + 0.5) { const u = q((t - LID_T) / 0.5, 12); card(out, `splash${u}`, 400, 400, (pp) => fxSplash(pp, u), [MH_FLOOD[0], 0.35, MH_FLOOD[2] + 0.1], 0.9, 0.9); }
      }
      break;
    }
    case "crew": {
      if (set === "street") {
        for (let i = 0; i < 8; i++) {
          const r = Math.floor(i / 2), c = i % 2, x = crewX(t) + r * 1.7 + (c ? 0.5 : 0), z = c ? -1.0 : 0.6;
          const prop = i % 4 === 1 ? (["shovel", 0.32] as ["shovel", number]) : i % 4 === 2 ? "hose" as const : null;
          front(out, cam, P(10 + i, FL[i], "fl" + i), x, G, z, { mode: "march", phase: q(((t * 1.8 + i * 0.27) % 1), 30), expr: t >= W1(76) && i < 2 ? "grin" : "stern", prop, lift: 40 }, t);
        }
      } else {
        // the jet: the lance in the front worker's hands, the spray onto the plug's nose
        const xh = FACE_X - 2.0, ph = q((t * 3) % 1, 10);
        front(out, cam, P(20, FL[2], "fl2"), xh, FLOOR_Y, -0.2, { mode: "stand", expr: "stern", prop: "hose", facing: 1 }, t, 0.82, 0.6);
        front(out, cam, P(21, FL[1], "fl1"), FACE_X - 2.7, FLOOR_Y, -0.45, { mode: "stand", expr: "neutral", prop: ["shovel", 0.25], facing: 1 }, t, 0.8, 0.6);
        if (t > Ws(80) - 0.1) {
          const x0 = xh + 0.52, x1 = FACE_X - 0.88, y = FLOOR_Y + 0.75;
          fxCard(out, `jet${ph}`, 600, 160, (pp) => fxJet(pp, ph), (x0 + x1) / 2, y - 0.03, 0.15, x1 - x0, 0.2);
          const u = q((t * 2.2) % 1, 10);
          fxCard(out, `jsplash${u}`, 300, 300, (pp) => fxSmoke(pp, u, "236,244,250", 0.85), x1 + 0.05, y + 0.1 * u, 0.2, 0.35 + 0.4 * u, 0.35 + 0.4 * u, 0, true);
        }
      }
      break;
    }
    case "concrete": {
      if (set === "cut") {
        const k = strikeAt(t), after = t >= STRIKE_T;
        const e: Expr = !after ? (t >= W1(89) ? "stern" : "neutral") : t < STRIKE_T + 0.45 ? "shock" : "dazed";
        front(out, cam, P(22, FL[1], "fl1"), FACE_X - 1.62, FLOOR_Y, -0.15, { mode: "stand", expr: e, prop: ["shovel", q(k, 20)], facing: 1, tilt: after ? q(3 * Math.sin((t - STRIKE_T) * 40) * Math.max(0, 1 - (t - STRIKE_T) * 2), 4) : 0 }, t, 0.82, 0.6);
        if (after && t < STRIKE_T + 0.3) { const u = q((t - STRIKE_T) / 0.3, 10); fxCard(out, `clang${u}`, 500, 500, (pp) => fxBurst(pp, u, "#fff3b0", 10), FACE_X - 0.95, SEW_Y + 0.15, 0.25, 0.55, 0.55); }
      } else {
        front(out, cam, P(23, FL[1], "fl1"), MH_FLOOD[0] - 0.85, G, MH_FLOOD[2] - 0.6, { mode: "sit", expr: "dazed", look: 1 }, t);
        front(out, cam, P(24, FL[3], "fl3"), MH_FLOOD[0] + 0.25, G, MH_FLOOD[2] - 1.15, { mode: "stand", expr: "pained", prop: ["shovel", 0.15] }, t);
      }
      break;
    }
    case "soap": {
      const at = (dx: number, c: V3): V3 => [c[0] + dx, TABLE_H + 0.05 + 0.17, c[2] + CARD_Z];
      if (set === "kitchen" && f < SINK_AT) {
        const u = q(t < SOAP_T - 0.2 ? 0.2 : clamp01(0.42 + (t - SOAP_T) / 1.6), 30);
        card(out, `soap${u}`, 900, 700, (pp) => fxSoap(pp, u), at(SOAP_DX, KITCHEN), 0.44, 0.34);
      } else if (set === "kitchen") {
        const u = q(lerpK(t, [[Ws(107) - 0.15, 0], [Ws(110), 0.3], [Ws(113), 0.5], [Ws(116) + 0.3, 0.95]]), 40);
        card(out, `sink${u}`, 900, 700, (pp) => fxSink(pp, u), at(0.9, KITCHEN), 0.44, 0.34);
      } else if (f < WIPES_AT) {
        card(out, "duck", 300, 300, fxDuck, [TUB_AT3[0] + 0.08 + 0.03 * Math.sin(t * 2), 0.48, TUB_AT3[2] + 0.2], 0.18, 0.18);
      } else {
        const u = q(lerpK(t, [[Ws(126) - 0.1, 0], [Ws(130) + 0.2, 0.45], [Ws(133), 0.52], [Ws(135) + 0.4, 1]]), 40);
        card(out, `wipes${u}`, 900, 700, (pp) => fxWipes(pp, u), at(1.4, BATH), 0.44, 0.34);
      }
      break;
    }
    case "ban": {
      const sign = q(smooth((t - Ws(139)) / (SEAL_T - 0.2 - Ws(139))), 20), seal = t >= SEAL_T ? 1 : 0;
      out.fx.push({ key: `ban${sign}|${seal}`, cw: 1000, ch: 720, draw: (pp) => fxBan(pp, sign, seal), x: OFFICE[0], y: TABLE_H + 0.056, z: OFFICE[2] + CARD_Z, w: 0.5, h: 0.36, flat: true, rot: Math.PI });
      if (t >= SEAL_T && t < SEAL_T + 0.25) { const u = q((t - SEAL_T) / 0.25, 10); fxCard(out, `burst${u}`, 500, 500, (pp) => fxBurst(pp, u, "#fff3b0"), OFFICE[0] + 0.16, TABLE_H + 0.12, OFFICE[2] + CARD_Z + 0.08, 0.25, 0.25); }
      break;
    }
    case "museum": {
      if (f < FLIES_AT) {
        const pinch = t >= W1(150);
        front(out, cam, P(30, CURATOR, "cur"), CASE_AT[0] + 0.78, G, CASE_AT[2] - 0.05, { mode: "stand", expr: pinch ? "grin" : "smile_closed", prop: "point" }, t);
        front(out, cam, P(31, KIDV, "kid"), CASE_AT[0] - 0.62, G, CASE_AT[2] - 0.35, { mode: "stand", expr: pinch ? "pained" : "shock", prop: pinch ? "nose" : null, look: 1 }, t);
        front(out, cam, P(32, ADULTV, "adv"), CASE_AT[0] - 1.05, G, CASE_AT[2] + 0.35, { mode: "stand", expr: pinch ? "nervous" : "neutral", look: 1 }, t);
      }
      // flies hatching out of the chunk and buzzing round the case
      if (t > Ws(158) - 0.15) for (let i = 0; i < 5; i++) {
        const age = t - Ws(158) + 0.15 - i * 0.18;
        if (age < 0) continue;
        const a = age * (2.2 + i * 0.4) + i * 1.3, rx = 0.2 * Math.min(1, age * 2), ph = q((t * 11 + i * 0.3) % 1, 6);
        fxCard(out, `fly${ph}`, 200, 200, (pp) => fxFly(pp, ph), CASE_AT[0] + rx * Math.cos(a), 1.2 + Math.min(0.22, age * 0.35) + 0.04 * Math.sin(a * 2.3), CASE_AT[2] + rx * 0.8 * Math.sin(a), 0.05, 0.05, 0.4 * Math.sin(a));
      }
      break;
    }
    case "fuel": {
      const u = q(clamp01((t - Ws(164) + 0.25) / (Ws(169) + 0.4 - Ws(164))), 40);
      card(out, `fuel${u}`, 900, 700, (pp) => fxFuel(pp, u), [LAB[0], TABLE_H + 0.05 + 0.17, LAB[2] + CARD_Z], 0.44, 0.34);
      break;
    }
    case "bus": {
      if (f < W(178, 3)) {
        const wave = t >= W1(180) - 0.3 ? q(0.5 + 0.5 * Math.sin(t * 6), 10) : undefined;
        front(out, cam, P(40, modernKid(0), "kid0"), -49.5, G + PV, 7.3, { mode: "stand", expr: wave !== undefined ? "laugh" : "smile", wave, look: -1 }, t);
        front(out, cam, P(41, LD[4], "ld4"), -48.7, G + PV, 7.7, { mode: "stand", expr: "smile_closed", look: -1 }, t);
        walker(out, cam, P(42, LD[5], "ld5"), -38 - 1.0 * t + 56, -7.8, -1, t);
      }
      break;
    }
    default: break;
  }
  return out;
};
void bodyFront; void bodySide; void fxPuff; void MUSEUM; void SEW_Y; void STRIKE_T; void breath;
