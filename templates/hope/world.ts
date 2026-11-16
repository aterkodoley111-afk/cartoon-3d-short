// The whole place as one three.js scene: the Nicolum Valley on 9 January 1965 (Johnson Peak, Mount Coulter, Outram
// Lake, the snowy Hope-Princeton highway, conifers, the edge of Hope), the slide itself (a live heightfield driven by
// terrain.ts), the stuck convertible / oil tanker / hay truck, the Greyhound bus, the rebuilt highway on top of the
// debris (1966 crew and today), and three small interior sets for the inserts (seismograph station, bathroom,
// kitchen). update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, setSight, Kit, Ray, quad } from "./build";
import { ctex, rep, planksHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, smooth, ShotDef, setAt, eraAt, Ws, W, LANE_E, LANE_W, MOUND, CONV_X, tankX, hayX, BUS_X, TOWN, ROOM, BATH, KITCHEN,
  carNowX, carNowZ, crackAt,
} from "./story";
import { H0, hAt, xp, dep, fbm, LAKE, lakeIn, passT, srcAt, scarAt, RELEASE, ROAD_NEW_Z, roadNewY, Era, SLIDE_X, crackDist, CRACKS } from "./terrain";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here

// ---------------- painted textures ----------------
const snowTex = () => ctex("snowBlotch", 512, 512, (g, r) => {
  g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.5)" : "rgba(170,180,200,0.16)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 80, 14 + r() * 40, r() * 3, 0, 7); g.fill(); }
});
const roadTex = (key: string, base: string, line: string | null, cracks: boolean) => ctex("road" + key, 256, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 256, r() * 1024, 6 + r() * 20, 4 + r() * 10); }
  if (line) { g.fillStyle = line; for (let y = 0; y < 1024; y += 256) g.fillRect(120, y + 30, 16, 140); }
  g.fillStyle = "rgba(235,235,230,0.55)"; g.fillRect(8, 0, 8, 1024); g.fillRect(240, 0, 8, 1024);
  if (cracks) {
    g.strokeStyle = "rgba(20,18,16,0.6)"; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { let x = r() * 256, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = "rgba(90,130,60,0.7)"; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 1024, 4 + r() * 10, 3 + r() * 6, 0, 0, 7); g.fill(); }
  }
});
const tileTex = () => ctex("tiles", 512, 512, (g) => {
  g.fillStyle = "#cfe3e6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#9ab8bd"; g.lineWidth = 4; for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
const wallpaper = (key: string, a: string, b: string) => ctex("wp" + key, 512, 512, (g) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  g.fillStyle = b; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 18, 512);
});
const windowTex = () => ctex("roomWindow", 256, 320, (g) => {
  g.fillStyle = "#f2ead8"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#9cc4ea"; g.fillRect(24, 24, 208, 272);
  g.fillStyle = "#f2ead8"; g.fillRect(124, 24, 8, 272); g.fillRect(24, 156, 208, 8);
  g.strokeStyle = "#3a2a22"; g.lineWidth = 6; g.strokeRect(21, 21, 214, 278);
});
/** a coach side: silver, blue stripe, a row of windows (no lettering) */
const coachTex = () => ctex("coach", 1024, 256, (g) => {
  g.fillStyle = "#c9ced6"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#aab0ba"; for (let y = 150; y < 256; y += 14) g.fillRect(0, y, 1024, 5);
  g.fillStyle = "#2e4f9a"; g.fillRect(0, 128, 1024, 18);
  g.fillStyle = "#3a4458"; for (let x = 40; x < 1000; x += 92) g.fillRect(x, 26, 80, 86);
  g.strokeStyle = "#1d1b22"; g.lineWidth = 5; for (let x = 40; x < 1000; x += 92) g.strokeRect(x, 26, 80, 86);
});
const hayTex = () => ctex("hayBale", 256, 256, (g, r) => {
  g.fillStyle = "#e3c45e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { g.strokeStyle = r() > 0.45 ? "rgba(170,125,40,0.55)" : "rgba(255,236,150,0.75)"; g.lineWidth = 1.5 + r() * 1.5; const x = r() * 256, y = r() * 256, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 * Math.cos(a), y + 14 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "rgba(120,80,30,0.45)"; g.fillRect(0, 80, 256, 3); g.fillRect(0, 176, 256, 3);
});

// ---------------- terrain grid (shared by every World: built once) ----------------
const axis = (lo: number, hi: number, c0: number, c1: number, fine: number, mid: number, coarse: number, m0: number, m1: number) => {
  const out: number[] = [];
  let v = lo;
  while (v < hi) { out.push(v); const st = v >= c0 && v < c1 ? fine : v >= m0 && v < m1 ? mid : coarse; v += st; }
  out.push(hi);
  return out;
};
type Grid = { xs: number[]; zs: number[]; nx: number; nz: number; h0: Float32Array; sc: Float32Array; dp: Float32Array; k: Float32Array; td: Float32Array; tiny: Float32Array };
let GRID: Grid | null = null;
const grid = () => {
  if (GRID) return GRID;
  const xs = axis(-1100, 1100, -250, 270, 4, 12, 40, -560, 580), zs = axis(-1000, 1000, -440, 230, 4, 12, 40, -640, 560);
  const nx = xs.length, nz = zs.length, n = nx * nz;
  const h0 = new Float32Array(n), sc = new Float32Array(n), dp = new Float32Array(n), k = new Float32Array(n), td = new Float32Array(n), tiny = new Float32Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], o = j * nx + i;
    h0[o] = H0(x, z); sc[o] = scarAt(x, z); dp[o] = dep(x, z); k[o] = xp(x); td[o] = hAt(x, z, "today"); tiny[o] = fbm(x / 9, z / 9);
  }
  GRID = { xs, zs, nx, nz, h0, sc, dp, k, td, tiny };
  return GRID;
};

// ---------------- vertex colours ----------------
const col = (hex: string) => new THREE.Color(hex);
const SNOW = col("#dfe6ef"), SNOW2 = col("#cdd7e6"), ROCK = col("#8c8580"), DEB = col("#857a70"), DEB2 = col("#9a8f84"), SCAR = col("#9a8c7f"), CRACK = col("#2c2428");
const GRASS = col("#6f8c4c"), GRASS2 = col("#5a7642"), ROCKN = col("#8b847c"), DEBN = col("#a89b88"), DEBG = col("#7f9158"), SCARN = col("#b3a493"), EMB = col("#8f9a64");
const tmpC = new THREE.Color();

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
  private outdoor = new THREE.Group(); private winter = new THREE.Group(); private now = new THREE.Group(); private built = new THREE.Group();
  private sets: Record<"room" | "bath" | "kitchen", THREE.Group> = { room: new THREE.Group(), bath: new THREE.Group(), kitchen: new THREE.Group() };
  private terr: THREE.Mesh; private tGeo: THREE.BufferGeometry; private tKey = "";
  private lake: THREE.Mesh;
  private bands = new Map<number, THREE.Group>(); private scarTrees = new THREE.Group();
  private conv = new THREE.Group(); private tanker = new THREE.Group(); private hay = new THREE.Group(); private bus = new THREE.Group();
  private dozer = new THREE.Group(); private carNow = new THREE.Group(); private mound: THREE.Mesh; private boulders = new THREE.Group();
  private cracks: THREE.Mesh; private crackGeo = new THREE.BufferGeometry(); private crackK = -1;
  private tongue: THREE.Mesh; private tongueGeo: THREE.BufferGeometry;
  private oldRoad: THREE.Mesh; private roadOld: THREE.Material; private roadAged: THREE.Material;
  private newRoad: THREE.Mesh; private roadGravel: THREE.Material; private roadNew: THREE.Material;

  constructor(_kit: Kit) {
    const R = this.root;
    R.add(this.outdoor, this.sets.room, this.sets.bath, this.sets.kitchen);
    this.outdoor.add(this.winter, this.now, this.built);
    // ---- sky + light ----
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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3200, 48, 24), this.skyMat);
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
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 2300 + (i % 3) * 150, w = 520 + (i % 4) * 120;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 620 + (i % 4) * 140, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    const rays = sightLines();
    setSight([]); // houses are placed by hand; trees and boulders test the sight lines themselves

    // ---- terrain: one live heightfield (positions, normals, vertex colours rewritten when the state changes) ----
    const G0 = grid(), N = G0.nx * G0.nz;
    this.tGeo = new THREE.BufferGeometry();
    this.tGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.tGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.tGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const uv = new Float32Array(N * 2);
    for (let j = 0; j < G0.nz; j++) for (let i = 0; i < G0.nx; i++) { const o = j * G0.nx + i; uv[o * 2] = G0.xs[i] / 14; uv[o * 2 + 1] = G0.zs[j] / 14; }
    this.tGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const idx: number[] = [];
    for (let j = 0; j < G0.nz - 1; j++) for (let i = 0; i < G0.nx - 1; i++) { const a = j * G0.nx + i, c = a + G0.nx; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    this.tGeo.setIndex(idx);
    const st = rep(snowTex(), 1, 1);
    this.terr = new THREE.Mesh(this.tGeo, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true, map: st }), 0.7));
    this.terr.frustumCulled = false; this.terr.receiveShadow = true; this.terr.castShadow = false; // no mountain-sized self shadows: they turned whole faces violet
    this.outdoor.add(this.terr);

    // ---- the old highway (z = 0) and the new one on the debris (today) ----
    this.roadOld = lam("roadOld", () => ({ map: rep(roadTex("old", "#4a4a50", "#e8c03a", false), 1, 120) }));
    this.roadAged = lam("roadAged", () => ({ map: rep(roadTex("aged", "#5c5a58", null, true), 1, 120) }));
    this.oldRoad = new THREE.Mesh(ribbon((x) => 0.06 + Math.max(0, H0(x, 0)), 0, 4.4, -1100, 1100, 4), this.roadOld);
    this.oldRoad.receiveShadow = true; this.outdoor.add(this.oldRoad);
    this.roadGravel = lam("roadGravel", () => ({ map: rep(roadTex("gravel", "#8a7f70", null, false), 1, 90) }));
    this.roadNew = lam("roadNew", () => ({ map: rep(roadTex("new", "#3f4046", "#f2efe6", false), 1, 90) }));
    this.newRoad = new THREE.Mesh(ribbon((x) => roadNewY(x) + 0.12, ROAD_NEW_Z, 4.3, -700, 720, 3), this.roadNew);
    this.newRoad.receiveShadow = true; this.outdoor.add(this.newRoad);
    // guard rail along the new road's north edge + a viewpoint
    const bn = new Batch(), rail = lam("rail", () => ({ color: "#c9ccd2" })), post = lam("railPost", () => ({ color: "#5a4a3a" }));
    for (let x = -300; x <= 330; x += 4) {
      const y = roadNewY(x); if (y < 6) continue;
      for (const zz of [ROAD_NEW_Z - 4.9, ROAD_NEW_Z + 4.9]) bn.add(boxGeo(V(x - 0.09, y, zz - 0.09), V(x + 0.09, y + 0.85, zz + 0.09)), post);
    }
    for (const zz of [ROAD_NEW_Z - 4.9, ROAD_NEW_Z + 4.9]) for (let x = -300; x < 330; x += 4) {
      const y0 = roadNewY(x), y1 = roadNewY(x + 4); if (y0 < 6 || y1 < 6) continue;
      bn.add(quad(V(x, y0 + 0.55, zz), V(x + 4, y1 + 0.55, zz), V(x + 4, y1 + 0.8, zz), V(x, y0 + 0.8, zz)), lam("railDS", () => ({ color: "#c9ccd2", side: THREE.DoubleSide })));
    }
    void rail;
    bn.build(this.now);

    // ---- Outram Lake (iced at the edges) ----
    const lg = new THREE.CircleGeometry(1, 48); lg.rotateX(-Math.PI / 2); lg.scale(LAKE.rx * 1.02, 1, LAKE.rz * 1.02);
    const lt = ctex("lakeIce", 512, 512, (g, r) => {
      const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256); gr.addColorStop(0, "#3f6f86"); gr.addColorStop(0.72, "#5a8aa0"); gr.addColorStop(1, "#cfe2ec");
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(220,235,245,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 50, 6 + r() * 12, r() * 3, 0, 7); g.fill(); }
    });
    lg.setAttribute("uv", new THREE.Float32BufferAttribute(Array.from({ length: lg.attributes.position.count }, (_, i) => [0.5 + lg.attributes.position.getX(i) / (2 * LAKE.rx * 1.02), 0.5 + lg.attributes.position.getZ(i) / (2 * LAKE.rz * 1.02)]).flat(), 2));
    this.lake = new THREE.Mesh(lg, twoTone(new THREE.MeshLambertMaterial({ map: lt }), 0.6));
    this.lake.position.set(LAKE.x, LAKE.y, LAKE.z); this.lake.receiveShadow = true;
    this.winter.add(this.lake);

    // ---- conifers: snowy (1965) and green (today) ----
    const bw = new Batch(), bTodayT = new Batch();
    const needle = [lam("needle0", () => ({ color: "#2f5a3e" })), lam("needle1", () => ({ color: "#386646" })), lam("needle2", () => ({ color: "#2a503a" }))];
    const snowCap = lam("snowCap", () => ({ color: "#e6ecf4" })), bark = lam("bark", () => ({ color: "#6a4a32" }));
    const band = (z: number) => Math.floor(z / 12);
    const bandBatches = new Map<number, Batch>(); const scarB = new Batch();
    let ti = 0;
    for (let z = -700; z <= 700; z += 17) for (let x = -760; x <= 760; x += 17) {
      ti++;
      const px = x + (hsh(ti, 1) - 0.5) * 13, pz = z + (hsh(ti, 2) - 0.5) * 13;
      if (Math.abs(pz) < 13 || lakeIn(px, pz * 0.92 + LAKE.z * 0.08) || Math.hypot(px - LAKE.x, (pz - LAKE.z) * 2.6) < LAKE.rx + 8) continue;
      if (Math.abs(px - TOWN[0]) < 120 && Math.abs(pz) < 45) continue;
      const hgt = 13 + 9 * hsh(ti, 3), y = H0(px, pz);
      if (y > 360) continue;
      if (blocked(rays, px, y, pz, hgt)) continue;
      const inLobe = xp(px) > 0.02 && pz > -430 && pz < 210;
      const nm = needle[ti % 3];
      // 1965 (snowy)
      const target = inLobe ? (scarAt(px, pz) > 6 ? scarB : (bandBatches.get(band(pz)) ?? bandBatches.set(band(pz), new Batch()).get(band(pz))!)) : bw;
      conifer(target, nm, snowCap, bark, px, y, pz, hgt, ti, true);
      // today (green, also some young trees on the old debris)
      const yT = hAt(px, pz, "today");
      if (Math.abs(pz - ROAD_NEW_Z) < 15 || blocked(rays, px, yT, pz, hgt)) continue;
      if (inLobe && dep(px, pz) > 3) { if (hsh(ti, 5) > 0.3) continue; conifer(bTodayT, nm, snowCap, bark, px, yT, pz, hgt * 0.6, ti, false); continue; }
      if (inLobe && scarAt(px, pz) > 6) continue;
      conifer(bTodayT, nm, snowCap, bark, px, yT, pz, hgt, ti, false);
    }
    bw.build(this.winter);
    for (const [k, b] of bandBatches) {
      // pivot each band on its ground line so it can topple forward (+z) as the mass hits it
      const zb = k * 12 + 6, yb = H0(SLIDE_X, zb), g = new THREE.Group(), inner = new THREE.Group();
      b.build(inner); inner.position.set(0, -yb, -zb); g.position.set(0, yb, zb); g.add(inner); this.bands.set(k, g); this.winter.add(g);
    }
    scarB.build(this.scarTrees); this.winter.add(this.scarTrees);
    bTodayT.build(this.now);

    // ---- the edge of Hope: a row of houses each side of the road ----
    const bh = new Batch();
    let r = 7;
    const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2146483646; };
    for (const side of [1, -1]) for (let x = TOWN[0] - 110; x < TOWN[0] + 80;) {
      const w = [7, 8, 9][Math.floor(rnd() * 3)], h = [6.2, 7, 7.8][Math.floor(rnd() * 3)];
      house(bh, x + w / 2, side * (14 + 4.5), side > 0 ? Math.PI : 0, w, 9, h, Math.floor(rnd() * 8), 0);
      x += w + 4 + rnd() * 6;
    }
    bh.build(this.winter);

    // ---- vehicles (each group: front bumper at local x = 0, pointing +x) ----
    buildConvertible(this.conv); buildTanker(this.tanker); buildHay(this.hay); buildBus(this.bus); buildDozer(this.dozer); buildCarNow(this.carNow);
    for (const g of [this.conv, this.tanker, this.hay, this.bus, this.dozer, this.carNow]) g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.conv.position.set(CONV_X, 0, LANE_E); this.conv.rotation.z = -0.07;
    this.winter.add(this.conv, this.tanker, this.hay, this.bus);
    this.bus.position.set(BUS_X, 0, LANE_W); this.bus.rotation.y = Math.PI;
    this.built.add(this.dozer);
    this.dozer.position.set(52, roadNewY(52) + 0.12, ROAD_NEW_Z + 1); this.dozer.rotation.y = Math.PI * 0.94;
    this.now.add(this.carNow);
    // the snow avalanche across the road
    const mg = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const mp = mg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i), y = mp.getY(i); mp.setY(i, y * (0.8 + 0.25 * Math.sin(x * 5 + z * 3))); }
    mg.computeVertexNormals();
    this.mound = new THREE.Mesh(mg, lam("moundSnow", () => ({ color: "#e9eef5" })));
    this.mound.position.set(MOUND[0], 0, MOUND[2]); this.mound.receiveShadow = true; this.mound.castShadow = true;
    this.winter.add(this.mound);
    // the small avalanche: a tongue of snow down the slope onto the road (revealed from the top as it runs)
    this.tongueGeo = new THREE.PlaneGeometry(1, 1, 6, 40);
    this.tongue = new THREE.Mesh(this.tongueGeo, lam("tongueSnow", () => ({ color: "#eef2f7", side: THREE.DoubleSide })));
    this.tongue.frustumCulled = false; this.tongue.receiveShadow = true; this.tongue.castShadow = true;
    this.winter.add(this.tongue);
    this.cracks = new THREE.Mesh(this.crackGeo, new THREE.MeshBasicMaterial({ color: "#1c1418", side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    this.cracks.frustumCulled = false; this.cracks.layers.set(NOINK); this.winter.add(this.cracks);
    // boulders on the finished deposit
    const bb = new Batch(), rockM = [lam("boulderA", () => ({ color: "#8a7c6c" })), lam("boulderB", () => ({ color: "#9d8f7e" }))];
    for (let i = 0; i < 700; i++) {
      const x = SLIDE_X + (hsh(i, 11) - 0.5) * 330, z = -150 + hsh(i, 12) * 240;
      if (xp(x) < 0.3 || dep(x, z) < 3) continue;
      const s = 0.7 + 2.6 * hsh(i, 13) ** 2, g = new THREE.DodecahedronGeometry(s, 1);
      g.scale(1, 0.7, 1 + 0.3 * hsh(i, 14));
      if (Math.abs(z - ROAD_NEW_Z) < 10 || blocked(rays, x, hAt(x, z, "after"), z, s * 1.5)) continue;
      bb.add(g, rockM[i % 2], new THREE.Matrix4().makeRotationY(hsh(i, 15) * 6).setPosition(x, hAt(x, z, "after") + s * 0.25, z));
    }
    bb.build(this.boulders);
    this.outdoor.add(this.boulders);

    // ---- interior sets ----
    this.room(this.sets.room, ROOM, rep(wallpaper("station", "#d8dcc8", "#c4cab0"), 3, 1.4));
    const rb = new Batch();
    tableAt(rb, ROOM[0], ROOM[2] + 2.85, 1.8, 1.0, 0.95);
    rb.add(boxGeo(V(ROOM[0] + 1.6, 0, ROOM[2] + 4.6), V(ROOM[0] + 2.4, 1.4, ROOM[2] + 5.4)), lam("cabinet", () => ({ color: "#6a7a6a" })));
    rb.add(boxGeo(V(ROOM[0] - 2.05, 1.2, ROOM[2] + 5.86), V(ROOM[0] - 1.15, 2.0, ROOM[2] + 5.95)), lam("corkboard", () => ({ color: "#b08a5a" })));
    rb.build(this.sets.room);
    this.room(this.sets.bath, BATH, rep(tileTex(), 4, 2));
    this.room(this.sets.kitchen, KITCHEN, rep(wallpaper("kitchen", "#e9dcb8", "#d8c79c"), 3, 1.4));
    const kb = new Batch();
    tableAt(kb, KITCHEN[0] - 0.2, KITCHEN[2] + 3.0, 1.6, 0.9, 0.78);
    kb.add(boxGeo(V(KITCHEN[0] - 1.8, 0, KITCHEN[2] + 5.0), V(KITCHEN[0] + 0.2, 0.9, KITCHEN[2] + 5.9)), lam("counter", () => ({ color: "#d8c4a0" })));
    kb.build(this.sets.kitchen);
  }

  private room(gr: THREE.Group, c: V3, wall: THREE.Texture) {
    const b = new Batch(), [x, , z] = c;
    const wm = lam("room" + x, () => ({ map: wall, side: THREE.DoubleSide }));
    b.add(quadUp(x - 6, x + 6, z - 6, z + 6, 3, 3, 0.002), lam("floor", () => ({ map: rep(planksHD(), 1, 1) })));
    b.add(quad(V(x - 6, 0, z + 6), V(x + 6, 0, z + 6), V(x + 6, 4, z + 6), V(x - 6, 4, z + 6)), wm);
    b.add(quad(V(x - 6, 0, z - 6), V(x - 6, 0, z + 6), V(x - 6, 4, z + 6), V(x - 6, 4, z - 6)), wm);
    b.add(quad(V(x + 6, 0, z + 6), V(x + 6, 0, z - 6), V(x + 6, 4, z - 6), V(x + 6, 4, z + 6)), wm);
    b.add(quad(V(x - 6, 0, z - 6), V(x + 6, 0, z - 6), V(x + 6, 4, z - 6), V(x - 6, 4, z - 6)), wm);
    b.add(quad(V(x - 6, 4, z + 6), V(x + 6, 4, z + 6), V(x + 6, 4, z - 6), V(x - 6, 4, z - 6)), lam("ceiling", () => ({ color: "#f2ead8", side: THREE.DoubleSide })));
    b.add(boxGeo(V(x - 6, 0, z + 5.9), V(x + 6, 0.25, z + 6)), lam("skirting", () => ({ color: "#5a3a26" })));
    b.add(quad(V(x + 3.2, 1.6, z + 5.95), V(x + 1.2, 1.6, z + 5.95), V(x + 1.2, 3.4, z + 5.95), V(x + 3.2, 3.4, z + 5.95)), lam("roomWin", () => ({ map: windowTex() })));
    b.build(gr, false);
  }

  /** rewrite the heightfield for an era at slide time st (cached by key) */
  private poseTerrain(era: Era, st: number, crack: number, winterCol: boolean) {
    const key = (era === "slide" ? (st < RELEASE ? "pre" : st > 1e8 ? "after" : `s${st.toFixed(3)}`) : era) + `|${crack.toFixed(3)}|${winterCol ? 1 : 0}`;
    if (key === this.tKey) return;
    this.tKey = key;
    const G0 = grid(), { nx, nz, xs, zs } = G0;
    const P = this.tGeo.attributes.position.array as Float32Array, Nn = this.tGeo.attributes.normal.array as Float32Array, Cc = this.tGeo.attributes.color.array as Float32Array;
    const k0 = key.split("|")[0], live = k0.startsWith("s"), e = k0 === "pre" ? "pre" : k0 === "after" ? "after" : k0 === "today" ? "today" : "slide";
    const src = live ? srcAt(st) : e === "pre" ? 0 : 1;
    const H = new Float32Array(nx * nz), L = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const o = j * nx + i, x = xs[i], z = zs[j];
      let h: number, lay = 0;
      if (e === "pre") h = G0.h0[o];
      else if (e === "today") { h = G0.td[o]; lay = h - (G0.h0[o] - G0.sc[o]); }
      else if (e === "after") { h = G0.h0[o] - G0.sc[o] + G0.dp[o]; lay = G0.dp[o]; }
      else { const b = G0.h0[o] - G0.sc[o] * src; h = hAt(x, z, "slide", st); lay = h - b; }
      H[o] = h; L[o] = lay;
      P[o * 3] = x; P[o * 3 + 1] = h; P[o * 3 + 2] = z;
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const o = j * nx + i, i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nz - 1, j + 1);
      const dx = (H[j * nx + i1] - H[j * nx + i0]) / (xs[i1] - xs[i0]), dz = (H[j1 * nx + i] - H[j0 * nx + i]) / (zs[j1] - zs[j0]);
      const l = Math.hypot(dx, 1, dz), ny = 1 / l;
      Nn[o * 3] = -dx / l; Nn[o * 3 + 1] = ny; Nn[o * 3 + 2] = -dz / l;
      const x = xs[i], z = zs[j], tn = G0.tiny[o];
      const steep = smooth((0.8 - ny) / 0.22);
      if (e === "today" && !winterCol) {
        const alt = smooth((H[o] - 60) / 260);
        tmpC.copy(GRASS).lerp(GRASS2, alt * 0.7 + 0.3 * tn);
        const emb = H[o] - (G0.h0[o] - G0.sc[o] + G0.dp[o]);
        if (emb > 1.2) tmpC.copy(EMB);
        else if (G0.dp[o] > 1.5) tmpC.copy(DEBN).lerp(DEBG, smooth((tn - 0.48) / 0.12) * 0.85);
        else if (G0.sc[o] > 3) tmpC.copy(SCARN).lerp(DEBG, smooth((tn - 0.62) / 0.1) * 0.6);
        tmpC.lerp(ROCKN, steep * 0.85);
      } else {
        tmpC.copy(SNOW).lerp(SNOW2, 0.35 * tn + 0.25 * smooth((Math.abs(z) - 20) / 200));
        tmpC.lerp(ROCK, steep * 0.45);
        const sc = G0.sc[o] * src;
        if (sc > 2) tmpC.copy(SCAR).lerp(ROCK, steep * 0.5 + 0.2 * tn);
        if (L[o] > 0.15) tmpC.lerp(DEB.clone().lerp(DEB2, tn), smooth((L[o] - 0.15) / 0.8));
      }
      Cc[o * 3] = tmpC.r; Cc[o * 3 + 1] = tmpC.g; Cc[o * 3 + 2] = tmpC.b;
      void x;
    }
    this.tGeo.attributes.position.needsUpdate = true; this.tGeo.attributes.normal.needsUpdate = true; this.tGeo.attributes.color.needsUpdate = true;
    this.tGeo.computeBoundingSphere();
  }

  /** ribbons 3.2 m wide along the crack polylines, draped 0.6 m over the face, grown to k */
  private buildCracks(k: number, hw: number) {
    const pos: number[] = [];
    CRACKS.forEach((l, i) => {
      const kk = Math.max(0, Math.min(1, k * 1.6 - i * 0.12));
      if (kk <= 0) return;
      const n = (l.length - 1) * kk, pts: [number, number][] = [];
      for (let j = 0; j <= Math.floor(n); j++) pts.push(l[j]);
      const j = Math.floor(n), fr = n - j;
      if (j < l.length - 1 && fr > 0) pts.push([l[j][0] + (l[j + 1][0] - l[j][0]) * fr, l[j][1] + (l[j + 1][1] - l[j][1]) * fr]);
      for (let a = 0; a < pts.length - 1; a++) {
        const [x0, z0] = pts[a], [x1, z1] = pts[a + 1], L = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
        const steps = Math.max(1, Math.ceil(L / 4));
        for (let q = 0; q < steps; q++) {
          const u0 = q / steps, u1 = (q + 1) / steps, w = hw * (1 - 0.5 * Math.abs(2 * ((a + u0) / pts.length) - 1));
          const P = (u: number, sd: number) => { const x = x0 + (x1 - x0) * u + nx * w * sd, z = z0 + (z1 - z0) * u + nz * w * sd; return [x, H0(x, z) + 0.6, z]; };
          const A = P(u0, -1), B = P(u0, 1), C = P(u1, 1), D = P(u1, -1);
          pos.push(...A, ...B, ...C, ...A, ...C, ...D);
        }
      }
    });
    this.crackGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.crackGeo.computeBoundingSphere();
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], set = setAt(id, f), era = eraAt(id, f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.12; cam.far = 5000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
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
    this.sunDisc.visible = set === "today";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 2600); this.sunDisc.scale.setScalar(2 * 2600 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    const out = set === "valley" || set === "today" || set === "build";
    this.outdoor.visible = out;
    this.sets.room.visible = set === "room"; this.sets.bath.visible = set === "bath"; this.sets.kitchen.visible = set === "kitchen";
    const st = s.slide ? s.slide(t) : 0;
    if (out) this.pose(id, era, st, t);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const p of stg.places) {
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
    for (const p of stg.fx) {
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

  private pose(id: number, era: Era, st: number, t: number) {
    const build = SHOTS[id - 1].set === "build";
    this.poseTerrain(era, st, crackAt(id, t), build);
    const isToday = era === "today" && !build, winter = !isToday;
    this.winter.visible = winter; this.now.visible = isToday; this.built.visible = build;
    this.oldRoad.material = isToday ? this.roadAged : this.roadOld;
    this.newRoad.visible = isToday || build; this.newRoad.material = SHOTS[id - 1].set === "build" ? this.roadGravel : this.roadNew;
    const sliding = era === "slide" || era === "after" || build;
    const after = era === "after" || (era === "slide" && st > 1e8);
    this.boulders.visible = after || isToday || build || (era === "slide" && st > Ws(96) + 0.6);
    if (winter) {
      const live = era === "slide" ? st : era === "after" || build ? 1e9 : 0;
      // trees go under as the mass passes their band; the scar's trees go with the face
      for (const [k, g] of this.bands) {
        const tp = passT(k * 12 + 6), lean = sliding ? smooth((live - tp + 0.45) / 0.4) : 0;
        g.visible = !sliding || live < tp - 0.02;
        g.rotation.x = 1.25 * lean;
      }
      // the cracks (thin ink lines on the face) while the face is still whole
      const ck = crackAt(id, t);
      this.cracks.visible = ck > 0.01 && (!sliding || live < RELEASE + 0.05);
      if (this.cracks.visible && Math.abs(ck - this.crackK) > 0.004) { this.crackK = ck; this.buildCracks(ck, id === 12 ? 3.6 : 1.7); }
      this.scarTrees.visible = !sliding || live < RELEASE + 0.6;
      this.lake.visible = !sliding || live < passT(LAKE.z + LAKE.rz) + 0.15;
      const buried = sliding && live > passT(2) + 0.25;
      // the convertible, the tanker and the hay truck (arriving in shot 4)
      this.conv.visible = !buried && id >= 4;
      const tx = id === 4 ? tankX(t) : 70.3, hx = id === 4 ? hayX(t) : 57.6;
      this.tanker.visible = !buried && (id > 4 || (id === 4 && t > Ws(48) - 0.4)); this.tanker.position.set(tx, 0, LANE_E);
      this.hay.visible = !buried && (id > 4 || (id === 4 && t > Ws(54) - 0.3)); this.hay.position.set(hx, 0, LANE_E);
      // a little brake dip as each one stops
      this.tanker.rotation.z = id === 4 ? -0.02 * Math.max(0, Math.sin(Math.PI * clamp((t - Ws(51) - 0.2) / 0.5))) : 0;
      this.hay.rotation.z = id === 4 ? -0.025 * Math.max(0, Math.sin(Math.PI * clamp((t - Ws(57) - 0.05) / 0.5))) : 0;
      // the convertible's rear wheels spinning: a little rock
      this.conv.position.y = id === 4 && t < Ws(48) ? 0.02 * Math.abs(Math.sin(t * 40)) : 0;
      this.bus.visible = after;
      if (build) { this.conv.visible = this.tanker.visible = this.hay.visible = this.mound.visible = false; }
      const mk = id === 3 ? smooth((t - Ws(34) + 0.1) / (Ws(37) - Ws(34) + 0.4)) : id < 3 ? 0 : 1;
      this.mound.visible = mk > 0.01 && !buried;
      this.mound.scale.set(8.5 * Math.max(0.05, mk), 2.7 * Math.max(0.05, mk), 7.2);
      // tongue: front runs from z = -80 down to the road during "A small snow avalanche had blocked the road"
      const front = id === 3 ? -80 + 82 * smooth((t - Ws(31) + 0.2) / (Ws(35) + 0.3 - Ws(31) + 0.2)) : id < 3 ? -80 : 2;
      this.tongue.visible = this.mound.visible || (id === 3 && front > -79);
      if (this.tongue.visible) {
        const P = this.tongueGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < P.count; i++) {
          const v = i % 7, u = Math.floor(i / 7) / 40, z = -82 + 84 * u, across = (v / 6 - 0.5);
          const w = 7 + 4 * u + 1.5 * Math.sin(z * 0.3), x = MOUND[0] + across * w + 2 * Math.sin(z * 0.08);
          const on = z <= front ? 1 : 0, prof = Math.max(0, 1 - (2 * across) ** 2);
          P.setXYZ(i, x, H0(x, z) + (on ? 0.25 + 0.9 * prof : -1.5), z);
        }
        P.needsUpdate = true; this.tongueGeo.computeVertexNormals();
      }
    }
    if (isToday) {
      const x = carNowX(t);
      this.carNow.visible = SHOTS[id - 1].set === "today";
      const east = t >= Ws(189) - 0.1;
      this.carNow.position.set(x, roadNewY(x) + 0.12, carNowZ(t)); this.carNow.rotation.y = east ? 0 : Math.PI;
      const dy = roadNewY(x - 2) - roadNewY(x + 2);
      this.carNow.rotation.z = (east ? 1 : -1) * Math.atan2(dy, 4);
    }
  }
}

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
let lampM: THREE.MeshBasicMaterial | null = null;
const LAMP = () => (lampM ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.4) }));
const hsh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

/** every outdoor lens position looking at its subject (trees, houses and boulders in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    const set = setAt(s.id, Math.max(0, f));
    if (set !== "valley" && set !== "today" && set !== "build") continue;
    const c = camAt(s.id, Math.max(0, f));
    const o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.6], [0, -0.6], [-0.7, -0.6], [0.7, -0.6]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
/** would a tree of height h at (x, y, z) stand in the first ~80 % of any sight line, or right in front of a lens? */
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

/** a stylised conifer: three stacked cones (snow caps on the winter ones), a short trunk */
const coneCache = new Map<string, THREE.BufferGeometry>();
const coneG = (r: number, h: number) => { const k = `${r}|${h}`; let g = coneCache.get(k); if (!g) { g = new THREE.ConeGeometry(r, h, 8, 1, true); coneCache.set(k, g); } return g; };
function conifer(b: Batch, needle: THREE.Material, snow: THREE.Material, bark: THREE.Material, x: number, y: number, z: number, h: number, seed: number, winter: boolean) {
  const w = h * (0.3 + 0.06 * hsh(seed, 7));
  b.add(new THREE.CylinderGeometry(w * 0.09, w * 0.12, h * 0.2, 6), bark, new THREE.Matrix4().makeTranslation(x, y + h * 0.1 - 0.6, z));
  const tiers: [number, number, number][] = [[0.15, 0.5, 1.0], [0.42, 0.38, 0.78], [0.66, 0.34, 0.52]];
  for (const [y0, hh, rr] of tiers) {
    const cy = y + h * (y0 + hh / 2), R = w * rr;
    b.add(coneG(R, h * hh), needle, new THREE.Matrix4().makeRotationY(seed).setPosition(x, cy, z));
    if (winter) b.add(coneG(R * 0.55, h * hh * 0.5), snow, new THREE.Matrix4().makeRotationY(seed + 0.4).setPosition(x, cy + h * hh * 0.27, z));
  }
}
/** road ribbon along x at centre z, half width hw, height y(x) */
function ribbon(y: (x: number) => number, z: number, hw: number, x0: number, x1: number, step: number) {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [];
  for (let x = x0; x < x1; x += step) {
    const a = y(x), b = y(x + step), u0 = x / 8.5, u1 = (x + step) / 8.5;
    pos.push(x, a, z + hw, x + step, b, z + hw, x + step, b, z - hw, x, a, z + hw, x + step, b, z - hw, x, a, z - hw);
    uv.push(0, u0, 0, u1, 1, u1, 0, u0, 1, u1, 1, u0);
    for (let k = 0; k < 6; k++) nor.push(0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.computeVertexNormals();
  return g;
}
function tableAt(b: Batch, x: number, z: number, w: number, d: number, h: number) {
  const m = lam("tableWood", () => ({ color: "#9a6a3c" }));
  b.add(boxGeo(V(x - w / 2, h - 0.06, z - d / 2), V(x + w / 2, h, z + d / 2)), m);
  b.add(boxGeo(V(x - w / 2, 0.1, z - d / 2 + 0.02), V(x + w / 2, h - 0.06, z - d / 2 + 0.06)), m);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(boxGeo(V(x + sx * (w / 2 - 0.08) - 0.04, 0, z + sz * (d / 2 - 0.08) - 0.04), V(x + sx * (w / 2 - 0.08) + 0.04, h - 0.06, z + sz * (d / 2 - 0.08) + 0.04)), m);
}
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}

// ---------------- vehicles: front bumper at x = 0, body toward -x, wheels on y = 0 ----------------
const wheelG = (r: number, w: number) => { const g = new THREE.CylinderGeometry(r, r, w, 18); g.rotateX(Math.PI / 2); return g; };
function wheels(b: Batch, xs: number[], half: number, r: number, w = 0.28) {
  const tyre = lam("tyre", () => ({ color: "#1f1d22" })), hub = lam("hub", () => ({ color: "#c9ccd2" }));
  for (const x of xs) for (const s of [-1, 1]) {
    b.add(wheelG(r, w), tyre, new THREE.Matrix4().makeTranslation(x, r, s * half));
    b.add(wheelG(r * 0.45, w + 0.02), hub, new THREE.Matrix4().makeTranslation(x, r, s * half));
  }
}
/** a cab with real window holes: lower body to the belt line, roof, four pillars */
function cab(b: Batch, m: THREE.Material, x0: number, x1: number, y0: number, belt: number, top: number, half: number, roofM?: THREE.Material) {
  b.add(boxGeo(V(x0, y0, -half), V(x1, belt, half)), m);
  b.add(boxGeo(V(x0 - 0.05, top - 0.12, -half - 0.03), V(x1 + 0.05, top, half + 0.03)), roofM ?? m);
  const p = 0.1;
  for (const xx of [x0, x1 - p]) for (const s of [-1, 1]) b.add(boxGeo(V(xx, belt, s > 0 ? half - p : -half), V(xx + p, top - 0.12, s > 0 ? half : -half + p)), roofM ?? m);
  // back wall (behind the driver) so the cab reads as a box
  b.add(boxGeo(V(x0, belt, -half), V(x0 + 0.06, top - 0.12, half)), m);
}
function buildConvertible(g: THREE.Group) {
  const b = new Batch(), y = lam("convYellow", () => ({ color: "#ecc23a" })), w = lam("convWhite", () => ({ color: "#f2efe6" })), chrome = lam("chrome", () => ({ color: "#d8dce2" }));
  b.add(boxGeo(V(-5.3, 0.3, -0.95), V(0, 0.95, 0.95)), y);
  b.add(boxGeo(V(-0.12, 0.32, -0.97), V(0.05, 0.5, 0.97)), chrome);
  b.add(boxGeo(V(-5.42, 0.32, -0.97), V(-5.25, 0.5, 0.97)), chrome);
  // tail fins
  for (const s of [-1, 1]) b.add(boxGeo(V(-5.3, 0.95, s * 0.95 - (s > 0 ? 0.14 : 0)), V(-4.0, 1.18, s * 0.95 + (s < 0 ? 0.14 : 0))), y);
  // windscreen frame and soft top (up: it is January)
  b.add(boxGeo(V(-2.15, 0.95, -0.92), V(-2.05, 1.5, 0.92)), chrome);
  b.add(boxGeo(V(-3.9, 1.32, -0.88), V(-2.05, 1.44, 0.88)), w);
  for (const s of [-1, 1]) b.add(boxGeo(V(-3.95, 0.95, s > 0 ? 0.76 : -0.88), V(-3.75, 1.4, s > 0 ? 0.88 : -0.76)), w);
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.13, 12, 8), LAMP(), new THREE.Matrix4().makeTranslation(0.0, 0.72, s * 0.65));
  wheels(b, [-0.95, -4.25], 0.82, 0.36);
  b.build(g);
}
function buildTanker(g: THREE.Group) {
  const b = new Batch(), red = lam("tankRed", () => ({ color: "#b5373a" })), silver = lam("tankSilver", () => ({ color: "#c9ced6" })), dark = lam("chassis", () => ({ color: "#2a2830" }));
  cab(b, red, -2.3, 0, 0.55, 1.55, 2.7, 1.15);
  b.add(boxGeo(V(-0.6, 0.55, -1.15), V(0, 1.55, 1.15)), red);
  b.add(boxGeo(V(-11, 0.5, -0.7), V(-2.4, 0.85, 0.7)), dark);
  const tank = new THREE.CapsuleGeometry(1.15, 7.2, 6, 18); tank.rotateZ(Math.PI / 2);
  b.add(tank, silver, new THREE.Matrix4().makeTranslation(-6.9, 2.0, 0));
  for (const x of [-4.5, -7, -9.5]) b.add(new THREE.TorusGeometry(1.17, 0.06, 6, 24).rotateY(Math.PI / 2), dark, new THREE.Matrix4().makeTranslation(x, 2.0, 0));
  wheels(b, [-1.3, -8.4, -9.7], 1.0, 0.5, 0.35);
  b.build(g);
}
function buildHay(g: THREE.Group) {
  const b = new Batch(), green = lam("hayGreen", () => ({ color: "#3f6a4a" })), bed = lam("bedWood", () => ({ color: "#8a5a34" })), hay = lam("hay", () => ({ map: hayTex() }));
  cab(b, green, -2.2, 0, 0.55, 1.5, 2.6, 1.1);
  b.add(boxGeo(V(-0.6, 0.55, -1.1), V(0, 1.5, 1.1)), green);
  b.add(boxGeo(V(-8.2, 0.75, -1.2), V(-2.3, 1.0, 1.2)), bed);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) for (let l = 0; l < 2; l++) {
    if (i === 3 && k === 1 && l === 1) continue;
    b.add(boxGeo(V(-8.0 + i * 1.42, 1.0 + k * 0.62, -1.1 + l * 1.1), V(-6.65 + i * 1.42, 1.6 + k * 0.62, -0.02 + l * 1.1)), hay);
  }
  wheels(b, [-1.2, -6.6], 1.0, 0.48, 0.32);
  b.build(g);
}
function buildBus(g: THREE.Group) {
  const b = new Batch(), side = lam("coachSide", () => ({ map: coachTex() })), silver = lam("coachSilver", () => ({ color: "#c9ced6" })), glass = lam("coachGlass", () => ({ color: "#3a4458" }));
  b.add(boxGeo(V(-12, 0.55, -1.25), V(-0.9, 3.2, 1.25)), side);
  cab(b, silver, -0.9, 0, 0.55, 1.6, 3.2, 1.25);
  b.add(boxGeo(V(-0.02, 0.55, -1.25), V(0.04, 1.6, 1.25)), silver);
  b.add(boxGeo(V(-12, 3.2, -1.2), V(-0.2, 3.45, 1.2)), silver);
  b.add(boxGeo(V(-1.4, 1.65, -1.27), V(-0.95, 3.0, -1.24)), glass);
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.15, 12, 8), LAMP(), new THREE.Matrix4().makeTranslation(0.02, 0.95, s * 0.85));
  b.add(boxGeo(V(0.0, 0.55, -1.2), V(0.12, 0.8, 1.2)), lam("chrome", () => ({ color: "#d8dce2" })));
  wheels(b, [-2.0, -9.2, -10.4], 1.12, 0.52, 0.34);
  b.build(g);
}
function buildDozer(g: THREE.Group) {
  const b = new Batch(), y = lam("dozerYellow", () => ({ color: "#e8b02a" })), dark = lam("track", () => ({ color: "#2a2830" }));
  for (const s of [-1, 1]) b.add(boxGeo(V(-4.2, 0, s > 0 ? 0.7 : -1.6), V(-0.4, 1.0, s > 0 ? 1.6 : -0.7)), dark);
  b.add(boxGeo(V(-4.0, 1.0, -1.2), V(-0.8, 2.0, 1.2)), y);
  cab(b, y, -3.8, -2.2, 2.0, 2.05, 3.3, 0.9);
  b.add(boxGeo(V(0.2, 0.1, -2.0), V(0.5, 1.5, 2.0)), y);
  for (const s of [-1, 1]) b.add(boxGeo(V(-0.9, 0.6, s * 1.2 - 0.1), V(0.25, 0.8, s * 1.2 + 0.1)), y);
  b.add(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), dark, new THREE.Matrix4().makeTranslation(-1.4, 2.6, 0.5));
  b.build(g);
}
function buildCarNow(g: THREE.Group) {
  const b = new Batch(), red = lam("carRed", () => ({ color: "#c23a3a" })), dark = lam("carGlass", () => ({ color: "#2e3646" }));
  b.add(boxGeo(V(-4.4, 0.3, -0.9), V(0, 0.95, 0.9)), red);
  cab(b, red, -3.2, -1.2, 0.95, 0.96, 1.48, 0.86);
  b.add(boxGeo(V(-1.25, 0.95, -0.8), V(-1.15, 1.38, 0.8)), dark);
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.11, 12, 8), LAMP(), new THREE.Matrix4().makeTranslation(0.0, 0.72, s * 0.62));
  wheels(b, [-0.85, -3.5], 0.8, 0.34);
  b.build(g);
}
void W; void untone;
