// The whole place as one three.js scene: Boston's North End waterfront in January 1919 (harbour, wharf, the
// molasses tank, Engine 31's firehouse, the Atlantic Avenue elevated railway over Commercial Street, brick
// tenements), the flood as a live heightfield, three small interior sets for the inserts (kitchen, court, office)
// and today's Little League field on the tank's old base. update(id, f, camera) poses everything for shot `id` at
// frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, prop, setSight, Kit, Ray, quad } from "./build";
import { ctex, rep, planksHD, cobbleHD, grassHD, stoneHD, cloudHD, facadeHD, brick } from "./paint";
import { Pen, fxBlueprint } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, D0, SHOTS, camAt, V3, smooth, clamp01, ShotDef, TANK, TANK_R, TANK_H, FIRE, QUAY_Z, EL_Z, EL_Y, ROOM, COURT, OFFICE,
  molH, setAt, W, SEAM_AT, HOSE_AT, LADDER_AT, BENCH_AT, SEAL_T,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here
const G = D0;

// ---------------- painted textures ----------------
/** riveted steel courses: 7 rings, 28 plates around, rivet rows on every seam; `col` = plate colour */
const tankTex = (key: string, col: string, seam: string) => ctex("tank" + key, 2048, 1024, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(40,30,30,0.06)";
    g.beginPath(); g.ellipse(r() * 2048, r() * 1024, 30 + r() * 90, 20 + r() * 50, 0, 0, 7); g.fill();
  }
  const rows = 7, cols = 28;
  g.fillStyle = seam;
  for (let k = 1; k < rows; k++) { const y = (k * 1024) / rows; g.fillRect(0, y - 2, 2048, 4); for (let x = 6; x < 2048; x += 22) { g.beginPath(); g.arc(x, y - 9, 3.2, 0, 7); g.arc(x + 11, y + 9, 3.2, 0, 7); g.fill(); } }
  for (let k = 0; k < cols; k++) for (let j = 0; j < rows; j++) {
    const x = ((k + (j % 2) * 0.5) * 2048) / cols, y0 = (j * 1024) / rows, y1 = ((j + 1) * 1024) / rows;
    g.fillRect(x - 2, y0, 4, y1 - y0);
    for (let y = y0 + 8; y < y1 - 4; y += 18) { g.beginPath(); g.arc(x - 9, y, 3, 0, 7); g.arc(x + 9, y + 9, 3, 0, 7); g.fill(); }
  }
});
const leakTex = () => ctex("leaks", 512, 1024, (g, r) => {
  g.clearRect(0, 0, 512, 1024);
  for (let i = 0; i < 9; i++) {
    const x = 30 + r() * 450, y0 = 60 + r() * 500, len = 300 + r() * 500, w = 18 + r() * 20;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, "rgba(74,36,18,0.95)"); gr.addColorStop(0.8, "rgba(74,36,18,0.9)"); gr.addColorStop(1, "rgba(74,36,18,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y0); g.quadraticCurveTo(x + 6, y0 + len * 0.5, x - w / 3, y0 + len); g.lineTo(x + w / 3, y0 + len);
    g.quadraticCurveTo(x + 10, y0 + len * 0.5, x + w / 2, y0); g.closePath(); g.fill();
    g.fillStyle = "rgba(201,138,74,0.6)"; g.fillRect(x - w / 4, y0 + 20, 2.5, len * 0.6);
  }
  g.fillStyle = "rgba(74,36,18,0.9)"; g.beginPath(); g.ellipse(256, 1000, 230, 26, 0, 0, 7); g.fill();
});
const snowTex = () => ctex("snowPatches", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = r() * 1024, rx = 40 + r() * 150, ry = 20 + r() * 70;
    g.fillStyle = "rgba(236,242,252,0.8)"; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, 7); g.fill();
    g.fillStyle = "rgba(200,214,240,0.8)"; g.beginPath(); g.ellipse(x, y + ry * 0.55, rx * 0.9, ry * 0.3, 0, 0, 7); g.fill();
  }
});
const wallpaper = (key: string, a: string, b: string) => ctex("wp" + key, 512, 512, (g) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  g.fillStyle = b; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 18, 512);
  g.fillStyle = "rgba(255,255,255,0.12)"; for (let y = 32; y < 512; y += 64) for (let x = 41; x < 512; x += 64) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
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
  g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(40, 120); g.lineTo(100, 40); g.lineTo(116, 40); g.lineTo(56, 120); g.fill();
  g.strokeStyle = "#3a2a22"; g.lineWidth = 6; g.strokeRect(21, 21, 214, 278);
});
const doorsTex = () => ctex("fireDoors", 512, 512, (g) => {
  g.fillStyle = "#b5543c"; g.fillRect(0, 0, 512, 512);
  for (const x of [40, 280]) {
    g.fillStyle = "#7a2f2a"; g.beginPath(); g.moveTo(x, 512); g.lineTo(x, 200); g.arc(x + 96, 200, 96, Math.PI, 0); g.lineTo(x + 192, 512); g.fill();
    g.strokeStyle = "#f2e6c8"; g.lineWidth = 10; g.stroke();
    g.strokeStyle = "rgba(30,15,10,0.6)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 96, 120); g.lineTo(x + 96, 512); g.stroke();
    g.fillStyle = "#9cc4ea"; g.fillRect(x + 30, 230, 50, 60); g.fillRect(x + 112, 230, 50, 60);
  }
});
const dirtTex = () => ctex("infield", 512, 512, (g, r) => {
  g.fillStyle = "#c9925a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,240,210,0.12)" : "rgba(90,50,20,0.12)"; g.fillRect(r() * 512, r() * 512, 3 + r() * 6, 2 + r() * 3); }
});
const waterTex = () => ctex("harbour", 512, 512, (g, r) => {
  g.fillStyle = "#3f7fae"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = r() > 0.4 ? "rgba(200,235,250,0.55)" : "rgba(20,60,110,0.4)"; g.lineWidth = 3; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 5, x + 30, y); g.stroke(); }
});
const barrelTex = () => ctex("barrelTex", 256, 256, (g) => {
  g.fillStyle = "#9a6a3c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(60,35,20,0.6)"; g.lineWidth = 3; for (let x = 0; x < 256; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  g.fillStyle = "#3d414c"; g.fillRect(0, 30, 256, 16); g.fillRect(0, 210, 256, 16);
});
const carTex = () => ctex("elCar", 1024, 256, (g) => {
  g.fillStyle = "#3f6a4a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#e8d8a8"; g.fillRect(0, 150, 1024, 14);
  for (let x = 40; x < 1000; x += 80) { g.fillStyle = "#9cc4ea"; g.fillRect(x, 50, 54, 80); g.strokeStyle = "#e8d8a8"; g.lineWidth = 5; g.strokeRect(x, 50, 54, 80); }
});

/** every town lens position looking at its subject (the sight-line culler leaves out houses in the way) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    if (s.set === "kitchen" || s.set === "office") continue;
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

const NX = 251, NZ = 126, MX0 = -75, MX1 = 75, MZ0 = QUAY_Z + 0.3, MZ1 = 32; // molasses grid
const SPANS = Array.from({ length: 22 }, (_, k) => -99 + k * 9); // El span starts (9 m spans)
const MD = new THREE.Color("#3a1608"), MA = new THREE.Color("#7a3c16");
const easeIn = (u: number) => { const x = clamp01(u); return x * x; };
const mixHex = (a: string, b: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getHexString();

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
  private y1919 = new THREE.Group(); private today = new THREE.Group(); private snow = new THREE.Group();
  private sets: Record<"kitchen" | "court" | "office", THREE.Group> = { kitchen: new THREE.Group(), court: new THREE.Group(), office: new THREE.Group() };
  private tank = new THREE.Group(); private panels: { g: THREE.Group; mesh: THREE.Mesh; th: number; delay: number; flip: number; p0: THREE.Vector3 }[] = [];
  private tankGrey: THREE.Material; private tankBrown: THREE.Material; private tankRoof: THREE.Mesh;
  private brownCoat: THREE.Mesh; private leaks: THREE.Mesh;
  private spans: { g: THREE.Group; xc: number }[] = []; private bents: { g: THREE.Group; x: number }[] = [];
  private firehouse = new THREE.Group(); private hose = new THREE.Group(); private ladder = new THREE.Group();
  private mol: THREE.Mesh; private molGeo: THREE.BufferGeometry; private molMat: THREE.MeshPhongMaterial;
  private blue: { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; key: string };

  constructor(_kit: Kit) {
    const R = this.root;
    R.add(this.y1919, this.today, this.snow, this.sets.kitchen, this.sets.court, this.sets.office);
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

    // ---- shared by both eras: street, quay, harbour, tenements ----
    const b = new Batch();
    const cob = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const plank = lam("wharfPlanks", () => ({ map: rep(planksHD(), 1, 1) }));
    const cope = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#d8cdbd", "#cfc3b1", "#e0d6c6", "#c6b9a6"], "#a39584") }));
    b.add(quadUp(-400, 400, -12, 400, 100, 103), cob);
    b.add(boxGeo(V(-400, -0.6, QUAY_Z - 0.6), V(400, G, QUAY_Z), 2), cope);
    const water = new THREE.Mesh(quadUp(-900, 900, -900, QUAY_Z, 1, 1, -G), twoTone(new THREE.MeshLambertMaterial({ map: rep(waterTex(), 60, 60) }), 0.6));
    water.receiveShadow = true; R.add(water);
    for (let x = -96; x <= 96; x += 12) {
      b.add(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 8), lam("lampIron", () => ({ color: "#2f3340" })), new THREE.Matrix4().makeTranslation(x + 3, G + 1.8, 0.4));
      b.add(new THREE.SphereGeometry(0.22, 12, 8), lam("lampGlass", () => ({ color: "#f6e6b8" })), new THREE.Matrix4().makeTranslation(x + 3, G + 3.7, 0.4));
    }
    let r = 7;
    const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
    for (let x = -110; x < 110;) {
      const w = [7, 9, 8][Math.floor(rnd() * 3)], h = [9.8, 11.2, 12.6][Math.floor(rnd() * 3)];
      house(b, x + w / 2, 1 + 4.5, Math.PI, w, 9, h, Math.floor(rnd() * 8));
      x += w + 0.2;
    }
    for (const zf of [17, 30, 44]) for (let x = -120; x < 120;) {
      const w = [7, 9][Math.floor(rnd() * 2)], h = [9.8, 11.2, 12.6, 14][Math.floor(rnd() * 4)];
      house(b, x + w / 2, zf + 4.5 + rnd() * 2, Math.PI, w, 9, h, Math.floor(rnd() * 8));
      x += w + 1 + rnd() * 2;
    }
    const spire = new THREE.ConeGeometry(3, 14, 4); spire.rotateY(Math.PI / 4);
    b.add(boxGeo(V(-34, G, 64), V(-28, G + 20, 70), 4), lam("churchBrick", () => ({ map: rep(brick(), 3, 8) })));
    b.add(spire, lam("spireSlate", () => ({ color: "#5d6b78" })), new THREE.Matrix4().makeTranslation(-31, G + 27, 67));
    b.build(R);

    // ---- 1919 only: wharf, sheds, barrels, hydrant ----
    const b19 = new Batch();
    b19.add(quadUp(-400, 400, QUAY_Z, -12, 100, 10, 0.004), plank);
    const shedRoof = lam("shedRoof", () => ({ color: "#6e6a72", side: THREE.DoubleSide }));
    for (const [x0, x1, h] of [[-62, -38, 7.5], [46, 72, 6.5], [-100, -70, 8]] as const) {
      const shed = lam(`shed${x0}`, () => ({ map: facadeHD(`shed${x0}`, x1 - x0, h, { wall: "#8c6a4a", shutter: "#3b3f52", brick: x0 > 0 }) }));
      b19.add(boxGeo(V(x0, G, -40), V(x1, G + h, -28)), shed);
      b19.add(quad(V(x0 - 0.4, G + h, -27.6), V(x1 + 0.4, G + h, -27.6), V(x1 + 0.4, G + h + 2.2, -34), V(x0 - 0.4, G + h + 2.2, -34)), shedRoof);
      b19.add(quad(V(x1 + 0.4, G + h, -40.4), V(x0 - 0.4, G + h, -40.4), V(x0 - 0.4, G + h + 2.2, -34), V(x1 + 0.4, G + h + 2.2, -34)), shedRoof);
    }
    const barrelM = lam("barrel", () => ({ map: barrelTex() }));
    for (let i = 0; i < 26; i++) {
      const x = -30 + (i % 7) * 1.05, z = -39 + Math.floor(i / 7) * 1.2, y = i % 9 === 8 ? G + 1.05 : G;
      b19.add(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 14), barrelM, new THREE.Matrix4().makeTranslation(x, y + 0.5, z));
    }
    const hyd = lam("hydrant", () => ({ color: "#c0353a" }));
    b19.add(new THREE.CylinderGeometry(0.16, 0.2, 0.8, 12), hyd, new THREE.Matrix4().makeTranslation(HOSE_AT[0] + 2.2, G + 0.4, HOSE_AT[2] + 1.6));
    b19.add(new THREE.SphereGeometry(0.17, 12, 8), hyd, new THREE.Matrix4().makeTranslation(HOSE_AT[0] + 2.2, G + 0.82, HOSE_AT[2] + 1.6));
    b19.add(boxGeo(V(HOSE_AT[0] - 0.35, G + 0.3, HOSE_AT[2] - 0.6), V(HOSE_AT[0] + 0.35, G + 0.9, HOSE_AT[2] + 0.35)), lam("ironDark", () => ({ color: "#3d414c" })));
    b19.build(this.y1919);
    const hc = new THREE.CatmullRomCurve3([V(HOSE_AT[0] + 2.2, G + 0.55, HOSE_AT[2] + 1.45), V(HOSE_AT[0] + 1.6, G + 0.06, HOSE_AT[2] + 1.6),
      V(HOSE_AT[0] + 0.6, G + 0.06, HOSE_AT[2] + 1.0), V(HOSE_AT[0], G + 0.6, HOSE_AT[2] + 0.36)]);
    this.hose.add(new THREE.Mesh(new THREE.TubeGeometry(hc, 40, 0.06, 8), twoTone(new THREE.MeshLambertMaterial({ color: "#6a4a2e" }))));
    this.y1919.add(this.hose);
    const lw = twoTone(new THREE.MeshLambertMaterial({ color: "#b07a48" }));
    for (const sx of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9.2, 0.08), lw); rail.position.set(sx * 0.3, 4.6, 0); this.ladder.add(rail); }
    for (let k = 0; k < 26; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), lw); rung.position.set(0, 0.3 + k * 0.34, 0); this.ladder.add(rung); }
    this.ladder.position.set(...LADDER_AT); this.ladder.rotation.x = -0.18;
    this.ladder.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.y1919.add(this.ladder);

    // ---- the tank: 28 curved plates hinged at their feet (they peel open at the split), roof, brown coat ----
    this.tankGrey = twoTone(new THREE.MeshPhongMaterial({ map: tankTex("grey", "#8f969e", "#5d636c"), specular: "#6a6a6a", shininess: 20, side: THREE.DoubleSide }), 0.15);
    this.tankBrown = twoTone(new THREE.MeshPhongMaterial({ map: tankTex("brown", "#9a6242", "#5e3622"), specular: "#5a4030", shininess: 20, side: THREE.DoubleSide }), 0.15);
    const NP = 28;
    for (let i = 0; i < NP; i++) {
      const th = (i / NP) * Math.PI * 2, mid = th + Math.PI / NP;
      const g = new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 4, 1, true, th, (Math.PI * 2) / NP);
      const px = TANK_R * Math.sin(mid), pz = TANK_R * Math.cos(mid);
      g.translate(-px, TANK_H / 2, -pz);
      const uv = g.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / NP);
      const mesh = new THREE.Mesh(g, this.tankGrey); mesh.castShadow = true; mesh.receiveShadow = true;
      const piv = new THREE.Group(); const p0 = V(TANK[0] + px, G, TANK[2] + pz); piv.position.copy(p0); piv.add(mesh);
      const hsh = Math.sin(i * 91.7) * 43758.5, fr = hsh - Math.floor(hsh);
      this.panels.push({ g: piv, mesh, th: mid, delay: 0.05 + 0.5 * fr, flip: 0.75 + 0.6 * fr, p0 });
      this.tank.add(piv);
    }
    this.tankRoof = new THREE.Mesh(new THREE.ConeGeometry(TANK_R + 0.2, 2.2, 56, 1, true), twoTone(new THREE.MeshLambertMaterial({ color: "#6d737c", side: THREE.DoubleSide })));
    this.tankRoof.position.set(TANK[0], G + TANK_H + 1.1, TANK[2]); this.tankRoof.castShadow = true;
    this.tank.add(this.tankRoof);
    this.brownCoat = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R + 0.03, TANK_R + 0.03, TANK_H, 96, 1, true).translate(0, TANK_H / 2, 0), this.tankBrown);
    this.brownCoat.position.set(TANK[0], G, TANK[2]); this.tank.add(this.brownCoat);
    const lth = Math.atan2(SEAM_AT[0] - TANK[0], SEAM_AT[2] - TANK[2]);
    this.leaks = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R + 0.06, TANK_R + 0.06, TANK_H * 0.4, 24, 1, true, lth - 0.16, 0.32).translate(0, TANK_H * 0.2, 0),
      new THREE.MeshBasicMaterial({ map: leakTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.leaks.position.set(TANK[0], G, TANK[2]); this.leaks.layers.set(NOINK); this.tank.add(this.leaks);
    this.y1919.add(this.tank);

    // ---- Engine 31's firehouse ----
    const fb = new Batch(), fw = 11, fd = 13, fh = 9;
    const brickF = lam("fireBrick", () => ({ map: facadeHD("fireSide", 13, 9, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
    fb.add(quad(V(-fw / 2, 0, fd / 2), V(fw / 2, 0, fd / 2), V(fw / 2, fh, fd / 2), V(-fw / 2, fh, fd / 2)), lam("fireDoors", () => ({ map: doorsTex() })));
    for (const [a, c, d2, e] of [[V(fw / 2, 0, -fd / 2), V(-fw / 2, 0, -fd / 2), V(-fw / 2, fh, -fd / 2), V(fw / 2, fh, -fd / 2)],
      [V(-fw / 2, 0, -fd / 2), V(-fw / 2, 0, fd / 2), V(-fw / 2, fh, fd / 2), V(-fw / 2, fh, -fd / 2)],
      [V(fw / 2, 0, fd / 2), V(fw / 2, 0, -fd / 2), V(fw / 2, fh, -fd / 2), V(fw / 2, fh, fd / 2)]] as THREE.Vector3[][]) fb.add(quad(a, c, d2, e), brickF);
    fb.add(boxGeo(V(-fw / 2 - 0.3, fh, -fd / 2 - 0.3), V(fw / 2 + 0.3, fh + 0.6, fd / 2 + 0.3)), lam("trimStone", () => ({ color: "#efe3c8" })));
    fb.add(boxGeo(V(-1.0, fh, -2), V(1.0, fh + 4.5, 0)), lam("fireBrick2", () => ({ map: rep(brick(), 1, 2) })));
    fb.build(this.firehouse);
    this.firehouse.position.set(...FIRE);
    this.firehouse.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.y1919.add(this.firehouse);

    // ---- the Atlantic Avenue El over Commercial Street ----
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3a4150", specular: "#7a7a7a", shininess: 40 }), 0.15);
    const tieM = lam("elTies", () => ({ color: "#6a4a32" }));
    for (const x0 of SPANS) {
      const g = new THREE.Group(), xc = x0 + 4.5;
      for (const dz of [-1.5, 1.5]) { const gir = new THREE.Mesh(new THREE.BoxGeometry(9.02, 0.7, 0.32), iron); gir.position.set(0, 0.35, dz); g.add(gir); }
      for (let k = 0; k < 12; k++) { const tt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 3.8), tieM); tt.position.set(-4.3 + k * 0.78, 0.77, 0); g.add(tt); }
      for (const dz of [-0.72, 0.72]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(9.02, 0.12, 0.1), iron); rl.position.set(0, 0.9, dz); g.add(rl); }
      g.position.set(xc, EL_Y, EL_Z); g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      this.y1919.add(g); this.spans.push({ g, xc });
      const bent = new THREE.Group();
      for (const dz of [-2.4, 2.4]) { const cc = new THREE.Mesh(new THREE.BoxGeometry(0.34, EL_Y - G, 0.34), iron); cc.position.set(0, (EL_Y - G) / 2, dz); bent.add(cc); }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.4), iron); cap.position.set(0, EL_Y - G - 0.1, 0); bent.add(cap);
      bent.position.set(x0, G, EL_Z); bent.traverse((o) => { o.castShadow = true; }); this.y1919.add(bent); this.bents.push({ g: bent, x: x0 });
    }
    const car = new THREE.Mesh(new THREE.BoxGeometry(14, 3.0, 2.8), twoTone(new THREE.MeshLambertMaterial({ map: carTex() })));
    car.position.set(-40, EL_Y + 2.4, EL_Z); car.castShadow = true; this.y1919.add(car);

    // ---- snow patches for the cold street ----
    const sn = new THREE.Mesh(quadUp(-60, 60, -12, 1, 3, 0.35, 0.012), twoTone(new THREE.MeshLambertMaterial({ map: snowTex(), transparent: true, depthWrite: false })));
    sn.receiveShadow = true; this.snow.add(sn);

    // ---- molasses: heightfield over the waterfront, glossy toon syrup ----
    this.molGeo = new THREE.BufferGeometry();
    this.molGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NX * NZ * 3), 3));
    this.molGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(NX * NZ * 3), 3));
    this.molGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(NX * NZ * 3), 3));
    const idx: number[] = [];
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, c = a + NX; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    this.molGeo.setIndex(idx);
    this.molMat = twoTone(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, specular: "#ffcf90", shininess: 70 }), 0.4);
    this.mol = new THREE.Mesh(this.molGeo, this.molMat); this.mol.frustumCulled = false; this.mol.receiveShadow = true;
    this.y1919.add(this.mol);

    // ---- today: the field on the tank's base ----
    const bt = new Batch();
    bt.add(quadUp(-400, 400, QUAY_Z, -12, 100, 10, 0.004), lam("parkPath", () => ({ map: rep(cobbleHD(), 1, 1) })));
    bt.add(quadUp(-36, 36, QUAY_Z + 3, -13, 18, 7, 0.02), lam("grassHD", () => ({ map: grassHD() })));
    const dia = new THREE.PlaneGeometry(14, 14); dia.rotateX(-Math.PI / 2); dia.rotateY(Math.PI / 4);
    const dirt = lam("infield", () => ({ map: dirtTex() }));
    bt.add(dia, dirt, new THREE.Matrix4().makeTranslation(TANK[0], G + 0.03, TANK[2] + 2));
    const bag = new THREE.BoxGeometry(0.4, 0.08, 0.4), bases = lam("bases", () => ({ color: "#f6f3ec" }));
    for (const [dx, dz] of [[0, 9.9], [7, 2.9], [0, -4.1], [-7, 2.9]]) bt.add(bag, bases, new THREE.Matrix4().makeTranslation(TANK[0] + dx, G + 0.07, TANK[2] + dz - 0.9));
    bt.add(new THREE.CylinderGeometry(1.4, 1.8, 0.25, 20), dirt, new THREE.Matrix4().makeTranslation(TANK[0], G + 0.12, TANK[2] + 2));
    const fence = lam("fence", () => ({ color: "#4a6a52" }));
    for (let k = 0; k <= 8; k++) { const a = Math.PI * 0.25 + (k / 8) * Math.PI * 0.5; bt.add(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), fence, new THREE.Matrix4().makeTranslation(TANK[0] + 6 * Math.cos(a), G + 2, TANK[2] + 10.4 + 2.2 * Math.sin(a))); }
    bt.add(boxGeo(V(-4.3, G + 3.9, TANK[2] + 10.0), V(4.3, G + 4.05, TANK[2] + 12.8)), fence);
    const wood = lam("benchWood", () => ({ color: "#8a5a34" })), lampIron = lam("lampIron", () => ({ color: "#2f3340" }));
    for (const [x, z] of [[BENCH_AT[0], BENCH_AT[2]], [-14, -11], [26, -12]] as const) {
      bt.add(boxGeo(V(x - 1, G + 0.42, z - 0.25), V(x + 1, G + 0.5, z + 0.25)), wood);
      bt.add(boxGeo(V(x - 1, G + 0.5, z - 0.3), V(x + 1, G + 1.0, z - 0.22)), wood);
      for (const sx of [-0.85, 0.85]) bt.add(boxGeo(V(x + sx - 0.04, G, z - 0.25), V(x + sx + 0.04, G + 0.42, z + 0.25)), lampIron);
    }
    for (const [x, z, h] of [[-30, -16, 8], [32, -18, 9], [-26, -40, 8.5], [30, -38, 8], [42, -20, 9], [-42, -22, 8.5], [8, -42, 7]] as const) prop(bt, {}, "tree_oak", x, G, z, h, x);
    bt.build(this.today);

    // ---- interior sets (inserts) ----
    this.room(this.sets.kitchen, ROOM, wallpaper("kitchen", "#e9dcb8", "#d8c79c"));
    const kb = new Batch();
    tableAt(kb, ROOM[0], ROOM[2] + 3, 1.6, 0.9, 0.78);
    kb.add(boxGeo(V(ROOM[0] + 2.0, G, ROOM[2] + 4.6), V(ROOM[0] + 3.0, G + 1.6, ROOM[2] + 5.4)), lam("icebox", () => ({ color: "#b07a48" })));
    kb.add(boxGeo(V(ROOM[0] + 2.08, G + 0.9, ROOM[2] + 4.55), V(ROOM[0] + 2.92, G + 1.5, ROOM[2] + 4.6)), lam("iceboxDoor", () => ({ color: "#9a6a3c" })));
    kb.build(this.sets.kitchen);
    this.room(this.sets.court, COURT, panelTex());
    const cb = new Batch();
    cb.add(boxGeo(V(COURT[0] - 1.8, G, COURT[2] + 3.4), V(COURT[0] + 1.8, G + 1.35, COURT[2] + 4.2)), lam("bench", () => ({ map: panelTex() })));
    cb.add(boxGeo(V(COURT[0] - 1.9, G + 1.35, COURT[2] + 3.3), V(COURT[0] + 1.9, G + 1.45, COURT[2] + 4.25)), lam("benchTop", () => ({ color: "#5a341e" })));
    cb.add(boxGeo(V(COURT[0] + 0.3, G + 1.45, COURT[2] + 3.4), V(COURT[0] + 0.8, G + 1.5, COURT[2] + 3.75)), lam("sound", () => ({ color: "#3a2214" })));
    cb.build(this.sets.court);
    this.room(this.sets.office, OFFICE, wallpaper("office", "#cfd9c8", "#bccab4"));
    const ob = new Batch();
    tableAt(ob, OFFICE[0], OFFICE[2] + 2.85, 1.8, 1.0, 0.95);
    ob.build(this.sets.office);
    const cv = document.createElement("canvas"); cv.width = 1000; cv.height = 720;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.9), new THREE.MeshBasicMaterial({ map: tex }));
    bm.rotation.set(-Math.PI / 2, 0, Math.PI); bm.position.set(OFFICE[0], G + 0.962, OFFICE[2] + 2.85); bm.layers.set(NOINK);
    this.sets.office.add(bm);
    this.blue = { cv, tex, key: "" };
  }

  private room(gr: THREE.Group, c: V3, wall: THREE.Texture) {
    const b = new Batch(), [x, , z] = c;
    const wm = lam("room" + x, () => ({ map: rep(wall, 3, 1.4), side: THREE.DoubleSide }));
    b.add(quadUp(x - 6, x + 6, z - 6, z + 6, 3, 3, 0.002), lam("floor", () => ({ map: rep(planksHD(), 1, 1) })));
    b.add(quad(V(x - 6, G, z + 6), V(x + 6, G, z + 6), V(x + 6, G + 4, z + 6), V(x - 6, G + 4, z + 6)), wm);
    b.add(quad(V(x - 6, G, z - 6), V(x - 6, G, z + 6), V(x - 6, G + 4, z + 6), V(x - 6, G + 4, z - 6)), wm);
    b.add(quad(V(x + 6, G, z + 6), V(x + 6, G, z - 6), V(x + 6, G + 4, z - 6), V(x + 6, G + 4, z + 6)), wm);
    b.add(quad(V(x - 6, G + 4, z + 6), V(x + 6, G + 4, z + 6), V(x + 6, G + 4, z - 6), V(x - 6, G + 4, z - 6)), lam("ceiling", () => ({ color: "#f2ead8", side: THREE.DoubleSide })));
    b.add(boxGeo(V(x - 6, G, z + 5.9), V(x + 6, G + 0.25, z + 6)), lam("skirting", () => ({ color: "#5a3a26" })));
    b.add(quad(V(x - 3.2, G + 1.6, z + 5.95), V(x - 1.2, G + 1.6, z + 5.95), V(x - 1.2, G + 3.4, z + 5.95), V(x - 3.2, G + 3.4, z + 5.95)), lam("roomWin", () => ({ map: windowTex() })));
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
    const town = set === "town", isToday = set === "today";
    this.y1919.visible = town; this.today.visible = isToday;
    this.sets.kitchen.visible = set === "kitchen"; this.sets.court.visible = set === "court"; this.sets.office.visible = set === "office";
    this.snow.visible = town && !!s.snow;
    if (town) this.poseTown(s, t, f);
    if (set === "office") this.poseBlueprint(f);
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

  private poseTown(s: ShotDef, t: number, f: number) {
    const tau = s.flood ? s.flood(t) : -1;
    const painting = s.paint === undefined;
    const p = painting ? smooth((f - W(69)) / (W(72) + 22 - W(69))) : s.paint!;
    for (const pn of this.panels) pn.mesh.material = !painting && p >= 1 ? this.tankBrown : this.tankGrey;
    this.brownCoat.visible = painting && p > 0.001; this.brownCoat.scale.y = Math.max(0.001, 0.12 + 0.88 * p);
    this.leaks.visible = !!s.leaks || painting;
    (this.leaks.material as THREE.MeshBasicMaterial).opacity = painting ? 1 - p : 1;
    this.hose.visible = s.crowd === "jell" || s.crowd === "leak";
    this.ladder.visible = painting;
    const ax = new THREE.Vector3();
    for (const pn of this.panels) {
      const u = tau > 0 ? easeIn((tau - pn.delay * 0.4) / (0.55 * pn.flip)) : 0;
      pn.g.rotation.set(0, 0, 0); pn.g.position.copy(pn.p0);
      if (u > 0) {
        ax.set(Math.cos(pn.th), 0, -Math.sin(pn.th)); // tangent at the plate's foot: tipping about it throws the top outward
        pn.g.rotateOnWorldAxis(ax, (Math.PI / 2) * Math.min(1, u) * pn.flip * 1.05);
        pn.g.position.y = G - Math.min(0.4, tau * 0.3);
      }
    }
    this.tankRoof.visible = tau <= 0.3;
    this.tankRoof.position.y = G + TANK_H + 1.1 - (tau > 0 ? 40 * tau * tau : 0);
    const bend = tau > 0 ? smooth((tau - 0.5) / 1.4) : 0;
    for (const sp of this.spans) {
      const w = smooth((24 - Math.abs(sp.xc)) / 12) * bend;
      sp.g.position.set(sp.xc + 0.4 * w * Math.sign(sp.xc), EL_Y - 2.4 * w, EL_Z + 1.4 * w);
      sp.g.rotation.set(0.16 * w, 0, -0.2 * w * Math.sign(sp.xc || 1));
    }
    for (const bt of this.bents) {
      const w = smooth((22 - Math.abs(bt.x)) / 10) * bend;
      bt.g.rotation.set(0.34 * w, 0, 0.1 * w * Math.sign(bt.x || 1)); bt.g.scale.y = 1 - 0.3 * w;
    }
    const sh = tau > 0 ? smooth((tau - 0.6) / 1.8) : 0;
    this.firehouse.position.set(FIRE[0] + 3.2 * sh, G - 0.25 * sh, FIRE[2] + 1.0 * sh); this.firehouse.rotation.set(0.02 * sh, -0.09 * sh, -0.035 * sh);
    this.mol.visible = tau > 0;
    if (tau > 0) this.poseMolasses(tau, s.cold ? s.cold(t) : 0, t);
  }

  private poseMolasses(tau: number, cold: number, t: number) {
    const P = this.molGeo.attributes.position.array as Float32Array, N = this.molGeo.attributes.normal.array as Float32Array;
    const dx = (MX1 - MX0) / (NX - 1), dz = (MZ1 - MZ0) / (NZ - 1), H = new Float32Array(NX * NZ);
    const rip = 0.05 * (1 - cold), ph = t * 5.5, Cc = this.molGeo.attributes.color.array as Float32Array;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = MX0 + i * dx, z = MZ0 + j * dz, h = molH(x, z, tau), r = Math.hypot(x - TANK[0], z - TANK[2]);
      H[j * NX + i] = h > 0.01 ? h + rip * Math.sin(r * 1.7 - ph) * Math.min(1, h) : -0.35;
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, x = MX0 + i * dx, z = MZ0 + j * dz;
      P[k * 3] = x; P[k * 3 + 1] = G + H[k]; P[k * 3 + 2] = z;
      const hl = H[j * NX + Math.max(0, i - 1)], hr = H[j * NX + Math.min(NX - 1, i + 1)], hd = H[Math.max(0, j - 1) * NX + i], hu = H[Math.min(NZ - 1, j + 1) * NX + i];
      const nx = -(hr - hl) / (2 * dx), nz = -(hu - hd) / (2 * dz), l = Math.hypot(nx, 1, nz);
      N[k * 3] = nx / l; N[k * 3 + 1] = 1 / l; N[k * 3 + 2] = nz / l;
      const st = smooth((1 - 1 / l) * 2.0), crest = smooth((H[k] - 2.2) / 3) * 0.35;
      Cc[k * 3] = MD.r + (MA.r - MD.r) * Math.min(1, st + crest); Cc[k * 3 + 1] = MD.g + (MA.g - MD.g) * Math.min(1, st + crest); Cc[k * 3 + 2] = MD.b + (MA.b - MD.b) * Math.min(1, st + crest);
    }
    this.molGeo.attributes.position.needsUpdate = true; this.molGeo.attributes.normal.needsUpdate = true; this.molGeo.attributes.color.needsUpdate = true;
    this.molMat.color.set(mixHex("#ffffff", "#9a8a88", cold));
    this.molMat.shininess = 70 - 55 * cold; this.molMat.specular.set(mixHex("#e0a060", "#6a4a3a", cold));
  }

  private poseBlueprint(f: number) {
    const sign = smooth((f - W(188, 2)) / 24), maths = smooth((f - W(190, 2)) / Math.max(1, W(195) - W(190))), seal = f >= Math.round(SEAL_T * FPS) ? 1 : 0;
    const q = (v: number) => Math.round(v * 40) / 40, key = `${q(sign)}|${q(maths)}|${seal}`;
    if (key === this.blue.key) return;
    this.blue.key = key;
    const g = this.blue.cv.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1000, 720);
    fxBlueprint(new Pen(g), q(sign), q(maths), seal);
    this.blue.tex.needsUpdate = true;
  }
}

function tableAt(b: Batch, x: number, z: number, w: number, d: number, h: number) {
  const m = lam("tableWood", () => ({ color: "#9a6a3c" }));
  b.add(boxGeo(V(x - w / 2, G + h - 0.06, z - d / 2), V(x + w / 2, G + h, z + d / 2)), m);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(boxGeo(V(x + sx * (w / 2 - 0.08) - 0.04, G, z + sz * (d / 2 - 0.08) - 0.04), V(x + sx * (w / 2 - 0.08) + 0.04, G + h - 0.06, z + sz * (d / 2 - 0.08) + 0.04)), m);
}
/** horizontal quad facing up at height D0 + dy covering x0..x1, z0..z1 */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
