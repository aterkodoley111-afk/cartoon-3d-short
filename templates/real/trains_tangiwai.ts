// Rolling stock and road vehicles for Tangiwai, built to real dimensions (local frame: +x = direction of travel,
// front coupler at x = 0, the body runs back along -x; y = 0 is the top of the rail; z across).
//  - NZR Ka class 4-8-4 (1939-50), oil-fired: ~13.6 m engine + 8.4 m tender (21.98 m over couplers), 3.6 m tall,
//    2.6 m wide on the 1067 mm gauge; 1370 mm (4 ft 6 in) drivers, 4-wheel leading bogie, 2-axle trailing truck,
//    the headlight on top of the smokebox front, a pilot (cowcatcher), black with a red buffer beam.
//  - NZR 1930s-50s main-trunk carriage ("56-foot"): 17.1 m body, 2.6 m wide, arched roof at ~3.6 m above rail,
//    open end platforms with railings and steps, two 2-axle bogies; the 1950s livery was a deep "Midland" red.
//  - a 1950s Bedford-style 3-ton truck (Ellis's), ~6 m long, round-fronted cab, flat tray, wire-spoked look.
//  - 2007: a DX-style diesel-electric (17.5 m, 6 axles, cab at the front) and two modern long-distance carriages.
// Real objects keep their real shape: rounded roofs and bonnets, wheels with spokes/hubs, window frames, lamps, rods.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex, rep } from "./paint";
import { NOINK } from "./ink";
import { twoTone } from "./shade";
import { skyEnv } from "./realism";

const M4 = () => new THREE.Matrix4();
const at = (x: number, y: number, z: number) => M4().makeTranslation(x, y, z);
/** cylinder along x (axis), radius r, from x0 to x1, centre (y, z) */
const cylX = (r: number, x0: number, x1: number, y: number, z: number, seg = 20, open = false): [THREE.BufferGeometry, THREE.Matrix4] => {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), seg, 1, open); g.rotateZ(Math.PI / 2); return [g, at((x0 + x1) / 2, y, z)];
};
/** cylinder along z (wheels, axles) */
const cylZ = (r: number, w: number, x: number, y: number, z: number, seg = 22): [THREE.BufferGeometry, THREE.Matrix4] => {
  const g = new THREE.CylinderGeometry(r, r, w, seg); g.rotateX(Math.PI / 2); return [g, at(x, y, z)];
};
/** vertical cylinder */
const cylY = (r0: number, r1: number, y0: number, y1: number, x: number, z: number, seg = 16): [THREE.BufferGeometry, THREE.Matrix4] =>
  [new THREE.CylinderGeometry(r1, r0, y1 - y0, seg), at(x, (y0 + y1) / 2, z)];
/** an arched roof: a shallow cylinder segment along x, spanning half-width hw, springing at y0, rise h */
const archRoof = (x0: number, x1: number, hw: number, y0: number, h: number) => {
  const R = (hw * hw + h * h) / (2 * h), th = Math.asin(hw / R);
  const g = new THREE.CylinderGeometry(R, R, x1 - x0, 24, 1, true, -th, 2 * th);
  g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2);
  // after the rotations the arc bulges toward +y; move its chord to y0
  const m = at((x0 + x1) / 2, y0 + h - R, 0);
  return [g, m] as [THREE.BufferGeometry, THREE.Matrix4];
};
const addT = (b: Batch, gm: [THREE.BufferGeometry, THREE.Matrix4], mat: THREE.Material) => b.add(gm[0], mat, gm[1]);

// ---------------- shared materials ----------------
let EM: Record<string, THREE.MeshBasicMaterial> = {};
/** self-lit (HDR) materials: lamps, lit windows, beacons */
export const glow = (key: string, rgb: [number, number, number], map?: THREE.Texture) =>
  (EM[key] ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), map: map ?? null }));
export const resetGlow = () => { EM = {}; };
const wheelTex = () => ctex("spokeWheel", 256, 256, (g) => {
  g.fillStyle = "#26242a"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = "#3a3a44"; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fill();
  g.strokeStyle = "#1a181e"; g.lineWidth = 11; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(128 + 26 * Math.cos(a), 128 + 26 * Math.sin(a)); g.lineTo(128 + 104 * Math.cos(a), 128 + 104 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "#c9ccd2"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.lineWidth = 6; g.strokeStyle = "#c9ccd2"; g.stroke();
  g.fillStyle = "#4a4a54"; g.beginPath(); g.arc(128, 128, 28, 0, 7); g.fill(); g.fillStyle = "#b9bec6"; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill();
  // the balance weight
  g.fillStyle = "#1a181e"; g.beginPath(); g.arc(128, 128, 100, 0.6, 2.2); g.arc(128, 128, 60, 2.2, 0.6, true); g.fill();
});
const discTex = () => ctex("discWheel", 256, 256, (g) => {
  g.fillStyle = "#2a282e"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#5a5a64"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle = "#1c1a20"; g.beginPath(); g.arc(128 + 64 * Math.cos(a), 128 + 64 * Math.sin(a), 14, 0, 7); g.fill(); }
  g.fillStyle = "#8a8e96"; g.beginPath(); g.arc(128, 128, 22, 0, 7); g.fill();
});
/** a wheel: tyre cylinder + a textured face each side, spun by the group rotation */
const wheel = (r: number, w: number, tex: THREE.Texture) => {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 26, 1, true).rotateX(Math.PI / 2), lam("tyreSteel", () => ({ color: "#3a3a42", side: THREE.DoubleSide })));
  const faceM = lam("wheelFace" + tex.uuid.slice(0, 6), () => ({ map: tex }));
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CircleGeometry(r * 0.995, 26), faceM); f.position.z = (s * w) / 2; if (s < 0) f.rotation.y = Math.PI; g.add(f); }
  g.add(tyre);
  g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return g;
};

export type Rolling = { root: THREE.Group; wheels: { g: THREE.Group; r: number }[]; rods?: THREE.Group; len: number; lamps?: THREE.Object3D[]; cab?: THREE.Vector3 };
/** spin the wheels for a distance travelled; the coupling rods follow the crank */
export const roll = (v: Rolling, dist: number) => {
  for (const w of v.wheels) w.g.rotation.z = -dist / w.r;
  if (v.rods) { const a = -dist / 0.685, rc = 0.3; v.rods.position.set(rc * Math.cos(a), rc * Math.sin(a), 0); }
};

// ---------------- NZR Ka ----------------
export const buildKA = (): Rolling => {
  const root = new THREE.Group(), b = new Batch(), thin = new Batch();
  const black = lam("kaBlack", () => ({ color: "#2a2a30" })), blk2 = lam("kaBlack2", () => ({ color: "#36363e" })), red = lam("kaRed", () => ({ color: "#b8312c" }));
  const steel = lam("kaSteel", () => ({ color: "#9aa0a8" })), brass = lam("kaBrass", () => ({ color: "#c9a24a" })), cabM = lam("kaCab", () => ({ color: "#3a3640" }));
  const L = 13.6;
  // frames and footplate
  b.add(boxGeo(V(-L + 0.2, 0.42, -0.5), V(-0.3, 1.15, 0.5)), black);
  b.add(boxGeo(V(-10.4, 1.3, -1.32), V(-0.9, 1.42, 1.32)), blk2);
  for (const s of [-1, 1]) b.add(boxGeo(V(-10.4, 1.12, s > 0 ? 1.22 : -1.32), V(-0.9, 1.42, s > 0 ? 1.32 : -1.22)), red); // valance stripe
  // buffer beam + pilot
  b.add(boxGeo(V(-0.32, 0.78, -1.3), V(0, 1.28, 1.3)), red);
  const pil = new THREE.BufferGeometry();
  pil.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.12, -1.2, 0.95, 0.12, -0.9, 0, 0.78, -1.2, 0.95, 0.12, 0.9, 0, 0.12, 1.2, 0, 0.78, 1.2, 0, 0.78, -1.2, 0.95, 0.12, -0.9, 0.95, 0.12, 0.9, 0, 0.78, -1.2, 0.95, 0.12, 0.9, 0, 0.78, 1.2], 3));
  pil.computeVertexNormals(); b.add(pil, lam("kaPilot", () => ({ color: "#3a3a44", side: THREE.DoubleSide })));
  // cylinders and steam chests
  for (const s of [-1, 1]) { addT(b, cylX(0.36, -0.6, -2.5, 1.0, s * 1.12), black); b.add(boxGeo(V(-2.3, 1.36, s * 1.12 - 0.3), V(-0.8, 1.75, s * 1.12 + 0.3)), blk2); }
  // smokebox, boiler, firebox
  addT(b, cylX(0.93, -0.9, -2.9, 2.38, 0), lam("kaSmokebox", () => ({ color: "#2e2e34" })));
  addT(b, cylX(0.86, -2.9, -9.1, 2.42, 0), black);
  b.add(boxGeo(V(-10.3, 1.42, -1.05), V(-9.0, 3.1, 1.05)), black);
  for (const x of [-3.2, -5.0, -6.8, -8.6]) addT(b, cylX(0.885, x - 0.06, x + 0.06, 2.42, 0), steel); // boiler bands
  // smokebox door: a disc with a ring and a hinge
  const door = new THREE.CircleGeometry(0.78, 28); door.rotateY(Math.PI / 2); b.add(door, lam("kaDoor", () => ({ color: "#33333a" })), at(-0.88, 2.38, 0));
  addT(b, cylX(0.8, -0.86, -0.92, 2.38, 0, 28, true), steel);
  b.add(boxGeo(V(-0.86, 2.34, -0.5), V(-0.82, 2.42, 0.5)), steel);
  // chimney, domes, safety valves, whistle
  addT(b, cylY(0.3, 0.27, 3.1, 3.66, -1.9, 0), black); addT(b, cylY(0.33, 0.33, 3.58, 3.68, -1.9, 0), black);
  for (const x of [-4.9, -7.2]) { addT(b, cylY(0.42, 0.36, 3.05, 3.45, x, 0), black); const d = new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); b.add(d, black, at(x, 3.43, 0)); }
  for (const z of [-0.18, 0.18]) addT(b, cylY(0.07, 0.06, 3.2, 3.5, -8.6, z), brass);
  addT(b, cylY(0.05, 0.05, 3.2, 3.62, -8.3, 0), brass);
  // the headlight: a drum on top of the smokebox front, lens facing forward
  addT(b, cylX(0.24, -0.9, -1.45, 3.48, 0), lam("kaLampBody", () => ({ color: "#2e2e36" })));
  b.add(boxGeo(V(-1.4, 3.18, -0.12), V(-1.0, 3.26, 0.12)), black);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).rotateY(Math.PI / 2), glow("headlamp", [6, 5.2, 3.6]));
  lens.position.set(-0.885, 3.48, 0); root.add(lens);
  // marker lamps on the buffer beam
  const ml: THREE.Object3D[] = [];
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12).rotateY(Math.PI / 2), glow("marker", [2.6, 2.3, 1.6])); m.position.set(0.01, 1.42, s * 0.95); root.add(m); ml.push(m); }
  // handrails along the boiler (thin: no ink)
  for (const s of [-1, 1]) addT(thin, cylX(0.025, -1.2, -9.2, 2.95, s * 0.82, 6), steel);
  // cab: walls with real window openings (pillars), arched roof, spectacle plates
  const x0 = -13.4, x1 = -10.2, hw = 1.34, y0 = 1.42, belt = 2.35, top = 3.32;
  b.add(boxGeo(V(x0, y0, -hw), V(x1, belt, -hw + 0.06)), cabM); b.add(boxGeo(V(x0, y0, hw - 0.06), V(x1, belt, hw)), cabM);
  for (const s of [-1, 1]) for (const [a, c] of [[x0, x0 + 0.15], [x0 + 1.5, x0 + 1.62], [x1 - 0.18, x1]] as [number, number][])
    b.add(boxGeo(V(a, belt, s > 0 ? hw - 0.06 : -hw), V(c, top, s > 0 ? hw : -hw + 0.06)), cabM);
  b.add(boxGeo(V(x1 - 0.06, y0, -hw), V(x1, top, hw)), cabM); // front sheet (spectacles painted as glass below)
  for (const s of [-1, 1]) { const sp = new THREE.CircleGeometry(0.22, 18).rotateY(Math.PI / 2); b.add(sp, lam("kaSpectacle", () => ({ color: "#2e3a52" })), at(x1 + 0.005, 2.9, s * 0.62)); }
  addT(b, archRoof(x0 - 0.15, x1 + 0.05, hw + 0.08, top, 0.28), lam("kaRoof", () => ({ color: "#2a2a30", side: THREE.DoubleSide })));
  b.add(boxGeo(V(x0, y0 - 0.02, -hw), V(x1, y0 + 0.04, hw)), lam("kaFloor", () => ({ color: "#5a4a3a" })));
  // backhead with gauges (seen through the cab side)
  b.add(boxGeo(V(x1 - 0.5, 1.5, -0.9), V(x1 - 0.06, 3.0, 0.9)), lam("kaBackhead", () => ({ color: "#4a3a34" })));
  // the brake handle (driver's side, +z)
  b.add(boxGeo(V(x1 - 0.75, 2.0, 0.85), V(x1 - 0.65, 2.55, 0.92)), brass);
  // a glowing firehole door
  const fh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3).rotateY(-Math.PI / 2), glow("firehole", [3.2, 1.6, 0.5])); fh.position.set(x1 - 0.52, 1.95, 0); root.add(fh);
  b.build(root); const tg = new THREE.Group(); thin.build(tg); tg.traverse((o) => o.layers.set(NOINK)); root.add(tg);
  // wheels
  const wheels: Rolling["wheels"] = [], spoke = wheelTex(), disc = discTex();
  const put = (x: number, r: number, tex: THREE.Texture, z = 0.6) => { for (const s of [-1, 1]) { const w = wheel(r, 0.13, tex); w.position.set(x, r, s * z); root.add(w); wheels.push({ g: w, r }); } };
  for (const x of [-4.1, -5.75, -7.4, -9.05]) put(x, 0.685, spoke, 0.66);
  for (const x of [-1.25, -2.15]) put(x, 0.38, disc, 0.6);
  for (const x of [-11.4, -12.4]) put(x, 0.43, disc, 0.6);
  // coupling + connecting rods (thin, no ink): moved in a circle by roll()
  const rods = new THREE.Group(), rb = new Batch();
  for (const s of [-1, 1]) {
    rb.add(boxGeo(V(-9.15, 0.6, s * 0.76 - 0.03), V(-4.0, 0.76, s * 0.76 + 0.03)), steel);
    rb.add(boxGeo(V(-5.9, 0.62, s * 0.82 - 0.03), V(-1.6, 0.74, s * 0.82 + 0.03)), steel);
  }
  rb.build(rods); rods.traverse((o) => { o.layers.set(NOINK); o.castShadow = true; }); root.add(rods);
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, rods, len: L, lamps: [lens, ...ml], cab: V(-11.8, y0, 0) };
};
export const buildTender = (): Rolling => {
  const root = new THREE.Group(), b = new Batch();
  const black = lam("kaBlack", () => ({ color: "#2a2a30" })), blk2 = lam("kaBlack2", () => ({ color: "#36363e" }));
  const L = 8.4;
  b.add(boxGeo(V(-L + 0.2, 0.55, -0.6), V(-0.2, 1.15, 0.6)), black);
  b.add(boxGeo(V(-L + 0.3, 1.15, -1.3), V(-0.3, 2.95, 1.3)), black);
  addT(b, archRoof(-L + 0.3, -0.3, 1.3, 2.95, 0.22), lam("tenderTop", () => ({ color: "#2e2e34", side: THREE.DoubleSide })));
  addT(b, cylY(0.32, 0.32, 3.1, 3.3, -L + 2.2, 0), blk2); // oil filler
  b.add(boxGeo(V(-0.3, 1.15, -1.1), V(0, 2.4, 1.1)), blk2);
  for (const s of [-1, 1]) b.add(boxGeo(V(-L + 0.3, 1.15, s * 1.3 - 0.02), V(-0.3, 1.3, s * 1.3 + 0.02)), lam("kaRed", () => ({ color: "#b8312c" })));
  b.build(root);
  const wheels: Rolling["wheels"] = [], disc = discTex();
  for (const x of [-1.3, -2.4, -6.0, -7.1]) for (const s of [-1, 1]) { const w = wheel(0.43, 0.12, disc); w.position.set(x, 0.43, s * 0.6); root.add(w); wheels.push({ g: w, r: 0.43 }); }
  for (const x of [-1.85, -6.55]) { const bb = new Batch(); for (const s of [-1, 1]) bb.add(boxGeo(V(x - 1.0, 0.25, s * 0.78 - 0.08), V(x + 1.0, 0.6, s * 0.78 + 0.08)), blk2); bb.build(root); }
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, len: L };
};

// ---------------- the carriage ----------------
/** carriage side (1024 x 256 over 17.1 m x 2.2 m): deep red panels, black lining, window openings (dark), a cream number band */
const carSideTex = () => ctex("carSide53", 1024, 256, (g, r) => {
  g.fillStyle = "#8e2a24"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"; g.fillRect(r() * 1024, r() * 256, 40, 6); }
  g.fillStyle = "#5e1a16"; g.fillRect(0, 150, 1024, 4); g.fillRect(0, 34, 1024, 3);
  // panel seams under the windows
  g.fillStyle = "rgba(40,8,6,0.45)"; for (let x = 30; x < 1024; x += 70) g.fillRect(x, 156, 2, 100);
  g.fillStyle = "#1a1418"; for (let k = 0; k < 13; k++) { const x = 44 + k * 72; g.fillRect(x, 44, 54, 92); }
});
/** the lit windows (1024 x 128 for the window band): warm interior, passengers' heads and hats in silhouette */
const winTex = (seed: number) => ctex("carWin53_" + seed, 1024, 128, (g, r) => {
  g.clearRect(0, 0, 1024, 128);
  for (let k = 0; k < 13; k++) {
    const x = 44 + k * 72, w = 54;
    const gr = g.createLinearGradient(0, 4, 0, 124); gr.addColorStop(0, "#fff0c8"); gr.addColorStop(1, "#f2b860");
    g.fillStyle = gr; g.fillRect(x, 4, w, 120);
    g.fillStyle = "#e8d6b0"; g.fillRect(x, 4, w, 10); // lamp-lit ceiling
    const n = Math.floor(r() * 3 + (seed % 3 === 0 ? 0.6 : 0));
    for (let i = 0; i < n; i++) {
      const cx = x + 10 + r() * (w - 20), cy = 70 + r() * 18, hr = 9 + r() * 3;
      g.fillStyle = "rgba(70,40,30,0.85)"; g.beginPath(); g.ellipse(cx, cy + 28, hr * 1.7, 22, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx, cy, hr, hr * 1.15, 0, 0, 7); g.fill();
      if (r() > 0.6) { g.fillRect(cx - hr * 1.5, cy - hr * 0.9, hr * 3, 4); g.fillRect(cx - hr * 0.8, cy - hr * 1.7, hr * 1.6, hr * 0.9); }
    }
    g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(x + 6, 120); g.lineTo(x + 26, 4); g.lineTo(x + 34, 4); g.lineTo(x + 14, 120); g.fill();
  }
});
export const buildCarriage = (seed: number, lit = true): Rolling => {
  const root = new THREE.Group(), b = new Batch(), thin = new Batch();
  const L = 17.4, hw = 1.3, y0 = 1.02, yb = 3.12;
  const lampsW: THREE.Object3D[] = [];
  const side = lam("carSide53", () => ({ map: carSideTex() })), red = lam("carRed53", () => ({ color: "#8e2a24" })), dark = lam("carUnder", () => ({ color: "#2a262c" }));
  const roofM = lam("carRoof53", () => ({ color: "#4a4650", side: THREE.DoubleSide }));
  // body: two textured sides + ends, floor
  const sideG = (s: number) => { const g = new THREE.PlaneGeometry(L - 1.0, yb - y0); if (s < 0) g.rotateY(Math.PI); return g; };
  b.add(sideG(1), side, at(-L / 2, (y0 + yb) / 2, hw)); b.add(sideG(-1), side, at(-L / 2, (y0 + yb) / 2, -hw));
  for (const x of [-0.5, -L + 0.5]) b.add(boxGeo(V(x - 0.04, y0, -hw), V(x + 0.04, yb, hw)), red);
  b.add(boxGeo(V(-L + 0.5, y0 - 0.12, -hw), V(-0.5, y0, hw)), dark);
  addT(b, archRoof(-L + 0.35, -0.35, hw + 0.08, yb, 0.42), roofM);
  // roof ventilators
  for (let x = -2.2; x > -L + 1.5; x -= 2.6) addT(b, cylY(0.12, 0.1, yb + 0.36, yb + 0.5, x, 0), dark);
  // end platforms: floor, railings, steps, gangway
  for (const [xa, xb] of [[-0.5, 0], [-L, -L + 0.5]] as [number, number][]) {
    b.add(boxGeo(V(xa, y0 - 0.08, -hw + 0.1), V(xb, y0, hw - 0.1)), dark);
    for (const s of [-1, 1]) { b.add(boxGeo(V(xa, 0.45, s * (hw - 0.15) - 0.2), V(xb, 0.53, s * (hw - 0.15) + 0.2)), dark); }
    for (const s of [-1, 1]) addT(thin, cylX(0.03, xa, xb, y0 + 0.95, s * (hw - 0.12), 6), lam("rail53", () => ({ color: "#2a262c" })));
  }
  // windows: dark glass behind the openings, the lit band over them (self-lit), window frames
  if (lit) {
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(L - 1.0, 0.805); if (s < 0) g.rotateY(Math.PI);
      const m = new THREE.Mesh(g, glow("win53_" + seed, [1.7, 1.42, 1.0], winTex(seed)));
      (m.material as THREE.MeshBasicMaterial).alphaTest = 0.5;
      m.position.set(-L / 2, yb - (90 / 256) * (yb - y0), s * (hw + 0.006));
      root.add(m); lampsW.push(m);
    }
  }
  b.add(boxGeo(V(-L + 0.6, y0 - 0.45, -0.9), V(-0.6, y0 - 0.12, 0.9)), dark);
  b.build(root); const tg = new THREE.Group(); thin.build(tg); tg.traverse((o) => o.layers.set(NOINK)); root.add(tg);
  const wheels: Rolling["wheels"] = [], disc = discTex();
  for (const xc of [-2.6, -L + 2.6]) {
    const bb = new Batch(); for (const s of [-1, 1]) bb.add(boxGeo(V(xc - 1.2, 0.22, s * 0.78 - 0.07), V(xc + 1.2, 0.62, s * 0.78 + 0.07)), dark); bb.add(boxGeo(V(xc - 0.25, 0.55, -0.9), V(xc + 0.25, 0.9, 0.9)), dark); bb.build(root);
    for (const x of [xc - 0.8, xc + 0.8]) for (const s of [-1, 1]) { const w = wheel(0.42, 0.11, disc); w.position.set(x, 0.42, s * 0.6); root.add(w); wheels.push({ g: w, r: 0.42 }); }
  }
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, len: L, lamps: lampsW };
};

// ---------------- Ellis's truck ----------------
export const buildTruck = (): Rolling & { lamps: THREE.Object3D[] } => {
  const root = new THREE.Group(), b = new Batch();
  const green = lam("truckGreen", () => ({ color: "#4a6a52" })), dark = lam("truckDark", () => ({ color: "#2a2830" })), wood = lam("truckTray", () => ({ color: "#8a6a44" }));
  const glass = lam("truckGlass", () => ({ color: "#3a4a62" })), chrome = lam("truckChrome", () => ({ color: "#c9ccd2" }));
  // bonnet with rounded top, grille, mudguards, cab with real window holes and a curved roof, the tray
  b.add(boxGeo(V(-1.7, 0.75, -0.62), V(-0.2, 1.42, 0.62)), green);
  addT(b, cylX(0.62, -1.7, -0.25, 1.42, 0, 18), green);
  b.add(boxGeo(V(-0.24, 0.72, -0.5), V(-0.12, 1.6, 0.5)), chrome);
  for (let i = 0; i < 7; i++) b.add(boxGeo(V(-0.13, 0.78 + i * 0.11, -0.46), V(-0.1, 0.81 + i * 0.11, 0.46)), dark);
  for (const s of [-1, 1]) { const mg = new THREE.CylinderGeometry(0.55, 0.55, 0.32, 16, 1, false, 0, Math.PI); mg.rotateX(Math.PI / 2); mg.rotateZ(Math.PI / 2); b.add(mg, dark, at(-0.75, 0.55, s * 0.92)); }
  const cx0 = -3.4, cx1 = -1.7, hw = 1.0, belt = 1.6, top = 2.45;
  b.add(boxGeo(V(cx0, 0.7, -hw), V(cx1, belt, hw)), green);
  for (const s of [-1, 1]) for (const [a, c] of [[cx0, cx0 + 0.12], [cx1 - 0.14, cx1]] as [number, number][]) b.add(boxGeo(V(a, belt, s > 0 ? hw - 0.08 : -hw), V(c, top, s > 0 ? hw : -hw + 0.08)), green);
  b.add(boxGeo(V(cx0, belt, -hw), V(cx0 + 0.08, top, hw)), green);
  b.add(boxGeo(V(cx1 - 0.05, belt + 0.05, -hw + 0.1), V(cx1 - 0.02, top - 0.08, hw - 0.1)), glass);
  addT(b, archRoof(cx0 - 0.05, cx1 + 0.05, hw + 0.04, top, 0.14), lam("truckRoof", () => ({ color: "#4a6a52", side: THREE.DoubleSide })));
  b.add(boxGeo(V(-6.0, 1.0, -1.15), V(-3.5, 1.15, 1.15)), wood);
  for (const s of [-1, 1]) b.add(boxGeo(V(-6.0, 1.15, s * 1.15 - 0.05), V(-3.5, 1.6, s * 1.15 + 0.05)), wood);
  b.add(boxGeo(V(-6.05, 1.15, -1.15), V(-5.95, 1.6, 1.15)), wood);
  b.add(boxGeo(V(-6.0, 0.5, -0.5), V(-0.3, 0.75, 0.5)), dark);
  b.add(boxGeo(V(-0.2, 0.45, -0.95), V(0.0, 0.6, 0.95)), chrome);
  b.build(root);
  const lamps: THREE.Object3D[] = [];
  for (const s of [-1, 1]) { addTLamp(root, lamps, -0.15, 1.2, s * 0.78); }
  const wheels: Rolling["wheels"] = [], disc = discTex();
  for (const x of [-0.75, -4.6]) for (const s of [-1, 1]) { const w = wheel(0.45, 0.25, disc); w.position.set(x, 0.45, s * 0.86); root.add(w); wheels.push({ g: w, r: 0.45 }); }
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, len: 6.0, lamps };
};
const addTLamp = (root: THREE.Group, lamps: THREE.Object3D[], x: number, y: number, z: number) => {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16).rotateZ(Math.PI / 2), lam("lampBody", () => ({ color: "#c9ccd2" })));
  body.position.set(x - 0.02, y, z); root.add(body);
  const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18).rotateY(Math.PI / 2), glow("truckLamp", [5, 4.5, 3.2])); l.position.set(x + 0.065, y, z); root.add(l); lamps.push(l);
};

// ---------------- 2007: diesel and modern carriages ----------------

// ======================================================================= 2007 rolling stock (detailed)
// KiwiRail DX class (GE U26C, Co-Co diesel-electric): 17.3 m over couplers, 2.75 m wide, 3.96 m tall; a short nose,
// a full-width cab, a narrower long hood with louvred doors and side walkways with handrails, radiator fans and the
// exhaust stack on the roof, two 3-axle bogies (1016 mm wheels) with coil springs, a fuel tank slung between them,
// a snowplough-style pilot with yellow/black chevrons, knuckle couplers, air hoses, headlights + ditch lights, horn.
// Long-distance carriage (2000s refurbished): 20 m, silver with a dark window band, plug doors at the ends, roof
// air-conditioning pods, gangway bellows, underframe equipment boxes, air-sprung bogies.
let ENV07: THREE.Texture | null = null;
const env07 = () => (ENV07 ??= skyEnv(false));
const paint = (key: string, color: string, shin = 55, refl = 0.12) => {
  const k = "p07_" + key;
  return (EM2[k] ??= twoTone(new THREE.MeshPhongMaterial({ color, specular: "#9a9a9a", shininess: shin, envMap: env07(), reflectivity: refl, combine: THREE.MixOperation })) as unknown as THREE.Material);
};
const EM2: Record<string, THREE.Material> = {};
const glass07 = () => (EM2.glass07 ??= twoTone(new THREE.MeshPhongMaterial({ color: "#3d5168", specular: "#ffffff", shininess: 120, envMap: env07(), reflectivity: 0.45, combine: THREE.MixOperation, transparent: true, opacity: 0.55, depthWrite: false })) as unknown as THREE.Material);
/** long-hood side: louvred access doors, panel seams, latches, a grimy lower edge */
const hoodTex = () => ctex("dxHood", 1024, 256, (g, r) => {
  g.fillStyle = "#d2532c"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"; g.fillRect(r() * 1024, r() * 256, 20 + r() * 40, 3); }
  for (let d = 0; d < 9; d++) {
    const x = 18 + d * 112;
    g.strokeStyle = "rgba(60,20,10,0.75)"; g.lineWidth = 3; g.strokeRect(x, 22, 100, 196);
    g.fillStyle = "#c04a26"; g.fillRect(x + 3, 25, 94, 190);
    if (d % 3 !== 1) for (let y = 40; y < 140; y += 9) { g.fillStyle = "#6a2412"; g.fillRect(x + 12, y, 76, 4); g.fillStyle = "rgba(255,200,170,0.25)"; g.fillRect(x + 12, y + 4, 76, 1.5); }
    g.fillStyle = "#3a3a40"; g.fillRect(x + 84, 150, 6, 18);
  }
  const gr = g.createLinearGradient(0, 200, 0, 256); gr.addColorStop(0, "rgba(40,30,25,0)"); gr.addColorStop(1, "rgba(40,30,25,0.45)"); g.fillStyle = gr; g.fillRect(0, 200, 1024, 56);
});
const grilleTex = () => ctex("dxGrille", 256, 256, (g) => {
  g.fillStyle = "#2a2c30"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#4a4c52"; g.lineWidth = 3; for (let k = 0; k < 256; k += 12) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
});
const chevronTex = () => ctex("dxChevron", 256, 64, (g) => { g.fillStyle = "#f2c81e"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#1d1d22"; for (let x = -64; x < 300; x += 48) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 56, 0); g.lineTo(x + 32, 0); g.fill(); } });
const fanTex = () => ctex("dxFan", 256, 256, (g) => {
  g.fillStyle = "#2a2c30"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#55585e"; g.lineWidth = 6;
  for (let rr = 20; rr < 128; rr += 18) { g.beginPath(); g.arc(128, 128, rr, 0, 7); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 124 * Math.cos(a), 128 + 124 * Math.sin(a)); g.stroke(); }
});
/** a 3-axle bogie: side frames with axle boxes, coil springs, brake cylinders, traction motor shadows */
const bogie3 = (root: THREE.Group, b: Batch, thin: Batch, xc: number, wheels: Rolling["wheels"]) => {
  const blk = paint("bogie", "#26272b", 20, 0.04), grey = paint("bogieG", "#4a4c52", 25, 0.05), spring = paint("spring", "#c84a2a", 30, 0.05);
  for (const s of [-1, 1]) {
    const z = s * 0.95;
    b.add(boxGeo(V(xc - 2.0, 0.55, z - 0.09), V(xc + 2.0, 0.95, z + 0.09)), blk);
    b.add(boxGeo(V(xc - 1.8, 0.4, z - 0.07), V(xc + 1.8, 0.56, z + 0.07)), blk);
    for (const dx of [-1.45, 0, 1.45]) {
      b.add(boxGeo(V(xc + dx - 0.22, 0.32, z - 0.13), V(xc + dx + 0.22, 0.72, z + 0.13), 0, true), grey); // axle box
      for (const o of [-0.38, 0.38]) addT(thin, cylY(0.09, 0.09, 0.72, 1.12, xc + dx + o, z), spring);    // coil springs
    }
    for (const dx of [-0.72, 0.72]) addT(b, cylX(0.11, xc + dx - 0.2, xc + dx + 0.2, 0.82, z + s * 0.12, 12), grey); // brake cylinders
  }
  b.add(boxGeo(V(xc - 1.9, 0.95, -0.95), V(xc + 1.9, 1.2, 0.95)), blk);
  for (const dx of [-1.45, 0, 1.45]) {
    addT(b, cylZ(0.09, 1.9, xc + dx, 0.508, 0, 12), grey);
    for (const s of [-1, 1]) { const w = wheel(0.508, 0.13, discTex07()); w.position.set(xc + dx, 0.508, s * 0.6); root.add(w); wheels.push({ g: w, r: 0.508 }); }
  }
};
const discTex07 = () => ctex("disc07", 256, 256, (g) => {
  g.fillStyle = "#3a3c42"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#8a8e96"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke();
  g.fillStyle = "#2a2c30"; g.beginPath(); g.arc(128, 128, 90, 0, 7); g.fill();
  g.fillStyle = "#6a6e76"; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = "#9aa0a8"; g.beginPath(); g.arc(128 + 20 * Math.cos(a), 128 + 20 * Math.sin(a), 4, 0, 7); g.fill(); }
});
export const buildDX = (): Rolling => {
  const root = new THREE.Group(), b = new Batch(), thin = new Batch();
  const L = 17.3, hw = 1.37, deck = 1.42;
  const red = paint("dxRed", "#d4542c", 60, 0.14), yel = paint("dxYel", "#f2c81e", 60, 0.14), grey = paint("dxGrey", "#5a5e66", 40, 0.1);
  const blk = paint("dxBlk", "#26272b", 25, 0.05), hoodSide = (EM2.hood ??= twoTone(new THREE.MeshPhongMaterial({ map: hoodTex(), specular: "#888888", shininess: 50, envMap: env07(), reflectivity: 0.1, combine: THREE.MixOperation })) as unknown as THREE.Material);
  const grille = lam("dxGrille", () => ({ map: rep4(grilleTex()) })), chev = lam("dxChev", () => ({ map: chevronTex() })), fan = lam("dxFan", () => ({ map: fanTex() }));
  const rail = paint("dxRail", "#f2c81e", 40, 0.1), steel = paint("dxSteel", "#b8bcc4", 90, 0.4);
  // underframe + deck with walkways
  b.add(boxGeo(V(-L + 0.15, 1.1, -hw), V(-0.15, deck, hw), 0, true), grey);
  b.add(boxGeo(V(-L + 0.15, deck, -hw), V(-0.15, deck + 0.03, hw)), lam("dxTread", () => ({ color: "#3a3c42" })));
  b.add(boxGeo(V(-L + 0.1, 1.08, -hw - 0.02), V(-0.1, 1.22, hw + 0.02)), yel); // yellow sill stripe
  // short nose (front), headlights, number board, ditch lights
  b.add(boxGeo(V(-1.75, deck, -0.92), V(-0.35, 2.55, 0.92), 0, true), yel);
  b.add(boxGeo(V(-1.75, 2.55, -0.92), V(-0.6, 2.62, 0.92)), yel);
  b.add(boxGeo(V(-0.37, 2.15, -0.3), V(-0.33, 2.45, 0.3)), lam("dxNumBoard", () => ({ color: "#e8e4dc" })));
  const lamps: THREE.Object3D[] = [];
  for (const [y, z, r] of [[1.95, 0.45, 0.11], [1.95, -0.45, 0.11], [1.05, 1.05, 0.09], [1.05, -1.05, 0.09]] as [number, number, number][]) {
    addT(b, cylX(r + 0.04, -0.4, -0.25, y, z, 16), steel);
    const l = new THREE.Mesh(new THREE.CircleGeometry(r, 18).rotateY(Math.PI / 2), glow("dxLamp", [3.2, 3.0, 2.4])); l.position.set(-0.245, y, z); root.add(l); lamps.push(l);
  }
  // pilot (plough) with chevrons, coupler, hoses, steps
  const pil = new THREE.BufferGeometry();
  pil.setAttribute("position", new THREE.Float32BufferAttribute([0.25, 0.18, -1.2, 0.25, 0.18, 1.2, -0.3, 1.1, 1.3, 0.25, 0.18, -1.2, -0.3, 1.1, 1.3, -0.3, 1.1, -1.3], 3));
  pil.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 4, 0, 4, 1, 0, 0, 4, 1, 0, 1], 2)); pil.computeVertexNormals();
  b.add(pil, chev);
  b.add(boxGeo(V(-0.15, 0.82, -0.2), V(0.42, 1.02, 0.2), 0, true), blk); b.add(boxGeo(V(0.3, 0.75, -0.25), V(0.5, 1.08, 0.25), 0, true), blk);
  for (const z of [-0.55, 0.55]) addT(thin, cylX(0.04, -0.1, 0.35, 0.95, z, 8), lam("dxHose", () => ({ color: "#1d1d22" })));
  for (const xs of [-0.25, -1.6, -L + 0.3]) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) b.add(boxGeo(V(xs - 0.25, 0.45 + k * 0.32, s * hw - 0.2), V(xs + 0.05, 0.49 + k * 0.32, s * hw + 0.02)), k === 0 ? yel : steel);
  // cab: full width, windscreen, side windows, door, sun visors, roof with horn and antenna
  const cx0 = -4.1, cx1 = -1.75, top = 3.96;
  b.add(boxGeo(V(cx0, deck, -hw + 0.02), V(cx1, 2.55, hw - 0.02), 0, true), red);
  for (const s of [-1, 1]) {
    b.add(boxGeo(V(cx0, 2.55, s > 0 ? hw - 0.1 : -hw + 0.02), V(cx0 + 0.25, top, s > 0 ? hw - 0.02 : -hw + 0.1)), red);
    b.add(boxGeo(V(cx0 + 1.05, 2.55, s > 0 ? hw - 0.1 : -hw + 0.02), V(cx0 + 1.2, top, s > 0 ? hw - 0.02 : -hw + 0.1)), red);
    b.add(boxGeo(V(cx1 - 0.15, 2.55, s > 0 ? hw - 0.1 : -hw + 0.02), V(cx1, top, s > 0 ? hw - 0.02 : -hw + 0.1)), red);
    for (const [a, c] of [[cx0 + 0.25, cx0 + 1.05], [cx0 + 1.2, cx1 - 0.15]] as [number, number][]) b.add(boxGeo(V(a, 2.6, s * (hw - 0.06) - 0.01), V(c, 3.75, s * (hw - 0.06) + 0.01)), glass07());
    b.add(boxGeo(V(cx0 + 1.2, 3.75, s * (hw - 0.06) - 0.03), V(cx1 - 0.15, top, s * (hw - 0.06) + 0.03)), red);
    addT(thin, cylY(0.02, 0.02, 2.75, 3.25, cx1 + 0.05, s * (hw + 0.12), 8), steel);
    b.add(boxGeo(V(cx1 + 0.0, 3.05, s * (hw + 0.06)), V(cx1 + 0.12, 3.3, s * (hw + 0.2))), blk); // mirror
  }
  // windscreen: two raked panes with a centre pillar, wipers, visors
  const ws = (z0: number, z1: number) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([cx1, 2.6, z0, cx1 - 0.3, 3.75, z0, cx1, 2.6, z1, cx1, 2.6, z1, cx1 - 0.3, 3.75, z0, cx1 - 0.3, 3.75, z1], 3)); g.computeVertexNormals(); return g; };
  b.add(ws(-hw + 0.1, -0.06), glass07()); b.add(ws(0.06, hw - 0.1), glass07());
  b.add(boxGeo(V(cx1 - 0.3, 2.55, -0.06), V(cx1, 3.8, 0.06)), red);
  b.add(boxGeo(V(cx1 - 0.35, 3.75, -hw + 0.02), V(cx1, top, hw - 0.02)), red);
  for (const z of [-0.65, 0.65]) addT(thin, cylX(0.015, cx1 - 0.02, cx1 - 0.3, 2.95, z, 6), blk);
  b.add(boxGeo(V(cx1 - 0.05, 3.72, -hw + 0.1), V(cx1 + 0.25, 3.76, hw - 0.1)), blk);
  b.add(boxGeo(V(cx0, top, -hw + 0.05), V(cx1 - 0.35, top + 0.08, hw - 0.05)), grey);
  addT(b, cylX(0.07, cx0 + 0.5, cx0 + 1.0, top + 0.18, 0.3, 12), steel); addT(b, cylX(0.05, cx0 + 0.3, cx0 + 0.8, top + 0.18, -0.3, 12), steel); // horn
  addT(thin, cylY(0.015, 0.015, top, top + 0.55, cx0 + 1.6, -0.6, 6), blk);
  // cab interior seen through the glass: desk, seat, back wall
  b.add(boxGeo(V(cx1 - 0.75, deck, -1.2), V(cx1 - 0.3, 2.9, 1.2)), lam("dxDesk", () => ({ color: "#4a4c52" })));
  b.add(boxGeo(V(cx0 + 0.05, deck, -1.25), V(cx0 + 0.15, 3.9, 1.25)), lam("dxCabWall", () => ({ color: "#c9c4b8" })));
  b.add(boxGeo(V(cx1 - 1.4, deck, -0.65), V(cx1 - 0.95, 2.3, -0.15)), lam("dxSeat", () => ({ color: "#2e3446" })));
  // long hood: louvred sides, grille ends, roof fans and exhaust stack, dynamic brake blister
  const hx0 = -L + 0.4, hx1 = cx0, hh = 3.62, hw2 = 1.0;
  b.add(boxGeo(V(hx0, deck, -hw2), V(hx1, hh, hw2), 0, true), red);
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(hx1 - hx0, hh - deck - 0.05); if (s < 0) g.rotateY(Math.PI); b.add(g, hoodSide, at((hx0 + hx1) / 2, (hh + deck) / 2, s * (hw2 + 0.005))); }
  b.add(boxGeo(V(hx0 - 0.01, 2.0, -0.85), V(hx0, 3.4, 0.85)), grille);
  b.add(boxGeo(V(hx0, hh, -hw2 + 0.05), V(hx0 + 4.6, hh + 0.12, hw2 - 0.05)), grey);
  for (const x of [hx0 + 1.3, hx0 + 3.2]) { const fg = new THREE.CircleGeometry(0.78, 28).rotateX(-Math.PI / 2); b.add(fg, fan, at(x, hh + 0.125, 0)); addT(b, cylY(0.82, 0.82, hh + 0.12, hh + 0.2, x, 0, 28), grey); }
  b.add(boxGeo(V(hx1 - 4.6, hh, -0.75), V(hx1 - 1.2, hh + 0.35, 0.75)), red);
  b.add(boxGeo(V(hx1 - 4.4, hh + 0.35, -0.6), V(hx1 - 1.4, hh + 0.37, 0.6)), grille);
  addT(b, cylY(0.16, 0.18, hh, hh + 0.42, hx1 - 6.4, 0.25, 14), blk);
  // walkway handrails: posts + a top rail each side
  for (const s of [-1, 1]) {
    for (let x = hx0 + 0.2; x < hx1; x += 1.45) addT(thin, cylY(0.022, 0.022, deck, deck + 1.0, x, s * (hw - 0.08), 6), rail);
    addT(thin, cylX(0.022, hx0 + 0.2, hx1, deck + 1.0, s * (hw - 0.08), 6), rail);
    addT(thin, cylX(0.018, hx0 + 0.2, hx1, deck + 0.55, s * (hw - 0.08), 6), rail);
  }
  // fuel tank between the bogies, air reservoirs
  addT(b, cylX(0.48, -6.6, -10.7, 0.88, 0, 20), grey); b.add(boxGeo(V(-10.7, 0.6, -0.9), V(-6.6, 1.1, 0.9), 0, true), grey);
  for (const s of [-1, 1]) addT(b, cylX(0.16, -11.2, -12.5, 0.9, s * 1.05, 12), grey);
  const wheels: Rolling["wheels"] = [];
  bogie3(root, b, thin, -3.5, wheels); bogie3(root, b, thin, -L + 3.5, wheels);
  b.build(root); const tg = new THREE.Group(); thin.build(tg); tg.traverse((o) => o.layers.set(NOINK)); root.add(tg);
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, len: L, lamps };
};
const rep4 = (t: THREE.Texture) => { const c = t.clone(); c.repeat.set(4, 4); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.needsUpdate = true; return c; };
/** modern carriage side: silver ribbing, a dark window band with frames and reflections, a blue stripe, door outlines */
const modSideTex = () => ctex("modSide2", 2048, 256, (g, r) => {
  g.fillStyle = "#d6dade"; g.fillRect(0, 0, 2048, 256);
  for (let y = 160; y < 236; y += 8) { g.fillStyle = "rgba(120,126,134,0.35)"; g.fillRect(0, y, 2048, 2); }
  g.fillStyle = "#28384e"; g.fillRect(150, 54, 1748, 84);
  for (let x = 150; x < 1898; x += 116) {
    g.fillStyle = "#b9bec6"; g.fillRect(x, 54, 8, 84);
    const gr = g.createLinearGradient(x, 54, x + 60, 138); gr.addColorStop(0, "rgba(200,220,240,0.45)"); gr.addColorStop(0.5, "rgba(120,150,180,0.1)"); gr.addColorStop(1, "rgba(30,40,60,0)");
    g.fillStyle = gr; g.fillRect(x + 8, 56, 108, 80);
    if (r() > 0.4) { g.fillStyle = "rgba(20,24,30,0.55)"; g.beginPath(); g.ellipse(x + 40 + r() * 40, 120, 14, 18, 0, 0, 7); g.fill(); }
  }
  g.fillStyle = "#2e4f9a"; g.fillRect(0, 146, 2048, 12);
  for (const x of [40, 1930]) { g.strokeStyle = "#7a8088"; g.lineWidth = 4; g.strokeRect(x, 40, 78, 196); g.fillStyle = "#28384e"; g.fillRect(x + 14, 56, 50, 70); }
  const gr2 = g.createLinearGradient(0, 220, 0, 256); gr2.addColorStop(0, "rgba(60,50,40,0)"); gr2.addColorStop(1, "rgba(60,50,40,0.35)"); g.fillStyle = gr2; g.fillRect(0, 220, 2048, 36);
});
export const buildModCar = (): Rolling => {
  const root = new THREE.Group(), b = new Batch(), thin = new Batch();
  const L = 20.0, hw = 1.37, y0 = 1.12, yt = 3.55;
  const side = (EM2.modSide ??= twoTone(new THREE.MeshPhongMaterial({ map: modSideTex(), specular: "#aaaaaa", shininess: 70, envMap: env07(), reflectivity: 0.18, combine: THREE.MixOperation })) as unknown as THREE.Material);
  const sil = paint("modSil", "#d6dade", 70, 0.18), dark = paint("modDark", "#2a2c30", 20, 0.04), roofM = paint("modRoof", "#b0b4bc", 50, 0.1);
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(L - 0.5, yt - y0); if (s < 0) g.rotateY(Math.PI); b.add(g, side, at(-L / 2, (y0 + yt) / 2, s * hw)); }
  b.add(boxGeo(V(-L + 0.25, y0, -hw + 0.01), V(-0.25, yt, hw - 0.01)), sil);
  addT(b, archRoof(-L + 0.25, -0.25, hw, yt, 0.32), roofM);
  for (const x of [-3.2, -L + 3.2]) { b.add(boxGeo(V(x - 1.4, yt + 0.28, -0.75), V(x + 1.4, yt + 0.62, 0.75)), roofM); b.add(boxGeo(V(x - 1.2, yt + 0.62, -0.55), V(x + 1.2, yt + 0.64, 0.55)), lam("modACGrille", () => ({ map: rep4(grilleTex()) }))); }
  // gangway bellows + end doors
  for (const xe of [-0.25, -L + 0.25]) { const sg = Math.sign(xe + L / 2); b.add(boxGeo(V(xe + (sg > 0 ? 0 : -0.3), 1.15, -0.65), V(xe + (sg > 0 ? 0.3 : 0), 3.1, 0.65)), dark); }
  // underframe equipment, skirts
  b.add(boxGeo(V(-L + 0.6, 0.62, -1.1), V(-0.6, y0, 1.1), 0, true), dark);
  for (const [xa, xb] of [[-6.5, -9.5], [-10.5, -13.5]]) b.add(boxGeo(V(xb, 0.5, -0.95), V(xa, 0.62, 0.95), 0, true), paint("modBox", "#3a3c42", 25, 0.05));
  const wheels: Rolling["wheels"] = [], disc = discTex07();
  for (const xc of [-2.9, -L + 2.9]) {
    for (const s of [-1, 1]) { b.add(boxGeo(V(xc - 1.4, 0.45, s * 0.92 - 0.08), V(xc + 1.4, 0.75, s * 0.92 + 0.08)), dark); addT(b, cylY(0.22, 0.22, 0.75, 1.02, xc, s * 0.85, 16), lam("airbag", () => ({ color: "#1d1d22" }))); }
    for (const x of [xc - 1.0, xc + 1.0]) { addT(b, cylZ(0.08, 1.8, x, 0.43, 0, 10), dark); for (const s of [-1, 1]) { const w = wheel(0.43, 0.12, disc); w.position.set(x, 0.43, s * 0.6); root.add(w); wheels.push({ g: w, r: 0.43 }); } }
  }
  b.build(root); const tg = new THREE.Group(); thin.build(tg); tg.traverse((o) => o.layers.set(NOINK)); root.add(tg);
  root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return { root, wheels, len: L };
};
