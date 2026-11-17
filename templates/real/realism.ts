// Realism kit for the cartoon shorts (user feedback after videos 1-5: "the liquid flows but doesn't feel real", "the
// character drives a car but it doesn't feel real", "the person inside the bus doesn't feel real", "if the wind blows,
// the grass must move like real grass"). Everything here is deterministic in time t (seconds), so any frame renders
// alone. Materials are passed in (use lam()/twoTone() from build.ts so they share the world's lighting).
//
//   pour()       a liquid stream that leaves a pipe with speed, falls on a ballistic arc, thins as it accelerates
//                (continuity: r ~ 1/sqrt(v)), wobbles, and hits the surface with a crown splash, droplets, expanding
//                ripple rings and a growing slick. Replaces the flat fxStream card.
//   car(), bus() vehicles from REAL dimensions with rounded bodies (extruded side profiles with bevels), wheel arches,
//                recessed wheels with hubs, glass panes on pillars, lights, bumpers, mirrors, and an INTERIOR: seats,
//                dashboard, steering wheel, and seat anchors so characters SIT at the right height with hands on the
//                wheel. drive() spins the wheels from distance travelled and adds suspension bob + pitch.
//   windSway()   vertex wind for grass / foliage / reeds / flags: displacement grows with height, travelling gusts
//                (a moving wave across the field), small flutter; patched into any Lambert/Phong material.
//   grassField() thousands of tapered blades (instanced) with wind, height and colour variation: real grass.
import * as THREE from "three";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ======================================================================= liquid pour
export type PourOpts = {
  from: THREE.Vector3;          // pipe mouth centre
  dir: THREE.Vector3;           // pipe axis (unit-ish), the liquid leaves along it
  speed: number;                // exit speed m/s (gravity-fed pipe ~0.6-1.5, pumped 2-4)
  radius: number;               // stream radius at the mouth (m), <= pipe inner radius
  surfaceY: number;             // where it lands (water / floor height)
  liquid: THREE.Material;       // stream + crown material (oil: near-black glossy; water: pale; grease: amber)
  foam?: THREE.Material;        // splash droplets + ripple rings (lighter tone of the liquid)
  slick?: THREE.Material;       // the spreading pool on the surface (transparent, depthWrite false is fine: it is flat)
  slickMax?: number;            // final slick radius (m)
};
export class Pour {
  group = new THREE.Group();
  private stream: THREE.Mesh; private crown: THREE.Mesh; private drops: THREE.InstancedMesh; private rings: THREE.Mesh[] = [];
  private slick?: THREE.Mesh; private o: PourOpts; private m4 = new THREE.Matrix4();
  constructor(o: PourOpts) {
    this.o = o;
    this.stream = new THREE.Mesh(new THREE.BufferGeometry(), o.liquid);
    this.crown = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.6, 1, 20, 1, true), o.liquid);
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), o.foam ?? o.liquid, 24);
    for (let i = 0; i < 3; i++) { // each ripple fades and thins as it spreads (own material copy for its opacity)
      const mat = ((o.foam ?? o.liquid) as THREE.MeshLambertMaterial).clone(); mat.transparent = true; mat.depthWrite = false;
      const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2), mat); this.rings.push(r); this.group.add(r);
    }
    if (o.slick) { this.slick = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), o.slick); this.group.add(this.slick); }
    this.group.add(this.stream, this.crown, this.drops);
    this.stream.frustumCulled = false;
  }
  /** ballistic point at time s after leaving the mouth */
  private at(s: number, d: THREE.Vector3) { const v = d.clone().multiplyScalar(this.o.speed); return this.o.from.clone().addScaledVector(v, s).add(V(0, -4.905 * s * s, 0)); }
  /** t = seconds since the pour started (<0: nothing). flow 0..1 scales the stream (start / stop). */
  update(t: number, flow = 1) {
    const o = this.o, d = o.dir.clone().normalize(), vis = t > 0 && flow > 0.01;
    this.group.visible = vis || (!!this.slick && t > 0);
    if (t <= 0) return;
    // time to reach the surface: y0 + vy s - g/2 s^2 = surfaceY
    const vy = d.y * o.speed, dy = o.from.y - o.surfaceY, T = (vy + Math.sqrt(vy * vy + 2 * 9.81 * dy)) / 9.81;
    const head = Math.min(T, t);                          // the stream front falls in during the first T seconds
    const N = 40, R = 10, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * head, c = this.at(s, d);
      const vel = d.clone().multiplyScalar(o.speed).add(V(0, -9.81 * s, 0)), sp = vel.length();
      const tng = vel.clone().normalize(), side = Math.abs(tng.y) > 0.95 ? V(1, 0, 0) : tng.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(tng).normalize();
      // continuity: area * speed = const -> r ~ sqrt(v0 / v); wobble grows with fall; the front is rounded
      const wob = 1 + 0.05 * Math.sin(s * 40 - t * 22) * Math.min(1, s * 4) + 0.025 * Math.sin(s * 71 - t * 37); // gentle surface ripple
      const front = i === N && head < T ? 0.4 : 1;
      const r = o.radius * flow * Math.sqrt(o.speed / Math.max(o.speed, sp)) * wob * front;
      for (let j = 0; j < R; j++) { const a = (j / R) * Math.PI * 2; pos.push(...c.clone().addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).toArray()); }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, e = b + R; idx.push(a, c, b, b, c, e); }
    const g = this.stream.geometry; g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.attributes.position.needsUpdate = true;
    this.stream.visible = vis;
    // impact: crown splash (a short flared cylinder that pulses), droplets on ballistic hops, rings, slick
    const hit = this.at(T, d), on = t > T && vis, ph = t * 9;
    this.crown.visible = on;
    if (on) { const k = o.radius * flow * (2.2 + 0.4 * Math.sin(ph)); this.crown.position.set(hit.x, o.surfaceY + k * 0.35, hit.z); this.crown.scale.set(k, k * 0.7, k); }
    for (let i = 0; i < 24; i++) {
      const life = 0.35 + 0.25 * hash(i, 1), age = ((t - T) + hash(i, 2) * life) % life, a = hash(i, 3) * Math.PI * 2, v0 = 0.6 + 0.9 * hash(i, 4);
      const x = hit.x + Math.cos(a) * v0 * 0.5 * age, z = hit.z + Math.sin(a) * v0 * 0.5 * age, y = o.surfaceY + v0 * 1.2 * age - 4.905 * age * age;
      const sz = on && y > o.surfaceY ? o.radius * (0.25 + 0.2 * hash(i, 5)) * flow : 0;
      this.m4.compose(V(x, y, z), new THREE.Quaternion(), V(sz, sz, sz)); this.drops.setMatrixAt(i, this.m4);
    }
    this.drops.instanceMatrix.needsUpdate = true;
    this.rings.forEach((r, i) => { const u = ((t - T) * 0.9 + i / 3) % 1, k = (0.05 + 0.9 * u) * (o.slickMax ?? 1.5) * 0.6; r.visible = on; r.position.set(hit.x, o.surfaceY + 0.004, hit.z); r.scale.setScalar(k); r.visible = on && u < 0.95; (r.material as THREE.MeshLambertMaterial).opacity = 0.7 * (1 - u) * (1 - u); });
    if (this.slick) { const k = (o.slickMax ?? 1.5) * Math.sqrt(sm((t - T) / 6)) + 0.001; this.slick.position.set(hit.x, o.surfaceY + 0.002, hit.z); this.slick.scale.setScalar(k); }
  }
}

// ======================================================================= vehicles
type Mats = { body: THREE.Material; glass: THREE.Material; trim: THREE.Material; tyre: THREE.Material; hub: THREE.Material; light: THREE.Material; seat: THREE.Material; interior: THREE.Material };
/** side profile (x along the vehicle, y up) extruded across the width with rounded bevel edges */
const profileBody = (pts: [number, number][], width: number, bevel: number, mat: THREE.Material) => {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
};
const wheel = (r: number, w: number, m: Mats) => {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, r * 0.24, 10, 28), m.tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w * 0.8, 20).rotateX(Math.PI / 2), m.hub);
  for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.85, w * 0.82), m.trim); s.rotation.z = (k / 5) * Math.PI; hub.add(s); } // spokes: show the spin
  g.add(tyre, hub); g.userData.r = r;
  return g;
};
export type Vehicle = { root: THREE.Group; body: THREE.Group; wheels: THREE.Group[]; seats: { driver: THREE.Vector3; rows: THREE.Vector3[] }; wheelR: number; length: number };
/** a car to real dimensions (default family saloon 4.5 x 1.8 x 1.45 m). Front at +x. Seat anchors are hip points:
 *  put a seated character card there (sit mode, scale 1) so the head ends ~1.2 m up and the hands reach the wheel. */
export const car = (m: Mats, o: { L?: number; W?: number; H?: number } = {}): Vehicle => {
  const L = o.L ?? 4.5, Wd = o.W ?? 1.8, H = o.H ?? 1.45, h0 = 0.18, root = new THREE.Group(), body = new THREE.Group();
  const x0 = -L / 2, x1 = L / 2;
  // lower body with wheel-arch cut-outs (profile with arches), bonnet slope, boot
  const ar = 0.36, wb = 2.7, xf = wb / 2, xr = -wb / 2;
  const arch = (cx: number) => { const p: [number, number][] = []; for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI; p.push([cx + Math.cos(a) * (ar + 0.06), h0 + 0.12 + Math.sin(a) * (ar + 0.06)]); } return p; };
  // nose: bumper line at +0.35, sloped front up to a bonnet edge 0.15 m back, bonnet rising toward the windscreen
  const lower: [number, number][] = [[x0 + 0.1, h0 + 0.12], ...arch(xr), [x1 - 0.15, h0 + 0.12], [x1, h0 + 0.3], [x1 - 0.02, h0 + 0.45], [x1 - 0.18, h0 + 0.66], [x1 - 0.9, h0 + 0.8], [x0 + 0.35, h0 + 0.84], [x0, h0 + 0.62]];
  // insert the front arch in order
  const li = lower.findIndex((p) => p[0] === x1 - 0.15); lower.splice(li, 0, ...arch(xf));
  body.add(profileBody(lower, Wd, 0.08, m.body));
  // cabin: pillars + roof + glass (raked windscreen, rounded roof line)
  const yb = h0 + 0.82, yt = H, xa = x1 - 1.55, xb = x0 + 1.0;
  const roof = profileBody([[xa - 0.35, yt - 0.02], [xb + 0.25, yt - 0.02], [xb + 0.3, yt], [xa - 0.4, yt]], Wd - 0.12, 0.05, m.body); body.add(roof);
  const pillar = (xA: number, xB: number) => { const p = profileBody([[xA, yb], [xA + 0.08, yb], [xB + 0.08, yt], [xB, yt]], Wd - 0.1, 0.03, m.body); body.add(p); };
  pillar(xa, xa - 0.4); pillar((xa + xb) / 2 - 0.05, (xa + xb) / 2 - 0.05); pillar(xb + 0.3, xb + 0.25);
  const pane = (pts: [number, number][], z: number) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ShapeGeometry(s); g.translate(0, 0, z); return new THREE.Mesh(g, m.glass); };
  for (const z of [Wd / 2 - 0.07, -(Wd / 2 - 0.07)]) { body.add(pane([[xa - 0.05, yb + 0.03], [(xa + xb) / 2, yb + 0.03], [(xa + xb) / 2, yt - 0.05], [xa - 0.37, yt - 0.05]], z)); body.add(pane([[(xa + xb) / 2 - 0.1, yb + 0.03], [xb + 0.33, yb + 0.03], [xb + 0.28, yt - 0.05], [(xa + xb) / 2 - 0.1, yt - 0.05]], z)); }
  const wsg = new THREE.PlaneGeometry(Wd - 0.2, Math.hypot(0.4, yt - yb)).rotateY(Math.PI / 2).rotateZ(Math.atan2(0.4, yt - yb));
  const ws = new THREE.Mesh(wsg, m.glass); ws.position.set(xa - 0.2, (yb + yt) / 2, 0); body.add(ws); // raked windscreen
  // grille between the headlights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, Wd * 0.45), m.trim); grille.position.set(x1 - 0.06, h0 + 0.42, 0); grille.rotation.z = 0.35; body.add(grille);
  // lights, bumpers, mirrors, plates (no text)
  for (const z of [Wd / 2 - 0.3, -(Wd / 2 - 0.3)]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8).scale(0.4, 0.7, 1.3), m.light); hl.position.set(x1 - 0.02, h0 + 0.55, z); body.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.28), m.trim); tl.position.set(x0 + 0.01, h0 + 0.58, z); body.add(tl);
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.16), m.body); mir.position.set(xa - 0.05, yb + 0.12, Math.sign(z) * (Wd / 2 + 0.07)); body.add(mir);
  }
  for (const x of [x1 + 0.03, x0 - 0.03]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, Wd - 0.05), m.trim); b.position.set(x, h0 + 0.24, 0); body.add(b); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.5), m.light); pl.position.set(x + Math.sign(x) * 0.05, h0 + 0.24, 0); body.add(pl); }
  // interior: floor, dashboard, steering wheel, two seat rows (seat cushion + back + headrest)
  const fl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, Wd - 0.2), m.interior); fl.position.set(-0.2, h0 + 0.25, 0); body.add(fl);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, Wd - 0.2), m.interior); dash.position.set(xa - 0.05, yb - 0.02, 0); body.add(dash);
  const seat = (x: number, z: number) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), m.seat); c.position.y = h0 + 0.42; const bk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.5), m.seat); bk.position.set(-0.25, h0 + 0.78, 0); bk.rotation.z = 0.18; const hr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.28), m.seat); hr.position.set(-0.33, h0 + 1.16, 0); g.add(c, bk, hr); g.position.set(x, 0, z); body.add(g); };
  const zd = 0.38, xd = xa - 0.75; // right-hand drive (UK): driver on the +z side when the car faces +x; flip zd for LHD
  seat(xd, zd); seat(xd, -zd); seat(xd - 1.0, zd); seat(xd - 1.0, -zd);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), m.trim); sw.position.set(xa - 0.33, yb + 0.12, zd); sw.rotation.set(0, Math.PI / 2, 0.45); body.add(sw);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), m.trim); col.position.set(xa - 0.22, yb + 0.02, zd); col.rotation.z = 1.1; body.add(col);
  // wheels in the arches
  const wheels: THREE.Group[] = [];
  for (const x of [xf, xr]) for (const s of [1, -1]) { const w = wheel(ar, 0.22, m); w.position.set(x, h0 + 0.12 + 0.0, s * (Wd / 2 - 0.12)); w.position.y = ar; wheels.push(w); root.add(w); }
  root.add(body);
  body.traverse((x) => { const mm = x as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  return { root, body, wheels, wheelR: ar, length: L, seats: { driver: V(xd + 0.05, h0 + 0.48, zd), rows: [V(xd + 0.05, h0 + 0.48, -zd), V(xd - 0.95, h0 + 0.48, zd), V(xd - 0.95, h0 + 0.48, -zd)] } };
};
/** a London-style double-decker to real dimensions (11.2 x 2.55 x 4.4 m), front at +x, rounded corners, two decks of
 *  window panes on pillars, entrance doors, cab with steering wheel, lower + upper deck seat rows, grab poles. */
export const bus = (m: Mats): Vehicle => {
  const L = 11.2, Wd = 2.55, H = 4.4, root = new THREE.Group(), body = new THREE.Group(), x0 = -L / 2, x1 = L / 2, r = 0.25;
  const outline: [number, number][] = []; // rounded rectangle side profile with a slight front rake
  const corners: [number, number, number][] = [[x1 - r - 0.15, H - r, 0], [x0 + r, H - r, 90], [x0 + r, 0.35 + r, 180], [x1 - r, 0.35 + r, 270]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= 6; i++) { const a = ((a0 + (i / 6) * 90) * Math.PI) / 180; outline.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  outline.reverse();
  const shell = profileBody(outline, Wd, 0.12, m.body); body.add(shell);
  // window bands: separate panes with pillars (glass slightly proud of the body, pillars body-coloured)
  const deck = (y0: number, y1: number, n: number, xs: number, xe: number) => {
    const pw = (xe - xs) / n;
    for (let i = 0; i < n; i++) for (const z of [Wd / 2 + 0.005, -(Wd / 2 + 0.005)]) {
      const g = new THREE.PlaneGeometry(pw - 0.12, y1 - y0); if (z < 0) g.rotateY(Math.PI);
      const p = new THREE.Mesh(g, m.glass); p.position.set(xs + pw * (i + 0.5), (y0 + y1) / 2, z); body.add(p);
    }
  };
  deck(1.25, 2.15, 6, x0 + 0.5, x1 - 1.9); deck(2.75, 3.75, 7, x0 + 0.4, x1 - 0.35);
  const wsc = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.35, 1.0).rotateY(Math.PI / 2), m.glass); wsc.position.set(x1 + 0.005, 1.65, 0); body.add(wsc);
  const wsu = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.35, 0.95).rotateY(Math.PI / 2), m.glass); wsu.position.set(x1 - 0.14, 3.25, 0); body.add(wsu);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.85), m.glass); door.position.set(x1 - 1.35, 1.35, Wd / 2 + 0.006); body.add(door);
  const band = new THREE.Mesh(new THREE.BoxGeometry(L - 0.3, 0.12, Wd + 0.02), m.trim); band.position.set(0, 2.42, 0); body.add(band);
  for (const z of [0.85, -0.85]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8).scale(0.4, 1, 1), m.light); hl.position.set(x1 + 0.02, 0.85, z); body.add(hl); }
  const blind = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.4), m.trim); blind.position.set(x1 - 0.12, 3.95, 0); body.add(blind);
  // interior: floors, seat pairs both sides of an aisle, grab poles, cab with wheel
  const floor = (y: number) => { const f = new THREE.Mesh(new THREE.BoxGeometry(L - 0.6, 0.05, Wd - 0.3), m.interior); f.position.set(0, y, 0); body.add(f); };
  floor(0.55); floor(2.45);
  const seatsLower: THREE.Vector3[] = [], seatsUpper: THREE.Vector3[] = [];
  const seatRow = (x: number, y: number, z: number, out: THREE.Vector3[]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.85), m.seat); c.position.set(x, y + 0.45, z); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.85), m.seat); bk.position.set(x - 0.22, y + 0.78, z); body.add(c, bk); out.push(V(x + 0.02, y + 0.5, z - 0.2), V(x + 0.02, y + 0.5, z + 0.2)); };
  for (let i = 0; i < 6; i++) for (const z of [0.68, -0.68]) seatRow(x0 + 0.9 + i * 0.85, 0.55, z, seatsLower);
  for (let i = 0; i < 9; i++) for (const z of [0.68, -0.68]) seatRow(x0 + 0.8 + i * 0.95, 2.45, z, seatsUpper);
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.85, 8), m.light); p.position.set(x0 + 1.3 + i * 1.7, 1.5, 0.22); body.add(p); }
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 24), m.trim); sw.position.set(x1 - 0.85, 1.55, 0.7); sw.rotation.set(0, Math.PI / 2, 0.6); body.add(sw);
  const dseat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), m.seat); dseat.position.set(x1 - 1.45, 1.05, 0.7); body.add(dseat);
  const wheels: THREE.Group[] = [];
  for (const x of [x1 - 2.2, x0 + 2.6]) for (const s of [1, -1]) { const w = wheel(0.5, 0.3, m); w.position.set(x, 0.5, s * (Wd / 2 - 0.18)); wheels.push(w); root.add(w); }
  root.add(body);
  body.traverse((x) => { const mm = x as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  return { root, body, wheels, wheelR: 0.5, length: L, seats: { driver: V(x1 - 1.45, 1.11, 0.7), rows: [...seatsLower, ...seatsUpper] } };
};
/** pose a moving vehicle: wheels spin from distance travelled, body bobs on its suspension and pitches with
 *  acceleration (a = d2x/dt2, sampled by the caller), a tiny road-roughness shake. dist in metres. */
export const drive = (v: Vehicle, dist: number, t: number, accel = 0, rough = 1) => {
  for (const w of v.wheels) w.rotation.z = -dist / v.wheelR;
  v.body.position.y = 0.012 * rough * Math.sin(t * 11.3) + 0.008 * rough * Math.sin(t * 17.9 + 1.2);
  v.body.rotation.z = THREE.MathUtils.clamp(-accel * 0.006, -0.03, 0.03) + 0.003 * rough * Math.sin(t * 7.1);
  v.body.rotation.x = 0.002 * rough * Math.sin(t * 9.4);
};
// Rules for occupants (the "person inside a bus/car doesn't feel real" feedback):
//  - characters SIT on a seat anchor (mode "sit"), never stand in a cut-out box; scale 1 (adult 1.7 m)
//  - the driver's hands go to the wheel (prop "wheel" pose: both arms forward) and the head is ~0.1 m under the roof
//  - the camera sees them THROUGH glass (glass tint + a soft diagonal reflection stripe), framed by pillars
//  - other passengers fill some seats; the interior is lit; the vehicle moves (drive()) whenever the story says so

// ======================================================================= wind
export const WIND = { time: { value: 0 }, strength: { value: 1 }, dir: { value: new THREE.Vector2(1, 0.3).normalize() } };
/** patch a material so its vertices sway in the wind: bend grows with height above the object's base (local y,
 *  0..hRef), a gust front travels across the world, plus a fast flutter. Set WIND.time.value = t every frame. */
export function windSway<T extends THREE.Material>(mat: T, hRef = 1, amp = 0.25, flutter = 0.03): T {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, { wTime: WIND.time, wStr: WIND.strength, wDir: WIND.dir });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float wTime; uniform float wStr; uniform vec2 wDir;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif
        float h = clamp(position.y / ${hRef.toFixed(3)}, 0.0, 1.0);
        float bend = h * h;                                                   // stiff base, flexible tip
        float phase = dot(wp.xz, wDir) * 0.35 - wTime * 1.6;                  // gust front travelling downwind
        float gust = 0.55 + 0.45 * sin(phase) * sin(phase * 0.37 + 1.3);
        float flick = sin(wTime * 9.0 + wp.x * 3.1 + wp.z * 2.3) * ${flutter.toFixed(3)};
        vec2 off = wDir * (${amp.toFixed(3)} * gust * wStr) * bend + vec2(flick, flick * 0.6) * h;
        transformed.x += off.x; transformed.z += off.y;
        transformed.y -= 0.35 * dot(off, off) / max(${hRef.toFixed(3)}, 0.001) * bend; // keep the blade length
      }`);
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : "") + `|wind${hRef}_${amp}_${flutter}`;
  return mat;
}
/** real grass: n tapered, slightly curved blades (instanced), random height / lean / colour, swaying in the wind */
export const grassField = (n: number, area: { x0: number; x1: number; z0: number; z1: number; y?: number }, mat: THREE.MeshLambertMaterial, h = 0.35) => {
  const blade = new THREE.BufferGeometry(), segs = 4, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) { const v = i / segs, w = 0.012 * (1 - v * 0.9), bend = 0.08 * v * v; pos.push(-w, v, bend, w, v, bend); }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  blade.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); blade.setIndex(idx); blade.computeVertexNormals();
  const im = new THREE.InstancedMesh(blade, windSway(mat, 1, 0.22, 0.04), n), m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = area.x0 + (area.x1 - area.x0) * hash(i, 1), z = area.z0 + (area.z1 - area.z0) * hash(i, 2), s = h * (0.6 + 0.8 * hash(i, 3));
    m4.compose(V(x, area.y ?? 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15 * (hash(i, 4) - 0.5), hash(i, 5) * Math.PI * 2, 0.15 * (hash(i, 6) - 0.5))), V(1, s, 1));
    im.setMatrixAt(i, m4); im.setColorAt(i, c.setHSL(0.27 + 0.05 * hash(i, 7), 0.5, 0.32 + 0.14 * hash(i, 8)));
  }
  im.receiveShadow = true;
  return im; // put on NOINK: thousands of blades would be a mess of ink lines (the ground is never inked anyway)
};
