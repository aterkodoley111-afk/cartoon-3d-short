// Look lab: the "real 3D world + flat cartoon cast" target look, built to match the style studied in the user's
// reference shorts (measured over all their frames: median luma ~0.43, high contrast (p95 ~0.70), saturated sky and
// grass, no ink outlines on the world, soft sun shadows, bloom, depth of field on close-ups).
// Physically lit materials (MeshStandard/Physical with an environment map) replace the two-tone world shading; the
// cast stays flat ink cards. Every object is built to its real size.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { car, carMaterials, Vehicle, seatWorld, handTargets, WIND, windSway, skyEnv } from "../tangiwai/realism";
import { Pen, bodyFront, bodySide, FrontOpts, SideOpts, Outfit } from "../tangiwai/toon";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hash = (i: number, s = 0) => { let h = (Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
const vn = (x: number, z: number) => { const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const h2 = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x: number, z: number) => vn(x, z) * 0.55 + vn(x * 2.1 + 7, z * 2.1) * 0.3 + vn(x * 4.3, z * 4.3 + 3) * 0.15;

// ---------------- textures ----------------
/** meadow ground seen between the blades: green-brown thatch, darker soil flecks */
const groundTex = () => tex(1024, 1024, (g) => {
  g.fillStyle = "#4f7a2a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5000; i++) { const x = hash(i, 1) * 1024, y = hash(i, 2) * 1024, a = hash(i, 3) * 6.28, L = 6 + 14 * hash(i, 4);
    g.strokeStyle = ["#6a9a32", "#3e6420", "#8aae3e", "#5c4a2a"][i % 4]; g.globalAlpha = 0.55; g.lineWidth = 1.5 + hash(i, 5) * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L * Math.cos(a), y + L * Math.sin(a)); g.stroke(); }
  g.globalAlpha = 1;
});
/** asphalt with aggregate, patches, crack sealant, and the markings PAINTED in (white edge lines, yellow dashed centre) */
const roadTex = () => tex(1024, 2048, (g) => {
  g.fillStyle = "#67686c"; g.fillRect(0, 0, 1024, 2048);
  for (let i = 0; i < 40; i++) { const x = hash(i, 11) * 1024, y = hash(i, 12) * 2048, r = 60 + 200 * hash(i, 13); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hash(i, 14) > 0.5 ? "rgba(120,120,122,0.22)" : "rgba(30,30,34,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // chip-seal aggregate: many small light and dark stones with a dark gap between them
  for (let i = 0; i < 140000; i++) { const v = 50 + hash(i, 15) * 120, x = hash(i, 16) * 1024, y = hash(i, 17) * 2048, r = 0.6 + hash(i, 26) * 1.6; g.fillStyle = `rgba(${v},${v - 2},${v - 4},0.7)`; g.fillRect(x, y, r, r * (0.7 + 0.6 * hash(i, 27))); }
  // fine hairline sealant joints only (no thick drawn cracks)
  g.strokeStyle = "rgba(28,28,30,0.35)"; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { let x = hash(i, 18) * 1024, y = hash(i, 19) * 2048; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (hash(i * 9 + k, 20) - 0.5) * 30; y += 20 + 25 * hash(i * 9 + k, 21); g.lineTo(x, y); } g.stroke(); }
  // tyre polish in the wheel paths
  for (const x of [250, 400, 624, 774]) { const gr = g.createLinearGradient(x - 40, 0, x + 40, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(20,20,24,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, 2048); }
  g.fillStyle = "#e2e1da"; g.fillRect(40, 0, 22, 2048); g.fillRect(962, 0, 22, 2048);
  g.fillStyle = "#dfae2a"; for (let y = 0; y < 2048; y += 512) g.fillRect(500, y + 40, 22, 300);
  // worn paint: aggregate shows through the markings
  for (let i = 0; i < 9000; i++) { const v = 60 + hash(i, 36) * 60; g.fillStyle = `rgba(${v},${v},${v},0.5)`; const x = [40 + hash(i, 37) * 22, 962 + hash(i, 38) * 22, 500 + hash(i, 39) * 22][i % 3]; g.fillRect(x, hash(i, 40) * 2048, 1.6, 1.6); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = "rgba(60,60,60,0.35)"; const x = [40 + hash(i, 22) * 26, 958 + hash(i, 23) * 26, 500 + hash(i, 24) * 24][i % 3]; g.fillRect(x, hash(i, 25) * 2048, 2, 2); }
});
const gravelTex = () => tex(512, 512, (g) => { g.fillStyle = "#8a7e6c"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 6000; i++) { const v = 100 + hash(i, 31) * 90; g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.beginPath(); g.ellipse(hash(i, 32) * 512, hash(i, 33) * 512, 1 + hash(i, 34) * 3, 1 + hash(i, 35) * 2, 0, 0, 7); g.fill(); } });
/** a ploughed / cropped field: rows of crop with soil showing, seen from a distance */
const fieldTex = (crop: string, soil: string) => tex(512, 512, (g) => { g.fillStyle = soil; g.fillRect(0, 0, 512, 512); for (let x = 0; x < 512; x += 16) { g.fillStyle = crop; g.fillRect(x + 2, 0, 10, 512); for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,200,0.12)"; g.fillRect(x + 2 + hash(x + i, 41) * 10, hash(x * 7 + i, 42) * 512, 2, 3); } } });
/** oak bark: deep vertical furrows broken into plates, moss on one side */
const barkTex = () => tex(512, 1024, (g) => {
  g.fillStyle = "#6e5a46"; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "#5f5042"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 90; i++) { let y = hash(i, 51) * 1024; g.strokeStyle = i % 3 ? "#2a211a" : "#3a2f25"; g.lineWidth = 5 + hash(i, 52) * 9; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 64) { y += (hash(i * 31 + x, 53) - 0.5) * 10; g.lineTo(x, y); } g.stroke();
    g.strokeStyle = "rgba(160,140,115,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y - 6); g.lineTo(512, y - 6 + (hash(i, 64) - 0.5) * 8); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.strokeStyle = "rgba(30,24,18,0.5)"; g.lineWidth = 2; const x = hash(i, 54) * 512, y = hash(i, 55) * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 22 * (hash(i, 56) - 0.5)); g.stroke(); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = hash(i, 57) > 0.5 ? "rgba(170,150,120,0.25)" : "rgba(40,30,20,0.25)"; g.fillRect(hash(i, 58) * 512, hash(i, 59) * 1024, 3, 3); }
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(90,120,50,0.35)"; g.beginPath(); g.ellipse(hash(i, 61) * 512, hash(i, 60) * 200, 6 + hash(i, 62) * 14, 4 + hash(i, 63) * 8, 0, 0, 7); g.fill(); }
});
/** a spray of oak leaves on a card (lobed leaves, mid-ribs, a light-to-dark gradient) */
const leafSprayTex = (k: number) => tex(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const cols = [["#9ccc4a", "#4e8a26"], ["#86bc3e", "#3e7420"], ["#b4d65a", "#5a9a2e"]][k % 3];
  for (let i = 0; i < 9; i++) {
    const cx = 128 + (hash(i + k * 20, 71) - 0.5) * 150, cy = 128 + (hash(i + k * 20, 72) - 0.5) * 150, a = hash(i + k * 20, 73) * 6.28, s = 0.75 + 0.5 * hash(i + k * 20, 74);
    g.save(); g.translate(cx, cy); g.rotate(a); g.scale(s, s);
    const gr = g.createLinearGradient(0, -50, 0, 50); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -52); for (let j = 0; j <= 10; j++) { const t = j / 10, y = -52 + 104 * t, w = 22 * Math.sin(Math.PI * t) * (1 + 0.25 * Math.sin(t * 25)); g.lineTo(w, y); } for (let j = 10; j >= 0; j--) { const t = j / 10, y = -52 + 104 * t, w = 22 * Math.sin(Math.PI * t) * (1 + 0.25 * Math.sin(t * 25 + 1)); g.lineTo(-w, y); } g.closePath(); g.fill();
    g.strokeStyle = "rgba(230,255,190,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -48); g.lineTo(0, 56); g.stroke(); g.restore();
  }
}, true);
/** a fair-weather cumulus: many soft puffs, bright sunlit tops, grey-blue flat bases */
const cumulusTex = (k: number) => tex(1024, 512, (g) => {
  g.clearRect(0, 0, 1024, 512);
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) { const t = hash(i + k * 99, 81), x = 120 + 780 * t, top = 320 - 210 * Math.sin(Math.PI * t) * (0.6 + 0.4 * hash(i + k * 99, 82)); puffs.push([x, top + 60 * hash(i + k * 99, 83), 40 + 70 * hash(i + k * 99, 84) * Math.sin(Math.PI * t) + 20]); }
  for (const [x, y, r] of puffs) { const gr = g.createRadialGradient(x, y + r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, "rgba(176,190,214,0.95)"); gr.addColorStop(1, "rgba(176,190,214,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y + r * 0.25, r, 0, 7); g.fill(); }
  for (const [x, y, r] of puffs) { const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.35, r * 0.05, x, y, r * 0.95); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(246,248,252,0.85)"); gr.addColorStop(1, "rgba(230,236,246,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y - r * 0.05, r * 0.92, 0, 7); g.fill(); }
  g.globalCompositeOperation = "destination-out"; g.fillStyle = "rgba(0,0,0,1)"; g.fillRect(0, 372, 1024, 140); g.globalCompositeOperation = "source-over";
});

// ---------------- geometry builders ----------------
/** grass: instanced curved blades in clumps; blade colour runs from a dark base to a sunlit yellow-green tip */
export const grass = (n: number, place: (i: number) => [number, number, number] | null, h0 = 0.38) => {
  const segs = 5, pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) { const v = i / segs, w = 0.011 * (1 - v * 0.95), bend = 0.12 * v * v; pos.push(-w, v, bend, w, v, bend);
    const c = new THREE.Color("#253f12").lerp(new THREE.Color("#6b9a34"), Math.min(1, v * 1.3)).lerp(new THREE.Color("#b9c86a"), Math.max(0, v - 0.7) * 2); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  // normals lean up so the lawn reads lit like the reference (blades are thin: shading from the sky, not their flat face)
  const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) { const nv = V(nrm.getX(i), nrm.getY(i) + 1.6, nrm.getZ(i)).normalize(); nrm.setXYZ(i, nv.x, nv.y, nv.z); }
  const mat = windSway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 }), h0 * 1.4, 0.1, 0.025);
  const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const p = place(i); if (!p) continue;
    const s = h0 * (0.3 + 1.3 * hash(i, 3) ** 2.2);
    m4.compose(V(p[0], p[1], p[2]), q.setFromEuler(new THREE.Euler(0.25 * (hash(i, 4) - 0.5), hash(i, 5) * 6.28, 0.25 * (hash(i, 6) - 0.5))), V(1 + hash(i, 9), s, 1));
    im.setMatrixAt(k, m4); const dry = hash(i, 10) < 0.14; im.setColorAt(k, dry ? c.setHSL(0.12 + 0.03 * hash(i, 7), 0.42, 0.62 + 0.15 * hash(i, 8)) : c.setHSL(0.21 + 0.07 * hash(i, 7), 0.5, 0.4 + 0.22 * hash(i, 8))); k++;
  }
  im.count = k; im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
  return im;
};
/** an English oak (~13 m): flared, furrowed trunk, heavy curving limbs, a dense crown of leaf-spray clumps that sway */
export const oak = (seed: number, H = 13) => {
  const g = new THREE.Group(), barkM = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.95 });
  barkM.map!.repeat.set(2, 2);
  const tube = (pts: THREE.Vector3[], r0: number, r1: number) => {
    const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, 24, 1, 12, false), p = tg.attributes.position, nrm = tg.attributes.normal;
    // taper: move every ring toward its curve point
    for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / 13), t = ring / 24, cp = curve.getPointAt(Math.min(1, t)), r = r0 + (r1 - r0) * t;
      const d = V(p.getX(i), p.getY(i), p.getZ(i)).sub(cp).normalize(); const flare = t < 0.08 && r0 > 0.4 ? 1 + 0.6 * (1 - t / 0.08) * (0.7 + 0.3 * Math.sin(Math.atan2(d.z, d.x) * 5)) : 1; p.setXYZ(i, cp.x + d.x * r * flare, cp.y + d.y * r * flare, cp.z + d.z * r * flare); void nrm; }
    tg.computeVertexNormals(); const m = new THREE.Mesh(tg, barkM); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const R = (k: number) => hash(seed * 31 + k, seed);
  const trunkTop = V(0.3 * (R(1) - 0.5), H * 0.42, 0.3 * (R(2) - 0.5));
  g.add(tube([V(0, -0.3, 0), V(0.05, H * 0.15, 0.03), V(-0.05, H * 0.3, 0), trunkTop], 0.55, 0.42));
  const clumps: THREE.Vector3[] = [];
  const limbs = 7;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * 6.28 + R(i + 3) * 0.8, out = H * (0.32 + 0.12 * R(i + 4)), up = H * (0.2 + 0.25 * R(i + 5));
    const y0 = trunkTop.y - 0.6 * R(i + 6);
    const p0 = V(trunkTop.x, y0, trunkTop.z), p1 = p0.clone().add(V(Math.cos(a) * out * 0.4, up * 0.45, Math.sin(a) * out * 0.4)), p2 = p0.clone().add(V(Math.cos(a) * out, up, Math.sin(a) * out));
    g.add(tube([p0, p1, p2], 0.26, 0.06));
    for (let k = 0; k < 4; k++) { const t = 0.45 + 0.55 * (k / 3); clumps.push(new THREE.CatmullRomCurve3([p0, p1, p2]).getPoint(t).add(V((R(i * 10 + k) - 0.5) * 2, 0.6 + R(i * 10 + k + 5) * 1.2, (R(i * 10 + k + 9) - 0.5) * 2))); }
    // twigs
    for (let k = 0; k < 2; k++) { const b0 = new THREE.CatmullRomCurve3([p0, p1, p2]).getPoint(0.55 + 0.3 * k), b1 = b0.clone().add(V((R(i * 7 + k) - 0.5) * 3, 1.5, (R(i * 7 + k + 3) - 0.5) * 3)); g.add(tube([b0, b0.clone().lerp(b1, 0.5).add(V(0, 0.3, 0)), b1], 0.08, 0.03)); if (b1.y > H * 0.45) clumps.push(b1.clone().add(V(0, 0.5, 0))); }
  }
  clumps.push(V(0, H * 0.82, 0), V(1.5, H * 0.78, 1), V(-1.6, H * 0.76, -1.2));
  // crown: leaf-spray cards around every clump centre (a sphere shell, denser outside), translucent
  const leafMats = [0, 1, 2].map((k) => windSway(new THREE.MeshStandardMaterial({ map: leafSprayTex(k), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, emissive: new THREE.Color("#2a4a10"), emissiveIntensity: 0.1 }), H, 0.14, 0.05));
  const per = 420, card = new THREE.PlaneGeometry(0.85, 0.85), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  leafMats.forEach((lm, mi) => {
    const im = new THREE.InstancedMesh(card, lm, clumps.length * Math.ceil(per / 3)); let k = 0;
    clumps.forEach((cp, ci) => { for (let j = 0; j < per / 3; j++) {
      const i = ci * 1000 + j * 3 + mi, th = hash(i, 91) * 6.28, ph = Math.acos(2 * hash(i, 92) - 1), rr = (1.6 + 1.6 * R(ci + 40)) * Math.pow(hash(i, 93), 0.35);
      const p = cp.clone().add(V(rr * Math.sin(ph) * Math.cos(th), rr * 0.8 * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)));
      m4.compose(p, q.setFromEuler(new THREE.Euler(hash(i, 94) * 6.3, hash(i, 95) * 6.3, hash(i, 96) * 6.3)), V(1, 1, 1));
      im.setMatrixAt(k, m4); im.setColorAt(k, c.setHSL(0.22 + 0.04 * hash(i, 97), 0.45, 0.22 + 0.42 * Math.min(1, rr / (2.8 + 0.01)) * (0.55 + 0.45 * (p.y - cp.y + rr) / (2 * rr + 0.01)))); k++;
    } });
    im.count = k; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im);
  });
  return g;
};

// ---------------- the scene ----------------
export type Setup = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; dof: number; focus?: THREE.Vector3 };
export class Lab {
  root = new THREE.Group(); sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; sky: THREE.Mesh; clouds: THREE.Mesh[] = [];
  car1: ReturnType<typeof sedan>; car2: ReturnType<typeof sedan>; cards: THREE.Mesh[] = [];
  constructor() {
    const R = this.root;
    // sky: deep blue zenith to a pale, slightly warm horizon
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec3 vP; void main(){ float e = clamp(vP.y, 0.0, 1.0); vec3 hor = vec3(0.72, 0.84, 0.97), mid = vec3(0.24, 0.52, 0.94), top = vec3(0.05, 0.26, 0.8);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, e)); c = mix(c, top, smoothstep(0.18, 0.75, e)); gl_FragColor = vec4(c, 1.0); }` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMat); this.sky.renderOrder = -2; R.add(this.sky);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.28 + hash(i, 101), d = 1400 + 900 * hash(i, 102), w = 420 + 380 * hash(i, 103);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: cumulusTex(i % 5), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 220 + 330 * hash(i, 104), Math.sin(a) * d); m.scale.set(w, w, 1); m.renderOrder = -1; this.clouds.push(m); R.add(m);
    }
    this.hemi = new THREE.HemisphereLight("#bcd8ff", "#6a7a3a", 1.1); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff3dc", 3.4); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.03; R.add(this.sun, this.sun.target);
    // ground: meadow, gently rolling away from the road; distant hills and mountains
    const gg = new THREE.PlaneGeometry(3000, 3000, 220, 220); gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position; for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), d = Math.max(0, Math.abs(x) - 30); gp.setY(i, (fbm(x / 120, z / 120) - 0.5) * 6 * Math.min(1, d / 200) + 140 * Math.max(0, (Math.hypot(x, z) - 700) / 800) ** 2 * fbm(x / 300 + 5, z / 300)); }
    gg.computeVertexNormals();
    const gt = groundTex(); gt.repeat.set(600, 600);
    const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95 })); ground.receiveShadow = true; R.add(ground);
    // crop fields beyond the fences (strips of different crops, real patchwork)
    const crops: [string, string][] = [["#8fb83e", "#7a6a3e"], ["#d6c25a", "#9a8450"], ["#5f9a30", "#6a5a36"], ["#c9b04a", "#8a7444"]];
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) {
      const ft = fieldTex(...crops[(k + (s > 0 ? 1 : 0)) % 4]); ft.repeat.set(12, 30);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(180, 240), new THREE.MeshStandardMaterial({ map: ft, roughness: 1 }));
      f.rotation.x = -Math.PI / 2; f.rotation.z = s * 0.02; f.position.set(s * 110, 0.03, -150 - k * 250); f.receiveShadow = true; R.add(f);
    }
    // road (7.4 m), gravel shoulders
    const rt = roadTex(); rt.repeat.set(1, 400);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3000), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.y = 0.06; road.receiveShadow = true; R.add(road);
    const gv = gravelTex(); gv.repeat.set(1, 1500);
    for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3000), new THREE.MeshStandardMaterial({ map: gv, roughness: 1 })); sh.rotation.x = -Math.PI / 2; sh.position.set(s * 4.4, 0.045, 0); sh.receiveShadow = true; R.add(sh); }
    // farm fence: treated pine posts every 3 m, four high-tensile wires; power poles further back
    const postM = new THREE.MeshStandardMaterial({ color: "#7a6450", roughness: 0.9 }), wireM = new THREE.LineBasicMaterial({ color: "#7a7a80" });
    const postG = new THREE.CylinderGeometry(0.06, 0.07, 1.25, 8);
    const posts = new THREE.InstancedMesh(postG, postM, 2 * 600), m4 = new THREE.Matrix4(); let pk = 0;
    for (const s of [-1, 1]) for (let z = 600; z > -1140; z -= 3) { m4.makeTranslation(s * 13, 0.6, z); posts.setMatrixAt(pk++, m4); }
    posts.count = pk; posts.castShadow = true; R.add(posts);
    const wp: number[] = []; for (const s of [-1, 1]) for (const y of [0.35, 0.65, 0.95, 1.18]) wp.push(s * 13, y, 600, s * 13, y, -1140);
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); R.add(new THREE.LineSegments(wg, wireM));
    const poleM = new THREE.MeshStandardMaterial({ color: "#5a4a3a", roughness: 0.9 });
    for (let z = 600; z > -1200; z -= 55) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 10, 10), poleM); p.position.set(-17, 5, z); p.castShadow = true; R.add(p); const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), poleM); arm.position.set(-17, 9.5, z); R.add(arm); }
    // the oak by the road + a far line of trees
    const tree1 = oak(3); tree1.position.set(8.5, 0, -18); R.add(tree1);
    for (let i = 0; i < 6; i++) { const t = oak(10 + i, 9 + 3 * hash(i, 111)); t.position.set((i % 2 ? 1 : -1) * (60 + 40 * hash(i, 112)), 0, -260 - i * 140); R.add(t); }
    // grass: dense meadow on both verges and around the oak (real blades only where the lens is close)
    const verge = (i: number): [number, number, number] | null => { const z = 20 - 90 * hash(i, 121), side = hash(i, 122) > 0.5 ? 1 : -1, x = side * (5.2 + 8 * hash(i, 123) ** 1.3); return Math.hypot(x - 6.9, z + 16.7) < 2.4 ? null : [x, 0, z]; };
    const mowed = (i: number): [number, number, number] | null => { const a = hash(i, 125) * 6.28, r = 2.6 * Math.sqrt(hash(i, 126)); return [6.9 + r * Math.cos(a), 0, -16.7 + r * Math.sin(a)]; };
    R.add(grass(170000, verge, 0.34)); R.add(grass(26000, mowed, 0.07));
    // cars: a red hatchback on the road toward us, a white SUV further back
    const envC = skyEnv(false);
    this.car1 = sedan("#b8141c", envC); this.car1.root.position.set(1.8, 0.06, -6); this.car1.root.rotation.y = -Math.PI / 2; R.add(this.car1.root);
    this.car2 = sedan("#e9ebec", envC); this.car2.root.position.set(-1.8, 0.06, -40); this.car2.root.rotation.y = Math.PI / 2; R.add(this.car2.root);
    for (const v of [this.car1, this.car2]) v.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    const env = envC;
    // a folding aluminium lawn chair with woven webbing under the oak (real size: seat 0.38 m high, 0.55 m wide)
    const chair = new THREE.Group(), al = new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 0.9, roughness: 0.3, envMap: env });
    const web = new THREE.MeshStandardMaterial({ map: tex(128, 128, (g) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#2f8a5a"; for (let k = 0; k < 128; k += 32) { g.fillRect(k, 0, 16, 128); g.fillRect(0, k + 16, 128, 8); } }), roughness: 0.8, side: THREE.DoubleSide });
    const tubeTo = (a: THREE.Vector3, b: THREE.Vector3) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, d.length(), 10), al); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; chair.add(m); };
    for (const s2 of [-0.28, 0.28]) { tubeTo(V(s2, 0, 0.25), V(s2, 0.38, -0.05)); tubeTo(V(s2, 0, -0.25), V(s2, 0.38, 0.22)); tubeTo(V(s2, 0.38, 0.22), V(s2, 0.38, -0.28)); tubeTo(V(s2, 0.38, -0.28), V(s2, 0.95, -0.42)); tubeTo(V(s2, 0.6, 0.18), V(s2, 0.6, -0.32)); }
    tubeTo(V(-0.28, 0.38, 0.22), V(0.28, 0.38, 0.22)); tubeTo(V(-0.28, 0.95, -0.42), V(0.28, 0.95, -0.42));
    const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.5), web); seat.rotation.x = -Math.PI / 2; seat.position.set(0, 0.37, -0.03); chair.add(seat);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.6), web); back.position.set(0, 0.66, -0.35); back.rotation.x = -0.24; chair.add(back);
    chair.position.set(6.3, 0, -16.55); chair.rotation.y = -0.51; R.add(chair);
    // wildflowers in the verge: dandelions, clover, a few purple vetch heads on thin stems
    { const n = 7000, head = new THREE.SphereGeometry(0.022, 8, 6); head.scale(1, 0.55, 1);
      const fm = new THREE.MeshStandardMaterial({ roughness: 0.7 }), fl = new THREE.InstancedMesh(head, fm, n), m = new THREE.Matrix4(), c = new THREE.Color();
      const stems: number[] = [];
      for (let i = 0; i < n; i++) { const pl = (verge(i * 7 + 3) ?? mowed(i))!, y = 0.08 + 0.26 * hash(i, 131) ** 1.5, sc = 0.7 + 0.8 * hash(i, 132); m.compose(V(pl[0], y, pl[2]), new THREE.Quaternion(), V(sc, sc, sc)); fl.setMatrixAt(i, m);
        const k = hash(i, 133); fl.setColorAt(i, k < 0.5 ? c.set("#f3c623") : k < 0.85 ? c.set("#f4f2ea") : c.set("#8a5ac8")); stems.push(pl[0], 0, pl[2], pl[0], y, pl[2]); }
      fl.receiveShadow = true; fl.frustumCulled = false; R.add(fl);
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(stems, 3)); R.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: "#4f7a2a" }))); }
    // roadside props (no text): a triangular warning sign, a stack of old tyres by the oak, traffic cones on the shoulder,
    // a farm mailbox, round hay bales in the fields
    { const post = new THREE.MeshStandardMaterial({ color: "#9aa0a6", metalness: 0.7, roughness: 0.4 });
      const sign = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 10), post); pole.position.y = 1.05; sign.add(pole);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 3), new THREE.MeshStandardMaterial({ map: tex(256, 256, (g) => { g.fillStyle = "#c8202a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#f6f4ee"; g.beginPath(); g.moveTo(128, 52); g.lineTo(218, 200); g.lineTo(38, 200); g.closePath(); g.fill(); g.fillStyle = "#16161a"; g.fillRect(118, 92, 20, 66); g.fillRect(118, 168, 20, 20); }), roughness: 0.5 }));
      face.rotation.z = Math.PI / 2; face.position.y = 2.0; sign.add(face); sign.position.set(-4.8, 0, -34); sign.rotation.y = -0.3; sign.rotation.y = 0.25; sign.traverse((o) => { o.castShadow = true; }); R.add(sign);
      const tyreM = new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.85 });
      for (let i = 0; i < 4; i++) { const ty = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 12, 28), tyreM); ty.rotation.x = Math.PI / 2; ty.position.set(7.2 + (i === 3 ? 0.7 : 0), 0.1 + (i === 3 ? 0 : i * 0.2), -17.0 + (i === 3 ? 0.4 : 0)); ty.castShadow = true; R.add(ty); }
      const coneM = new THREE.MeshStandardMaterial({ color: "#ff5a14", roughness: 0.5 }), band = new THREE.MeshStandardMaterial({ color: "#f2f2f2", roughness: 0.4 });
      for (const z of [-2.5, -5.5, -8.5]) { const cg = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 16), coneM); cone.position.y = 0.38; cg.add(cone);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.1, 16), band); b.position.y = 0.45; cg.add(b); const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), coneM); base.position.y = 0.02; cg.add(base);
        cg.position.set(4.25, 0.045, z); cg.traverse((o) => { o.castShadow = true; }); R.add(cg); }
      const mb = new THREE.Group(); const mp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), new THREE.MeshStandardMaterial({ color: "#6e5640", roughness: 0.9 })); mp.position.y = 0.55; mb.add(mp);
      const box = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 20, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: "#2f5f9a", metalness: 0.5, roughness: 0.4 })); box.rotation.x = Math.PI / 2; box.rotation.z = Math.PI / 2; box.position.y = 1.12; mb.add(box);
      const boxB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.32), box.material as THREE.Material); boxB.position.y = 1.04; mb.add(boxB);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: "#d22020" })); flag.position.set(0.1, 1.26, 0.17); mb.add(flag);
      mb.position.set(-4.9, 0, -9); mb.rotation.y = Math.PI / 2; mb.traverse((o) => { o.castShadow = true; }); R.add(mb);
      const strawT = tex(256, 256, (g) => { g.fillStyle = "#c9a94a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2500; i++) { g.strokeStyle = hash(i, 141) > 0.5 ? "rgba(240,220,140,0.6)" : "rgba(120,95,40,0.5)"; g.lineWidth = 1.5; const x = hash(i, 142) * 256, y = hash(i, 143) * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 3 * (hash(i, 144) - 0.5)); g.stroke(); } });
      const baleM = new THREE.MeshStandardMaterial({ map: strawT, roughness: 1 });
      for (let i = 0; i < 14; i++) { const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 24), baleM); bale.rotation.z = Math.PI / 2; bale.rotation.y = hash(i, 145) * 3; const sd = i % 2 ? 1 : -1; bale.position.set(sd * (24 + 40 * hash(i, 146)), 0.75, -30 - 160 * hash(i, 147)); bale.castShadow = true; R.add(bale); } }
  }
  /** a cloud of soft dust puffs (sprites): kicked up behind a car or under feet */
  dust(x: number, y: number, z: number, n: number, spread: [number, number, number], size: number, opacity = 0.4, col = "214,196,160") {
    const t = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, `rgba(${col},0.9)`); gr.addColorStop(0.5, `rgba(${col},0.4)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: opacity * (0.5 + 0.5 * hash(i, 151)) }));
      sp.position.set(x + (hash(i, 152) - 0.5) * spread[0], y + hash(i, 153) * spread[1], z + (hash(i, 154) - 0.5) * spread[2]); const k = size * (0.6 + 0.8 * hash(i, 155)); sp.scale.set(k, k * 0.8, 1); this.root.add(sp); }
  }
  /** a flat ink character card (the cast keeps its own look); drawn into a canvas, lit softly by the scene */
  card(draw: (p: Pen) => void, x: number, y: number, z: number, scale = 1, w = 1080, h = 1800, pull = 0) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; g.scale(w / 600, h / 1000); draw(new Pen(g));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(600 * 0.00216, 1000 * 0.00216); geo.translate(0, (975 - 500) * 0.00216 * -1 * -1, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: true, color: new THREE.Color(0.95, 0.93, 0.88) }));
    m.position.set(x, y, z); m.scale.setScalar(scale); m.renderOrder = 1; m.userData = { base: V(x, y, z), scale, pull }; this.root.add(m); this.cards.push(m);
    // shadow twin: an invisible copy turned to FACE THE SUN, so the full silhouette falls on the ground beside the
    // figure (a camera-facing card would only throw a thin sliver straight behind itself)
    const sh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    sh.castShadow = true; sh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5, side: THREE.DoubleSide });
    sh.position.set(x, y, z); sh.scale.setScalar(scale); sh.lookAt(x + SUN_DIR.x, y, z + SUN_DIR.z); this.root.add(sh);
    const ground = Math.abs(x) < 3.7 ? 0.06 : 0.0;
    // contact shadow: a soft dark pool under the feet (the ink figure stands ON the ground)
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.75 * scale, 0.42 * scale), new THREE.MeshBasicMaterial({ map: CONTACT, transparent: true, depthWrite: false, opacity: 0.85 }));
    cs.rotation.x = -Math.PI / 2; cs.position.set(x, Math.max(y, ground) + 0.012, z); cs.renderOrder = 0; this.root.add(cs);
    return m;
  }
  frame(s: Setup, cam: THREE.PerspectiveCamera, t: number) {
    cam.position.copy(s.pos); cam.lookAt(s.look); cam.fov = s.fov; cam.near = 0.05; cam.far = 6000; cam.updateProjectionMatrix();
    this.sky.position.copy(cam.position);
    for (const m of this.clouds) m.lookAt(cam.position);
    for (const m of this.cards) { const u = m.userData as { base: THREE.Vector3; scale: number; pull: number };
      if (u.pull) { const d = V(cam.position.x - u.base.x, 0, cam.position.z - u.base.z), L0 = d.length(); d.normalize();
        // move toward the lens by `pull` and shrink by the distance ratio so it keeps its on-screen size
        const L1 = Math.max(0.3, L0 - u.pull); m.position.copy(u.base).addScaledVector(d, L0 - L1); m.scale.setScalar(u.scale * L1 / L0);
        m.position.y = u.base.y + (cam.position.y - u.base.y) * (1 - L1 / L0); }
      m.lookAt(cam.position.x, m.position.y, cam.position.z); }
    WIND.time.value = t;
    // a high, warm afternoon sun from behind-left of the lens (soft shadows toward the camera-right)
    const dir = SUN_DIR;
    this.sun.position.copy(s.look).addScaledVector(dir, 120); this.sun.target.position.copy(s.look);
    const sc = this.sun.shadow.camera, Rr = Math.min(60, 8 + s.pos.distanceTo(s.look) * 1.2); sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = 400; sc.updateProjectionMatrix();
  }
}
const SUN_DIR = new THREE.Vector3(-0.78, 0.46, 0.42).normalize();
const CONTACT = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 64; const g = c.getContext("2d")!; const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62); gr.addColorStop(0, "rgba(10,14,8,0.7)"); gr.addColorStop(0.45, "rgba(10,14,8,0.35)"); gr.addColorStop(1, "rgba(10,14,8,0)"); g.setTransform(1, 0, 0, 0.5, 0, 16); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
export const envMap = () => skyEnv(false);
export { seatWorld, handTargets, mergeVertices, bodyFront, bodySide };
export type { FrontOpts, SideOpts, Outfit };

// ======================================================================= a modern car (lofted body)
/** A modern mid-size sedan built like the real thing (4.75 x 1.85 x 1.45 m, 2.8 m wheelbase): the body is lofted from
 *  cross-sections (a rounded superellipse whose width, sill and roof follow the real side profile), so it has smooth
 *  shoulders, a sloping bonnet, raked screens and a fastback; the glasshouse is real tinted glass with body-colour
 *  A/B/C pillars; slim LED headlights, a full-width tail-light bar, a dark grille, mirrors, door seams, handles,
 *  black arches and side skirts, 18" two-tone alloys on low-profile tyres, seats and a dashboard inside. +x = forward. */
export const sedan = (paint: string, env: THREE.Texture) => {
  const root = new THREE.Group(), L = 4.75, W = 1.86, wb = 2.84, xf = wb / 2 - 0.02, xr = -wb / 2 - 0.05, tr = 0.36;
  const paintM = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 0.7 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: "#0e1620", roughness: 0.04, metalness: 0.2, envMap: env, envMapIntensity: 1.3, clearcoat: 1, transparent: true, opacity: 0.62, depthWrite: false });
  const blackM = new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.55, metalness: 0.2, envMap: env });
  const chromeM = new THREE.MeshStandardMaterial({ color: "#d8dde4", roughness: 0.12, metalness: 1, envMap: env });
  // side profile (x from rear -L/2 to front L/2): sill y, belt y, roof y; plan half-width
  const prof = (x: number) => {
    const u = (x + L / 2) / L; // 0 rear .. 1 front
    const cl = (v: number) => Math.max(0, Math.min(1, v));
    const nose = cl((u - 0.88) / 0.12), tail = cl((0.08 - u) / 0.08);
    // a low, long bonnet that falls toward a rounded nose; the nose tucks in (plan + height) like a real sedan
    // wheel arches: the body's lower edge lifts into a round opening over each wheel (radius tyre + 4 cm)
    const arch = (xw: number) => { const dx = x - xw, R0 = tr + 0.045; return Math.abs(dx) < R0 ? tr + Math.sqrt(R0 * R0 - dx * dx) : 0; };
    const sill = Math.max(0.3 + 0.13 * nose ** 2 + 0.1 * tail ** 2, arch(xf), arch(xr));
    const bonnet = 0.93 - 0.15 * cl((u - 0.68) / 0.32) ** 1.3 - 0.13 * nose ** 2.4, boot = 1.0 - 0.05 * cl((0.2 - u) / 0.2) - 0.1 * tail ** 2.2;
    const belt = u > 0.68 ? bonnet : u < 0.2 ? boot : 0.93 + 0.07 * (0.68 - u) / 0.48;
    const roofU = u < 0.22 ? (u - 0.12) / 0.1 : u > 0.62 ? (0.78 - u) / 0.16 : 1;
    const roof = belt + Math.max(0, Math.min(1, roofU)) ** 0.7 * (1.42 - belt);
    const hw = (W / 2) * (1 - 0.16 * nose ** 2.2 - 0.1 * tail ** 2) * (0.97 + 0.03 * Math.sin(Math.PI * cl(u)));
    return { sill, belt, roof, hw, cabin: roofU > 0.02 && u > 0.12 && u < 0.78 };
  };
  // lower body: sill to belt (bonnet, flanks, boot deck), a rounded superellipse section
  const NX = 80, NC = 28, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NX; i++) {
    const x = -L / 2 + (L * i) / NX, p = prof(x), tip = Math.min(1, Math.min(i, NX - i) / 3);
    for (let j = 0; j <= NC; j++) {
      const a = (j / NC) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), e = 0.2;
      const sx = Math.sign(cs) * Math.abs(cs) ** e, sy = Math.sign(sn) * Math.abs(sn) ** (sn > 0 ? 0.6 : e);
      const mid = p.sill + 0.42 * (p.belt - p.sill);
      let y = sy > 0 ? mid + sy * (p.belt - mid) : mid + sy * (mid - p.sill), z = sx * p.hw * (sy > 0 ? 1 - 0.08 * sy * sy : 1);
      y = mid + (y - mid) * (0.35 + 0.65 * tip); z *= 0.55 + 0.45 * tip;
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const lower = new THREE.Mesh(geo, paintM); lower.castShadow = true; lower.receiveShadow = true; root.add(lower);
  // greenhouse: belt -> glass -> roof rail -> roof, per slice; side glass and the raked screens are glass, the roof and
  // the rails (with A/B/C pillars) are body colour
  const gx0 = -L / 2 + 0.13 * L, gx1 = -L / 2 + 0.775 * L, NG = 40, gp: number[] = [], gPaint: number[] = [], gGlass: number[] = [], gBlack: number[] = [];
  const sec = (x: number) => { const p = prof(x), hb = p.hw * 0.94, hr = p.hw * 0.7, yr = Math.max(p.roof, p.belt + 0.02), yg = p.belt + (yr - p.belt) * 0.86;
    return [[-hb, p.belt], [-(hr + 0.06), yg], [-hr, yr], [0, yr + 0.03], [hr, yr], [hr + 0.06, yg], [hb, p.belt]] as [number, number][]; };
  for (let i = 0; i <= NG; i++) { const x = gx0 + ((gx1 - gx0) * i) / NG; for (const [z, y] of sec(x)) gp.push(x, y, z); }
  for (let i = 0; i < NG; i++) {
    const x = gx0 + ((gx1 - gx0) * (i + 0.5)) / NG, u = (x + L / 2) / L, ramp = u < 0.24 || u > 0.62, pillar = Math.abs(u - 0.47) < 0.013;
    for (let j = 0; j < 6; j++) {
      const a = i * 7 + j, b = a + 7, quad = [a, b, a + 1, a + 1, b, b + 1];
      const side = j === 0 || j === 5, rail = j === 1 || j === 4, top = j === 2 || j === 3;
      ((side && !pillar) || (top && ramp) ? gGlass : rail || (side && pillar) ? gBlack : gPaint).push(...quad);
    }
  }
  // end caps (base of the screens) close the greenhouse onto the deck
  const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  gg.setIndex([...gPaint, ...gGlass, ...gBlack]); gg.addGroup(0, gPaint.length, 0); gg.addGroup(gPaint.length, gGlass.length, 1); gg.addGroup(gPaint.length + gGlass.length, gBlack.length, 2); gg.computeVertexNormals();
  const pd = paintM.clone(); pd.side = THREE.DoubleSide; const gd = glassM.clone(); gd.side = THREE.DoubleSide; gd.opacity = 0.86; gd.envMapIntensity = 1.8;
  const gloss = new THREE.MeshPhysicalMaterial({ color: "#0c0d10", roughness: 0.15, clearcoat: 1, envMap: env, side: THREE.DoubleSide });
  const green = new THREE.Mesh(gg, [pd, gd, gloss]); green.castShadow = true; root.add(green);
  void lower;
  // arches + skirts (black), wheels
  const tyreM = new THREE.MeshStandardMaterial({ color: "#1a1a1c", roughness: 0.9 });
  const rimTex = tex(256, 256, (g) => { g.fillStyle = "#2a2c30"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = "#c9ced6";
    for (let k = 0; k < 10; k++) { g.save(); g.translate(128, 128); g.rotate((k / 10) * 6.28); g.beginPath(); g.moveTo(-8, -20); g.lineTo(-14, -112); g.lineTo(14, -112); g.lineTo(8, -20); g.fill(); g.restore(); }
    g.strokeStyle = "#e4e8ee"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke(); g.fillStyle = "#3a3c42"; g.beginPath(); g.arc(128, 128, 24, 0, 7); g.fill(); g.fillStyle = "#c9ced6"; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill(); });
  const wheels: THREE.Group[] = [];
  for (const x of [xf, xr]) for (const s of [-1, 1]) {
    const wg = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(tr - 0.11, 0.11, 16, 40), tyreM); tyre.scale.z = 1.3; wg.add(tyre);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(tr - 0.1, 36), new THREE.MeshStandardMaterial({ map: rimTex, metalness: 0.8, roughness: 0.3, envMap: env })); rim.position.z = s * 0.05; if (s < 0) rim.rotation.y = Math.PI; wg.add(rim);
    wg.position.set(x, tr, s * (W / 2 - 0.1)); wg.traverse((o) => { o.castShadow = true; }); root.add(wg); wheels.push(wg);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(tr + 0.035, 0.035, 8, 24, Math.PI), blackM); arch.position.set(x, tr, s * (W / 2 - 0.02)); root.add(arch);
    const well = new THREE.Mesh(new THREE.CircleGeometry(tr + 0.05, 24, 0, Math.PI), blackM); well.position.set(x, tr, s * (W / 2 - 0.2)); if (s < 0) well.rotation.y = Math.PI; root.add(well);
  }
  for (const s of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(xf - xr - 2 * tr - 0.2, 0.08, 0.04), blackM); sk.position.set((xf + xr) / 2, 0.3, s * (prof(0).hw - 0.01)); root.add(sk); }
  // lights, grille, plates, mirrors, handles, seams
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.1, 2.9) }), tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.12) });
  const fp = prof(L / 2 - 0.12);
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), led); hl.position.set(L / 2 - 0.13, fp.belt - 0.08, s * (fp.hw - 0.3)); hl.rotation.y = s * 0.25; root.add(hl);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.5), blackM); housing.position.set(L / 2 - 0.15, fp.belt - 0.1, s * (fp.hw - 0.3)); housing.rotation.y = s * 0.25; root.add(housing);
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), paintM); mir.scale.set(0.7, 0.55, 1.1); mir.position.set(0.75, prof(0.75).belt + 0.07, s * (prof(0.75).hw * 0.94 + 0.04)); root.add(mir);
    for (const x of [0.55, -0.45]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.02), chromeM); h.position.set(x, 0.92, s * (prof(x).hw - 0.01)); root.add(h); }
    for (const x of [0.97, 0.0, -1.0]) { const sm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.55, 0.01), blackM); sm.position.set(x, 0.66, s * (prof(x).hw * 0.995)); root.add(sm); }
  }
  const np = prof(L / 2 - 0.16), grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, np.hw * 1.0), blackM); grille.position.set(L / 2 - 0.13, np.sill + 0.12, 0); root.add(grille);
  const rp = prof(-L / 2 + 0.1), tb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, rp.hw * 1.7), tail); tb.position.set(-L / 2 + 0.06, rp.belt - 0.05, 0); root.add(tb);
  const plateM = new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.5 });
  for (const x of [L / 2 - 0.1, -L / 2 + 0.08]) { const pp = prof(x), pl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.48), plateM); pl.position.set(x, (pp.sill + pp.belt) / 2 - 0.02, 0); root.add(pl); }
  // feature crease along the flank (a sharp ridge catching the sky) + a lower rocker crease
  for (const sd of [-1, 1]) for (const [k, r, x0, x1] of [[0.82, 0.01, -L / 2 + 0.3, L / 2 - 0.3], [0.1, 0.008, xr + tr + 0.12, xf - tr - 0.12]] as [number, number, number, number][]) { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 30; i++) { const x = x0 + ((x1 - x0) * i) / 30, p = prof(x), base = 0.3; pts.push(V(x, base + k * (p.belt - base), sd * p.hw * 1.0)); }
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 5), paintM)); }
  // chrome window trim along the belt, black lower intake, a thin LED daytime-running strip across the nose
  for (const sd of [-1, 1]) { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 24; i++) { const x = gx0 + 0.04 + ((gx1 - gx0 - 0.08) * i) / 24, p = prof(x); pts.push(V(x, p.belt + 0.012, sd * p.hw * 0.945)); }
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.009, 6), chromeM)); }
  { const ip = prof(L / 2 - 0.2), intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, ip.hw * 1.45), blackM); intake.position.set(L / 2 - 0.2, ip.sill + 0.03, 0); root.add(intake);
    const dp = prof(L / 2 - 0.1), drl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, dp.hw * 1.15), led); drl.position.set(L / 2 - 0.1, dp.belt - 0.06, 0); root.add(drl); }
  // interior: seats, dashboard with a glowing cluster, steering wheel
  const seatM = new THREE.MeshStandardMaterial({ color: "#2a2c32", roughness: 0.8 });
  for (const [x, z] of [[0.15, 0.4], [0.15, -0.4], [-0.75, 0.4], [-0.75, -0.4]] as [number, number][]) {
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), seatM); c2.position.set(x, 0.55, z); root.add(c2);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.48), seatM); bk.position.set(x - 0.28, 0.88, z); bk.rotation.z = 0.2; root.add(bk);
    const hr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.26), seatM); hr.position.set(x - 0.36, 1.27, z); root.add(hr);
  }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.6), blackM); dash.position.set(0.98, 0.86, 0); root.add(dash);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 10, 28), blackM); sw.position.set(0.62, 0.98, 0.4); sw.rotation.y = Math.PI / 2; sw.rotation.x = 0.4; root.add(sw);
  // soft contact shadow (cars sit on a dark pool, darkest under the sills)
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.05, W * 1.2), new THREE.MeshBasicMaterial({ map: tex(256, 128, (g) => { const gr = g.createRadialGradient(128, 64, 10, 128, 64, 128); gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.6, "rgba(0,0,0,0.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }), transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = 0.012; root.add(cs);
  return { root, wheels, driver: V(0.15, 0.6, 0.4) };
};
