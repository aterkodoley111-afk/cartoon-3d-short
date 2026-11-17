// The whole place as one three.js scene: the Whangaehu River at Tangiwai on Christmas Eve 1953 (tussock plain, the
// rail bridge on its concrete piers, the low road bridge, the line of telegraph poles, Mount Ruapehu far upstream),
// the lahar as a live water surface in the channel, the Wellington-Auckland express (Ka 949, tender, carriages),
// Ellis's truck, the summit crater with its ash dam (far away, its own set), the inside of a carriage, a bathroom,
// and the same river in 2007 (the replacement bridges, the alarm mast, the signal, the held train, the barrier).
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, setSight, Kit, Ray, quad } from "./build";
import { ctex, rep, planksHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import { windSway, WIND, car as carModel, carMaterials, Vehicle, skyEnv } from "./realism";
import {
  FPS, SHOTS, camAt, V3, smooth, ShotDef, setAt, eraAt, lightAt, trainAt, Ws, SETUPS, CAR_INT, BATH, C, MAST, SIGNAL_X, TRAIN07_X, TRUCK,
  cruiseX, REST6, T_FALL6, TrainMode, tubState,
} from "./story";
import {
  hAt, fbm, rc, bedY, plainY, waterY, zfAt, RAIL_Y, ABUT, PIERS, LOST_PIER, EDGE_X, ROAD_Z, roadY, Era, pierFall, spanDrop,
  CARS, GAP, carOffset, SIXTH, pathXZ, pathY, frontS, S_SETTLED, RUAPEHU, CRATER, craterH, damK, lakeLevel, LAKE_R, RIM_R, sstep, LAHAR_V,
} from "./terrain";
import { buildKA, buildTender, buildCarriage, buildTruck, buildDX, buildModCar, Rolling, roll, glow } from "./trains";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here

// ---------------- painted textures ----------------
const tussockTex = () => ctex("tussockGround", 512, 512, (g, r) => {
  g.fillStyle = "#e9e2d0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,250,235,0.35)" : "rgba(120,110,80,0.12)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 260; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() > 0.5 ? "rgba(90,80,50,0.25)" : "rgba(255,245,215,0.3)"; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 22, y - 8 - r() * 14); } g.stroke(); }
});
const bladeTuftTex = () => ctex("tuftBlades", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x0 = 128 + (r() - 0.5) * 70, lean = (r() - 0.5) * 120, h = 140 + r() * 110;
    const gr = g.createLinearGradient(0, 256, 0, 256 - h); gr.addColorStop(0, "#6a5a32"); gr.addColorStop(0.5, "#b89a5a"); gr.addColorStop(1, "#e8d49a");
    g.strokeStyle = gr; g.lineWidth = 3 + r() * 2; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + lean * 0.3, 256 - h * 0.6, x0 + lean, 256 - h); g.stroke();
  }
});
const snowGrain = () => ctex("snowGrain", 512, 512, (g, r) => {
  g.fillStyle = "#f2f2f0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) { const v = 200 + r() * 55; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(150,150,160,0.12)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 40, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
});
const ballastTex = () => ctex("ballast", 256, 256, (g, r) => {
  g.fillStyle = "#8a8078"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 90 + r() * 90; g.fillStyle = `rgb(${v},${v - 6},${v - 12})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, 7); g.fill(); }
});
const asphaltTex = (key: string, line: boolean) => ctex("asphalt" + key, 256, 1024, (g, r) => {
  g.fillStyle = key === "53" ? "#55524e" : "#3c3d42"; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * 256, r() * 1024, 3 + r() * 8, 2 + r() * 5); }
  if (line) { g.fillStyle = "#f2efe6"; for (let y = 0; y < 1024; y += 256) g.fillRect(122, y + 40, 12, 150); g.fillStyle = "rgba(240,236,226,0.8)"; g.fillRect(10, 0, 8, 1024); g.fillRect(238, 0, 8, 1024); }
  g.fillStyle = "rgba(120,110,90,0.5)"; g.fillRect(0, 0, 6, 1024); g.fillRect(250, 0, 6, 1024);
});
/** turbulent sediment-laden water (v runs downstream): silt swirls, boils, long foam streaks drawn out by the current */
const flowTex = () => ctex("lahrFlow", 1024, 1024, (g, r) => {
  g.fillStyle = "#d8d2ca"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > 0.5 ? "rgba(120,100,80,0.10)" : "rgba(255,250,240,0.08)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 60, 30 + r() * 110, (r() - 0.5) * 0.6, 0, 7); g.fill(); }
  // boils: rings of lighter water
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024, R = 14 + r() * 40; g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 3 + r() * 4; g.beginPath(); g.ellipse(x, y, R, R * 1.4, 0, 0, 7); g.stroke(); }
  // foam streaks: broken, tapering, wavy lines along the flow
  for (let i = 0; i < 170; i++) {
    let x = r() * 1024, y = r() * 1024; const L = 60 + r() * 220, w = 2 + r() * 6;
    g.strokeStyle = `rgba(255,255,255,${(0.25 + r() * 0.45).toFixed(2)})`; g.lineCap = "round";
    for (let k = 0; k < L; k += 12) { if (r() < 0.25) { y += 12; continue; } g.lineWidth = w * (1 - k / L); g.beginPath(); g.moveTo(x, y); x += (r() - 0.5) * 6; y += 12; g.lineTo(x, y); g.stroke(); }
  }
  for (let i = 0; i < 500; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 2 + r() * 3); }
});
/** volcanic rock: grey andesite with grain, pits, darker cracks and pale lichen spots */
const rockTex = () => ctex("rockReal", 512, 512, (g, r) => {
  g.fillStyle = "#8a8682"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { const v = 90 + r() * 90; g.fillStyle = `rgba(${v},${v - 4},${v - 8},0.5)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(40,36,34,0.35)"; g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 4, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(40,34,30,0.55)"; for (let i = 0; i < 18; i++) { let x = r() * 512, y = r() * 512; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 26; i++) { g.fillStyle = r() > 0.5 ? "rgba(200,200,170,0.35)" : "rgba(150,160,110,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 14, 3 + r() * 10, r() * 3, 0, 7); g.fill(); }
});
/** loose tephra (volcanic ash/lapilli) with bedding: grey-brown layers, grains, a few dark lapilli */
const ashTex = () => ctex("ashStrata", 512, 512, (g, r) => {
  for (let y = 0; y < 512; y += 4) { const v = 96 + 40 * Math.sin(y * 0.09 + Math.sin(y * 0.021) * 3) + 12 * r(); g.fillStyle = `rgb(${v + 6},${v},${v - 6})`; g.fillRect(0, y, 512, 4); }
  for (let i = 0; i < 5000; i++) { const v = 60 + r() * 120; g.fillStyle = `rgba(${v},${v - 5},${v - 10},0.6)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2.5, 1 + r() * 2.5); }
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(30,28,30,0.7)"; g.beginPath(); g.arc(r() * 512, r() * 512, 1.5 + r() * 3.5, 0, 7); g.fill(); }
});
/** the night sky as a reflection map (navy, a paler horizon, a few stars), equirectangular */
const nightEnv = () => { const t = ctex("nightEnv", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#0a1230"); gr.addColorStop(0.46, "#2c3f70"); gr.addColorStop(0.5, "#4a5a86"); gr.addColorStop(0.53, "#1a1e2a"); gr.addColorStop(1, "#101218");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 120; i++) { g.fillStyle = "rgba(230,236,255,0.8)"; g.fillRect(r() * 512, r() * 110, 1.5, 1.5); }
}); t.mapping = THREE.EquirectangularReflectionMapping; return t; };
const concreteTex = () => ctex("concrete53", 256, 256, (g, r) => {
  g.fillStyle = "#aaa59c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(60,55,45,0.1)"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, 7); g.fill(); }
  g.fillStyle = "rgba(70,60,50,0.25)"; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2);
});
const panelTex = () => ctex("carPanel", 512, 512, (g, r) => {
  g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#8a5430"; g.fillRect(0, 300, 512, 212);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(60,30,10,0.12)"; g.fillRect(r() * 512, 300 + r() * 212, 2, 40 + r() * 80); }
  g.fillStyle = "#6a3c20"; g.fillRect(0, 296, 512, 8); g.fillRect(0, 500, 512, 12);
  g.strokeStyle = "rgba(60,30,10,0.4)"; g.lineWidth = 3; for (let x = 0; x < 512; x += 128) g.strokeRect(x + 10, 320, 108, 170);
});
const nightGlass = () => ctex("nightGlass", 128, 128, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#26345a"); gr.addColorStop(1, "#141a2e"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(255,240,200,0.22)"; g.beginPath(); g.moveTo(20, 128); g.lineTo(60, 0); g.lineTo(78, 0); g.lineTo(38, 128); g.fill();
});
const seatTex = () => ctex("seatCloth", 256, 256, (g, r) => {
  g.fillStyle = "#6e2e30"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,200,180,0.06)" : "rgba(0,0,0,0.1)"; g.fillRect(r() * 256, r() * 256, 3, 3); }
  g.strokeStyle = "rgba(30,8,8,0.5)"; g.lineWidth = 3; for (let x = 32; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
});
const tileTex = () => ctex("tiles", 512, 512, (g) => {
  g.fillStyle = "#cfe3e6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#9ab8bd"; g.lineWidth = 4; for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
const stripeTex = () => ctex("barrierStripe", 256, 32, (g) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 32); g.fillStyle = "#d23b3b"; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 32); });

// ---------------- terrain grid ----------------
const axis = (lo: number, hi: number, f0: number, f1: number, fine: number, m0: number, m1: number, mid: number, coarse: number) => {
  const out: number[] = []; let v = lo;
  while (v < hi) { out.push(v); v += v >= f0 && v < f1 ? fine : v >= m0 && v < m1 ? mid : coarse; }
  out.push(hi); return out;
};
type Grid = { xs: number[]; zs: number[]; nx: number; nz: number };
let GRID: Grid | null = null;
const grid = () => {
  if (GRID) return GRID;
  const xs = axis(-1800, 1800, -130, 175, 3, -420, 1100, 8, 45), zs = axis(-1800, 2400, -230, 130, 3, -420, 600, 6, 45);
  GRID = { xs, zs, nx: xs.length, nz: zs.length };
  return GRID;
};
let CGRID: Grid | null = null;
const cgrid = () => {
  if (CGRID) return CGRID;
  const xs = axis(-1300, 1500, -330, 560, 4, -700, 1000, 12, 50), zs = axis(-1300, 1300, -330, 330, 4, -700, 700, 12, 50);
  CGRID = { xs, zs, nx: xs.length, nz: zs.length };
  return CGRID;
};
const col = (hex: string) => new THREE.Color(hex);
const TUS = col("#9c8a5c"), TUS2 = col("#7c7a50"), TUS3 = col("#a8966a"), GRAV = col("#8e8984"), GRAV2 = col("#a49e96"), BANK = col("#9a8a70"), EMB = col("#7e746a");
const SNOW = col("#e6edf6"), SNOW2 = col("#cfd9e8"), ROCK = col("#7a7068"), ASH = col("#4e4a48"), ASH2 = col("#7a706a");
const tmpC = new THREE.Color();
const hsh = (i: number, s = 0) => { let h = (Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };

/** heightfield mesh (positions/normals/colours filled by a function), shared helpers */
const gridMesh = (G: Grid, uvScale: number) => {
  const N = G.nx * G.nz, geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const uv = new Float32Array(N * 2);
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { const o = j * G.nx + i; uv[o * 2] = G.xs[i] / uvScale; uv[o * 2 + 1] = G.zs[j] / uvScale; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const idx: number[] = [];
  for (let j = 0; j < G.nz - 1; j++) for (let i = 0; i < G.nx - 1; i++) { const a = j * G.nx + i, c = a + G.nx; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  geo.setIndex(idx);
  return geo;
};
const fillGrid = (geo: THREE.BufferGeometry, G: Grid, h: (x: number, z: number) => number, colour: (x: number, z: number, y: number, ny: number, out: THREE.Color) => void) => {
  const { nx, nz, xs, zs } = G;
  const P = geo.attributes.position.array as Float32Array, Nn = geo.attributes.normal.array as Float32Array, Cc = geo.attributes.color.array as Float32Array;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i; H[o] = h(xs[i], zs[j]); P[o * 3] = xs[i]; P[o * 3 + 1] = H[o]; P[o * 3 + 2] = zs[j]; }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i, i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nz - 1, j + 1);
    const dx = (H[j * nx + i1] - H[j * nx + i0]) / (xs[i1] - xs[i0]), dz = (H[j1 * nx + i] - H[j0 * nx + i]) / (zs[j1] - zs[j0]);
    const l = Math.hypot(dx, 1, dz);
    Nn[o * 3] = -dx / l; Nn[o * 3 + 1] = 1 / l; Nn[o * 3 + 2] = -dz / l;
    colour(xs[i], zs[j], H[o], 1 / l, tmpC);
    Cc[o * 3] = tmpC.r; Cc[o * 3 + 1] = tmpC.g; Cc[o * 3 + 2] = tmpC.b;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  geo.computeBoundingSphere();
};

type Train = { cars: Rolling[]; group: THREE.Group; beam: THREE.Mesh };
type Floater = { m: THREE.Mesh; s: number; u: number; r: number; spin: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#22335e", 120, 9000);
  private sunCache = new Map<number, THREE.Vector3>(); private shadowCache = new Map<string, { Rr: number; ctr: THREE.Vector3 }>();
  private clouds: THREE.Mesh[] = []; private cloudMaps: THREE.Texture[];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private valley = new THREE.Group(); private y53 = new THREE.Group(); private y07 = new THREE.Group();
  private crater = new THREE.Group(); private carSet = new THREE.Group(); private bathSet = new THREE.Group();
  private terr: THREE.Mesh; private tGeo: THREE.BufferGeometry; private tKey = "";
  private cTerr: THREE.Mesh; private cGeo: THREE.BufferGeometry; private cKey = "";
  private water: THREE.Mesh; private wGeo: THREE.BufferGeometry; private wCols: number; private wRows: number[];
  private waterMat: THREE.MeshLambertMaterial; private flow: THREE.Texture; private envDay: THREE.Texture; private envNight: THREE.Texture;
  private drops: THREE.InstancedMesh; private dropMat: THREE.MeshPhongMaterial; private chunks: THREE.Mesh[] = [];
  private floaters: Floater[] = [];
  private lostPier = new THREE.Group(); private spanA = new THREE.Group(); private spanB = new THREE.Group();
  private road53: THREE.Mesh; private road07: THREE.Mesh;
  private train53: Train; private truck: Rolling & { lamps: THREE.Object3D[] }; private truckBeams: THREE.Mesh[] = [];
  private train07: Rolling[] = []; private t07 = new THREE.Group();
  private beacon: THREE.Mesh; private sigLamp: THREE.Mesh; private barriers: THREE.Group[] = []; private cars07: Vehicle[] = [];
  private lake: THREE.Mesh; private outflow: THREE.Mesh; private outGeo: THREE.BufferGeometry; private seep: THREE.Mesh;
  private mountain: THREE.Mesh;
  private tubWater!: THREE.Mesh; private tubWaterBase!: Float32Array; private sandPlug!: THREE.Mesh; private duck = new THREE.Group(); private drainHole!: THREE.Mesh;
  private tufts: THREE.InstancedMesh;

  constructor(_kit: Kit) {
    const R = this.root;
    R.add(this.valley, this.crater, this.carSet, this.bathSet);
    this.valley.add(this.y53, this.y07);
    // ---- sky (gradient + soft stars at night) + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() }, stars: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform float stars; varying vec3 vP;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        void main(){ vec3 d = normalize(vP); float el = asin(clamp(d.y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          if (stars > 0.0) {
            // stars on an angular grid: a soft disc (~3 px) per cell, steady (no per-frame noise)
            float az = atan(d.z, d.x);
            vec2 g = vec2(az * 140.0, el * 140.0), id = floor(g), f = fract(g) - 0.5;
            float r = h21(id), show = step(0.86, r);
            vec2 o = vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5;
            float dd = length((f - o * 0.6) * vec2(cos(el), 1.0));
            float b = show * smoothstep(0.12, 0.0, dd) * (0.5 + 0.9 * h21(id + 1.3)) * smoothstep(0.03, 0.25, el);
            c += vec3(0.85, 0.9, 1.0) * b * stars;
          }
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 6500 + (i % 3) * 400, w = 1500 + (i % 4) * 300;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 1700 + (i % 4) * 350, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    const rays = sightLines();
    setSight([]);

    // ---- valley terrain (both eras share the mesh; the road cutting differs) ----
    this.tGeo = gridMesh(grid(), 14);
    this.terr = new THREE.Mesh(this.tGeo, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true, map: rep(tussockTex(), 1, 1) }), 0.7));
    this.terr.frustumCulled = false; this.terr.receiveShadow = true; this.terr.castShadow = false;
    this.valley.add(this.terr);
    // Mount Ruapehu: a broad snow-capped massif far upstream (the backdrop)
    this.mountain = mountainMesh();
    this.valley.add(this.mountain); this.mountain.renderOrder = -0.5;

    // ---- tussock tufts (instanced crossed cards, swaying) ----
    const tuftGeo = new THREE.BufferGeometry(), tp: number[] = [], tuv: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5;
      tp.push(-cx, 0, -cz, cx, 0, cz, cx, 1, cz, -cx, 0, -cz, cx, 1, cz, -cx, 1, -cz); tuv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
    tuftGeo.setAttribute("position", new THREE.Float32BufferAttribute(tp, 3)); tuftGeo.setAttribute("uv", new THREE.Float32BufferAttribute(tuv, 2));
    tuftGeo.setAttribute("normal", new THREE.Float32BufferAttribute(Array(18).fill([0, 1, 0]).flat(), 3));
    const tuftMat = windSway(twoTone(new THREE.MeshLambertMaterial({ map: bladeTuftTex(), alphaTest: 0.45, side: THREE.DoubleSide })), 0.9, 0.09, 0.02);
    const spots: [number, number][] = [];
    const want = (x: number, z: number) => {
      if (Math.abs(x - rc(z)) < 42) return false;
      if (Math.abs(z) < 6.5 && Math.abs(x) > ABUT - 3) return false;
      if (Math.abs(z - ROAD_Z) < 8) return false;
      if (Math.hypot(x - MAST[0], z - MAST[2]) < 6) return false;
      return true;
    };
    const areas: [number, number, number, number, number][] = [[-260, 280, -280, 160, 9000], [760, 1040, -110, 60, 2600], [-140, 140, 300, 520, 2600]];
    let ii = 0;
    for (const [x0, x1, z0, z1, n] of areas) for (let k = 0; k < n; k++) {
      ii++;
      const x = x0 + (x1 - x0) * hsh(ii, 1), z = z0 + (z1 - z0) * hsh(ii, 2);
      if (want(x, z)) spots.push([x, z]);
    }
    this.tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
    spots.forEach(([x, z], i) => {
      const s = 0.55 + 0.5 * hsh(i, 3);
      m4.compose(V(x, hAt(x, z) - 0.05, z), q.setFromEuler(new THREE.Euler(0, hsh(i, 4) * 6.28, 0)), V(s * 1.2, s, s * 1.2));
      this.tufts.setMatrixAt(i, m4); this.tufts.setColorAt(i, cc.setHSL(0.11 + 0.04 * hsh(i, 5), 0.32, 0.36 + 0.16 * hsh(i, 6)));
    });
    this.tufts.layers.set(NOINK); this.tufts.receiveShadow = true; this.tufts.frustumCulled = false;
    this.valley.add(this.tufts);

    // ---- pine shelter belts (distant) ----
    const pb = new Batch(), needle = [lam("pine0", () => ({ color: "#2c4a34" })), lam("pine1", () => ({ color: "#34553a" }))], bark = lam("bark", () => ({ color: "#5a4030" }));
    let ti = 0;
    const belt = (xa: number, xb: number, za: number, zb: number, step: number) => {
      for (let x = xa; x <= xb; x += step) for (let z = za; z <= zb; z += step) {
        ti++; const px = x + (hsh(ti, 1) - 0.5) * step * 0.7, pz = z + (hsh(ti, 2) - 0.5) * step * 0.7, h = 14 + 8 * hsh(ti, 3), y = hAt(px, pz);
        if (blocked(rays, px, y, pz, h)) continue;
        conifer(pb, needle[ti % 2], bark, px, y, pz, h, ti);
      }
    };
    belt(-700, -260, -330, -300, 9); belt(260, 560, 170, 230, 10); belt(-560, -420, 120, 260, 10); belt(600, 760, -360, -330, 9);
    pb.build(this.valley);

    // ---- the line: ballast, sleepers, rails, telegraph poles ----
    const lb = new Batch(), lbThin = new Batch(), sleeperM = lam("sleeper", () => ({ color: "#5a4a3c" })), railM = lam("railSteel", () => ({ color: "#6a6a72" }));
    const ballastM = lam("ballast", () => ({ map: rep(ballastTex(), 1, 1) }));
    for (const [xa, xb] of [[-1800, -ABUT], [ABUT, 1800]] as [number, number][]) {
      lb.add(quad(V(xa, RAIL_Y - 0.42, 2.0), V(xb, RAIL_Y - 0.42, 2.0), V(xb, RAIL_Y - 0.42, -2.0), V(xa, RAIL_Y - 0.42, -2.0), (xb - xa) / 3, 1.3), ballastM);
      for (let x = Math.max(xa, -260); x < Math.min(xb, 1100); x += 0.75) lb.add(boxGeo(V(x - 0.11, RAIL_Y - 0.4, -1.05), V(x + 0.11, RAIL_Y - 0.25, 1.05)), sleeperM);
    }
    for (const s of [-1, 1]) lbThin.add(boxGeo(V(-1800, RAIL_Y - 0.25, s * 0.535 - 0.035), V(1800, RAIL_Y, s * 0.535 + 0.035)), railM);
    const lineG = new THREE.Group(); lb.build(lineG); lbThin.build(lineG); lineG.traverse((o) => o.layers.set(NOINK)); this.valley.add(lineG);
    const poleB = new Batch(), poleM = lam("telePole", () => ({ color: "#4a3a2e" })), insM = lam("insulator", () => ({ color: "#d8dcd8" }));
    const poleXs: number[] = [];
    for (let x = -800; x <= 1150; x += 48) { if (Math.abs(x) < ABUT + 8) continue; poleXs.push(x); const y = hAt(x, 7.5);
      poleB.add(new THREE.CylinderGeometry(0.11, 0.14, 8, 8), poleM, new THREE.Matrix4().makeTranslation(x, y + 4, 7.5));
      poleB.add(boxGeo(V(x - 0.07, y + 7.3, 6.6), V(x + 0.07, y + 7.45, 8.4)), poleM);
      for (const dz of [-0.75, -0.25, 0.25, 0.75]) poleB.add(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6), insM, new THREE.Matrix4().makeTranslation(x, y + 7.53, 7.5 + dz));
    }
    const poles = new THREE.Group(); poleB.build(poles); poles.traverse((o) => o.layers.set(NOINK)); this.y53.add(poles);
    const wirePts: number[] = [];
    for (const dz of [-0.75, 0.25, 0.75]) for (let i = 0; i < poleXs.length - 1; i++) {
      const xa = poleXs[i], xb = poleXs[i + 1]; if (xb - xa > 60) continue;
      for (let k = 0; k < 8; k++) { const u0 = k / 8, u1 = (k + 1) / 8, sag = (u: number) => -0.6 * 4 * u * (1 - u);
        const ya = hAt(xa, 7.5) + 7.6, yb = hAt(xb, 7.5) + 7.6;
        wirePts.push(xa + (xb - xa) * u0, ya + (yb - ya) * u0 + sag(u0), 7.5 + dz, xa + (xb - xa) * u1, ya + (yb - ya) * u1 + sag(u1), 7.5 + dz); }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wirePts, 3));
    const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: "#1c1c26" })); wires.layers.set(NOINK); this.y53.add(wires);

    // ---- the 1953 rail bridge: concrete piers, steel plate-girder spans, timber deck ----
    const conc = lam("concrete53", () => ({ map: rep(concreteTex(), 1, 1) })), steel = lam("girder53", () => ({ color: "#4e5058" })), deck = lam("deck53", () => ({ color: "#5e4e40" }));
    const bb = new Batch();
    for (const x of [-ABUT, ABUT]) { const s = Math.sign(x); bb.add(boxGeo(V(x - (s > 0 ? 0 : 3), -7, -3.2), V(x + (s > 0 ? 3 : 0), RAIL_Y - 1.25, 3.2), 3), conc); }
    for (const x of PIERS) if (x !== LOST_PIER) pier(bb, conc, x, 0, -0.2);
    bb.build(this.y53);
    // spans: each a group; the two east spans hinge (A at x = 15, B at x = 45)
    for (let i = 0; i < 6; i++) {
      const xa = -45 + i * 15, xb = xa + 15, g = i === 4 ? this.spanA : i === 5 ? this.spanB : new THREE.Group();
      const piv = i === 4 ? xa : i === 5 ? xb : 0;
      const sb = new Batch(), thin = new Batch();
      span(sb, thin, steel, deck, sleeperM, railM, xa - piv, xb - piv);
      sb.build(g); const tg = new THREE.Group(); thin.build(tg); tg.traverse((o) => o.layers.set(NOINK)); g.add(tg);
      if (i >= 4) g.position.set(piv, 0, 0);
      this.y53.add(g);
    }
    { const pb2 = new Batch(); pier(pb2, conc, 0, 0, -0.2); pb2.build(this.lostPier); this.lostPier.position.set(LOST_PIER, 0, 0); this.y53.add(this.lostPier); }
    // ---- the 2007 bridges: concrete piers (twin columns), a concrete deck with guard rails ----
    const conc7 = lam("concrete07", () => ({ color: "#c4c2bc" })), rail7 = lam("rail07", () => ({ color: "#9aa0a8" }));
    const b7 = new Batch(), b7t = new Batch();
    for (const x of [-ABUT, ABUT]) { const s = Math.sign(x); b7.add(boxGeo(V(x - (s > 0 ? 0 : 3), -7, -3.2), V(x + (s > 0 ? 3 : 0), RAIL_Y - 1.0, 3.2)), conc7); }
    for (const x of PIERS) for (const z of [-1.1, 1.1]) b7.add(new THREE.CylinderGeometry(0.6, 0.6, 7.5, 18), conc7, new THREE.Matrix4().makeTranslation(x, -3.4 - 0.4, z));
    for (const x of PIERS) b7.add(boxGeo(V(x - 0.8, -0.35 - 0.6, -2.0), V(x + 0.8, RAIL_Y - 1.0, 2.0)), conc7);
    b7.add(boxGeo(V(-ABUT, RAIL_Y - 1.0, -2.2), V(ABUT, RAIL_Y - 0.42, 2.2), 0, true), conc7);
    for (let x = -ABUT; x < ABUT; x += 0.75) b7t.add(boxGeo(V(x - 0.11, RAIL_Y - 0.42, -1.05), V(x + 0.11, RAIL_Y - 0.25, 1.05)), lam("sleeper07", () => ({ color: "#8a8680" })));
    for (const s of [-1, 1]) { b7.add(boxGeo(V(-ABUT, RAIL_Y - 0.42, s * 2.2 - 0.1), V(ABUT, RAIL_Y + 0.5, s * 2.2 + 0.1)), conc7); b7t.add(boxGeo(V(-ABUT, RAIL_Y + 0.8, s * 2.15 - 0.03), V(ABUT, RAIL_Y + 0.88, s * 2.15 + 0.03)), rail7); }
    b7.build(this.y07); const g7 = new THREE.Group(); b7t.build(g7); g7.traverse((o) => o.layers.set(NOINK)); this.y07.add(g7);

    // ---- the road and its bridges ----
    this.road53 = new THREE.Mesh(roadRibbon((x) => roadY(x, "night") + 0.04, -1800, 1800, 3.3), lam("road53", () => ({ map: rep(asphaltTex("53", false), 1, 300) })));
    this.road07 = new THREE.Mesh(roadRibbon((x) => roadY(x, "today") + 0.04, -1800, 1800, 3.6), lam("road07", () => ({ map: rep(asphaltTex("07", true), 1, 300) })));
    for (const r of [this.road53, this.road07]) { r.receiveShadow = true; r.layers.set(NOINK); }
    this.y53.add(this.road53); this.y07.add(this.road07);
    const rb53 = new Batch();
    rb53.add(boxGeo(V(-42, roadY(0, "night") - 0.5, ROAD_Z - 3.6), V(42, roadY(0, "night"), ROAD_Z + 3.6), 0, true), conc);
    for (let x = -28; x <= 28; x += 14) rb53.add(boxGeo(V(x - 0.5, -8, ROAD_Z - 3.2), V(x + 0.5, roadY(0, "night") - 0.5, ROAD_Z + 3.2)), conc);
    for (const s of [-1, 1]) for (let x = -42; x <= 42; x += 3) rb53.add(boxGeo(V(x - 0.15, roadY(0, "night"), ROAD_Z + s * 3.5 - 0.15), V(x + 0.15, roadY(0, "night") + 0.7, ROAD_Z + s * 3.5 + 0.15)), conc);
    rb53.build(this.y53);
    const rb07 = new Batch(), rb07t = new Batch();
    rb07.add(boxGeo(V(-46, 0.3 - 0.8, ROAD_Z - 4.2), V(46, 0.3, ROAD_Z + 4.2), 0, true), conc7);
    for (let x = -30; x <= 30; x += 15) rb07.add(boxGeo(V(x - 0.7, -8, ROAD_Z - 3.5), V(x + 0.7, -0.5, ROAD_Z + 3.5)), conc7);
    for (const s of [-1, 1]) { rb07.add(boxGeo(V(-46, 0.3, ROAD_Z + s * 4.1 - 0.12), V(46, 0.75, ROAD_Z + s * 4.1 + 0.12)), conc7); rb07t.add(boxGeo(V(-46, 1.05, ROAD_Z + s * 4.05 - 0.04), V(46, 1.12, ROAD_Z + s * 4.05 + 0.04)), rail7); }
    rb07.build(this.y07); const g7r = new THREE.Group(); rb07t.build(g7r); g7r.traverse((o) => o.layers.set(NOINK)); this.y07.add(g7r);

    // ---- the river surface (live) ----
    this.flow = rep(flowTex(), 1, 1);
    // spray: real droplets (instanced, ballistic), posed from the stage's bursts every frame
    this.dropMat = twoTone(new THREE.MeshPhongMaterial({ color: "#8a7c6e", specular: "#888888", shininess: 80 })) as unknown as THREE.MeshPhongMaterial;
    this.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), this.dropMat, 2400);
    this.drops.layers.set(NOINK); this.drops.frustumCulled = false; this.drops.count = 0; this.root.add(this.drops);
    this.envDay = skyEnv(false); this.envNight = nightEnv();
    this.waterMat = twoTone(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, map: this.flow, specular: "#5a5a5a", shininess: 70, envMap: this.envNight, reflectivity: 0.1, combine: THREE.MixOperation }), 0.6) as unknown as THREE.MeshLambertMaterial;
    const cols = 45, rows: number[] = [];
    for (let z = -470; z <= 760;) { rows.push(z); z += z > -220 && z < 160 ? 2 : 4; }
    this.wCols = cols; this.wRows = rows;
    this.wGeo = new THREE.BufferGeometry();
    const NW = cols * rows.length;
    this.wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NW * 3), 3));
    this.wGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(NW * 3), 3));
    this.wGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(NW * 3), 3));
    const wuv = new Float32Array(NW * 2), widx: number[] = [];
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < cols; i++) { const o = j * cols + i; wuv[o * 2] = (i * 2) / 18; wuv[o * 2 + 1] = rows[j] / 18; }
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, c = a + cols; widx.push(a, c, a + 1, a + 1, c, c + 1); }
    this.wGeo.setAttribute("uv", new THREE.BufferAttribute(wuv, 2)); this.wGeo.setIndex(widx);
    this.water = new THREE.Mesh(this.wGeo, this.waterMat);
    this.water.frustumCulled = false; this.water.receiveShadow = true; this.water.layers.set(NOINK);
    this.valley.add(this.water);
    // boulders, ice blocks and logs riding the front
    const rockM = [lam("lahRock0", () => ({ map: rockTex(), color: "#9a948e" })), lam("lahRock1", () => ({ map: rockTex(), color: "#b0a69a" }))], logM = lam("lahLog", () => ({ color: "#5a4636" }));
    const iceM = twoTone(new THREE.MeshPhongMaterial({ color: "#d4e8f4", specular: "#ffffff", shininess: 90, transparent: true, opacity: 0.86, envMap: this.envNight, reflectivity: 0.3, combine: THREE.MixOperation }));
    for (let i = 0; i < 34; i++) {
      const kind = i % 4 === 0 ? "ice" : i % 7 === 3 ? "log" : "rock", r = kind === "log" ? 0.35 : 0.55 + 1.1 * hsh(i, 21);
      let g: THREE.BufferGeometry;
      if (kind === "log") g = new THREE.CylinderGeometry(0.35, 0.4, 5 + 3 * hsh(i, 22), 10).rotateZ(Math.PI / 2);
      else if (kind === "ice") { g = new THREE.BoxGeometry(r * 1.6, r * 1.1, r * 1.3, 4, 4, 4); const pp = g.attributes.position, v = new THREE.Vector3(); for (let k = 0; k < pp.count; k++) { v.fromBufferAttribute(pp, k); const n = v.clone().normalize().multiplyScalar(r * 0.75); v.lerp(n, 0.35); pp.setXYZ(k, v.x, v.y, v.z); } g.computeVertexNormals(); }
      else g = rockGeo(r, i);
      const m = new THREE.Mesh(g, kind === "ice" ? iceM : kind === "log" ? logM : rockM[i % 2]);
      m.castShadow = true; m.layers.set(NOINK); this.valley.add(m);
      this.floaters.push({ m, s: 1 + 22 * hsh(i, 23) ** 1.3, u: (hsh(i, 24) - 0.5) * 44, r, spin: 0.6 + 0.8 * hsh(i, 25) });
    }

    // ---- boulders on the river bed and banks (old lahar deposits), scrub on the plain ----
    const bedRock = lam("bedRock", () => ({ map: rockTex(), color: "#a8a29a" }));
    for (let v2 = 0; v2 < 3; v2++) {
      const pts: THREE.Matrix4[] = [];
      for (let i = 0; i < 520; i++) {
        const k = v2 * 1000 + i, z = -240 + 520 * hsh(k, 71), x = rc(z) + (hsh(k, 72) - 0.5) * 84, d = Math.abs(x - rc(z));
        if (d > 43 || (Math.abs(z) < 4 && Math.abs(x) > 40)) continue;
        if (blocked(rays, x, hAt(x, z), z, 2) || rays.some((ry) => Math.hypot(ry.o.x - x, ry.o.z - z) < 14)) continue;
        const s2 = (0.25 + 1.3 * hsh(k, 73) ** 2.2) * (d > 27 ? 0.8 : 1), y = hAt(x, z) - s2 * 0.3;
        pts.push(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hsh(k, 74) * 6.28, 0.3 * (hsh(k, 75) - 0.5))), V(s2, s2, s2)));
      }
      const im = new THREE.InstancedMesh(rockGeo(1, 300 + v2), bedRock, pts.length);
      pts.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true; im.receiveShadow = true; im.layers.set(NOINK); im.frustumCulled = false; this.valley.add(im);
    }
    const scrubM = windSway(twoTone(new THREE.MeshLambertMaterial({ color: "#3e5236" })), 1.2, 0.05, 0.01);
    const sg = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute("normal").deleteAttribute("uv"));
    { const pp = sg.attributes.position; for (let k = 0; k < pp.count; k++) { const x = pp.getX(k), y = pp.getY(k), z = pp.getZ(k), f = 1 + 0.25 * Math.sin(x * 5) * Math.cos(z * 4 + y * 3); pp.setXYZ(k, x * f, Math.max(-0.1, y) * f * 0.7 + 0.35, z * f); } sg.computeVertexNormals(); }
    const sp: THREE.Matrix4[] = [];
    for (let i = 0; i < 2200; i++) {
      const x = -260 + 540 * hsh(i, 81), z = -280 + 440 * hsh(i, 82);
      if (!want(x, z) || hsh(i, 83) > 0.55) continue;
      const s2 = 0.35 + 0.6 * hsh(i, 84);
      sp.push(new THREE.Matrix4().compose(V(x, hAt(x, z) - 0.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hsh(i, 85) * 6, 0)), V(s2 * 1.3, s2, s2 * 1.2)));
    }
    const scrub = new THREE.InstancedMesh(sg, scrubM, sp.length); sp.forEach((m, i) => { scrub.setMatrixAt(i, m); scrub.setColorAt(i, new THREE.Color().setHSL(0.24 + 0.06 * hsh(i, 86), 0.3, 0.32 + 0.15 * hsh(i, 87))); });
    scrub.layers.set(NOINK); scrub.receiveShadow = true; scrub.frustumCulled = false; this.valley.add(scrub);

    // ---- the 1953 express, Ellis's truck ----
    const tg53 = new THREE.Group(), cars: Rolling[] = [];
    CARS.forEach((_, i) => { const v = i === 0 ? buildKA() : i === 1 ? buildTender() : buildCarriage(i); cars.push(v); tg53.add(v.root); });
    const beamGeo = new THREE.ConeGeometry(7, 70, 24, 1, true); beamGeo.rotateZ(Math.PI / 2); beamGeo.translate(35, 0, 0); // apex at the lamp, opening forward (+x)
    const bcol: number[] = []; const bp = beamGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) { const k = Math.max(0, 1 - bp.getX(i) / 70); bcol.push(0.11 * k * k, 0.095 * k * k, 0.07 * k * k); }
    beamGeo.setAttribute("color", new THREE.Float32BufferAttribute(bcol, 3));
    const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(-0.9, 3.48, 0); beam.layers.set(NOINK);
    cars[0].root.add(beam);
    this.train53 = { cars, group: tg53, beam };
    this.y53.add(tg53);
    this.truck = buildTruck();
    this.truck.root.position.set(TRUCK[0], roadY(TRUCK[0], "night"), TRUCK[2]); this.truck.root.rotation.y = Math.PI;
    for (const l of this.truck.lamps) { const b2 = new THREE.Mesh(beamGeo.clone().scale(0.42, 0.25, 0.25), beamMat); b2.position.copy(l.position); b2.layers.set(NOINK); this.truck.root.add(b2); this.truckBeams.push(b2); }
    this.y53.add(this.truck.root);
    // ---- 2007: the held train, the signal, the alarm mast, the road barriers, waiting cars ----
    const dx = buildDX(), mc1 = buildModCar(), mc2 = buildModCar();
    this.train07 = [dx, mc1, mc2];
    let off = 0;
    for (const v of this.train07) { v.root.position.set(TRAIN07_X + off, RAIL_Y, 0); v.root.rotation.y = Math.PI; off += v.len + 0.6; this.t07.add(v.root); }
    this.y07.add(this.t07);
    const sb7 = new Batch(), sigM = lam("sigPost", () => ({ color: "#5a5e66" })), blackM = lam("sigBlack", () => ({ color: "#1d1d22" }));
    sb7.add(new THREE.CylinderGeometry(0.1, 0.12, 5.2, 10), sigM, new THREE.Matrix4().makeTranslation(SIGNAL_X, hAt(SIGNAL_X, -3.4) + 2.6, -3.4));
    const disc = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24); disc.rotateZ(Math.PI / 2); sb7.add(disc, blackM, new THREE.Matrix4().makeTranslation(SIGNAL_X + 0.06, hAt(SIGNAL_X, -3.4) + 4.6, -3.4));
    sb7.build(this.y07);
    this.sigLamp = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18).rotateY(Math.PI / 2), glow("sigRed", [6, 0.5, 0.35]));
    this.sigLamp.position.set(SIGNAL_X + 0.11, hAt(SIGNAL_X, -3.4) + 4.6, -3.4); this.y07.add(this.sigLamp);
    const mb = new Batch(), mastM = lam("mastSteel", () => ({ color: "#a8aeb6" })), boxM = lam("mastBox", () => ({ color: "#c9ccbf" })), solar = lam("solar", () => ({ color: "#26385a" }));
    const my = hAt(MAST[0], MAST[2], "today");
    mb.add(new THREE.CylinderGeometry(0.13, 0.17, 7, 12), mastM, new THREE.Matrix4().makeTranslation(MAST[0], my + 3.5, MAST[2]));
    mb.add(boxGeo(V(MAST[0] - 0.5, my, MAST[2] + 0.4), V(MAST[0] + 0.5, my + 1.4, MAST[2] + 1.0), 0, true), boxM);
    mb.add(boxGeo(V(MAST[0] - 0.7, my + 1.4, MAST[2] + 0.35), V(MAST[0] + 0.7, my + 1.48, MAST[2] + 1.05)), boxM);
    const pnl = boxGeo(V(-0.6, -0.02, -0.45), V(0.6, 0.02, 0.45)); mb.add(pnl, solar, new THREE.Matrix4().makeRotationX(-0.6).setPosition(MAST[0], my + 5.2, MAST[2] - 0.5));
    const horn = new THREE.ConeGeometry(0.32, 0.7, 16, 1, true); horn.rotateX(Math.PI / 2); mb.add(horn, lam("horn", () => ({ color: "#d8dcd8", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(MAST[0] + 0.0, my + 6.3, MAST[2] - 0.45));
    mb.add(boxGeo(V(MAST[0] - 0.08, my + 6.2, MAST[2] - 0.12), V(MAST[0] + 0.08, my + 6.4, MAST[2])), mastM);
    mb.add(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 14), mastM, new THREE.Matrix4().makeTranslation(MAST[0], my + 7.05, MAST[2]));
    mb.build(this.y07);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow("beacon", [4, 2.2, 0.3]));
    this.beacon.position.set(MAST[0], my + 7.11, MAST[2]); this.y07.add(this.beacon);
    for (const s of [-1, 1]) {
      const g = new THREE.Group(), gb = new Batch();
      gb.add(boxGeo(V(-0.25, 0, -0.25), V(0.25, 1.0, 0.25)), lam("barrierPost", () => ({ color: "#e8e4dc" })));
      gb.build(g);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2).translate(0, 0, -2.1 * s), lam("barrierArm", () => ({ map: stripeTex() })));
      arm.position.set(0, 0.95, 0); arm.name = "arm"; g.add(arm);
      g.position.set(60 + (s > 0 ? 0 : -1), roadY(60, "today"), ROAD_Z + s * 4.3); this.barriers.push(g); this.y07.add(g);
    }
    const paints = ["#c23a3a", "#3f6fb5"];
    paints.forEach((p, i) => { const v = carModel(carMaterials(p)); v.root.position.set(70 + i * 6.5, roadY(70, "today") + 0.02, ROAD_Z + 1.8); v.root.rotation.y = Math.PI; this.cars07.push(v); this.y07.add(v.root); });

    // ---- the summit set ----
    this.crater.position.set(C[0], 0, C[2]);
    this.cGeo = gridMesh(cgrid(), 16);
    this.cTerr = new THREE.Mesh(this.cGeo, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true, map: rep(snowGrain(), 1, 1) }), 0.7));
    this.cTerr.frustumCulled = false; this.cTerr.receiveShadow = true;
    this.crater.add(this.cTerr);
    const lg = new THREE.CircleGeometry(LAKE_R + 14, 64); lg.rotateX(-Math.PI / 2);
    const lt = ctex("craterLake", 512, 512, (g, r) => {
      const gr = g.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, "#6fa6a2"); gr.addColorStop(0.8, "#7fb2aa"); gr.addColorStop(1, "#a8c8c0");
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(230,245,240,0.18)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 70, 8 + r() * 16, r() * 3, 0, 7); g.fill(); }
    });
    lg.setAttribute("uv", new THREE.Float32BufferAttribute(Array.from({ length: lg.attributes.position.count }, (_, i) => [0.5 + lg.attributes.position.getX(i) / (2 * (LAKE_R + 14)), 0.5 + lg.attributes.position.getZ(i) / (2 * (LAKE_R + 14))]).flat(), 2));
    this.lake = new THREE.Mesh(lg, twoTone(new THREE.MeshLambertMaterial({ map: lt }), 0.8));
    this.lake.receiveShadow = true; this.lake.layers.set(NOINK); this.crater.add(this.lake);
    this.outGeo = new THREE.BufferGeometry();
    const OR = 90, OC = 9;
    this.outGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(OR * OC * 3), 3));
    const ouv: number[] = [], oidx: number[] = [];
    for (let j = 0; j < OR; j++) for (let i = 0; i < OC; i++) ouv.push(i / (OC - 1), j * 0.18);
    for (let j = 0; j < OR - 1; j++) for (let i = 0; i < OC - 1; i++) { const a = j * OC + i, c2 = a + OC; oidx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
    this.outGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ouv, 2)); this.outGeo.setIndex(oidx);
    this.outflow = new THREE.Mesh(this.outGeo, twoTone(new THREE.MeshPhongMaterial({ color: "#b4a898", side: THREE.DoubleSide, map: this.flow, specular: "#666666", shininess: 60, envMap: this.envNight, reflectivity: 0.2, combine: THREE.MixOperation }), 0.6));
    this.outflow.frustumCulled = false; this.outflow.layers.set(NOINK); this.crater.add(this.outflow);
    const ashM = lam("ashChunk", () => ({ map: ashTex(), color: "#b0aaa4" }));
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(rockGeo(0.8 + 2.2 * hsh(i, 91) ** 1.5, 500 + i), ashM); m.castShadow = true; m.layers.set(NOINK); this.chunks.push(m); this.crater.add(m); }
    this.seep = new THREE.Mesh(new THREE.BufferGeometry(), lam("seep", () => ({ color: "#9cc8c4", side: THREE.DoubleSide })));
    this.seep.layers.set(NOINK); this.crater.add(this.seep);
    this.buildSeep();

    // ---- interior sets ----
    this.buildCarSet();
    this.buildBath();
  }

  // ---------------- sets ----------------
  private buildSeep() {
    // a thin trickle down the outer face of the dam (the water already wearing at it)
    const pts: number[] = [];
    for (let k = 0; k < 30; k++) {
      const u0 = RIM_R - 8 + k * 3, u1 = u0 + 3, w = 0.7 + 0.03 * k;
      const v0 = -0.08 * Math.max(0, u0 - RIM_R) + 1.5 * Math.sin(k * 0.7), v1 = -0.08 * Math.max(0, u1 - RIM_R) + 1.5 * Math.sin((k + 1) * 0.7);
      const y0 = craterH(u0, v0, 0) + 0.15, y1 = craterH(u1, v1, 0) + 0.15;
      pts.push(u0, y0, v0 - w, u1, y1, v1 - w, u1, y1, v1 + w, u0, y0, v0 - w, u1, y1, v1 + w, u0, y0, v0 + w);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals();
    this.seep.geometry = g;
  }
  private buildCarSet() {
    const [x, , z] = CAR_INT, b = new Batch(), thin = new Batch(), g = this.carSet;
    const hw = 1.32, L = 8.2, top = 2.2;
    const panel = lam("carPanel", () => ({ map: rep(panelTex(), 1, 1), side: THREE.DoubleSide }));
    b.add(quad(V(x - hw, 0, z + L), V(x + hw, 0, z + L), V(x + hw, 0, z - L), V(x - hw, 0, z - L), 2, 12), lam("carFloor", () => ({ map: rep(planksHD(), 1, 1) })));
    // walls: panelled, with window openings every 1.2 m (night glass set in)
    for (const s of [-1, 1]) {
      const wx = x + s * hw;
      b.add(quad(V(wx, 0, z - L), V(wx, 0, z + L), V(wx, 0.95, z + L), V(wx, 0.95, z - L), 12, 1), panel);
      b.add(quad(V(wx, 1.75, z - L), V(wx, 1.75, z + L), V(wx, top, z + L), V(wx, top, z - L), 12, 0.3), panel);
      for (let zz = z - L; zz < z + L - 0.1; zz += 1.2) {
        b.add(quad(V(wx, 0.95, zz), V(wx, 0.95, zz + 0.32), V(wx, 1.75, zz + 0.32), V(wx, 1.75, zz)), panel);
        b.add(quad(V(wx + s * 0.04, 0.95, zz + 0.32), V(wx + s * 0.04, 0.95, zz + 1.2), V(wx + s * 0.04, 1.75, zz + 1.2), V(wx + s * 0.04, 1.75, zz + 0.32)), lam("nightGlass", () => ({ map: nightGlass(), side: THREE.DoubleSide })));
        b.add(boxGeo(V(wx - s * 0.08 - 0.04, 0.92, zz + 0.3), V(wx - s * 0.08 + 0.04, 0.97, zz + 1.2)), lam("sill", () => ({ color: "#6a3c20" })));
      }
      // luggage rack + Christmas garland
      thin.add(boxGeo(V(wx - s * 0.42 - 0.2, 1.95, z - L), V(wx - s * 0.42 + 0.2, 1.98, z + L)), lam("rack", () => ({ color: "#c9a24a" })));
    }
    // ceiling (arched)
    const ceil = new THREE.CylinderGeometry(1.7, 1.7, 2 * L, 24, 1, true, -0.9, 1.8); ceil.rotateZ(Math.PI / 2); ceil.rotateX(-Math.PI / 2); ceil.rotateY(Math.PI / 2);
    b.add(ceil, lam("carCeil", () => ({ color: "#efe6d0", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(x, top + 0.42 - 1.7, z));
    // end walls with doors (far end open: Ellis comes in there)
    for (const s of [-1, 1]) {
      const ez = z + s * L;
      b.add(quad(V(x - hw, 0, ez), V(x - 0.45, 0, ez), V(x - 0.45, top + 0.3, ez), V(x - hw, top + 0.3, ez)), panel);
      b.add(quad(V(x + 0.45, 0, ez), V(x + hw, 0, ez), V(x + hw, top + 0.3, ez), V(x + 0.45, top + 0.3, ez)), panel);
      b.add(quad(V(x - 0.45, 1.95, ez), V(x + 0.45, 1.95, ez), V(x + 0.45, top + 0.3, ez), V(x - 0.45, top + 0.3, ez)), panel);
      if (s > 0) b.add(quad(V(x - 0.45, 0, ez), V(x + 0.45, 0, ez), V(x + 0.45, 1.95, ez), V(x - 0.45, 1.95, ez)), lam("doorGlass", () => ({ map: nightGlass(), side: THREE.DoubleSide })));
    }
    // seats: benches facing each other, both sides of the aisle
    const cloth = lam("seatCloth", () => ({ map: rep(seatTex(), 1, 1) })), frame = lam("seatFrame", () => ({ color: "#4a3020" }));
    for (let k = 0; k < 12; k++) {
      const zc = z - L + 0.9 + k * 1.3, face = k % 2 ? 1 : -1;
      for (const s of [-1, 1]) {
        const xa = s < 0 ? x - hw + 0.05 : x + 0.32, xb = s < 0 ? x - 0.32 : x + hw - 0.05;
        b.add(boxGeo(V(xa, 0.0, zc - 0.25), V(xb, 0.42, zc + 0.25)), frame);
        b.add(boxGeo(V(xa, 0.42, zc - 0.27), V(xb, 0.52, zc + 0.27)), cloth);
        const bz = zc - face * 0.3;
        b.add(boxGeo(V(xa, 0.52, bz - 0.07), V(xb, 1.2, bz + 0.07)), cloth);
        b.add(boxGeo(V(xa, 1.2, bz - 0.09), V(xb, 1.26, bz + 0.09)), frame);
      }
    }
    // suitcases and presents on the racks
    const caseM = [lam("case0", () => ({ color: "#8a5a34" })), lam("case1", () => ({ color: "#3a4a6a" })), lam("gift0", () => ({ color: "#c8343a" })), lam("gift1", () => ({ color: "#2f8a4a" }))];
    for (let k = 0; k < 14; k++) for (const s of [-1, 1]) {
      if (hsh(k * 2 + (s > 0 ? 1 : 0), 31) < 0.35) continue;
      const zc = z - L + 0.6 + k * 1.15, w = 0.35 + 0.3 * hsh(k, 32), h = 0.18 + 0.2 * hsh(k, 33), xc = x + s * (hw - 0.42);
      b.add(boxGeo(V(xc - 0.18, 1.98, zc - w / 2), V(xc + 0.18, 1.98 + h, zc + w / 2), 0, true), caseM[(k + (s > 0 ? 1 : 0)) % 4]);
    }
    b.build(g, false);
    const tg = new THREE.Group(); thin.build(tg, false); tg.traverse((o) => o.layers.set(NOINK)); g.add(tg);
    // ceiling lamps (self-lit globes)
    for (let zz = z - L + 1.2; zz < z + L; zz += 2.4) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), glow("carLamp", [1.7, 1.45, 1.0])); m.position.set(x, top + 0.28, zz); g.add(m); }
  }
  private buildBath() {
    const [x, , z] = BATH, b = new Batch(), g = this.bathSet;
    const wall = lam("bathTiles", () => ({ map: rep(tileTex(), 4, 2), side: THREE.DoubleSide }));
    b.add(quad(V(x - 4, 0, z + 6), V(x + 4, 0, z + 6), V(x + 4, 0, z - 2), V(x - 4, 0, z - 2), 3, 3), lam("bathFloor", () => ({ map: rep(planksHD(), 1, 1) })));
    b.add(quad(V(x - 4, 0, z + 6), V(x + 4, 0, z + 6), V(x + 4, 3, z + 6), V(x - 4, 3, z + 6)), wall);
    b.add(quad(V(x - 4, 0, z - 2), V(x - 4, 0, z + 6), V(x - 4, 3, z + 6), V(x - 4, 3, z - 2)), wall);
    b.add(quad(V(x + 4, 0, z + 6), V(x + 4, 0, z - 2), V(x + 4, 3, z - 2), V(x + 4, 3, z + 6)), wall);
    b.add(quad(V(x - 4, 3, z + 6), V(x + 4, 3, z + 6), V(x + 4, 3, z - 2), V(x - 4, 3, z - 2)), lam("ceilingB", () => ({ color: "#f2ead8", side: THREE.DoubleSide })));
    b.add(boxGeo(V(x - 4, 0, z + 5.92), V(x + 4, 0.15, z + 6)), lam("skirtB", () => ({ color: "#5a3a26" })));
    b.build(g, false);
    // a real enamel bath (1.70 x 0.75 m, 0.55 m tall), on four feet, chrome taps at the left end, drain at the right
    const T0 = V(x + 0.1, 0, z + 4.0), env = skyEnv(false);
    const enamel = twoTone(new THREE.MeshPhongMaterial({ color: "#f6f4ee", specular: "#ffffff", shininess: 90, envMap: env, reflectivity: 0.15, combine: THREE.MixOperation }));
    const rr = (w: number, d: number, r: number) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return s; };
    const ring = rr(1.7, 0.75, 0.26); ring.holes.push(rr(1.56, 0.61, 0.2) as unknown as THREE.Path);
    const shell = new THREE.ExtrudeGeometry(ring, { depth: 0.44, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
    shell.rotateX(-Math.PI / 2); shell.translate(0, 0.1, 0);
    const tub = new THREE.Mesh(shell, enamel); tub.position.copy(T0); tub.castShadow = true; tub.receiveShadow = true; g.add(tub);
    const bot = new THREE.ExtrudeGeometry(rr(1.58, 0.63, 0.2), { depth: 0.06, bevelEnabled: false, curveSegments: 16 }); bot.rotateX(-Math.PI / 2); bot.translate(0, 0.08, 0);
    const bm = new THREE.Mesh(bot, enamel); bm.position.copy(T0); g.add(bm);
    const fb = new Batch(), brass = lam("tubFeet", () => ({ color: "#c9a24a" }));
    for (const [fx2, fz2] of [[-0.68, -0.25], [0.68, -0.25], [-0.68, 0.25], [0.68, 0.25]]) fb.add(new THREE.SphereGeometry(0.06, 14, 10), brass, new THREE.Matrix4().makeTranslation(T0.x + fx2, 0.06, T0.z + fz2));
    const chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#d8dce2", specular: "#ffffff", shininess: 120, envMap: env, reflectivity: 0.6, combine: THREE.MixOperation }));
    fb.add(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), chrome, new THREE.Matrix4().makeTranslation(T0.x - 0.8, 0.66, T0.z));
    fb.add(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12).rotateZ(Math.PI / 2), chrome, new THREE.Matrix4().makeTranslation(T0.x - 0.73, 0.75, T0.z));
    for (const s of [-1, 1]) fb.add(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), chrome, new THREE.Matrix4().makeTranslation(T0.x - 0.8, 0.6, T0.z + s * 0.14));
    fb.build(g, true);
    this.drainHole = new THREE.Mesh(new THREE.CircleGeometry(0.028, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#1a1a1e" }));
    this.drainHole.position.set(T0.x + 0.6, 0.141, T0.z); g.add(this.drainHole);
    // the plug of sand in the drain
    const sandM = lam("sandPlug", () => ({ map: ctex("sandGrain", 256, 256, (gg, r) => { gg.fillStyle = "#cfb07a"; gg.fillRect(0, 0, 256, 256); for (let i = 0; i < 3000; i++) { const v = 150 + r() * 80; gg.fillStyle = `rgba(${v},${v - 25},${v - 70},0.7)`; gg.fillRect(r() * 256, r() * 256, 1.5, 1.5); } }) }));
    this.sandPlug = new THREE.Mesh(rockGeo(1, 900), sandM); this.sandPlug.position.set(T0.x + 0.6, 0.14, T0.z); g.add(this.sandPlug);
    // the water: a subdivided sheet clamped inside the bath's inner outline, rippling, dipping into a whirl at the drain
    const wg = new THREE.PlaneGeometry(1.56, 0.61, 64, 28); wg.rotateX(-Math.PI / 2);
    const wp = wg.attributes.position;
    for (let k = 0; k < wp.count; k++) { let px = wp.getX(k), pz = wp.getZ(k); const R = 0.19, ax = 0.78 - R, az = 0.305 - R; const qx = Math.max(Math.abs(px) - ax, 0), qz = Math.max(Math.abs(pz) - az, 0), d = Math.hypot(qx, qz); if (d > R) { px = Math.sign(px) * (ax + (qx * R) / d); pz = Math.sign(pz) * (az + (qz * R) / d); } wp.setXYZ(k, px * 0.995, 0, pz * 0.99); }
    this.tubWaterBase = Float32Array.from(wp.array as Float32Array);
    this.tubWater = new THREE.Mesh(wg, twoTone(new THREE.MeshPhongMaterial({ color: "#9cc8d4", specular: "#ffffff", shininess: 110, transparent: true, opacity: 0.72, envMap: env, reflectivity: 0.25, combine: THREE.MixOperation, depthWrite: false })));
    this.tubWater.position.copy(T0); this.tubWater.layers.set(NOINK); this.tubWater.renderOrder = 1; g.add(this.tubWater);
    // a rubber duck
    const yel = lam("duckYel", () => ({ color: "#f3d040" })), ora = lam("duckBeak", () => ({ color: "#e8892c" })), blk = lam("duckEye", () => ({ color: "#151418" }));
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), yel); body.scale.set(1.25, 0.8, 1); body.position.y = 0.035;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.043, 18, 12), yel); head.position.set(0.06, 0.1, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 12).rotateZ(-Math.PI / 2), ora); beak.position.set(0.108, 0.094, 0); beak.scale.set(1, 1, 1.6);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), blk); e.position.set(0.088, 0.115, s * 0.022); this.duck.add(e); }
    this.duck.add(body, head, beak); this.duck.traverse((o) => { o.castShadow = true; }); g.add(this.duck);
  }

  // ---------------- per-frame posing ----------------
  private poseValley(era: Era) {
    if (this.tKey === era) return;
    this.tKey = era;
    fillGrid(this.tGeo, grid(), (x, z) => hAt(x, z, era), (x, z, y, ny, out) => {
      const d = Math.abs(x - rc(z)), tn = fbm(x / 9, z / 9), bank = sstep(BED_HW_C, BANK_HW_C + 2, d);
      out.copy(TUS).lerp(TUS2, smooth((tn - 0.45) / 0.2) * 0.6).lerp(TUS3, smooth((fbm(x / 31, z / 31) - 0.5) / 0.15) * 0.4);
      if (bank < 0.98) out.lerp(GRAV.clone().lerp(GRAV2, tn), 1 - bank);
      if (d > BED_HW_C && d < BANK_HW_C + 4) out.lerp(BANK, (1 - smooth((0.85 - ny) / 0.2)) * 0.2 + smooth((0.9 - ny) / 0.25) * 0.7);
      if (Math.abs(z) < 4.2 && Math.abs(x) > ABUT - 1 && y > RAIL_Y - 2.5) out.lerp(EMB, smooth((4.2 - Math.abs(z)) / 1.2));
      void y;
    });
  }
  private poseCrater(b: number, era: Era) {
    const key = `${b.toFixed(3)}|${era}`;
    if (key === this.cKey) return;
    this.cKey = key;
    fillGrid(this.cGeo, cgrid(), (u, v) => craterH(u, v, b), (u, v, y, ny, out) => {
      const tn = fbm(u / 11, v / 11), r = Math.hypot(u, v);
      out.copy(SNOW).lerp(SNOW2, 0.4 * tn + 0.25 * sstep(400, 1000, r));
      out.lerp(ROCK, smooth((0.82 - ny) / 0.2) * 0.8);
      if (r > 520 && era === "today") out.lerp(ROCK, 0.35);
      // the dam: loose tephra laid down in beds (grey / brown-grey bands with height), wet and darker near the water
      const dk = damK(u, v);
      if (dk > 0.01) { const band = 0.5 + 0.5 * Math.sin(y * 1.6 + 2 * fbm(u / 20, v / 20)); out.lerp(ASH.clone().lerp(ASH2, band).lerp(col("#5e5246"), 0.5 * (1 - band)), Math.min(1, dk * 1.3)); if (y < lakeLevel(b) + 3) out.multiplyScalar(0.8); }
      if (y < lakeLevel(b) + 0.4 && r < LAKE_R + 30) out.copy(ROCK);
    });
    this.lake.position.y = lakeLevel(b);
  }
  private poseOutflow(b: number, t: number) {
    this.outflow.visible = b > 0.01;
    if (!this.outflow.visible) return;
    const P = this.outGeo.attributes.position as THREE.BufferAttribute, OR = 90, OC = 9;
    for (let j = 0; j < OR; j++) {
      const u = LAKE_R - 12 + j * 8.5, reach = LAKE_R - 12 + b * 9 * OR, v0 = -0.08 * Math.max(0, u - RIM_R), w = (6 + 30 * b) * (0.6 + 0.4 * sstep(RIM_R - 20, RIM_R + 60, u));
      for (let i = 0; i < OC; i++) {
        const a = i / (OC - 1) - 0.5, v = v0 + a * 2 * w, prof = 1 - (2 * a) ** 2;
        const on = u < reach ? 1 : 0;
        const y = u < RIM_R - 20 ? lakeLevel(b) + 0.05 : craterH(u, v, b) + (0.4 + 2.6 * b) * prof * on - (on ? 0 : 3);
        P.setXYZ(j * OC + i, u, Math.max(y, craterH(u, v, b) - 2), v);
      }
    }
    P.needsUpdate = true; this.outGeo.computeVertexNormals();
    this.flow.offset.set(0, -t * 1.4);
  }
  private poseWater(lt: number, era: Era, light: LightName, t: number) {
    const P = this.wGeo.attributes.position.array as Float32Array, Nn = this.wGeo.attributes.normal.array as Float32Array, Cc = this.wGeo.attributes.color.array as Float32Array;
    const cols = this.wCols, rows = this.wRows, K = LOOK[light].water;
    const body = untone(K.body), foam = untone(K.foam), stream = untone(K.stream);
    const zf = lt > 1e8 || lt < -1e8 ? (lt > 0 ? -1e9 : 1e9) : zfAt(lt);
    const Y = new Float32Array(cols * rows.length);
    for (let j = 0; j < rows.length; j++) {
      const z = rows[j], c0 = rc(z);
      for (let i = 0; i < cols; i++) {
        const x = c0 + (i - (cols - 1) / 2) * 2, o = j * cols + i;
        const y = waterY(x, z, lt, era, t);
        Y[o] = y; P[o * 3] = x; P[o * 3 + 1] = y; P[o * 3 + 2] = z;
      }
    }
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < cols; i++) {
      const o = j * cols + i, i0 = Math.max(0, i - 1), i1 = Math.min(cols - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(rows.length - 1, j + 1);
      const dx = (Y[j * cols + i1] - Y[j * cols + i0]) / ((i1 - i0) * 2), dz = (Y[j1 * cols + i] - Y[j0 * cols + i]) / (rows[j1] - rows[j0] || 1);
      const l = Math.hypot(dx, 1, dz);
      Nn[o * 3] = -dx / l; Nn[o * 3 + 1] = 1 / l; Nn[o * 3 + 2] = -dz / l;
      const z = rows[j], s = z - zf, flood = Y[o] - bedY(z) > 0.6;
      if (!flood) tmpC.copy(stream);
      else {
        tmpC.copy(body);
        const steep = smooth((Math.hypot(dx, dz) - 0.25) / 0.5), front = lt > -1e8 && lt < 1e8 ? Math.exp(-(((s - 4) / 7) ** 2)) : 0;
        tmpC.lerp(foam, Math.min(1, steep * 0.8 + front * 0.65));
      }
      Cc[o * 3] = tmpC.r; Cc[o * 3 + 1] = tmpC.g; Cc[o * 3 + 2] = tmpC.b;
    }
    this.wGeo.attributes.position.needsUpdate = true; this.wGeo.attributes.normal.needsUpdate = true; this.wGeo.attributes.color.needsUpdate = true;
    this.flow.offset.set(0.02 * Math.sin(t * 0.7), (t * (lt > -1e8 ? 6.5 : 0.5)) / 18);
    const env = light === "night" ? this.envNight : this.envDay;
    for (const m of [this.waterMat as unknown as THREE.MeshPhongMaterial, this.dropMat]) if (m.envMap !== env) { m.envMap = env; m.needsUpdate = true; }
    this.dropMat.color.set(light === "night" ? "#5e544c" : "#9a8a78");
    // floaters ride the front (and tumble in the steady flood after it)
    const live = lt > -1e8;
    for (const fl of this.floaters) {
      fl.m.visible = live;
      if (!live) continue;
      const zz = lt < 1e8 ? zf + fl.s : -60 + ((fl.s * 37 + (t * 6)) % 200) * -1 + 100, xx = rc(zz) + fl.u * (lt < 1e8 ? 1 : 0.6);
      const y = waterY(xx, zz, lt, era, t);
      fl.m.visible = y - bedY(zz) > 1.0 && (lt < 1e8 || fl.s > 8);
      fl.m.position.set(xx, y - fl.r * 0.35 + 0.25 * Math.sin(t * 2 + fl.s), zz);
      const dist = lt < 1e8 ? (lt * LAHAR_V) : t * 6;
      fl.m.rotation.set(dist / (fl.r * 2.2) * fl.spin, fl.s, 0.3 * Math.sin(dist * 0.1 + fl.u));
    }
  }
  private poseBridge(lt: number) {
    const pf = lt < -1e8 ? 0 : lt > 1e8 ? 1 : pierFall(lt), sd = lt < -1e8 ? 0 : lt > 1e8 ? 1 : spanDrop(lt);
    this.lostPier.visible = pf < 0.999;
    this.lostPier.rotation.set(-1.35 * pf * pf, 0, 0.1 * pf);
    this.lostPier.position.set(LOST_PIER, -2.5 * pf, -7 * pf);
    this.spanA.rotation.z = -0.9 * sd; this.spanA.position.y = -0.3 * sd;
    this.spanB.rotation.z = 1.0 * sd;
  }
  /** place a vehicle by its front point and back point (world), plus a roll about its own axis */
  private placeCar(v: Rolling, F: THREE.Vector3, B: THREE.Vector3, rollA = 0) {
    const fwd = F.clone().sub(B).normalize(), up0 = V(0, 1, 0);
    let side = fwd.clone().cross(up0); if (side.lengthSq() < 1e-6) side = V(0, 0, 1); side.normalize();
    const up = side.clone().cross(fwd).normalize();
    // basis: x = fwd, y = up, z = x cross y (= -side)
    const z = fwd.clone().cross(up).normalize();
    const m = new THREE.Matrix4().makeBasis(fwd, up, z);
    v.root.quaternion.setFromRotationMatrix(m);
    if (rollA) v.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), rollA));
    v.root.position.copy(F);
  }
  private pathPt(s: number) { const [x, z] = pathXZ(s); return V(x, pathY(s), z); }
  private poseTrain(mode: TrainMode, t: number) {
    const { cars, group, beam } = this.train53;
    group.visible = mode !== "none";
    if (!group.visible) return;
    beam.visible = false;
    for (const v of cars) for (const l of v.lamps ?? []) l.visible = true;
    if (mode === "cruise") {
      const xf = cruiseX(t);
      cars.forEach((v, i) => {
        const x = xf + carOffset(i);
        v.root.visible = x < 1800;
        v.root.position.set(x, RAIL_Y, 0); v.root.quaternion.setFromAxisAngle(V(0, 1, 0), Math.PI); // heading -x
        roll(v, (t - 4.9) * 24);
      });
      return;
    }
    const sf = mode === "run" ? frontS(t) : S_SETTLED;
    cars.forEach((v, i) => {
      const s0 = sf - carOffset(i), s1 = s0 - v.len;
      v.root.visible = EDGE_X - s0 < 1800;
      if (!v.root.visible) return;
      if (i === SIXTH && (mode === "settled" || mode === "fall6" || mode === "rest6")) { this.poseSixth(v, mode, t); return; }
      const F = this.pathPt(s0), B = this.pathPt(s1);
      const smid = (s0 + s1) / 2, rl = (i % 2 ? 0.35 : -0.28) * sstep(14, 30, smid) + (i === 0 ? 0.25 * sstep(6, 20, smid) : 0);
      this.placeCar(v, F, B, rl);
      roll(v, Math.min(s0, 0) + 1000);
      // the lights go out once a car is in the water
      for (const l of v.lamps ?? []) l.visible = pathY(smid) > -1.2;
    });
    beam.visible = false;
  }
  private poseSixth(v: Rolling, mode: TrainMode, t: number) {
    const s0 = S_SETTLED - carOffset(SIXTH), edge = V(EDGE_X, RAIL_Y, 0);
    // teetering on the edge: pivot about the edge, front down a little
    const tilt = 0.05 + 0.025 * Math.sin(t * 2.6);
    const edgePose = () => { const F = edge.clone().add(V(-(s0) * Math.cos(tilt), -s0 * Math.sin(tilt), 0)), B = edge.clone().add(V((v.len - s0) * Math.cos(tilt), (v.len - s0) * Math.sin(tilt), 0)); return { F, B }; };
    const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2));
    // rest: lying on its side (fell downstream), its middle at REST6, half sunk into the gravel / water
    const restCtr = V(REST6[0], hAt(REST6[0], REST6[2]) + 1.0, REST6[2]);
    if (mode === "settled") { const { F, B } = edgePose(); this.placeCar(v, F, B); for (const l of v.lamps ?? []) l.visible = true; return; }
    for (const l of v.lamps ?? []) l.visible = false;
    const u = mode === "rest6" ? 2 : (t - T_FALL6) / 1.05;
    if (u <= 0) { const { F, B } = edgePose(); this.placeCar(v, F, B); for (const l of v.lamps ?? []) l.visible = true; return; }
    // phase 1 (u < .4): pivots over the edge, sliding forward; phase 2: drops and rolls onto its side
    const { F, B } = edgePose();
    this.placeCar(v, F, B);
    const q0 = v.root.quaternion.clone(), p0 = v.root.position.clone();
    const ctr0 = p0.clone().add(V(-v.len / 2, 0, 0).applyQuaternion(q0));
    const k1 = smooth(u / 0.4), k2 = clamp((u - 0.3) / 0.7);
    const qT = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.7 * k1));
    const q = qT.clone().slerp(restQ, smooth(k2));
    const ctr = ctr0.clone().add(V(-3 * k1, -2.5 * k1, 0)).lerp(restCtr, k2 * k2 * (3 - 2 * k2));
    ctr.y -= 2.2 * Math.sin(Math.PI * Math.min(1, k2)) * 0; // (no bounce)
    v.root.quaternion.copy(q);
    v.root.position.copy(ctr.clone().add(V(v.len / 2, 0, 0).applyQuaternion(q)));
  }

  private poseTub(t: number) {
    const { level, erode, drain } = tubState(t);
    const T0 = this.tubWater.position, y = 0.15 + 0.33 * level, P = this.tubWater.geometry.attributes.position as THREE.BufferAttribute, B = this.tubWaterBase;
    for (let k = 0; k < P.count; k++) {
      const px = B[k * 3], pz = B[k * 3 + 2], r = Math.hypot(px - 0.5, pz), a = Math.atan2(pz, px - 0.5);
      let dy = 0.004 * Math.sin(px * 18 + t * 2.2) * Math.sin(pz * 21 - t * 1.7) + 0.002 * Math.sin((px + pz) * 40 + t * 5);
      if (drain > 0) dy += -Math.min(0.12, 0.11 * drain * Math.exp(-(r * r) / 0.012)) * Math.min(1, level * 4 + 0.2) + 0.006 * drain * Math.sin(a * 3 + r * 60 - t * 14) * Math.exp(-r / 0.15);
      P.setY(k, dy);
    }
    P.needsUpdate = true; this.tubWater.geometry.computeVertexNormals();
    T0.y = y; this.tubWater.visible = level > 0.01;
    const k = Math.max(0, 1 - drain * 1.4);
    this.sandPlug.visible = k > 0.02;
    this.sandPlug.scale.set(0.075 * (1 - 0.25 * erode) * k, 0.06 * (1 - 0.45 * erode) * k, 0.07 * k);
    this.sandPlug.rotation.set(0, erode * 0.4, 0);
    // the duck rides the surface, drifting to the whirl as it drains and settling on the bottom
    const dx = -0.5 + 0.8 * drain * drain, wob = 0.02 * Math.sin(t * 1.8);
    this.duck.position.set(T0.x + dx, Math.max(0.14, y - 0.012) + wob * 0.2, T0.z + 0.05 + wob - 0.06 * drain);
    this.duck.rotation.set(0.04 * Math.sin(t * 2.3), 0.4 + drain * 4 * drain, 0.05 * Math.sin(t * 1.7));
  }
  /** ballistic droplets from the stage's bursts (t0 is relative: age = -t0) */
  private poseDrops(bursts: { x: number; y: number; z: number; t0: number; n: number; v: number; spread: number; size: number; seed: number; dx?: number; dz?: number }[]) {
    let k = 0; const m = this.m4, N = 2400, q0 = new THREE.Quaternion();
    for (const b of bursts) {
      const age = -b.t0;
      if (age < 0) continue;
      for (let i = 0; i < b.n && k < N; i++) {
        const h1 = hsh(b.seed, i * 3 + 1), h2 = hsh(b.seed, i * 3 + 2), h3 = hsh(b.seed, i * 3 + 3);
        const a = h1 * Math.PI * 2, el = Math.acos(b.spread * (0.15 + 0.85 * h2)), sp = b.v * (0.35 + 0.65 * h3);
        const vx = Math.sin(el) * Math.cos(a) * sp + (b.dx ?? 0), vz = Math.sin(el) * Math.sin(a) * sp + (b.dz ?? 0), vy = Math.cos(el) * sp;
        const y = b.y + vy * age - 4.9 * age * age;
        if (y < b.y - 0.4) continue;
        const r = b.size * (0.5 + 0.9 * hsh(b.seed, i + 77)) * Math.max(0.3, 1 - age * 0.35);
        m.compose(this.v.set(b.x + vx * age, y, b.z + vz * age), q0, new THREE.Vector3(r, r * (1 + 0.6 * Math.min(1, Math.abs(vy - 9.8 * age) / 8)), r));
        this.drops.setMatrixAt(k++, m);
      }
    }
    this.drops.count = k; this.drops.instanceMatrix.needsUpdate = true;
  }
  private shotSun(id: number, s: ShotDef, L: LightPreset, ck = 0) {
    let v = this.sunCache.get(id * 10 + ck);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id * 10 + ck, v);
    return v;
  }
  private shadowFrame(id: number, f: number, s: ShotDef, sunDir: THREE.Vector3) {
    let f0 = s.a;
    for (const [sid, sf] of SETUPS) if (sid === id && sf <= f && sf > f0) f0 = sf;
    const key = `${id}|${f0}`;
    let r = this.shadowCache.get(key);
    if (r) return r;
    let f1 = s.b;
    for (const [sid, sf] of SETUPS) if (sid === id && sf > f0 && sf < f1) f1 = sf;
    let Rr = 12;
    for (let k = f0; k < f1; k += 2) { const c = camAt(id, k); Rr = Math.max(Rr, Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]) * 1.15 + 7); }
    Rr = Math.min(160, Rr);
    const c0 = camAt(id, f0), ctr = V(...c0.look);
    const right = V(0, 1, 0).cross(sunDir).normalize(), up = sunDir.clone().cross(right).normalize(), tex = (2 * Rr) / 2048;
    const u = ctr.dot(right), v = ctr.dot(up);
    ctr.addScaledVector(right, Math.round(u / tex) * tex - u).addScaledVector(up, Math.round(v / tex) * tex - v);
    r = { Rr, ctr }; this.shadowCache.set(key, r);
    return r;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], light = lightAt(id, f), L = LIGHTS[light], set = setAt(id, f), era = eraAt(id, f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = set === "car" || set === "bath" ? 0.08 : 0.4; cam.far = 12000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    const K = LOOK[light], sunDir = this.shotSun(id, s, L, set === "car" ? 1 : set === "valley" && s.set !== "valley" ? 2 : 0);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const indoor = set === "car" || set === "bath";
    const { Rr, ctr } = indoor ? { Rr: 12, ctr: focus } : this.shadowFrame(id, f, s, sunDir);
    this.sun.castShadow = !indoor;
    this.sun.position.copy(ctr).addScaledVector(sunDir, 600); this.sun.target.position.copy(ctr);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 1400; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = light === "night" ? 0.74 : 1.03;
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]); su.stars.value = K.stars;
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    if (set === "crater") { this.fog.near = 500; this.fog.far = light === "night" ? 3200 : 4200; }
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.visible = light === "day"; m.lookAt(cam.position.x, m.position.y, cam.position.z); }
    WIND.time.value = t; WIND.strength.value = light === "night" ? 0.6 : 1.0;
    this.valley.visible = set === "valley"; this.crater.visible = set === "crater"; this.carSet.visible = set === "car"; this.bathSet.visible = set === "bath";
    this.sky.visible = !indoor;
    const lt = s.lahar(t);
    if (set === "valley") {
      this.poseValley(era);
      { const mm = this.mountain.material as THREE.Material & { fog: boolean }; const fg = light !== "night"; if (mm.fog !== fg) { mm.fog = fg; mm.needsUpdate = true; } }
      this.y53.visible = era === "night"; this.y07.visible = era === "today";
      this.poseWater(lt, era, light, t);
      if (era === "night") { this.poseBridge(lt); this.poseTrain(trainAt(id, f), t); this.truck.root.visible = id === 9 || id === 3 ? id === 9 : false; for (const b of this.truckBeams) b.visible = false; }
      else {
        const alarm = id === 17;
        const flash = alarm ? (Math.floor(t * 2.4) % 2 === 0 ? 1 : 0.15) : 0.08;
        (this.beacon.material as THREE.MeshBasicMaterial).color.setRGB(4 * flash + 0.3, 2.2 * flash + 0.2, 0.3 * flash + 0.05);
        this.t07.visible = id === 17; this.sigLamp.visible = id === 17;
        for (const g of this.barriers) { const arm = g.getObjectByName("arm")!; arm.rotation.x = alarm ? 0 : -1.4; }
        for (const v of this.cars07) v.root.visible = alarm;
      }
    }
    if (set === "bath") this.poseTub(t);
    if (set === "crater") {
      const b = s.breach ? s.breach(t) : 0; this.poseCrater(b, era); this.poseOutflow(b, t); this.seep.visible = id === 4;
      const env = light === "night" ? this.envNight : this.envDay, om = this.outflow.material as THREE.MeshPhongMaterial;
      if (om.envMap !== env) { om.envMap = env; om.needsUpdate = true; }
      // blocks of the dam carried off by the water: they slump into the notch and tumble down the gully
      this.chunks.forEach((m, i) => {
        const u0 = (b * 1.25 - i * 0.03);
        m.visible = b > 0.02 && u0 > 0;
        if (!m.visible) return;
        const along = Math.min(1, u0) * (60 + 260 * hsh(i, 92)), uu = RIM_R - 6 + along, vv = -0.08 * Math.max(0, uu - RIM_R) + (hsh(i, 93) - 0.5) * (8 + 26 * b);
        const y = craterH(uu, vv, b) + 0.6 + 1.5 * Math.abs(Math.sin(along * 0.25 + i));
        m.position.set(uu, y, vv); m.rotation.set(along * 0.4 + i, i, along * 0.27);
      });
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    this.poseDrops(stg.bursts);
    let ai = 0;
    for (const p of stg.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      let scK = 1;
      if (p.pull) { const d = this.v.copy(cam.position).sub(a.mesh.position), L = Math.hypot(d.x, d.z); if (L > p.pull + 0.3) { a.mesh.position.x += (d.x / L) * p.pull; a.mesh.position.z += (d.z / L) * p.pull; scK = (L - p.pull) / L; a.mesh.position.y = cam.position.y + (p.y - cam.position.y) * scK; } }
      a.mesh.scale.set((p.mirror ? -sc2 : sc2) * scK, sc2 * scK, sc2 * scK);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of stg.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      e2.add = !!p.add;
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

const BED_HW_C = 27, BANK_HW_C = 40;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** every outdoor lens position looking at its subject (trees in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    if (setAt(s.id, Math.max(0, f)) !== "valley") continue;
    const c = camAt(s.id, Math.max(0, f));
    const o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.6], [0, -0.6]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
const blocked = (rays: Ray[], x: number, y: number, z: number, h: number) => {
  const r = Math.max(2.5, h * 0.3), cy = y + h * 0.5;
  for (const { o, d, len } of rays) {
    const dl = d.length(), dx = d.x / dl, dy = d.y / dl, dz = d.z / dl;
    const px = x - o.x, py = cy - o.y, pz = z - o.z, tt = px * dx + py * dy + pz * dz;
    if (tt < 0 || tt > len * 0.85) { if (Math.hypot(px, py, pz) < r + 3) return true; continue; }
    const qx = px - tt * dx, qy = py - tt * dy, qz = pz - tt * dz;
    if (Math.abs(qy) < h * 0.5 + 2 && Math.hypot(qx, qz) < r + 1.5) return true;
  }
  return false;
};
const coneCache = new Map<string, THREE.BufferGeometry>();
const coneG = (r: number, h: number) => { const k = `${r.toFixed(2)}|${h.toFixed(2)}`; let g = coneCache.get(k); if (!g) { g = new THREE.ConeGeometry(r, h, 8, 1, true); coneCache.set(k, g); } return g; };
/** a radiata-style pine: a tall trunk, layered dark crown */
function conifer(b: Batch, needle: THREE.Material, bark: THREE.Material, x: number, y: number, z: number, h: number, seed: number) {
  const w = h * (0.26 + 0.06 * hsh(seed, 7));
  b.add(new THREE.CylinderGeometry(w * 0.07, w * 0.11, h * 0.45, 6), bark, new THREE.Matrix4().makeTranslation(x, y + h * 0.22, z));
  for (const [y0, hh, rr] of [[0.3, 0.42, 1.0], [0.52, 0.32, 0.78], [0.7, 0.3, 0.5]] as [number, number, number][])
    b.add(coneG(w * rr, h * hh), needle, new THREE.Matrix4().makeRotationY(seed).setPosition(x, y + h * (y0 + hh / 2), z));
}
/** a concrete pier with rounded cutwaters, from the bed to the girder seat */
function pier(b: Batch, m: THREE.Material, x: number, z: number, top: number) {
  const y0 = -8.5, w = 0.8, L = 2.6;
  b.add(boxGeo(V(x - w, y0, z - L), V(x + w, top - 0.35, z + L)), m);
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(w, w, top - 0.35 - y0, 16, 1, false, s > 0 ? 0 : Math.PI, Math.PI), m, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x, (y0 + top - 0.35) / 2, z + s * L));
  b.add(boxGeo(V(x - w - 0.15, top - 0.35, z - L - 0.4), V(x + w + 0.15, top, z + L + 0.4)), m);
}
/** one 15 m deck span: two plate girders, cross bracing, timber transoms, rails, a light handrail */
function span(b: Batch, thin: Batch, steel: THREE.Material, deck: THREE.Material, sleeper: THREE.Material, rail: THREE.Material, xa: number, xb: number) {
  for (const s of [-1, 1]) {
    b.add(boxGeo(V(xa, -0.2, s * 0.85 - 0.06), V(xb, 0.95, s * 0.85 + 0.06), 0, true), steel);
    b.add(boxGeo(V(xa, 0.85, s * 0.85 - 0.22), V(xb, 0.95, s * 0.85 + 0.22)), steel);
    b.add(boxGeo(V(xa, -0.25, s * 0.85 - 0.22), V(xb, -0.15, s * 0.85 + 0.22), 0, true), steel);
    for (let x = xa + 1.5; x < xb; x += 1.5) b.add(boxGeo(V(x - 0.05, -0.15, s * 0.85 - 0.14), V(x + 0.05, 0.85, s * 0.85 - 0.08 * s)), steel);
  }
  for (let x = xa + 0.3; x < xb; x += 0.6) b.add(boxGeo(V(x - 0.12, 0.95, -1.45), V(x + 0.12, 1.05, 1.45), 0, true), deck);
  for (const s of [-1, 1]) thin.add(boxGeo(V(xa, 1.05, s * 0.535 - 0.035), V(xb, RAIL_Y, s * 0.535 + 0.035)), rail);
  for (let x = xa; x <= xb; x += 2.5) thin.add(boxGeo(V(x - 0.03, 1.05, 1.42), V(x + 0.03, 2.1, 1.48)), steel);
  thin.add(boxGeo(V(xa, 2.05, 1.42), V(xb, 2.11, 1.48)), steel);
  void sleeper;
}
/** a road ribbon along x at ROAD_Z */
function roadRibbon(y: (x: number) => number, x0: number, x1: number, hw: number) {
  const pos: number[] = [], uv: number[] = [];
  for (let x = x0; x < x1; x += 3) {
    const a = y(x), b2 = y(x + 3), u0 = x / 8.5, u1 = (x + 3) / 8.5;
    pos.push(x, a, ROAD_Z + hw, x + 3, b2, ROAD_Z + hw, x + 3, b2, ROAD_Z - hw, x, a, ROAD_Z + hw, x + 3, b2, ROAD_Z - hw, x, a, ROAD_Z - hw);
    uv.push(0, u0, 0, u1, 1, u1, 0, u0, 1, u1, 1, u0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
/** Mount Ruapehu: a broad massif with a flat-topped summit plateau, ridges, a snow cap; vertex colours */
function mountainMesh() {
  const { x: mx, z: mz, h: H, r: Rm } = RUAPEHU, NR = 60, NA = 120;
  const pos: number[] = [], colr: number[] = [], idx: number[] = [];
  const snow = col("#e6edf6"), rock = col("#6e6a70"), low = col("#6a6458"), c = new THREE.Color();
  for (let j = 0; j <= NR; j++) for (let i = 0; i < NA; i++) {
    const r = (j / NR) * Rm, a = (i / NA) * Math.PI * 2;
    const ridge = 0.08 * Math.sin(a * 7 + 1.3) + 0.05 * Math.sin(a * 13 + 0.4) + 0.06 * (fbm(a * 3, r / 400) - 0.5);
    let h = H * Math.pow(Math.max(0, 1 - r / Rm), 1.35) * (1 + ridge * (r / Rm));
    h = Math.min(h, H * 0.97) - (r < 220 ? 40 * (1 - r / 220) : 0) + 30 * (fbm(r / 300 + a, a) - 0.5) * (r / Rm);
    const x = mx + r * Math.cos(a), z = mz + r * Math.sin(a);
    pos.push(x, h, z);
    const sn = sstep(H * 0.5, H * 0.62, h + 80 * Math.sin(a * 9)) * (0.8 + 0.2 * Math.sin(a * 17));
    c.copy(low).lerp(rock, sstep(H * 0.2, H * 0.45, h)).lerp(snow, sn);
    colr.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * NA + i, b2 = j * NA + ((i + 1) % NA), c2 = a + NA, d = b2 + NA; idx.push(a, c2, b2, b2, c2, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }), 1.6));
  m.frustumCulled = false;
  return m;
}
void plainY; void CRATER; void GAP; void REST6; void W2;
function W2() { return 0; }
void Ws;

/** a real-looking stone: a smooth lumpy icosphere (merged vertices: no facet creases), flattened, with a few flat
 *  fracture faces, box-projected UVs for the rock texture */
export function rockGeo(r: number, seed: number) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 3).deleteAttribute("normal").deleteAttribute("uv"));
  const pp = g.attributes.position, v = new THREE.Vector3(), uv: number[] = [];
  const cut = [0, 1, 2].map((k) => new THREE.Vector3(hsh(seed, 40 + k) - 0.5, hsh(seed, 50 + k) - 0.5, hsh(seed, 60 + k) - 0.5).normalize());
  for (let k = 0; k < pp.count; k++) {
    v.fromBufferAttribute(pp, k);
    let f = 1 + 0.16 * fbm(v.x * 1.7 + seed, v.z * 1.7 + v.y) + 0.06 * Math.sin(v.x * 7 + seed) * Math.cos(v.y * 6);
    for (const c of cut) { const d = v.dot(c); if (d > 0.62) f = Math.min(f, 0.66 / d); }
    v.multiplyScalar(f * r); v.y *= 0.72 + 0.2 * hsh(seed, 3); v.z *= 0.9 + 0.3 * hsh(seed, 4);
    pp.setXYZ(k, v.x, v.y, v.z);
    const n = v.clone().normalize(), ax = Math.abs(n.x), ay = Math.abs(n.y);
    if (ay > ax && ay > Math.abs(n.z)) uv.push(v.x / 2, v.z / 2); else if (ax > Math.abs(n.z)) uv.push(v.z / 2, v.y / 2); else uv.push(v.x / 2, v.y / 2);
  }
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
