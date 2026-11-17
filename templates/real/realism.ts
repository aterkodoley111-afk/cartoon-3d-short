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
/** integer hash -> [0, 1) (murmur-style mix): no lattice / row patterns for thousands of sequential instances
 *  (a sin()-based hash put the grass blades into visible stripes) */
const hash = (i: number, s = 0) => { let h = (Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };

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
type Mats = { body: THREE.Material; glass: THREE.Material; trim: THREE.Material; tyre: THREE.Material; hub: THREE.Material; light: THREE.Material; seat: THREE.Material; interior: THREE.Material;
  side?: THREE.Material; blur?: THREE.Material; gauge?: THREE.Material; chrome?: THREE.Material; lens?: THREE.Material; tail?: THREE.Material; plateF?: THREE.Material; plateR?: THREE.Material; rubber?: THREE.Material; amber?: THREE.Material };

// ---------------- painted textures for real-looking cars (deterministic canvases) ----------------
const ctx = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
/** car glass: dark tint toward the bottom, sky reflection toward the top, two soft diagonal reflection streaks */
export const glassTex = () => ctx(256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#b8d0e6"); gr.addColorStop(0.35, "#7f9ab4"); gr.addColorStop(1, "#56708a"); // light tint: occupants must read
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.save(); g.rotate(-0.5);
  for (const [x, w, a] of [[40, 34, 0.32], [110, 12, 0.22], [150, 50, 0.12]] as const) { const s = g.createLinearGradient(x, 0, x + w, 0); s.addColorStop(0, "rgba(255,255,255,0)"); s.addColorStop(0.5, `rgba(255,255,255,${a})`); s.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = s; g.fillRect(x, -100, w, 600); }
  g.restore();
});
/** tyre tread: chevron blocks + a centre rib + sipes around the circumference (u) - shows the roll when it turns */
export const tyreTex = () => ctx(1024, 128, (g) => {
  g.fillStyle = "#232227"; g.fillRect(0, 0, 1024, 128);
  for (let x = 0; x < 1024; x += 32) {
    g.fillStyle = "#121115";
    g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 12, 8); g.lineTo(x + 22, 52); g.lineTo(x + 10, 52); g.fill();           // chevron groove
    g.beginPath(); g.moveTo(x + 10, 76); g.lineTo(x + 22, 76); g.lineTo(x + 12, 120); g.lineTo(x, 120); g.fill();
    g.fillStyle = "#3a383f"; g.fillRect(x + 24, 14, 3, 32); g.fillRect(x + 24, 82, 3, 32);                             // sipes catch light
  }
  g.fillStyle = "#151418"; g.fillRect(0, 58, 1024, 12);                                                                  // centre groove
});
/** tyre sidewall: rubber with raised marks and a lighter rim band (no lettering) - the marks show the spin */
export const sideTex = () => ctx(1024, 64, (g) => {
  g.fillStyle = "#1f1e22"; g.fillRect(0, 0, 1024, 64);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "#33313a"; g.fillRect(x + 10, 20, 28, 6); g.fillRect(x + 44, 20, 8, 6); }
  g.fillStyle = "#2b2a30"; g.fillRect(0, 50, 1024, 6);
});
/** motion-blurred wheel face for fast spin (radial streak gradient), alpha 0 at the centre cap */
export const blurTex = () => ctx(256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 18, 128, 128, 128);
  gr.addColorStop(0, "rgba(200,205,212,0.0)"); gr.addColorStop(0.18, "rgba(200,205,212,0.9)"); gr.addColorStop(0.75, "rgba(150,156,164,0.85)"); gr.addColorStop(0.9, "rgba(210,214,220,0.95)"); gr.addColorStop(1, "rgba(30,30,34,0.0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let a = 0; a < 360; a += 4) { g.strokeStyle = `rgba(255,255,255,${0.05 + 0.08 * ((a * 7) % 3)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(128, 128, 30 + (a % 90), (a * Math.PI) / 180, ((a + 40) * Math.PI) / 180); g.stroke(); }
});
/** UK number plates: white front / yellow rear, black border band, no lettering (no text in the video) */
export const plateTex = (rear: boolean) => ctx(256, 56, (g) => {
  g.fillStyle = rear ? "#f2c80f" : "#f4f4ef"; g.fillRect(0, 0, 256, 56);
  g.fillStyle = "#2c4fa0"; g.fillRect(0, 0, 22, 56); g.strokeStyle = "#222"; g.lineWidth = 3; g.strokeRect(2, 2, 252, 52);
});
/** reflection environment (equirectangular): bright sky, glowing horizon, warm ground. Real paint, glass and chrome
 *  read as real mostly because they reflect their surroundings. Pass `golden` for sunset scenes. */
export const skyEnv = (golden = false) => { const t = ctx(512, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (golden) { gr.addColorStop(0, "#6a5a8c"); gr.addColorStop(0.42, "#f2a57a"); gr.addColorStop(0.5, "#ffe0a8"); gr.addColorStop(0.53, "#7a6a5a"); gr.addColorStop(1, "#3a3230"); }
  else { gr.addColorStop(0, "#3f7fd2"); gr.addColorStop(0.42, "#b8d4f0"); gr.addColorStop(0.5, "#f4f8fc"); gr.addColorStop(0.53, "#8a8a84"); gr.addColorStop(1, "#4a4844"); }
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(hash(i, 91) * 512, 40 + 60 * hash(i, 92), 30 + 40 * hash(i, 93), 8 + 6 * hash(i, 94), 0, 0, 7); g.fill(); } // clouds
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(60,64,70,0.55)"; const x = hash(i, 95) * 512, w = 12 + 30 * hash(i, 96), h = 6 + 20 * hash(i, 97); g.fillRect(x, 128 - h, w, h); }           // skyline / trees band
}); t.mapping = THREE.EquirectangularReflectionMapping; return t; };
/** a ready set of car materials (Phong paint with a clear-coat highlight; wrap with twoTone() in the world) */
export const carMaterials = (paint: string, golden = false): Mats => {
  const env = skyEnv(golden);
  const P = (c: string, o: Partial<THREE.MeshPhongMaterialParameters> = {}) => new THREE.MeshPhongMaterial({ color: c, ...o });
  return {
    body: P(paint, { specular: "#ffffff", shininess: 70, envMap: env, combine: THREE.MixOperation, reflectivity: 0.18 }),
    glass: P("#ffffff", { map: glassTex(), transparent: true, opacity: 0.42, specular: "#ffffff", shininess: 120, side: THREE.DoubleSide, envMap: env, combine: THREE.MixOperation, reflectivity: 0.35 }),
    trim: P("#1d1c20", { specular: "#333", shininess: 20 }), rubber: P("#141316", { shininess: 5 }),
    tyre: P("#ffffff", { map: tyreTex(), shininess: 8 }), side: P("#ffffff", { map: sideTex(), shininess: 12 }),
    blur: new THREE.MeshBasicMaterial({ map: blurTex(), transparent: true, depthWrite: false, opacity: 0 }), hub: P("#c5cad1", { specular: "#ffffff", shininess: 90 }),
    chrome: P("#d9dde3", { specular: "#ffffff", shininess: 140, envMap: env, combine: THREE.MixOperation, reflectivity: 0.75 }),
    light: P("#fff6d8", { emissive: new THREE.Color("#fff1c0"), emissiveIntensity: 0.6, specular: "#fff", shininess: 120 }),
    lens: P("#ffffff", { transparent: true, opacity: 0.35, specular: "#ffffff", shininess: 150 }),
    tail: P("#c0121c", { emissive: new THREE.Color("#5a0008"), specular: "#ffb0b0", shininess: 90 }),
    amber: P("#f08a1c", { emissive: new THREE.Color("#3a1a00"), shininess: 90 }),
    plateF: P("#ffffff", { map: plateTex(false) }), plateR: P("#ffffff", { map: plateTex(true) }),
    seat: P("#3a3f4a", { shininess: 10 }), interior: P("#2e2c30", { shininess: 10 }),
    gauge: P("#101014", { emissive: new THREE.Color("#7fd0ff"), emissiveIntensity: 0.5 }),
  };
};
/** side profile (x along the vehicle, y up) extruded across the width with rounded bevel edges */
/** NOTE: the bevel grows the outline by `bevel` on every side: the real surface is `bevel` outside the points. Place
 *  anything that sits on the surface (lamps, plates, grilles) with that offset along the surface normal. */
const profileBody = (pts: [number, number][], width: number, bevel: number, mat: THREE.Material) => {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 16 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
};
/** rounded-rectangle shape (for lamps, windows, plates) */
const rrShape = (w: number, h: number, r: number) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
/** a lamp unit facing +x: rubber/chrome housing, inner reflector bowl, bulb, clear domed lens (headlight) or
 *  red segmented lens (tail light). w x h in metres. */
const lamp = (w: number, h: number, kind: "head" | "tail", m: Mats) => {
  const g = new THREE.Group(), face = (geo: THREE.BufferGeometry) => geo.rotateY(Math.PI / 2);
  const housing = new THREE.Mesh(face(new THREE.ExtrudeGeometry(rrShape(w, h, Math.min(w, h) * 0.35), { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 })), m.chrome ?? m.trim);
  housing.position.x = -0.04; g.add(housing);
  if (kind === "head") {
    const refl = new THREE.Mesh(face(new THREE.ShapeGeometry(rrShape(w * 0.88, h * 0.82, Math.min(w, h) * 0.3))), m.hub); refl.position.x = 0.012; g.add(refl);
    for (const dz of [-w * 0.22, w * 0.22]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(h * 0.26, 16, 12), m.light); bulb.position.set(0.02, 0, dz); g.add(bulb); const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.32, h * 0.04, 8, 24).rotateY(Math.PI / 2), m.chrome ?? m.hub); ring.position.set(0.018, 0, dz); g.add(ring); }
    const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, 0.5).rotateZ(-Math.PI / 2).scale(0.04 / (1 - Math.cos(0.5)), h / 2 / Math.sin(0.5), w / 2 / Math.sin(0.5)), m.lens ?? m.glass);
    lens.position.x = 0.012 - 0.04 * Math.cos(0.5) / (1 - Math.cos(0.5)); g.add(lens);
    const ind = new THREE.Mesh(face(new THREE.ShapeGeometry(rrShape(w * 0.22, h * 0.5, h * 0.12))), m.amber ?? m.light); ind.position.set(0.03, 0, w / 2 + w * 0.14); g.add(ind);
  } else {
    const red = new THREE.Mesh(face(new THREE.ShapeGeometry(rrShape(w * 0.92, h * 0.86, Math.min(w, h) * 0.3))), m.tail ?? m.trim); red.position.x = 0.012; g.add(red);
    for (let i = -1; i <= 1; i++) { const seg = new THREE.Mesh(face(new THREE.PlaneGeometry(w * 0.22, h * 0.5)), m.lens ?? m.glass); seg.position.set(0.016, 0, i * w * 0.28); g.add(seg); }
  }
  return g;
};
const wheel = (r: number, w: number, m: Mats) => {
  const g = new THREE.Group();
  // tyre: tread band (textured cylinder) + rounded sidewalls (torus) ; alloy: rim lip, 5 twin spokes, centre cap, nuts
  const tg = new THREE.CylinderGeometry(r, r, w * 0.8, 48, 1, true).rotateX(Math.PI / 2); const tuv = tg.attributes.uv; for (let i = 0; i < tuv.count; i++) tuv.setX(i, tuv.getX(i) * 3); // 3 tread repeats round
  const tm = (m.tyre as THREE.MeshPhongMaterial).map; if (tm) { tm.wrapS = THREE.RepeatWrapping; }
  const tread = new THREE.Mesh(tg, m.tyre); g.add(tread);
  for (const s of [1, -1]) { const side = new THREE.Mesh(new THREE.TorusGeometry(r * 0.83, r * 0.17, 12, 48), m.side ?? m.rubber ?? m.tyre); side.position.z = s * w * 0.36; g.add(side); }
  if (m.blur) for (const s of [1, -1]) { const bd = new THREE.Mesh(new THREE.CircleGeometry(r * 0.66, 32), m.blur.clone()); bd.position.z = s * w * 0.44; if (s < 0) bd.rotation.y = Math.PI; bd.name = "blur"; g.add(bd); }
  const hub = new THREE.Group(); g.add(hub);
  for (const s of [1, -1]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.64, r * 0.045, 8, 36), m.chrome ?? m.hub); lip.position.z = s * w * 0.42; hub.add(lip);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.62, 32), m.trim); disc.position.z = s * w * 0.3; if (s < 0) disc.rotation.y = Math.PI; hub.add(disc);
    for (let k = 0; k < 5; k++) for (const off of [-0.09, 0.09]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.09, r * 0.56, 0.03), m.hub); const a = (k / 5) * Math.PI * 2 + off;
      sp.position.set(Math.sin(a) * r * 0.33, Math.cos(a) * r * 0.33, s * w * 0.38); sp.rotation.z = -a; hub.add(sp);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.15, 0.03, 20).rotateX(Math.PI / 2), m.chrome ?? m.hub); cap.position.z = s * w * 0.42; hub.add(cap);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.6, n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6).rotateX(Math.PI / 2), m.trim); n.position.set(Math.sin(a) * r * 0.2, Math.cos(a) * r * 0.2, s * w * 0.42); hub.add(n); }
  }
  g.userData.r = r;
  return g;
};
export type Vehicle = { root: THREE.Group; body: THREE.Group; wheels: THREE.Group[]; seats: { driver: THREE.Vector3; rows: THREE.Vector3[] }; wheelR: number; length: number;
  /** the 3D steering wheel (hide it when a driver card holds its own drawn wheel); front wheels for steer() */
  steering?: THREE.Object3D; front?: THREE.Group[] };
/** soft contact shadow under a vehicle (real cars sit on a dark pool, darkest right under the sills) */
const contactShadow = (L: number, W: number) => {
  const t = ctx(128, 64, (g) => { const gr = g.createRadialGradient(64, 32, 4, 64, 32, 64); gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.6, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.12, W * 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.position.y = 0.006; m.renderOrder = -1; return m;
};
/** world position of a seat on a (moving, bouncing) vehicle: place the occupant card here every frame.
 *  Card placement that reads like a real person in a car: sole at seat.y + 0.04, scale ~0.7, cabin H 1.52 (the cartoon head is big),
 *  so the shoulders sit just above the window line and the head clears the roof by ~5 cm. */
export const seatWorld = (v: Vehicle, seat: THREE.Vector3) => { v.root.updateMatrixWorld(true); return v.body.localToWorld(seat.clone()); };
/** steer: front wheels yaw and the steering wheel turns (~15:1 ratio); pass the same angle to the driver card's `steer` */
export const steer = (v: Vehicle, angle: number) => { for (const w of v.front ?? []) w.rotation.y = angle; if (v.steering) v.steering.rotation.x = angle * 15 * 0.06; };
/** a car to real dimensions (default family saloon 4.5 x 1.8 x 1.45 m, UK right-hand drive). Front at +x.
 *  Seat anchors are hip points: put a seated character card there (sit mode, scale 1): head ~1.2 m up, hands on the wheel. */
export const car = (m: Mats, o: { L?: number; W?: number; H?: number } = {}): Vehicle => {
  const L = o.L ?? 4.5, Wd = o.W ?? 1.8, H = o.H ?? 1.52, h0 = 0.18, root = new THREE.Group(), body = new THREE.Group();
  const x0 = -L / 2, x1 = L / 2, ar = 0.33, wb = 2.7, xf = wb / 2, xr = -wb / 2, belt = h0 + 0.8;
  // ---- lower body: wheel-arch cut-outs, sloped nose, bonnet rising to the scuttle, boot lid, rear valance
  const arch = (cx: number) => { const p: [number, number][] = []; for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; p.push([cx + Math.cos(a) * (ar + 0.16), h0 + 0.14 + Math.sin(a) * (ar + 0.16)]); } return p; }; // +0.09 bevel -> 7 cm clearance
  const lower: [number, number][] = [[x0 + 0.12, h0 + 0.14], ...arch(xr), ...arch(xf), [x1 - 0.12, h0 + 0.14], [x1, h0 + 0.3], [x1 + 0.01, h0 + 0.45], [x1 - 0.12, h0 + 0.64], [x1 - 0.95, belt - 0.02], [x0 + 0.45, belt], [x0 + 0.05, h0 + 0.7], [x0, h0 + 0.42], [x0 + 0.04, h0 + 0.22]];
  const shell = profileBody(lower, Wd, 0.09, m.body); body.add(shell);
  // ---- greenhouse: HOLLOW like a real car (roof on A/B/C pillars, glass between them), so the windscreen shows its
  // texture and reflections and the seats / driver are visible through the glass. (A solid cabin hid the screens.)
  const xa = x1 - 0.95, xc = x0 + 0.95, roof = H, hz = (Wd - 0.16) / 2, xm = (xa + xc) / 2 - 0.05, top = roof - 0.05;
  const roofP = profileBody([[xa - 0.62, top], [xc + 0.42, top], [xc + 0.36, roof - 0.01], [xa - 0.56, roof - 0.01]], Wd - 0.16, 0.03, m.body); body.add(roofP);
  const strut = (A: [number, number], B: [number, number], z: number, t: number, d = 0.06) => {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), s2 = new THREE.Mesh(new THREE.BoxGeometry(t, len, d), m.body);
    s2.position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, z); s2.rotation.z = -Math.atan2(B[0] - A[0], B[1] - A[1]); body.add(s2);
  };
  for (const z of [hz, -hz]) {
    strut([xa, belt], [xa - 0.6, top], z, 0.07);           // A pillar (along the windscreen edge)
    strut([xm, belt], [xm, top], z, 0.09);                 // B pillar
    strut([xc + 0.06, belt], [xc + 0.46, top], z, 0.16);   // C pillar (wide, like a saloon)
  }
  /** glass quad from 4 corners (bl, br, tr, tl) with the glass texture the right way up (sky at the top) */
  const glassQuad = (bl: THREE.Vector3, br: THREE.Vector3, tr: THREE.Vector3, tl: THREE.Vector3) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([bl, br, tr, bl, tr, tl].flatMap((v) => v.toArray()), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); g.computeVertexNormals();
    const q = new THREE.Mesh(g, m.glass); body.add(q); return q;
  };
  // windscreen (raked 46 deg) and rear screen, black rubber frame round both
  glassQuad(V(xa - 0.02, belt + 0.02, -hz + 0.03), V(xa - 0.02, belt + 0.02, hz - 0.03), V(xa - 0.58, top - 0.01, hz - 0.03), V(xa - 0.58, top - 0.01, -hz + 0.03));
  glassQuad(V(xc + 0.08, belt + 0.02, hz - 0.08), V(xc + 0.08, belt + 0.02, -hz + 0.08), V(xc + 0.44, top - 0.01, -hz + 0.08), V(xc + 0.44, top - 0.01, hz - 0.08));
  // side glass between the pillars, seals and chrome sill
  const zs = hz + 0.035;
  for (const z of [zs, -zs]) {
    const s1 = Math.sign(z), P = (x: number, y: number) => V(x, y, z);
    const f1 = glassQuad(P(xa - 0.06, belt + 0.03), P(xm + 0.05, belt + 0.03), P(xm + 0.05, top - 0.02), P(xa - 0.56, top - 0.02));
    const f2 = glassQuad(P(xm - 0.05, belt + 0.03), P(xc + 0.16, belt + 0.03), P(xc + 0.42, top - 0.02), P(xm - 0.05, top - 0.02));
    if (s1 < 0) for (const q of [f1, f2]) q.geometry.scale(1, 1, 1); // double-sided glass material: both sides read
    const sill = new THREE.Mesh(new THREE.BoxGeometry(xa - xc - 0.1, 0.02, 0.012), m.chrome ?? m.trim); sill.position.set((xa + xc) / 2, belt + 0.02, s1 * (zs + 0.006)); body.add(sill);
    const seal = new THREE.Mesh(new THREE.BoxGeometry(xa - xc - 0.2, 0.012, 0.01), m.rubber ?? m.trim); seal.position.set((xa + xc) / 2 + 0.05, top - 0.015, s1 * (zs + 0.004)); body.add(seal);
    // door shut lines (thin dark grooves), handles, side mirror (housing + glass + arm)
    for (const x of [xa + 0.05, xm, xc - 0.02]) { const ln = new THREE.Mesh(new THREE.BoxGeometry(0.008, belt - h0 - 0.2, 0.004), m.rubber ?? m.trim); ln.position.set(x, (belt + h0 + 0.2) / 2, s1 * (Wd / 2 + 0.002)); body.add(ln); }
    for (const x of [xm + 0.3, xc + 0.25]) { const hd = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.025), m.chrome ?? m.hub); hd.position.set(x, belt - 0.12, s1 * (Wd / 2 + 0.012)); body.add(hd); }
    const mh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10).scale(0.8, 0.7, 1.2), m.body); mh.position.set(xa - 0.12, belt + 0.1, s1 * (Wd / 2 + 0.09)); body.add(mh);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.12), m.trim); arm.position.set(xa - 0.08, belt + 0.06, s1 * (Wd / 2 + 0.02)); body.add(arm);
    const mg = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16).rotateY(-Math.PI / 2).scale(1, 0.8, 1.3), m.glass); mg.position.set(xa - 0.19, belt + 0.1, s1 * (Wd / 2 + 0.09)); body.add(mg);
    const rub = new THREE.Mesh(new THREE.BoxGeometry(L - 1.6, 0.05, 0.02), m.rubber ?? m.trim); rub.position.set(0, h0 + 0.42, s1 * (Wd / 2 + 0.005)); body.add(rub); // side rubbing strip
  }
  // interior trim you see through the glass: headliner under the roof, parcel shelf, door cards
  const head = new THREE.Mesh(new THREE.PlaneGeometry(xa - xc - 0.5, Wd - 0.3).rotateX(Math.PI / 2), m.interior); head.position.set((xa + xc) / 2 - 0.05, top - 0.01, 0); body.add(head);
  for (const z of [hz - 0.02, -hz + 0.02]) { const dc = new THREE.Mesh(new THREE.PlaneGeometry(xa - xc, 0.12).rotateY(z > 0 ? Math.PI : 0), m.interior); dc.position.set((xa + xc) / 2, belt + 0.05, z); body.add(dc); }
  for (const dz of [-0.35, 0.25]) { const wp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.55), m.trim); wp.position.set(xa - 0.06, belt + 0.03, dz); wp.rotation.x = 0.2; body.add(wp); }
  // ---- front: headlight units, grille with bars, bumper, plate, fog lamps; rear: tail lights, bumper, plate
  for (const s of [1, -1]) {
    // lamps sit ON the surface and follow its slope (nose rises 0.19 m over 0.13 m; tail panel leans 0.05 m)
    const hl = lamp(0.42, 0.17, "head", m); hl.position.set(x1 - 0.005 + 0.09 * Math.cos(0.55), h0 + 0.535 + 0.09 * Math.sin(0.55), s * (Wd / 2 - 0.38)); hl.rotation.z = 0.55; body.add(hl);
    const tl = lamp(0.36, 0.16, "tail", m); tl.rotation.set(0, Math.PI, 0.17); tl.position.set(x0 + 0.03 - 0.09 * Math.cos(0.17), h0 + 0.56 + 0.09 * Math.sin(0.17), s * (Wd / 2 - 0.34)); body.add(tl);
  }
  const grille = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(Wd * 0.38, 0.14, 0.04), { depth: 0.03, bevelEnabled: false }).rotateY(Math.PI / 2), m.trim); grille.position.set(x1 - 0.012 + 0.085, h0 + 0.42 + 0.02, 0); grille.rotation.z = 0.3; body.add(grille);
  for (let i = -2; i <= 2; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, Wd * 0.36), m.chrome ?? m.hub); bar.position.set(x1 + 0.11 - i * 0.008, h0 + 0.44 + i * 0.025, 0); body.add(bar); }
  for (const [x, plate] of [[x1 + 0.06, m.plateF], [x0 - 0.06, m.plateR]] as [number, THREE.Material | undefined][]) {
    const bmp = profileBody([[-0.06, 0], [0.06, 0], [0.06, 0.16], [-0.06, 0.16]], Wd + 0.02, 0.03, m.body); bmp.position.set(x - Math.sign(x) * 0.03, h0 + 0.14, 0); body.add(bmp);
    const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, Wd - 0.1), m.trim); lowerLip.position.set(x + Math.sign(x) * 0.02, h0 + 0.12, 0); body.add(lowerLip);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11).rotateY(Math.sign(x) * Math.PI / 2), plate ?? m.light); pl.position.set(x - Math.sign(x) * 0.03 + Math.sign(x) * 0.095, h0 + 0.22, 0); body.add(pl); // bumper face = centre + 0.06 + 0.03 bevel
  }
  // ---- interior: floor, dashboard with instrument binnacle, steering wheel on its column, seats with headrests
  const fl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, Wd - 0.2), m.interior); fl.position.set(-0.2, h0 + 0.25, 0); body.add(fl);
  const dash = profileBody([[0, 0], [0.42, 0], [0.42, 0.04], [0.12, 0.11], [0, 0.1]], Wd - 0.24, 0.02, m.interior); dash.position.set(xa - 0.5, belt - 0.1, 0); body.add(dash); // low dash: the driver's face shows through the windscreen
  const seat = (x: number, z: number) => { const g = new THREE.Group(); const c = profileBody([[-0.25, 0], [0.25, 0.02], [0.25, 0.12], [-0.25, 0.1]], 0.5, 0.04, m.seat); c.position.y = h0 + 0.36; const bk = profileBody([[-0.06, 0], [0.06, 0], [0.0, 0.62], [-0.12, 0.62]], 0.5, 0.05, m.seat); bk.position.set(-0.26, h0 + 0.46, 0); const hr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.27), m.seat); hr.position.set(-0.34, h0 + 1.16, 0); g.add(c, bk, hr); g.position.set(x, 0, z); body.add(g); };
  const zd = 0.38, xd = xa - 0.85;
  seat(xd, zd); seat(xd, -zd); seat(xd - 0.95, zd); seat(xd - 0.95, -zd);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 10, 32), m.trim); sw.position.set(xa - 0.42, belt + 0.12, zd); sw.rotation.set(0, Math.PI / 2, 0); sw.rotateX(0); sw.rotation.z = 0.45; body.add(sw);
  const hubw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16).rotateZ(Math.PI / 2 + 0.45), m.trim); hubw.position.copy(sw.position); body.add(hubw);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.38, 10), m.trim); col.position.set(xa - 0.28, belt + 0.03, zd); col.rotation.z = 1.12; body.add(col);
  // ---- interior details seen through the glass: rear-view mirror, sun visors, glowing gauges, gear lever, belts
  const rvm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.22), m.trim); rvm.position.set(xa - 0.5, top - 0.1, 0); body.add(rvm);
  const rvg = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05).rotateY(-Math.PI / 2), m.chrome ?? m.glass); rvg.position.set(xa - 0.52, top - 0.1, 0); body.add(rvg);
  for (const z of [zd, -zd]) { const vis = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.34), m.interior); vis.position.set(xa - 0.52, top - 0.04, z); vis.rotation.z = -0.3; body.add(vis); }
  for (const dz of [-0.07, 0.07]) { const gz = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20).rotateY(-Math.PI / 2), m.gauge ?? m.light); gz.position.set(xa - 0.35, belt + 0.07, zd + dz); gz.rotation.z = 0.5; body.add(gz); }
  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), m.chrome ?? m.trim); gear.position.set(xd + 0.25, h0 + 0.62, 0); gear.rotation.z = -0.2; body.add(gear);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), m.trim); knob.position.set(xd + 0.27, h0 + 0.73, 0); body.add(knob);
  for (const [x, z] of [[xd, zd], [xd, -zd], [xd - 0.95, zd], [xd - 0.95, -zd]]) { const bt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.05), m.trim); bt.position.set(x - 0.22, h0 + 0.85, z + Math.sign(z) * 0.2); bt.rotation.x = Math.sign(z) * 0.35; body.add(bt); } // belts on the pillars
  // exhaust tailpipe under the rear bumper
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 14, 1, true).rotateZ(Math.PI / 2), m.chrome ?? m.trim); ex.position.set(x0 - 0.02, h0 + 0.06, -Wd / 2 + 0.35); (ex.material as THREE.Material).side = THREE.DoubleSide; body.add(ex);
  // ---- wheels in the arches (tyre tops tuck ~6 cm into the arch, like a real car)
  const wheels: THREE.Group[] = [];
  for (const x of [xf, xr]) for (const s of [1, -1]) { const w = wheel(ar, 0.22, m); w.position.set(x, ar, s * (Wd / 2 - 0.13)); wheels.push(w); root.add(w); }
  // dark wheel-well liners so the arch openings read as cavities, not holes
  for (const x of [xf, xr]) { const well = new THREE.Mesh(new THREE.CylinderGeometry(ar + 0.06, ar + 0.06, Wd - 0.1, 24, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), m.rubber ?? m.trim); well.material = m.rubber ?? m.trim; well.position.set(x, h0 + 0.14, 0); (well.material as THREE.Material).side = THREE.DoubleSide; body.add(well); }
  root.add(body); root.add(contactShadow(L, Wd));
  body.traverse((x) => { const mm = x as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
  return { root, body, wheels, front: wheels.slice(0, 2), steering: sw, wheelR: ar, length: L, seats: { driver: V(xd + 0.05, h0 + 0.46, zd), rows: [V(xd + 0.05, h0 + 0.46, -zd), V(xd - 0.9, h0 + 0.46, zd), V(xd - 0.9, h0 + 0.46, -zd)] } };
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
  for (const z of [0.85, -0.85]) { const hl = lamp(0.32, 0.2, "head", m); hl.position.set(x1 + 0.04, 0.85, z); body.add(hl); const tl = lamp(0.18, 0.4, "tail", m); tl.rotation.y = Math.PI; tl.position.set(x0 - 0.04, 1.0, z * 1.25); body.add(tl); }
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
export const drive = (v: Vehicle, dist: number, t: number, accel = 0, rough = 1, speed = 0) => {
  // wheel spin from distance; above ~4 rad per frame-sample the spokes strobe, so a blurred disc fades in (like film)
  const dPerFrame = Math.abs(speed) / 30 / v.wheelR, blur = Math.max(0, Math.min(0.92, (dPerFrame - 0.15) / 0.35));
  for (const w of v.wheels) { w.rotation.z = -dist / v.wheelR; w.traverse((o) => { if (o.name === "blur") ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = blur; }); }
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
        float yLocal = position.y;
        #ifdef USE_INSTANCING
          yLocal = (instanceMatrix * vec4(position, 1.0)).y;            // leaves / blades: height of THIS instance
        #endif
        float h = clamp(yLocal / ${hRef.toFixed(3)}, 0.0, 1.0);
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
  const uvs: number[] = [];
  for (let i = 0; i <= segs; i++) { const v = i / segs, w = 0.012 * (1 - v * 0.9), bend = 0.08 * v * v; pos.push(-w, v, bend, w, v, bend); uvs.push(0, v, 1, v); }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  blade.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); blade.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); blade.setIndex(idx); blade.computeVertexNormals();
  if (!mat.map) { mat.map = bladeTex(); mat.color.set("#ffffff"); mat.side = THREE.DoubleSide; }
  const im = new THREE.InstancedMesh(blade, windSway(mat, h * 1.4, 0.12, 0.03), n), m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = area.x0 + (area.x1 - area.x0) * hash(i, 1), z = area.z0 + (area.z1 - area.z0) * hash(i, 2), s = h * (0.6 + 0.8 * hash(i, 3));
    m4.compose(V(x, area.y ?? 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15 * (hash(i, 4) - 0.5), hash(i, 5) * Math.PI * 2, 0.15 * (hash(i, 6) - 0.5))), V(1, s, 1));
    im.setMatrixAt(i, m4); im.setColorAt(i, c.setHSL(0.22 + 0.06 * hash(i, 7), 0.35, 0.72 + 0.28 * hash(i, 8))); // tint x blade texture
  }
  im.receiveShadow = true;
  return im; // put on NOINK: thousands of blades would be a mess of ink lines (the ground is never inked anyway)
};

// ======================================================================= textures for nature + ground
/** a grass blade: dark green base -> light yellow-green tip, pale midrib (UV v runs base -> tip) */
export const bladeTex = () => ctx(32, 128, (g) => {
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, "#2f5a22"); gr.addColorStop(0.6, "#5f9a3a"); gr.addColorStop(1, "#b9cf6a");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 128); g.fillStyle = "rgba(230,255,190,0.35)"; g.fillRect(15, 0, 2, 128);
});
/** one leaf on a transparent card: pointed oval, gradient, midrib + 5 vein pairs, a darker serrated edge */
export const leafTex = (hue = 0) => ctx(128, 128, (g) => {
  g.clearRect(0, 0, 128, 128); g.save(); g.translate(64, 64); g.rotate(-0.6);
  const path = () => { g.beginPath(); g.moveTo(0, -58); g.bezierCurveTo(30, -40, 34, 20, 0, 58); g.bezierCurveTo(-34, 20, -30, -40, 0, -58); };
  const gr = g.createLinearGradient(-30, -50, 30, 50); gr.addColorStop(0, ["#9ad25a", "#b8c85a", "#86c050"][hue % 3]); gr.addColorStop(1, ["#4a8a36", "#6f8f34", "#40803c"][hue % 3]);
  path(); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(20,50,15,0.8)"; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = "rgba(220,255,180,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -54); g.lineTo(0, 62); g.stroke();
  g.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const y = -36 + i * 18; for (const s of [1, -1]) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(s * 12, y - 2, s * 22, y - 12); g.stroke(); } }
  g.restore();
});
/** tree bark: vertical fissures, plates and a few knots (u around, v up) */
export const barkTex = () => ctx(256, 512, (g) => {
  g.fillStyle = "#8a7058"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 46; i++) { const x = (i * 37) % 256, w = 3 + (i % 4); g.fillStyle = i % 3 ? "#3e2f24" : "#4a382a"; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 32) g.lineTo(x + 6 * Math.sin(y * 0.03 + i), y); g.lineTo(x + w, 512); for (let y = 512; y >= 0; y -= 32) g.lineTo(x + w + 6 * Math.sin(y * 0.03 + i), y); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(160,140,110,0.25)"; g.fillRect((i * 53) % 256, (i * 97) % 512, 10, 3); }
  for (let i = 0; i < 4; i++) { g.strokeStyle = "#2e231a"; g.lineWidth = 3; g.beginPath(); g.ellipse((i * 71) % 256, 80 + i * 110, 8, 12, 0, 0, 7); g.stroke(); }
});
/** soil with grass tufts (ground under grassField) and real asphalt (aggregate at a size that survives mipmaps) */
export const turfTex = () => ctx(512, 512, (g) => {
  g.fillStyle = "#5b7a34"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) { const x = hash(i, 81) * 512, y = hash(i, 82) * 512; g.fillStyle = ["rgba(90,70,40,0.3)", "rgba(120,160,70,0.45)", "rgba(60,90,35,0.45)"][i % 3]; g.beginPath(); g.ellipse(x, y, 8 + 22 * hash(i, 83), 5 + 12 * hash(i, 84), hash(i, 85) * 3, 0, 7); for (const ox of [-512, 512]) g.ellipse(x + ox, y, 8 + 22 * hash(i, 83), 5 + 12 * hash(i, 84), hash(i, 85) * 3, 0, 7); g.fill(); }
});
export const asphaltRealTex = () => ctx(1024, 1024, (g) => {
  g.fillStyle = "#5c5b5d"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 30; i++) { const x = hash(i, 71) * 1024, y = hash(i, 72) * 1024, r = 80 + 160 * hash(i, 73); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hash(i, 74) > 0.5 ? "rgba(110,108,106,0.25)" : "rgba(40,40,44,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = ["rgba(122,120,118,0.55)", "rgba(70,69,72,0.5)", "rgba(140,136,128,0.4)"][i % 3]; const r = 0.8 + 1.4 * hash(i, 76); g.fillRect(hash(i, 77) * 1024, hash(i, 78) * 1024, r, r); }
});

// ======================================================================= trees
export type Tree = { group: THREE.Group; leaves: THREE.InstancedMesh; trunk: THREE.Mesh };
/** a broadleaf tree from real proportions (h ~ 6-12 m): tapered, slightly bent bark trunk, 5-7 branches from ~45 %
 *  height, foliage = hundreds of textured leaf cards clustered at branch ends (alpha-tested, NOINK), all swaying in
 *  WIND (trunk barely, branch tips more, leaves flutter). seed varies the shape. */
export const tree = (h = 8, seed = 1, mats?: { bark?: THREE.Material; leaf?: THREE.Material }): Tree => {
  const g = new THREE.Group(), R = (k: number) => hash(seed * 13 + k, seed);
  const bark = mats?.bark ?? windSway(new THREE.MeshLambertMaterial({ map: barkTex() }), h, 0.04, 0.0);
  const tg = new THREE.CylinderGeometry(h * 0.022, h * 0.04, h * 0.62, 14, 10).translate(0, h * 0.31, 0); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i) / h; tp.setX(i, tp.getX(i) + 0.15 * h * 0.04 * Math.sin(y * 5 + seed)); tp.setZ(i, tp.getZ(i) + 0.1 * h * 0.04 * Math.cos(y * 4 + seed)); }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, bark); trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
  const ends: THREE.Vector3[] = [V(0, h * 0.86, 0)];
  const nb = 5 + Math.floor(R(1) * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + R(i + 2), y0 = h * (0.42 + 0.22 * R(i + 9)), len = h * (0.28 + 0.12 * R(i + 4)), up = 0.55 + 0.3 * R(i + 5);
    const dir = V(Math.cos(a) * (1 - up * 0.5), up, Math.sin(a) * (1 - up * 0.5)).normalize();
    const bg = new THREE.CylinderGeometry(h * 0.006, h * 0.016, len, 8).translate(0, len / 2, 0);
    const b = new THREE.Mesh(bg, bark); b.position.set(0, y0, 0); b.quaternion.setFromUnitVectors(V(0, 1, 0), dir); b.castShadow = true; g.add(b);
    ends.push(V(0, y0, 0).addScaledVector(dir, len));
  }
  // real leaves pass light through (translucency): a soft emissive from their own texture keeps back-lit leaves green, not black
  const leafM = mats?.leaf ?? windSway(new THREE.MeshLambertMaterial({ map: leafTex(seed), alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color("#ffffff"), emissiveMap: leafTex(seed), emissiveIntensity: 0.35 }), h, 0.18, 0.06);
  const n = Math.round(420 * ends.length), leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.16), leafM, n), m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const e = ends[i % ends.length], rr = h * 0.16 * Math.cbrt(hash(i, seed + 3)), th = hash(i, seed + 4) * Math.PI * 2, ph = Math.acos(2 * hash(i, seed + 5) - 1);
    const p = V(e.x + rr * Math.sin(ph) * Math.cos(th), e.y + rr * 0.75 * Math.cos(ph), e.z + rr * Math.sin(ph) * Math.sin(th));
    m4.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(i, 7) * 6.3, hash(i, 8) * 6.3, hash(i, 9) * 6.3)), V(1, 1, 1));
    leaves.setMatrixAt(i, m4); leaves.setColorAt(i, c.setHSL(0.24 + 0.05 * hash(i, 10), 0.25, 0.85 + 0.15 * hash(i, 11)));
  }
  leaves.castShadow = true; leaves.receiveShadow = true; g.add(leaves);
  return { group: g, leaves, trunk };
};
