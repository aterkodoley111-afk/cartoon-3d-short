// Our cast as lit flat sprites in the 3D world (the bridge short's card system: pooled canvases, cardShade lighting,
// contact blobs, blinks, reaction lead) staged for the Molasses Flood. stage() returns everything with a face, plus
// effect cards, for shot `id` at time t.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxPuff, fxContact, fxShadow, fxWatch, Outfit, Expr, FrontOpts, SideOpts,
  FIREMAN, STEEL, PHOTOG, EDITOR, SENATOR, reader69, FISHER, modernKid, fxFlame, fxSmoke, fxSpark, fxStream, fxOldPhoto, fxMatch, fxSoup, fxLaw, fxGull, fxFish,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, W, Ws, setAt, D0, OFFICE, KITCHEN, CAPITOL, PIPE_OIL, PIPE_GREASE, IGN, FIREMAN_AT, WORKER_AT, TALLY_AT, WATCH_AT,
  PHOTO_AT, STREET_AT, FISH_AT, GULL_AT, fireR, outAt, sparkAt, photogX, SPARK_T0, LAND_T, boatAt, FLASH_T, DUST_T, SEAL_T, PHONE_T, OUT_T1,
} from "./story";
import { STACKS } from "./world";
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
const FM = [0, 1, 2, 3, 4].map((v) => FIREMAN(v)), ST = [0, 1, 2].map((v) => STEEL(v)), RD = [0, 1, 2, 3, 4, 5].map((v) => reader69(v));
const FRIEND: Outfit = { ...modernKid(1), build: "adult", hat: "hair", hair: "#2a1e1a" };
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

// ---------------- the fire: flame cards on a jittered grid over the junk raft, smoke above ----------------
type FP = { x: number; z: number; d: number; s: number; h: number };
const FLAMES: FP[] = (() => {
  const out: FP[] = [];
  let i = 0;
  for (let x = -25; x <= 3.5; x += 1.9) for (let z = -12.8; z <= 10.5; z += 1.9) {
    const px = x + (hh(i, 21) - 0.5) * 1.4, pz = z + (hh(i, 22) - 0.5) * 1.4;
    const nearPiles = Math.abs(px + 0.6) < 3.2;
    out.push({ x: px, z: pz, d: Math.hypot(px - IGN[0], pz - IGN[2]), s: i % 4, h: (nearPiles ? 2.6 : 1.5) + 1.3 * hh(i, 23) });
    i++;
  }
  return out;
})();
/** time since the flame front reached distance d */
const fireAge = (tau: number, d: number) => {
  if (fireR(tau) < d) return -1;
  // invert fireR by bisection (monotone)
  let lo = 0, hi = tau;
  for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (fireR(m) >= d) hi = m; else lo = m; }
  return tau - hi;
};
const flames = (out: Stage, cam: CamInfo, t: number, tau: number, outK: (x: number) => number, smokeOnly = false) => {
  FLAMES.forEach((p, i) => {
    const age = smokeOnly ? 99 : fireAge(tau, p.d);
    if (age < 0) return;
    const ok = Math.hypot(cam.pos.x - p.x, cam.pos.z - p.z) > 3.2;
    const o = outK(p.x), g = smooth(age / 0.45) * (1 - o);
    if (g > 0.03 && ok) {
      const h = p.h * g * (0.9 + 0.12 * Math.sin(t * 7 + i)), w = h * 0.62;
      const ph = q(((t * 2.4 + hh(i, 24)) % 1), 8);
      fxCard(out, `flame${ph}|${p.s}`, 300, 500, (pp) => fxFlame(pp, ph, p.s), p.x, h * 0.5 - 0.03, p.z, w, h);
    }
    // smoke: dark while burning, pale steam as it goes out
    if (i % 3 === 0 && (g > 0.2 || o > 0.05) && Math.hypot(cam.pos.x - p.x, cam.pos.z - p.z) > 10) {
      const u = q(((t * 0.3 + hh(i, 25)) % 1), 16), steam = o > 0.5;
      const life = smokeOnly ? 0.5 : 1;
      const sz = (steam ? 2.2 : 3.2) + 5 * u;
      fxCard(out, `smoke${u}|${steam ? 1 : 0}|${life}`, 300, 300, (pp) => fxSmoke(pp, u, steam ? "226,226,230" : "58,54,58", steam ? 0.6 * life : 0.7), p.x + 2.5 * u, (steam ? 0.6 : p.h) + 7 * u, p.z - 1.5 * u, sz, sz * 0.9, 0, true);
    }
  });
};
/** the mills' smokestacks puffing (1969) */
const stackSmoke = (out: Stage, t: number) => {
  STACKS.forEach(([x, , z], i) => {
    const h = 34 + (i % 3) * 7;
    for (let k = 0; k < 4; k++) {
      const u = q(((t * 0.12 + k / 4 + hh(i, 31)) % 1), 16);
      const sz = 5 + 13 * u;
      fxCard(out, `stack${u}`, 300, 300, (pp) => fxSmoke(pp, u, "112,106,108", 0.8), x + 14 * u, D0 + h + 2 + 9 * u, z + 3 * u, sz, sz * 0.85, 0, true);
    }
  });
};

export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const set = setAt(id, f), G = D0;
  if (set === "flats") stackSmoke(out, t);
  if (s.fire && set === "flats") flames(out, cam, t, s.fire(t), (x) => (s.out ? outAt(s.out(t), x) : 0));
  if (s.smokeOnly) flames(out, cam, t, 99, () => 1, true);
  switch (s.crowd) {
    case "hook": {
      if (t >= Ws(8) - 0.2) {
        const e: Expr = t < W1(12) ? "neutral" : "whistle";
        front(out, cam, P(1, FM[0], "fm0"), FIREMAN_AT[0], G, FIREMAN_AT[2], { mode: "stand", expr: e, look: t < W1(12) ? -1 : 0, headTilt: t < W1(12) ? 0 : 4 }, t);
      }
      break;
    }
    case "proud": {
      const proud = t >= W1(27);
      front(out, cam, P(2, ST[1], "st1"), WORKER_AT[0], G, WORKER_AT[2], { mode: "stand", expr: proud ? "grin" : "smile", wave: proud ? q(0.5 + 0.5 * Math.sin(t * 5), 10) : undefined }, t);
      front(out, cam, P(3, ST[0], "st0"), WORKER_AT[0] - 0.8, G, WORKER_AT[2] - 0.6, { mode: "stand", expr: proud ? "smile_closed" : "neutral", look: 1 }, t);
      break;
    }
    case "pipes": {
      const oil = t < Ws(37) - 0.1 || f >= W(39) - 3, grease = t >= Ws(37) - 0.4 && f < W(39) - 3;
      const ph = q((t * 1.6) % 1, 8);
      if (oil && f < W(39) - 3) fxCard(out, `oil${ph}`, 160, 600, (pp) => fxStream(pp, "#1e1a1c", ph), PIPE_OIL[0], PIPE_OIL[1] * 0.5 - 0.05, PIPE_OIL[2] + 0.15, 0.55, PIPE_OIL[1] + 0.1);
      if (grease) fxCard(out, `grease${ph}`, 160, 600, (pp) => fxStream(pp, "#c9a24a", ph, 40), PIPE_GREASE[0], PIPE_GREASE[1] * 0.5 - 0.05, PIPE_GREASE[2] + 0.15, 0.6, PIPE_GREASE[1] + 0.1);
      for (const [p, col] of [[PIPE_OIL, "#1e1a1c"], [PIPE_GREASE, "#b08a3a"]] as [V3, string][]) {
        const k = 0.8 + 0.2 * Math.sin(t * 2);
        out.fx.push({ key: `plume${col}`, cw: 300, ch: 300, draw: (pp) => { pp.ell(150, 150, 140, 120, col, 0); pp.ell(110, 120, 50, 26, "rgba(255,255,255,0.18)", 0); }, x: p[0], y: 0.035, z: p[2] + 1.6, w: 3.4 * k, h: 3.0 * k, flat: true });
      }
      if (f >= W(39) - 3) fxCard(out, "gull", 300, 300, fxGull, GULL_AT[0], GULL_AT[1] + 0.22, GULL_AT[2], 0.5, 0.5);
      break;
    }
    case "tally": {
      const k = smooth((f - W(54)) / Math.max(1, W(57) + 6 - W(54)));
      front(out, cam, P(4, FM[1], "fm1"), TALLY_AT[0] + 1.25, G, TALLY_AT[2] - 0.6, { mode: "stand", expr: t >= W1(55) ? "smile" : "neutral", prop: ["pen", q(0.35 + 0.4 * (k > 0 && k < 1 ? 0.5 + 0.5 * Math.sin(t * 14) : 0), 10)], facing: -1, look: -1 }, t);
      front(out, cam, P(5, FM[2], "fm2"), TALLY_AT[0] - 0.95, G, TALLY_AT[2] - 1.0, { mode: "sit", expr: t >= W1(55) ? "whistle" : "neutral", look: 1 }, t);
      break;
    }
    case "spark": {
      if (t >= SPARK_T0 - 0.1 && t < SPARK_T0 + 0.25) { const u = clamp01((t - SPARK_T0 + 0.1) / 0.35); fxCard(out, `wburst${q(u, 10)}`, 500, 500, (pp) => fxBurst(pp, q(u, 10), "#ffb02e", 9, 20, 160), -1.75, DECK0 + 0.5, -4.2, 0.6, 0.6); }
      const sp = sparkAt(t);
      if (sp) { fxCard(out, "spark", 200, 200, fxSpark, sp[0], sp[1], sp[2], 0.6, 0.6, t * 6);
        for (let k = 1; k <= 3; k++) { const pk = sparkAt(t - k * 0.05); if (pk) fxCard(out, "spark", 200, 200, fxSpark, pk[0], pk[1], pk[2], 0.45 - k * 0.1, 0.45 - k * 0.1, t * 6 + k); } }
      break;
    }
    case "boat": {
      const b = boatAt(t);
      if (setAt(id, f) === "flats" && f < W(85) - 3) {
        front(out, cam, P(6, FM[3], "fm3"), b[0] - 2.6, 1.4, b[2] + 0.5, { mode: "stand", expr: "stern", prop: "armsUp" }, t, 0.95, 0);
        front(out, cam, P(7, FM[4], "fm4"), b[0] - 1.4, 1.4, b[2] - 0.6, { mode: "stand", expr: "nervous", look: -1 }, t, 0.95, 0);
        if (t > Ws(80) + 1.2) for (let k = 0; k < 3; k++) { const u = q(((t * 1.6 + k / 3) % 1), 12); fxCard(out, `splash${u}`, 300, 300, (pp) => fxSmoke(pp, u, "236,244,250", 0.9), IGN[0] + 3 - 3 * k, 0.6 + 1.6 * u, IGN[2] + k, 1.6 + 2 * u, 1.4 + 2 * u, 0, true); }
      } else {
        front(out, cam, P(8, FM[0], "fm0"), WATCH_AT[0], G, WATCH_AT[2], { mode: "stand", expr: t >= W1(87) ? "grin" : "smile", prop: "point", look: 1 }, t);
        fxCard(out, "watchBig", 400, 460, fxWatch, WATCH_AT[0] + 0.5, G + 1.2, WATCH_AT[2] + 1.3, 0.28, 0.32);
      }
      break;
    }
    case "photog": {
      const arrive = Ws(93) - 0.2;
      if (t < arrive) {
        const x = photogX(t);
        const so: SideOpts = { mode: "march", phase: q((t * 2.4) % 1, 30), expr: "grin", stomp: 1.1, stride: 0.9 };
        out.places.push(person(cam, P(9, PHOTOG, "pg"), x, G, PHOTO_AT[2], { side: true, mirror: true }, {}, { ...so, blink: lidAt(t, 9) }));
        blob(out, x, G, PHOTO_AT[2]);
      } else {
        const flash = t >= FLASH_T;
        const e: Expr = t < W1(94) ? "shock" : t < W1(97) ? "pained" : flash ? "dazed" : "nervous";
        front(out, cam, P(9, PHOTOG, "pg"), PHOTO_AT[0], G, PHOTO_AT[2], { mode: "stand", expr: e, prop: "camera", look: -1 }, t);
        if (flash && t < FLASH_T + 0.25) { const u = (t - FLASH_T) / 0.25; fxCard(out, `flash${q(u, 10)}`, 500, 500, (pp) => fxBurst(pp, q(u, 10), "#ffffff", 12), PHOTO_AT[0] + 0.12, G + 1.95, PHOTO_AT[2] + 0.2, 0.9, 0.9); }
      }
      // firemen rolling up the hose in the background
      front(out, cam, P(10, FM[2], "fm2"), PHOTO_AT[0] - 3.4, G, PHOTO_AT[2] - 0.5, { mode: "stand", expr: "neutral", look: 1 }, t);
      front(out, cam, P(11, FM[4], "fm4"), PHOTO_AT[0] - 4.3, G, PHOTO_AT[2] - 0.3, { mode: "stand", expr: "smile_closed" }, t);
      break;
    }
    case "editor": {
      if (f < W(109) - 3) {
        const old = t >= W1(106);
        front(out, cam, P(12, EDITOR, "ed"), OFFICE[0] + 0.25, G, OFFICE[2] + 3.6, { mode: "stand", expr: old ? "grin" : "stern", prop: "photo", look: -1 }, t, 1, 0);
      } else {
        const dust = t < DUST_T ? 1 : 0;
        fxCard(out, `oldphoto${dust}`, 760, 600, (pp) => fxOldPhoto(pp, dust), OFFICE[0], G + 1.27, OFFICE[2] + 2.85, 0.44, 0.35);
        if (t >= DUST_T && t < DUST_T + 0.8) { const u = q((t - DUST_T) / 0.8, 12); fxCard(out, `dust${u}`, 300, 300, (pp) => fxPuff(pp, u), OFFICE[0] + 0.05, G + 1.3, OFFICE[2] + 2.75, 0.45, 0.45, 0, true); }
      }
      break;
    }
    case "match": {
      if (set === "kitchen" && f < W(124) - 3) {
        const u = t < Ws(119) ? 0 : clamp01((t - Ws(119)) / (Ws(123) - Ws(119)) * 0.62 + (t > Ws(123) ? (t - Ws(123)) * 0.6 : 0));
        fxCard(out, `match${q(u, 30)}`, 700, 900, (pp) => fxMatch(pp, q(u, 30)), KITCHEN[0], G + 1.27, KITCHEN[2] + 2.95, 0.42, 0.54);
      } else if (set === "kitchen") {
        const u = q((t - Ws(124)) / 8, 40);
        fxCard(out, `soup${u}`, 900, 700, (pp) => fxSoup(pp, u), KITCHEN[0], G + 1.05, KITCHEN[2] + 2.95, 0.5, 0.39);
      } else {
        const ph = q((t * 1.6) % 1, 8);
        fxCard(out, `oil${ph}`, 160, 600, (pp) => fxStream(pp, "#1e1a1c", ph), PIPE_OIL[0], PIPE_OIL[1] * 0.5 - 0.05, PIPE_OIL[2] + 0.15, 0.55, PIPE_OIL[1] + 0.1);
      }
      break;
    }
    case "readers": {
      if (set === "flats") {
        const xs = [-1.05, -0.35, 0.35, 1.05], ex: Expr[] = ["shock", "nervous", "shock", "pained"];
        xs.forEach((dx, i) => {
          const e: Expr = t < W1(147) + 0.15 * i ? "neutral" : ex[i];
          front(out, cam, P(20 + i, RD[i], `rd${i}`), STREET_AT[0] + dx, G, STREET_AT[2] + (i % 2) * 0.35, { mode: "stand", expr: e, prop: "magazine", headTilt: e === "neutral" ? 6 : 0 }, t);
        });
      } else if (f < W(159) - 3) {
        front(out, cam, P(30, SENATOR, "sen"), CAPITOL[0] + 0.25, G, CAPITOL[2] + 3.6, { mode: "stand", expr: "smile_closed", prop: ["pen", q(0.7 + 0.15 * Math.sin(t * 7), 20)], look: -1 }, t, 1, 0);
      } else {
        const sign = q(smooth((t - Ws(159)) / (SEAL_T - 0.15 - Ws(159))), 20), seal = t >= SEAL_T ? 1 : 0;
        fxCard(out, `law0${seal}`, 1000, 720, (pp) => fxLaw(pp, 0, seal), CAPITOL[0], G + 1.27, CAPITOL[2] + 2.85, 0.44, 0.32);
        if (t >= SEAL_T && t < SEAL_T + 0.25) { const u = (t - SEAL_T) / 0.25; fxCard(out, `burst${q(u, 10)}`, 500, 500, (pp) => fxBurst(pp, q(u, 10), "#fff3b0"), CAPITOL[0] + 0.25, G + 1.2, CAPITOL[2] + 2.8, 0.35, 0.35); }
      }
      break;
    }
    case "fisher": {
      const hold = t >= W1(177);
      front(out, cam, P(40, FISHER, "fish"), FISH_AT[0], G, FISH_AT[2], { mode: "stand", expr: hold ? "grin" : t >= W1(175) ? "shock" : "smile_closed", prop: hold ? "fish" : ["rod", q(t >= Ws(175) ? 0.6 + 0.4 * Math.sin(t * 9) : 0.1, 10)], look: -1 }, t);
      front(out, cam, P(41, FRIEND, "friend"), FISH_AT[0] - 0.75, G, FISH_AT[2] + 0.6, { mode: "stand", expr: t >= PHONE_T ? "laugh" : "smile", prop: "phone", facing: 1 }, t);
      if (!hold && t >= Ws(175) - 0.2) { const u = q((t - Ws(175) + 0.2) % 1, 12), y = 0.15 + 0.9 * Math.sin(Math.PI * clamp01((t - Ws(175) + 0.2) / 1.0)); fxCard(out, `fishj${u}`, 400, 260, (pp) => fxFish(pp, u), FISH_AT[0] + 1.6, y, FISH_AT[2] - 2.6, 0.5, 0.33, 0.4); }
      if (t >= PHONE_T && t < PHONE_T + 0.2) { const u = (t - PHONE_T) / 0.2; fxCard(out, `pflash${q(u, 10)}`, 500, 500, (pp) => fxBurst(pp, q(u, 10), "#ffffff", 10), FISH_AT[0] - 0.65, G + 1.6, FISH_AT[2] + 0.75, 0.4, 0.4); }
      break;
    }
    default: break;
  }
  return out;
};
const DECK0 = 6.0;
void OUT_T1; void KITCHEN;
