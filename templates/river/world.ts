// The whole place as one three.js scene: the Cleveland Flats on 22 June 1969 (the Cuyahoga between bulkheads, the
// steel mills and smokestacks on the north bank, the Norfolk & Western wooden trestle, a train, the oil slick and a
// raft of logs/tires/junk jammed against the piles, the fireboat, the firehouse, a street of houses), the same river
// today (clean water, trees, a kayak), and three small interior sets for the inserts (newsroom, kitchen, Washington
// office). update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, prop, setSight, Kit, Ray, quad } from "./build";
import { ctex, rep, planksHD, cobbleHD, grassHD, stoneHD, cloudHD, facadeHD, brick } from "./paint";
import { Pen, fxTally } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, D0, SHOTS, camAt, V3, smooth, clamp01, ShotDef, setAt, W, Ws, BANK_N, BANK_S, DECK, OFFICE, KITCHEN, CAPITOL,
  PIPE_OIL, PIPE_GREASE, TALLY_AT, BOAT0, boatAt, OUT_T0, OUT_T1, IGN, STREET_AT, GULL_AT,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here
const G = D0;

// ---------------- painted textures ----------------
const riverTex = (key: string, base: string, light: string, dark: string, strokes = true) => ctex("river" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  if (!strokes) { for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? light : dark; g.beginPath(); g.ellipse(r() * 512, r() * 512, 40 + r() * 90, 20 + r() * 40, r() * 3, 0, 7); g.fill(); } return; }
  for (let i = 0; i < 60; i++) { g.fillStyle = r() > 0.5 ? light : dark; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 70, 6 + r() * 10, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = r() > 0.4 ? light : dark; g.lineWidth = 3; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 5, x + 30, y); g.stroke(); }
});
/** the slick: near-black oil with brown patches and faint rainbow swirls, ragged transparent edges */
const slickTex = () => ctex("slick", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  g.fillStyle = "#2c2622";
  g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, rr = 470 + 40 * Math.sin(a * 5 + 1) + 25 * Math.sin(a * 11); const x = 512 + rr * Math.cos(a) * 1.0, y = 512 + rr * Math.sin(a); if (i) g.lineTo(Math.max(4, Math.min(1020, x)), Math.max(4, Math.min(1020, y))); else g.moveTo(x, y); }
  g.fill();
  for (let i = 0; i < 70; i++) { g.fillStyle = r() > 0.5 ? "rgba(90,70,50,0.45)" : "rgba(20,16,16,0.5)"; g.beginPath(); g.ellipse(80 + r() * 860, 80 + r() * 860, 30 + r() * 110, 12 + r() * 40, r() * 3, 0, 7); g.fill(); }
  const cols = ["rgba(120,80,110,0.22)", "rgba(70,110,120,0.22)", "rgba(130,120,70,0.22)"];
  for (let i = 0; i < 40; i++) { g.strokeStyle = cols[i % 3]; g.lineWidth = 3; const x = 120 + r() * 780, y = 120 + r() * 780; g.beginPath(); g.arc(x, y, 20 + r() * 50, r() * 3, r() * 3 + 2.5); g.stroke(); }
});
const corrTex = (key: string, col: string, dark: string) => ctex("corr" + key, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = dark; g.fillRect(x, 0, 5, 512); }
  for (let i = 0; i < 18; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,60,30,0.25)" : "rgba(30,25,25,0.2)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 40 + r() * 120, 0, 0, 7); g.fill(); }
  g.fillStyle = "rgba(25,22,25,0.6)"; for (let y = 120; y < 512; y += 200) g.fillRect(0, y, 512, 8);
});
const stackTex = (key: string, col: string) => ctex("stack" + key, 256, 1024, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 1024);
  g.fillStyle = "rgba(20,18,20,0.75)"; g.fillRect(0, 0, 256, 70); for (let y = 200; y < 1024; y += 210) g.fillRect(0, y, 256, 14);
  g.fillStyle = "rgba(255,255,255,0.06)"; for (let y = 0; y < 1024; y += 24) g.fillRect(0, y, 256, 2);
});
const woodTex = () => ctex("trestleWood", 256, 256, (g, r) => {
  g.fillStyle = "#7a5634"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { g.strokeStyle = r() > 0.5 ? "rgba(40,24,14,0.5)" : "rgba(160,120,80,0.3)"; g.lineWidth = 2 + r() * 2; const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + (r() - 0.5) * 12); g.stroke(); }
  g.fillStyle = "rgba(20,15,10,0.35)"; g.fillRect(0, 0, 256, 8); g.fillRect(0, 248, 256, 8);
});
const concreteTex = () => stoneHD("bulkhead", ["#9c958a", "#a39c91", "#958e84", "#aaa398"], "#6e6860");
const loco = () => ctex("loco", 1024, 256, (g) => {
  g.fillStyle = "#2b2b33"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#e8c03a"; g.fillRect(0, 180, 1024, 16);
  g.fillStyle = "#3a3a44"; for (let x = 60; x < 1000; x += 120) g.fillRect(x, 40, 70, 100);
  g.strokeStyle = "rgba(10,10,12,0.8)"; g.lineWidth = 6; for (let x = 60; x < 1000; x += 120) g.strokeRect(x, 40, 70, 100);
});
const boxcar = (key: string, col: string) => ctex("boxcar" + key, 1024, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < 1024; x += 40) g.fillRect(x, 0, 4, 256);
  g.fillStyle = "rgba(20,15,15,0.55)"; g.fillRect(420, 30, 190, 210); g.strokeStyle = "#1d1b22"; g.lineWidth = 6; g.strokeRect(420, 30, 190, 210);
});
const doorsTex = () => ctex("fireDoors69", 512, 512, (g) => {
  g.fillStyle = "#b5543c"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#c0353a"; g.fillRect(60, 120, 392, 392); g.strokeStyle = "#f2e6c8"; g.lineWidth = 12; g.strokeRect(60, 120, 392, 392);
  g.fillStyle = "#9cc4ea"; for (let x = 90; x < 430; x += 90) g.fillRect(x, 160, 60, 70);
  g.strokeStyle = "rgba(30,15,10,0.6)"; g.lineWidth = 5; g.beginPath(); g.moveTo(256, 120); g.lineTo(256, 512); g.stroke();
});
const wallpaper = (key: string, a: string, b: string) => ctex("wp" + key, 512, 512, (g) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  g.fillStyle = b; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 18, 512);
});
const panelTex = () => ctex("panels", 512, 512, (g) => {
  g.fillStyle = "#6e4228"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) for (let y = 0; y < 512; y += 256) {
    g.fillStyle = "#7d4c2e"; g.fillRect(x + 14, y + 14, 100, 228);
    g.strokeStyle = "rgba(30,15,10,0.6)"; g.lineWidth = 4; g.strokeRect(x + 14, y + 14, 100, 228);
  }
});
const windowTex = () => ctex("roomWindow", 256, 320, (g) => {
  g.fillStyle = "#f2ead8"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#9cc4ea"; g.fillRect(24, 24, 208, 272);
  g.fillStyle = "#f2ead8"; g.fillRect(124, 24, 8, 272); g.fillRect(24, 156, 208, 8);
  g.strokeStyle = "#3a2a22"; g.lineWidth = 6; g.strokeRect(21, 21, 214, 278);
});
const flagTex = () => ctex("usFlag", 380, 200, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f6f3ec" : "#b8323a"; g.fillRect(0, (i * 200) / 13, 380, 200 / 13 + 1); }
  g.fillStyle = "#2e3f75"; g.fillRect(0, 0, 160, (7 * 200) / 13);
  g.fillStyle = "#f6f3ec"; for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { g.beginPath(); g.arc(13 + c * 27 + (r % 2) * 13.5, 9 + r * 11.5, 3, 0, 7); g.fill(); }
});
const magRack = () => ctex("magRack", 512, 256, (g) => {
  g.fillStyle = "#3f5a3a"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6; i++) { const x = 18 + i * 82; g.fillStyle = i % 2 ? "#d23b30" : "#e8d8b0"; g.fillRect(x, 30, 66, 90); g.fillStyle = "#e8e2d4"; g.fillRect(x + 8, 46, 50, 62); g.fillStyle = "rgba(30,30,40,0.6)"; for (let k = 0; k < 3; k++) g.fillRect(x + 12, 56 + k * 16, 42, 6); }
  for (let i = 0; i < 6; i++) { const x = 18 + i * 82; g.fillStyle = ["#e8d8b0", "#5a8ac0", "#f6f3ec"][i % 3]; g.fillRect(x, 140, 66, 90); g.fillStyle = "rgba(30,30,40,0.6)"; for (let k = 0; k < 4; k++) g.fillRect(x + 8, 156 + k * 16, 50, 6); }
});

/** every outdoor lens position looking at its subject (the sight-line culler leaves out houses in the way) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    const set = setAt(s.id, Math.max(0, f));
    if (set !== "flats" && set !== "today") continue;
    const c = camAt(s.id, Math.max(0, f));
    if (c.pos[0] > 200) continue;
    const o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** the junk raft: logs, tires, barrels, planks, crates jammed against the upstream face of the trestle */
type Junk = { m: THREE.Object3D; x: number; z: number; arrive: number; spin: number };
export const STACKS: V3[] = [[-28, 0, -29], [-20, 0, -30.5], [-12, 0, -29], [6, 0, -30], [13, 0, -31], [20, 0, -29.5], [44, 0, -31], [52, 0, -30], [-60, 0, -30], [80, 0, -31]];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private outdoor = new THREE.Group(); private y1969 = new THREE.Group(); private today = new THREE.Group();
  private sets: Record<"office" | "kitchen" | "capitol", THREE.Group> = { office: new THREE.Group(), kitchen: new THREE.Group(), capitol: new THREE.Group() };
  private water: THREE.Mesh; private water69: THREE.Material; private waterNow: THREE.Material;
  private slick: THREE.Mesh; private junk: Junk[] = [];
  private train = new THREE.Group(); private boat = new THREE.Group();
  private sprays: THREE.Mesh[] = []; private sprayMat: THREE.MeshBasicMaterial;
  private tally: { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; key: string };

  constructor(_kit: Kit) {
    const R = this.root;
    R.add(this.outdoor, this.sets.office, this.sets.kitchen, this.sets.capitol);
    this.outdoor.add(this.y1969, this.today);
    // ---- sky + light (as the bridge short) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    const disc = ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    setSight(sightLines());

    // ---- both eras: banks, bulkheads, river, trestle, mills, skyline, firehouse, street ----
    const b = new Batch();
    const cob = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const conc = lam("bulkhead", () => ({ map: rep(concreteTex(), 1, 1) }));
    b.add(quadUp(-500, 500, -500, BANK_N, 120, 120), lam("yardDirt", () => ({ map: rep(dirtTex(), 120, 120) })));
    b.add(quadUp(-500, 500, BANK_S, 500, 120, 120), cob);
    for (const z of [BANK_N, BANK_S]) {
      const s = z < 0 ? 1 : -1; // wall faces the river
      for (let x0 = -500; x0 < 500; x0 += 50) b.add(quad(V(s > 0 ? x0 : x0 + 50, -2, z), V(s > 0 ? x0 + 50 : x0, -2, z), V(s > 0 ? x0 + 50 : x0, G, z), V(s > 0 ? x0 : x0 + 50, G, z), 12, 1.2), conc);
      b.add(boxGeo(V(-500, G, z - (s > 0 ? 0.5 : 0)), V(500, G + 0.25, z + (s > 0 ? 0 : 0.5))), lam("copeConc", () => ({ color: "#b8b0a2" })));
      for (let x = -300; x <= 300; x += 9) b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 10), lam("bollard", () => ({ color: "#3a3d47" })), new THREE.Matrix4().makeTranslation(x + 4, G + 0.3, z - s * 0.8));
    }
    this.water69 = twoTone(new THREE.MeshLambertMaterial({ map: rep(riverTex("69c", "#4c4636", "rgba(110,104,92,0.3)", "rgba(36,32,26,0.3)", false), 50, 50) }), 0.6);
    this.waterNow = twoTone(new THREE.MeshLambertMaterial({ map: rep(riverTex("now", "#2f8a92", "rgba(150,225,230,0.55)", "rgba(20,80,100,0.45)"), 50, 50) }), 0.6);
    this.water = new THREE.Mesh(quadUp(-900, 900, BANK_N - 2, BANK_S + 2, 1, 1, -G), this.water69);
    this.water.receiveShadow = true; R.add(this.water);
    this.outdoor.add(this.water);

    // the wooden trestle (x = 0), bents every 3.6 m from bank to bank and out over both banks
    const wood = lam("trestleWood", () => ({ map: woodTex() }));
    const iron = lam("railIron", () => ({ color: "#4a4650" }));
    for (let z = -46.8; z <= 46.8; z += 3.6) {
      const y0 = Math.abs(z) < 14 ? -2 : G, top = DECK - 0.75;
      for (const x of [-1.6, -0.55, 0.55, 1.6]) b.add(new THREE.CylinderGeometry(0.17, 0.2, top - y0, 8), wood, new THREE.Matrix4().makeTranslation(x + 0.08 * Math.sign(x) * 0, (top + y0) / 2, z));
      b.add(boxGeo(V(-2.0, top - 0.32, z - 0.2), V(2.0, top, z + 0.2)), wood);
      const yb = Math.max(y0, -0.4) + 0.2, h = top - 0.35 - yb;
      if (h > 1.2) for (const sgn of [1, -1]) {
        const brace = new THREE.BoxGeometry(Math.hypot(3.4, h), 0.22, 0.1); brace.rotateZ(sgn * Math.atan2(h, 3.4));
        b.add(brace, wood, new THREE.Matrix4().makeTranslation(0, yb + h / 2, z + 0.22 * sgn));
      }
    }
    b.add(boxGeo(V(-1.9, DECK - 0.75, -48), V(-1.4, DECK - 0.35, 48)), wood); b.add(boxGeo(V(1.4, DECK - 0.75, -48), V(1.9, DECK - 0.35, 48)), wood);
    b.add(boxGeo(V(-0.9, DECK - 0.75, -48), V(0.9, DECK - 0.4, 48)), wood);
    for (let z = -47.7; z < 48; z += 0.62) b.add(boxGeo(V(-1.7, DECK - 0.35, z - 0.12), V(1.7, DECK - 0.2, z + 0.12)), lam("ties", () => ({ color: "#5a3e28" })));
    for (const x of [-0.72, 0.72]) b.add(boxGeo(V(x - 0.05, DECK - 0.2, -48), V(x + 0.05, DECK, 48)), iron);
    // embankments carrying the line away from the river
    for (const s of [-1, 1]) b.add(boxGeo(V(-3.5, G, s > 0 ? 48 : -160), V(3.5, DECK - 0.35, s > 0 ? 160 : -48)), lam("ballast", () => ({ color: "#8a7f72" })));

    // steel mills (north bank): long sheds, blast furnace, ore piles, smokestacks
    const corrA = lam("corrA", () => ({ map: rep(corrTex("A", "#8a5a42", "rgba(40,25,20,0.5)"), 4, 1) }));
    const corrB = lam("corrB", () => ({ map: rep(corrTex("B", "#7d8088", "rgba(30,30,35,0.45)"), 4, 1) }));
    const roofM = lam("millRoof", () => ({ color: "#4a4650", side: THREE.DoubleSide }));
    for (const [x0, x1, z0, z1, h, m] of [[-75, -36, -70, -35, 15, corrA], [-32, -4, -68, -35, 18, corrB], [4, 34, -74, -35, 16, corrA], [40, 78, -72, -35, 20, corrB],
      [-120, -82, -70, -35, 14, corrB], [86, 130, -74, -36, 17, corrA]] as [number, number, number, number, number, THREE.Material][]) {
      b.add(boxGeo(V(x0, G, z0), V(x1, G + h, z1)), m);
      const zc = (z0 + z1) / 2;
      b.add(quad(V(x0 - 0.5, G + h, z1 + 0.5), V(x1 + 0.5, G + h, z1 + 0.5), V(x1 + 0.5, G + h + 4, zc), V(x0 - 0.5, G + h + 4, zc)), roofM);
      b.add(quad(V(x1 + 0.5, G + h, z0 - 0.5), V(x0 - 0.5, G + h, z0 - 0.5), V(x0 - 0.5, G + h + 4, zc), V(x1 + 0.5, G + h + 4, zc)), roofM);
    }
    const stackM = lam("stackBrick", () => ({ map: stackTex("b", "#9a5040") })), stackM2 = lam("stackGrey", () => ({ map: stackTex("g", "#6e6a6e") }));
    STACKS.forEach(([x, , z], i) => {
      const h = 34 + (i % 3) * 7, r = 1.3 + (i % 2) * 0.4;
      b.add(new THREE.CylinderGeometry(r * 0.8, r * 1.15, h, 18), i % 2 ? stackM : stackM2, new THREE.Matrix4().makeTranslation(x, G + h / 2, z));
    });
    const furn = lam("furnace", () => ({ color: "#5a5258" }));
    b.add(new THREE.CylinderGeometry(4.5, 5.5, 26, 24), furn, new THREE.Matrix4().makeTranslation(-48, G + 13, -22));
    b.add(new THREE.ConeGeometry(4.5, 5, 24), furn, new THREE.Matrix4().makeTranslation(-48, G + 28.5, -22));
    for (const dx of [-7, 7]) b.add(new THREE.CylinderGeometry(2.2, 2.2, 20, 16), lam("stove", () => ({ color: "#8a8a92" })), new THREE.Matrix4().makeTranslation(-48 + dx, G + 10, -26));
    const ore = lam("ore", () => ({ color: "#a0563a" }));
    for (const [x, z, r, h] of [[-90, -22, 9, 7], [60, -22, 8, 6], [92, -24, 10, 7.5]]) b.add(new THREE.ConeGeometry(r, h, 20), ore, new THREE.Matrix4().makeTranslation(x, G + h / 2, z));
    // gantry crane over the ore dock
    const gm = lam("gantry", () => ({ color: "#c46a2a" }));
    for (const x of [64, 76]) for (const z of [-16.5, -26]) b.add(boxGeo(V(x - 0.4, G, z - 0.4), V(x + 0.4, G + 16, z + 0.4)), gm);
    b.add(boxGeo(V(62, G + 16, -27), V(78, G + 17.2, -15.5)), gm);
    b.add(boxGeo(V(68, G + 15, -13), V(71, G + 16, -32)), gm);

    // south bank: warehouses, the skyline downtown (+x, +z), the firehouse, a street of houses
    for (const [x0, x1, z0, z1, h, m] of [[40, 70, 34, 60, 11, corrB], [74, 110, 30, 55, 13, corrA], [-60, -30, 30, 54, 10, corrA], [-30, -12, 34, 50, 9, corrB]] as [number, number, number, number, number, THREE.Material][])
      b.add(boxGeo(V(x0, G, z0), V(x1, G + h, z1)), m);
    const tower = lam("towerStone", () => ({ color: "#d8cbb2" })), glassT = lam("officeBlock", () => ({ color: "#8fa2b8" }));
    const sky: [number, number, number, number, THREE.Material][] = [[220, 210, 22, 70, glassT], [250, 230, 26, 60, tower], [190, 250, 20, 48, glassT], [290, 205, 24, 55, glassT], [170, 190, 16, 36, tower]];
    for (const [x, z, w, h, m] of sky) b.add(boxGeo(V(x - w / 2, G, z - w / 2), V(x + w / 2, G + h, z + w / 2)), m);
    // the tall stepped tower downtown
    for (const [w, y0, y1] of [[30, 0, 40], [22, 40, 78], [16, 78, 104], [11, 104, 122], [7, 122, 134]]) b.add(boxGeo(V(240 - w / 2, G + y0, 180 - w / 2), V(240 + w / 2, G + y1, 180 + w / 2)), tower);
    b.add(new THREE.ConeGeometry(3.2, 12, 4), tower, new THREE.Matrix4().makeTranslation(240, G + 140, 180));
    // firehouse with the chalk tally on its river wall
    const fbr = lam("fireBrick", () => ({ map: facadeHD("fireSide69", 14, 8, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
    const fx0 = 26, fx1 = 42, fz0 = TALLY_AT[2] + 0.1, fz1 = fz0 + 12, fh = 8;
    b.add(quad(V(fx1, G, fz0), V(fx0, G, fz0), V(fx0, G + fh, fz0), V(fx1, G + fh, fz0)), fbr);
    b.add(quad(V(fx0, G, fz0), V(fx0, G, fz1), V(fx0, G + fh, fz1), V(fx0, G + fh, fz0)), fbr);
    b.add(quad(V(fx1, G, fz1), V(fx1, G, fz0), V(fx1, G + fh, fz0), V(fx1, G + fh, fz1)), fbr);
    b.add(quad(V(fx0, G + fh, fz0), V(fx1, G + fh, fz0), V(fx1, G + fh, fz1), V(fx0, G + fh, fz1)), lam("flatRoof", () => ({ color: "#5a5258", side: THREE.DoubleSide })));
    b.add(quad(V(40.6, G, fz0 - 0.03), V(36.4, G, fz0 - 0.03), V(36.4, G + 4.6, fz0 - 0.03), V(40.6, G + 4.6, fz0 - 0.03)), lam("fireDoors69", () => ({ map: doorsTex() })));
    b.add(boxGeo(V(fx0 - 0.3, G + fh, fz0 - 0.3), V(fx1 + 0.3, G + fh + 0.5, fz1 + 0.3)), lam("trimStone", () => ({ color: "#efe3c8" })));
    b.add(boxGeo(V(31, G, fz0 - 1.0), V(33, G + 0.45, fz0 - 0.6)), lam("benchWood", () => ({ color: "#8a5a34" })));
    // the street (houses facing the river, -z), lamp posts and a newsstand
    let r = 11;
    const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
    for (let x = -150; x < -66;) {
      const w = [7, 8, 9][Math.floor(rnd() * 3)], h = [8.4, 9.8, 11.2][Math.floor(rnd() * 3)];
      house(b, x + w / 2, STREET_AT[2] + 6 + 4.5, Math.PI, w, 9, h, Math.floor(rnd() * 8));
      x += w + 0.3;
    }
    const lampIron = lam("lampIron", () => ({ color: "#2f3340" }));
    for (let x = -150; x <= 150; x += 15) if (Math.abs(x) > 45) b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), lampIron, new THREE.Matrix4().makeTranslation(x, G + 2.2, BANK_S + 3.2));
    b.add(boxGeo(V(STREET_AT[0] + 1.1, G, STREET_AT[2] + 1.6), V(STREET_AT[0] + 2.7, G + 1.9, STREET_AT[2] + 2.6)), lam("standGreen", () => ({ color: "#3f5a3a" })));
    b.add(quad(V(STREET_AT[0] + 2.7, G + 0.2, STREET_AT[2] + 1.58), V(STREET_AT[0] + 1.1, G + 0.2, STREET_AT[2] + 1.58), V(STREET_AT[0] + 1.1, G + 1.7, STREET_AT[2] + 1.58), V(STREET_AT[0] + 2.7, G + 1.7, STREET_AT[2] + 1.58)), lam("magRack", () => ({ map: magRack() })));
    b.build(this.outdoor);

    // the tally card (canvas, redrawn when the chalk moves)
    const cv = document.createElement("canvas"); cv.width = 900; cv.height = 420;
    const tt = new THREE.CanvasTexture(cv); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8;
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.84), twoTone(new THREE.MeshLambertMaterial({ map: tt })));
    tm.position.set(TALLY_AT[0] - 0.4, TALLY_AT[1], TALLY_AT[2] - 0.02); tm.rotation.y = Math.PI; tm.receiveShadow = true;
    this.y1969.add(tm);
    this.tally = { cv, tex: tt, key: "" };

    // ---- 1969 only: pipes, the slick, the junk raft, the train, the fireboat + sprays ----
    const b69 = new Batch();
    const rust = lam("pipeRust", () => ({ color: "#7a4a32" }));
    for (const p of [PIPE_OIL, PIPE_GREASE]) {
      const g = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 20, 1, true); g.rotateX(Math.PI / 2);
      b69.add(g, lam("pipeRustDS", () => ({ color: "#6e4430", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(p[0], p[1], BANK_N + 0.1));
      b69.add(new THREE.TorusGeometry(0.47, 0.08, 8, 24), rust, new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]));
      b69.add(new THREE.CircleGeometry(0.44, 20), lam("pipeDark", () => ({ color: "#140f0e" })), new THREE.Matrix4().makeTranslation(p[0], p[1], p[2] - 0.6));
    }
    b69.build(this.y1969);
    this.slick = new THREE.Mesh(new THREE.PlaneGeometry(46, 28).rotateX(-Math.PI / 2).translate(23, 0, 0), twoTone(new THREE.MeshLambertMaterial({ map: slickTex(), transparent: true, depthWrite: false }), 0.6));
    this.slick.position.set(-38, 0.025, -0.2); this.slick.receiveShadow = true; this.slick.renderOrder = 0.2;
    this.y1969.add(this.slick);
    const logM = lam("log", () => ({ color: "#6a4a30" })), endM = lam("logEnd", () => ({ color: "#c9a06a" })), tireM = lam("tire", () => ({ color: "#26242a" }));
    const barM = lam("drum", () => ({ color: "#3f5a7a" })), barR = lam("drumR", () => ({ color: "#9a3a2e" })), plankM = lam("plankJunk", () => ({ color: "#9a7a52" })), crateM = lam("crate", () => ({ color: "#b0905a" }));
    for (let i = 0; i < 82; i++) {
      const k = i % 6, x = -0.9 - 24 * hash(i, 1) ** 1.6, z = -12.6 + 22 * hash(i, 2), yaw = hash(i, 3) * Math.PI;
      const gr = new THREE.Group(); let m: THREE.Mesh;
      if (k === 0 || k === 3) { const L = 2.5 + 3 * hash(i, 4), rr2 = 0.18 + 0.16 * hash(i, 5); m = new THREE.Mesh(new THREE.CylinderGeometry(rr2, rr2, L, 10), logM); m.rotation.z = Math.PI / 2; gr.add(m);
        for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(rr2 * 0.95, 10), endM); e.position.x = (s * L) / 2 + s * 0.005; e.rotation.y = (s * Math.PI) / 2; gr.add(e); } gr.position.y = rr2 * 0.4; }
      else if (k === 1) { m = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.15, 8, 20), tireM); m.rotation.x = Math.PI / 2 + 0.2 * hash(i, 6); gr.add(m); gr.position.y = 0.06; }
      else if (k === 2) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14), i % 4 ? barM : barR); m.rotation.z = Math.PI / 2; gr.add(m); gr.position.y = 0.15; }
      else if (k === 4) { m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), plankM); gr.add(m); gr.position.y = 0.05; }
      else { m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), crateM); m.rotation.set(0.3, 0, 0.2); gr.add(m); gr.position.y = 0.1; }
      gr.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      gr.rotation.y = yaw; gr.position.set(x, gr.position.y, z); gr.userData.y0 = gr.position.y;
      this.y1969.add(gr);
      this.junk.push({ m: gr, x, z, arrive: [Ws(40), Ws(41), Ws(43), Ws(40), Ws(43), Ws(43)][k] + 0.3 * hash(i, 7), spin: hash(i, 8) - 0.5 });
    }
    // the train: a diesel and boxcars, along +z on the deck (front at z = 0 of the group)
    const tb = new Batch(), wheel = lam("wheel", () => ({ color: "#1d1b22" }));
    const cars: [number, THREE.Material][] = [[17, lam("locoBody", () => ({ map: loco() }))], [14.5, lam("bcA", () => ({ map: boxcar("A", "#8a4a32") }))], [14.5, lam("bcB", () => ({ map: boxcar("B", "#6a5a3a") }))],
      [14.5, lam("bcC", () => ({ map: boxcar("C", "#8a4a32") }))], [14.5, lam("bcD", () => ({ map: boxcar("D", "#4a5a6a") }))], [14.5, lam("bcE", () => ({ map: boxcar("E", "#8a4a32") }))]];
    let z0 = 0;
    cars.forEach(([L, m], i) => {
      const zf = z0, zb = z0 - L, yb = DECK + 1.15;
      tb.add(sideBox(-1.5, 1.5, yb, yb + (i ? 3.4 : 2.8), zb, zf), m);
      if (i === 0) { tb.add(boxGeo(V(-1.5, yb + 2.8, zf - 4.2), V(1.5, yb + 3.9, zf - 1.0)), lam("cab", () => ({ color: "#2b2b33" }))); tb.add(boxGeo(V(-1.3, yb + 3.05, zf - 1.05), V(1.3, yb + 3.7, zf - 0.98)), lam("cabGlass", () => ({ color: "#9cc4ea" }))); }
      tb.add(boxGeo(V(-1.25, DECK + 0.55, zb + 0.6), V(1.25, yb, zf - 0.6)), lam("underframe", () => ({ color: "#26242a" })));
      for (const zz of [zf - 2.2, zf - 3.6, zb + 2.2, zb + 3.6]) for (const x of [-0.72, 0.72]) {
        const w = new THREE.CylinderGeometry(0.45, 0.45, 0.16, 18); w.rotateZ(Math.PI / 2);
        tb.add(w, wheel, new THREE.Matrix4().makeTranslation(x, DECK + 0.45, zz));
      }
      z0 = zb - 0.9;
    });
    tb.build(this.train);
    this.train.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.y1969.add(this.train);
    // fireboat: red hull pointed upstream (-x), white cabin, a monitor on the bow
    const bb = new Batch(), hull = lam("hullRed", () => ({ color: "#b5373a" }));
    bb.add(boxGeo(V(-4, -0.5, -2.1), V(6, 1.4, 2.1)), hull);
    const bow = new THREE.BufferGeometry();
    const P = [[-4, -0.5, -2.1], [-4, -0.5, 2.1], [-7.2, 1.4, 0], [-4, 1.4, -2.1], [-4, 1.4, 2.1]] as const;
    const pv = (i: number) => P[i];
    bow.setAttribute("position", new THREE.Float32BufferAttribute([0, 2, 3, 1, 4, 2, 3, 2, 4, 0, 1, 2].flatMap((i) => [...pv(i)]), 3)); bow.computeVertexNormals();
    bb.add(bow, lam("hullRedDS", () => ({ color: "#b5373a", side: THREE.DoubleSide })));
    bb.add(boxGeo(V(-4, 1.4, -2.15), V(6, 1.7, 2.15)), lam("gunwale", () => ({ color: "#f2efe6" })));
    bb.add(boxGeo(V(-0.5, 1.7, -1.5), V(4.5, 3.9, 1.5)), lam("cabin", () => ({ color: "#f2efe6" })));
    bb.add(boxGeo(V(-0.4, 3.0, -1.52), V(4.4, 3.6, 1.52)), lam("cabGlass", () => ({ color: "#9cc4ea" })));
    bb.add(new THREE.CylinderGeometry(0.35, 0.4, 1.8, 12), lam("funnel", () => ({ color: "#1d1b22" })), new THREE.Matrix4().makeTranslation(3, 4.8, 0));
    bb.add(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 10), lam("monitor", () => ({ color: "#d8b04a" })), new THREE.Matrix4().makeTranslation(-3.6, 2.4, 0));
    bb.add(boxGeo(V(-4.4, 3.0, -0.18), V(-3.4, 3.3, 0.18)), lam("monitor", () => ({ color: "#d8b04a" })));
    bb.build(this.boat);
    this.boat.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.y1969.add(this.boat);
    this.sprayMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e6f4ff") });
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), this.sprayMat); m.frustumCulled = false; this.sprays.push(m); this.y1969.add(m); }

    // ---- today: trees on both banks, grass strips, a railing, a kayak ----
    const bt = new Batch();
    bt.add(quadUp(-500, 500, BANK_S + 0.6, BANK_S + 6, 80, 2, 0.03), lam("grassHD", () => ({ map: grassHD() })));
    bt.add(quadUp(-500, 500, BANK_N - 8, BANK_N - 0.6, 80, 2, 0.03), lam("grassHD", () => ({ map: grassHD() })));
    for (let x = -200; x <= 200; x += 2.5) bt.add(boxGeo(V(x - 0.05, G, BANK_S + 0.35), V(x + 0.05, G + 1.1, BANK_S + 0.45)), lampIron);
    bt.add(boxGeo(V(-200, G + 1.05, BANK_S + 0.32), V(200, G + 1.15, BANK_S + 0.48)), lampIron);
    for (let i = 0; i < 46; i++) {
      const x = -160 + i * 7 + 3 * hash(i, 4), s = i % 2 ? 1 : -1, z = s > 0 ? BANK_S + 3.5 + 3 * hash(i, 5) : BANK_N - 3 - 4 * hash(i, 6);
      if (Math.abs(x) < 6 || (Math.abs(x + 8) < 7 && s > 0)) continue;
      prop(bt, {}, ["tree_oak", "tree_fat", "tree_default"][i % 3], x, G, z, 7 + 4 * hash(i, 7), x);
    }
    bt.add(new THREE.CapsuleGeometry(0.35, 3.2, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.55, 1), lam("kayak", () => ({ color: "#e8a020" })), new THREE.Matrix4().makeTranslation(12, 0.1, 2));
    bt.add(new THREE.CapsuleGeometry(0.35, 3.2, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.55, 1), lam("kayak2", () => ({ color: "#d23b3b" })), new THREE.Matrix4().makeTranslation(20, 0.1, -3));
    bt.build(this.today);

    // ---- interior sets ----
    this.room(this.sets.office, OFFICE, rep(wallpaper("news", "#cfd9c8", "#bccab4"), 3, 1.4));
    const ob = new Batch();
    tableAt(ob, OFFICE[0], OFFICE[2] + 2.85, 1.8, 1.0, 0.95);
    ob.add(boxGeo(V(OFFICE[0] - 0.55, G + 0.95, OFFICE[2] + 2.75), V(OFFICE[0] - 0.05, G + 1.1, OFFICE[2] + 3.15)), lam("typewriter", () => ({ color: "#3a4a3a" })));
    ob.add(boxGeo(V(OFFICE[0] - 0.5, G + 1.1, OFFICE[2] + 3.05), V(OFFICE[0] - 0.1, G + 1.3, OFFICE[2] + 3.12)), lam("paper", () => ({ color: "#f6f3ec" })));
    ob.add(boxGeo(V(OFFICE[0] + 1.6, G, OFFICE[2] + 4.6), V(OFFICE[0] + 2.4, G + 1.4, OFFICE[2] + 5.4)), lam("cabinet", () => ({ color: "#6a7a6a" })));
    for (let k = 0; k < 3; k++) ob.add(boxGeo(V(OFFICE[0] + 1.68, G + 0.15 + k * 0.42, OFFICE[2] + 4.55), V(OFFICE[0] + 2.32, G + 0.5 + k * 0.42, OFFICE[2] + 4.6)), lam("drawer", () => ({ color: "#7d8d7d" })));
    for (let k = 0; k < 6; k++) ob.add(boxGeo(V(OFFICE[0] - 2.5 + k * 0.5, G + 2.0, OFFICE[2] + 5.9), V(OFFICE[0] - 2.1 + k * 0.5, G + 2.5, OFFICE[2] + 5.95)), lam(k % 2 ? "pinA" : "pinB", () => ({ color: k % 2 ? "#e8d8b0" : "#f6f3ec" })));
    ob.build(this.sets.office);
    this.room(this.sets.kitchen, KITCHEN, rep(wallpaper("kitchen", "#e9dcb8", "#d8c79c"), 3, 1.4));
    const kb = new Batch();
    tableAt(kb, KITCHEN[0], KITCHEN[2] + 3, 1.6, 0.9, 0.78);
    kb.add(boxGeo(V(KITCHEN[0] - 1.8, G, KITCHEN[2] + 5.0), V(KITCHEN[0] + 0.2, G + 0.9, KITCHEN[2] + 5.9)), lam("counter", () => ({ color: "#d8c4a0" })));
    kb.build(this.sets.kitchen);
    this.room(this.sets.capitol, CAPITOL, rep(panelTex(), 3, 1.4));
    const cb = new Batch();
    tableAt(cb, CAPITOL[0], CAPITOL[2] + 2.85, 2.0, 1.0, 0.95);
    cb.add(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), lam("flagPole", () => ({ color: "#d8b04a" })), new THREE.Matrix4().makeTranslation(CAPITOL[0] - 1.5, G + 1.3, CAPITOL[2] + 5.2));
    cb.add(quad(V(CAPITOL[0] - 1.48, G + 1.55, CAPITOL[2] + 5.25), V(CAPITOL[0] - 0.4, G + 1.55, CAPITOL[2] + 5.55), V(CAPITOL[0] - 0.4, G + 2.5, CAPITOL[2] + 5.55), V(CAPITOL[0] - 1.48, G + 2.5, CAPITOL[2] + 5.25)), lam("usFlag", () => ({ map: flagTex(), side: THREE.DoubleSide })));
    cb.build(this.sets.capitol);
  }

  private room(gr: THREE.Group, c: V3, wall: THREE.Texture) {
    const b = new Batch(), [x, , z] = c;
    const wm = lam("room" + x, () => ({ map: wall, side: THREE.DoubleSide }));
    b.add(quadUp(x - 6, x + 6, z - 6, z + 6, 3, 3, 0.002), lam("floor", () => ({ map: rep(planksHD(), 1, 1) })));
    b.add(quad(V(x - 6, G, z + 6), V(x + 6, G, z + 6), V(x + 6, G + 4, z + 6), V(x - 6, G + 4, z + 6)), wm);
    b.add(quad(V(x - 6, G, z - 6), V(x - 6, G, z + 6), V(x - 6, G + 4, z + 6), V(x - 6, G + 4, z - 6)), wm);
    b.add(quad(V(x + 6, G, z + 6), V(x + 6, G, z - 6), V(x + 6, G + 4, z - 6), V(x + 6, G + 4, z + 6)), wm);
    b.add(quad(V(x - 6, G + 4, z + 6), V(x + 6, G + 4, z + 6), V(x + 6, G + 4, z - 6), V(x - 6, G + 4, z - 6)), lam("ceiling", () => ({ color: "#f2ead8", side: THREE.DoubleSide })));
    b.add(boxGeo(V(x - 6, G, z + 5.9), V(x + 6, G + 0.25, z + 6)), lam("skirting", () => ({ color: "#5a3a26" })));
    b.add(quad(V(x + 3.2, G + 1.6, z + 5.95), V(x + 1.2, G + 1.6, z + 5.95), V(x + 1.2, G + 3.4, z + 5.95), V(x + 3.2, G + 3.4, z + 5.95)), lam("roomWin", () => ({ map: windowTex() })));
    b.build(gr, false);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], set = setAt(id, f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.12; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    const out = set === "flats" || set === "today", isToday = set === "today";
    this.outdoor.visible = out; this.y1969.visible = set === "flats"; this.today.visible = isToday;
    this.water.visible = out; this.water.material = isToday ? this.waterNow : this.water69;
    this.sets.office.visible = set === "office"; this.sets.kitchen.visible = set === "kitchen"; this.sets.capitol.visible = set === "capitol";
    if (set === "flats") this.pose69(id, s, t, f);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }

  private pose69(id: number, s: ShotDef, t: number, f: number) {
    // the slick spreads downstream from the oil pipe in the "blanket" shot, otherwise it is all there
    const grow = id === 11 ? 0.18 + 0.82 * smooth((t - Ws(136)) / (Ws(145) - Ws(136))) : 1;
    this.slick.scale.set(grow, 1, 0.55 + 0.45 * grow);
    // the junk drifts into place during "logs, tires and trash"
    const drifting = id === 3;
    for (const j of this.junk) {
      const k = drifting ? smooth((t - j.arrive + 1.4) / 1.6) : 1;
      j.m.visible = !drifting || f >= W(39) - 3;
      j.m.position.x = j.x - 9 * (1 - k); j.m.position.z = j.z + 0.6 * (1 - k) * j.spin;
      j.m.rotation.y = j.spin * 3 + 0.8 * (1 - k) * j.spin;
      j.m.position.y = j.m.userData.y0 + 0.02 * Math.sin(t * 1.3 + j.x); // a lazy bob
    }
    // the train
    this.train.visible = !!s.train;
    if (s.train) this.train.position.set(0, 0, s.train(t));
    // the fireboat: docked by the firehouse, under way in shot 8, on station after
    const bp = id === 8 ? boatAt(t) : id >= 9 && id <= 12 ? boatAt(99) : BOAT0;
    this.boat.position.set(bp[0], 0, bp[2]);
    const spraying = id === 8 && t > Ws(80) + 0.2 && t < OUT_T1 + 0.4;
    for (let i = 0; i < this.sprays.length; i++) {
      const m = this.sprays[i];
      m.visible = spraying;
      if (!spraying) continue;
      const k = clamp01((t - Ws(80) - 0.2) / 0.5), tgt = V(IGN[0] + 3 - 5 * i + 2 * Math.sin(t * 0.7 + i), 0.4, IGN[2] + 3 * i - 1);
      const o = V(bp[0] - 4.3, 3.15, bp[2] + (i ? 0.2 : -0.2));
      const end = o.clone().lerp(tgt, k), mid = o.clone().lerp(end, 0.5); mid.y += 3.2 * k + 0.5;
      m.geometry.dispose();
      m.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(o, mid, end), 30, 0.13 + 0.05 * i, 8);
    }
    // chalk tally: eleven marks, the twelfth drawn on "a dozen times"
    if (id === 4) {
      const k = smooth((f - W(54)) / Math.max(1, W(57) + 6 - W(54)));
      const key = `${Math.round(k * 20)}`;
      if (key !== this.tally.key) {
        this.tally.key = key;
        const g = this.tally.cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 900, 420);
        fxTally(new Pen(g), 11, Math.round(k * 20) / 20);
        this.tally.tex.needsUpdate = true;
      }
    }
  }
}

function tableAt(b: Batch, x: number, z: number, w: number, d: number, h: number) {
  const m = lam("tableWood", () => ({ color: "#9a6a3c" }));
  b.add(boxGeo(V(x - w / 2, G + h - 0.06, z - d / 2), V(x + w / 2, G + h, z + d / 2)), m);
  b.add(boxGeo(V(x - w / 2, G + 0.1, z - d / 2 + 0.02), V(x + w / 2, G + h - 0.06, z - d / 2 + 0.06)), m); // modesty panel hides the legs behind
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(boxGeo(V(x + sx * (w / 2 - 0.08) - 0.04, G, z + sz * (d / 2 - 0.08) - 0.04), V(x + sx * (w / 2 - 0.08) + 0.04, G + h - 0.06, z + sz * (d / 2 - 0.08) + 0.04)), m);
}
/** box with the painted texture on both long sides (x = +-), plain ends */
function sideBox(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const g = boxGeo(V(x0, y0, z0), V(x1, y1, z1));
  return g;
}
const dirtTex = () => ctex("yard", 512, 512, (g, r) => {
  g.fillStyle = "#8a7f6c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() > 0.5 ? "rgba(60,50,40,0.18)" : "rgba(170,160,140,0.18)"; g.fillRect(r() * 512, r() * 512, 4 + r() * 10, 3 + r() * 6); }
});
/** horizontal quad facing up at height D0 + dy covering x0..x1, z0..z1 */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
// unused-import guards (kept for parity with the template's helpers)
void brick; void GULL_AT; void OUT_T0; void PIPE_GREASE;
