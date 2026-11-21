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
  g.fillStyle = "#4e4f53"; g.fillRect(0, 0, 1024, 2048);
  for (let i = 0; i < 40; i++) { const x = hash(i, 11) * 1024, y = hash(i, 12) * 2048, r = 60 + 200 * hash(i, 13); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hash(i, 14) > 0.5 ? "rgba(120,120,122,0.22)" : "rgba(30,30,34,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 40000; i++) { const v = 60 + hash(i, 15) * 90; g.fillStyle = `rgba(${v},${v},${v + 4},0.55)`; g.fillRect(hash(i, 16) * 1024, hash(i, 17) * 2048, 1.5, 1.5); }
  g.strokeStyle = "rgba(25,25,28,0.7)"; g.lineWidth = 3; for (let i = 0; i < 10; i++) { let x = hash(i, 18) * 1024, y = hash(i, 19) * 2048; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (hash(i * 9 + k, 20) - 0.5) * 80; y += 30 + 40 * hash(i * 9 + k, 21); g.lineTo(x, y); } g.stroke(); }
  // tyre polish in the wheel paths
  for (const x of [250, 400, 624, 774]) { const gr = g.createLinearGradient(x - 40, 0, x + 40, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(20,20,24,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, 2048); }
  g.fillStyle = "#ecebe4"; g.fillRect(40, 0, 26, 2048); g.fillRect(958, 0, 26, 2048);
  g.fillStyle = "#e8b628"; for (let y = 0; y < 2048; y += 512) g.fillRect(500, y + 40, 24, 300);
  for (let i = 0; i < 3000; i++) { g.fillStyle = "rgba(60,60,60,0.35)"; const x = [40 + hash(i, 22) * 26, 958 + hash(i, 23) * 26, 500 + hash(i, 24) * 24][i % 3]; g.fillRect(x, hash(i, 25) * 2048, 2, 2); }
});
const gravelTex = () => tex(512, 512, (g) => { g.fillStyle = "#8a7e6c"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 6000; i++) { const v = 100 + hash(i, 31) * 90; g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.beginPath(); g.ellipse(hash(i, 32) * 512, hash(i, 33) * 512, 1 + hash(i, 34) * 3, 1 + hash(i, 35) * 2, 0, 0, 7); g.fill(); } });
/** a ploughed / cropped field: rows of crop with soil showing, seen from a distance */
const fieldTex = (crop: string, soil: string) => tex(512, 512, (g) => { g.fillStyle = soil; g.fillRect(0, 0, 512, 512); for (let x = 0; x < 512; x += 16) { g.fillStyle = crop; g.fillRect(x + 2, 0, 10, 512); for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,200,0.12)"; g.fillRect(x + 2 + hash(x + i, 41) * 10, hash(x * 7 + i, 42) * 512, 2, 3); } } });
/** oak bark: deep vertical furrows broken into plates, moss on one side */
const barkTex = () => tex(512, 1024, (g) => {
  g.fillStyle = "#6e5a46"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 70; i++) { let x = hash(i, 51) * 512; g.strokeStyle = i % 3 ? "#2e241c" : "#3c3026"; g.lineWidth = 4 + hash(i, 52) * 7; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 1024; y += 40) { x += (hash(i * 31 + y, 53) - 0.5) * 18; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 300; i++) { g.strokeStyle = "rgba(30,24,18,0.6)"; g.lineWidth = 2; const x = hash(i, 54) * 512, y = hash(i, 55) * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 * (hash(i, 56) - 0.5), y + 3); g.stroke(); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = hash(i, 57) > 0.5 ? "rgba(170,150,120,0.25)" : "rgba(40,30,20,0.25)"; g.fillRect(hash(i, 58) * 512, hash(i, 59) * 1024, 3, 3); }
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(90,120,50,0.35)"; g.beginPath(); g.ellipse(hash(i, 60) * 160, hash(i, 61) * 1024, 6 + hash(i, 62) * 14, 4 + hash(i, 63) * 8, 0, 0, 7); g.fill(); }
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
    const c = new THREE.Color("#2c4a14").lerp(new THREE.Color("#7fb63a"), Math.min(1, v * 1.3)).lerp(new THREE.Color("#d6e27a"), Math.max(0, v - 0.7) * 2); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  // normals lean up so the lawn reads lit like the reference (blades are thin: shading from the sky, not their flat face)
  const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) { const nv = V(nrm.getX(i), nrm.getY(i) + 1.6, nrm.getZ(i)).normalize(); nrm.setXYZ(i, nv.x, nv.y, nv.z); }
  const mat = windSway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 }), h0 * 1.4, 0.1, 0.025);
  const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const p = place(i); if (!p) continue;
    const s = h0 * (0.5 + 0.9 * hash(i, 3) ** 1.5);
    m4.compose(V(p[0], p[1], p[2]), q.setFromEuler(new THREE.Euler(0.25 * (hash(i, 4) - 0.5), hash(i, 5) * 6.28, 0.25 * (hash(i, 6) - 0.5))), V(1 + hash(i, 9), s, 1));
    im.setMatrixAt(k, m4); im.setColorAt(k, c.setHSL(0.2 + 0.07 * hash(i, 7), 0.55, 0.42 + 0.22 * hash(i, 8))); k++;
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
  const leafMats = [0, 1, 2].map((k) => windSway(new THREE.MeshStandardMaterial({ map: leafSprayTex(k), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, emissive: new THREE.Color("#2a4a10"), emissiveIntensity: 0.4 }), H, 0.14, 0.05));
  const per = 260, card = new THREE.PlaneGeometry(0.85, 0.85), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  leafMats.forEach((lm, mi) => {
    const im = new THREE.InstancedMesh(card, lm, clumps.length * Math.ceil(per / 3)); let k = 0;
    clumps.forEach((cp, ci) => { for (let j = 0; j < per / 3; j++) {
      const i = ci * 1000 + j * 3 + mi, th = hash(i, 91) * 6.28, ph = Math.acos(2 * hash(i, 92) - 1), rr = (1.6 + 1.6 * R(ci + 40)) * Math.pow(hash(i, 93), 0.35);
      const p = cp.clone().add(V(rr * Math.sin(ph) * Math.cos(th), rr * 0.8 * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)));
      m4.compose(p, q.setFromEuler(new THREE.Euler(hash(i, 94) * 6.3, hash(i, 95) * 6.3, hash(i, 96) * 6.3)), V(1, 1, 1));
      im.setMatrixAt(k, m4); im.setColorAt(k, c.setHSL(0.22 + 0.04 * hash(i, 97), 0.4, 0.55 + 0.35 * (p.y - cp.y + rr) / (2 * rr + 0.01))); k++;
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
      fragmentShader: `varying vec3 vP; void main(){ float e = clamp(vP.y, 0.0, 1.0); vec3 hor = vec3(0.78, 0.88, 0.98), mid = vec3(0.34, 0.6, 0.95), top = vec3(0.1, 0.32, 0.82);
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
    const verge = (i: number): [number, number, number] | null => { const z = 20 - 90 * hash(i, 121), side = hash(i, 122) > 0.5 ? 1 : -1, x = side * (5.2 + 8 * hash(i, 123) ** 1.3); return [x, 0, z]; };
    R.add(grass(150000, verge, 0.42));
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
  }
  /** a flat ink character card (the cast keeps its own look); drawn into a canvas, lit softly by the scene */
  card(draw: (p: Pen) => void, x: number, y: number, z: number, scale = 1, w = 1080, h = 1800) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; g.scale(w / 600, h / 1000); draw(new Pen(g));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(600 * 0.00216, 1000 * 0.00216); geo.translate(0, (975 - 500) * 0.00216 * -1 * -1, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: true, color: new THREE.Color(0.95, 0.93, 0.88) }));
    m.position.set(x, y, z); m.scale.setScalar(scale); m.renderOrder = 1; this.root.add(m); this.cards.push(m);
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
    for (const m of this.cards) m.lookAt(cam.position.x, m.position.y, cam.position.z);
    WIND.time.value = t;
    // a high, warm afternoon sun from behind-left of the lens (soft shadows toward the camera-right)
    const dir = SUN_DIR;
    this.sun.position.copy(s.look).addScaledVector(dir, 120); this.sun.target.position.copy(s.look);
    const sc = this.sun.shadow.camera, Rr = Math.min(60, 8 + s.pos.distanceTo(s.look) * 1.2); sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 1; sc.far = 400; sc.updateProjectionMatrix();
  }
}
const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.55).normalize();
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
  const root = new THREE.Group(), L = 4.75, W = 1.85, wb = 2.8, xf = wb / 2 - 0.05, xr = -wb / 2 - 0.05, tr = 0.335;
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
    const sill = 0.3 + 0.13 * nose ** 2 + 0.1 * tail ** 2;
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
      const a = (j / NC) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), e = 0.3;
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
  const gx0 = -L / 2 + 0.13 * L, gx1 = -L / 2 + 0.775 * L, NG = 40, gp: number[] = [], gPaint: number[] = [], gGlass: number[] = [];
  const sec = (x: number) => { const p = prof(x), hb = p.hw * 0.94, hr = p.hw * 0.7, yr = Math.max(p.roof, p.belt + 0.02), yg = p.belt + (yr - p.belt) * 0.86;
    return [[-hb, p.belt], [-(hr + 0.06), yg], [-hr, yr], [0, yr + 0.03], [hr, yr], [hr + 0.06, yg], [hb, p.belt]] as [number, number][]; };
  for (let i = 0; i <= NG; i++) { const x = gx0 + ((gx1 - gx0) * i) / NG; for (const [z, y] of sec(x)) gp.push(x, y, z); }
  for (let i = 0; i < NG; i++) {
    const x = gx0 + ((gx1 - gx0) * (i + 0.5)) / NG, u = (x + L / 2) / L, ramp = u < 0.24 || u > 0.62, pillar = Math.abs(u - 0.47) < 0.013;
    for (let j = 0; j < 6; j++) {
      const a = i * 7 + j, b = a + 7, quad = [a, b, a + 1, a + 1, b, b + 1];
      const side = j === 0 || j === 5, rail = j === 1 || j === 4, top = j === 2 || j === 3;
      ((side && !pillar) || (top && ramp) ? gGlass : gPaint).push(...quad); void rail;
    }
  }
  // end caps (base of the screens) close the greenhouse onto the deck
  const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  gg.setIndex([...gPaint, ...gGlass]); gg.addGroup(0, gPaint.length, 0); gg.addGroup(gPaint.length, gGlass.length, 1); gg.computeVertexNormals();
  const pd = paintM.clone(); pd.side = THREE.DoubleSide; const gd = glassM.clone(); gd.side = THREE.DoubleSide; gd.opacity = 0.78;
  const green = new THREE.Mesh(gg, [pd, gd]); green.castShadow = true; root.add(green);
  void lower;
  // arches + skirts (black), wheels
  const tyreM = new THREE.MeshStandardMaterial({ color: "#1a1a1c", roughness: 0.9 });
  const rimTex = tex(256, 256, (g) => { g.fillStyle = "#2a2c30"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = "#c9ced6";
    for (let k = 0; k < 10; k++) { g.save(); g.translate(128, 128); g.rotate((k / 10) * 6.28); g.beginPath(); g.moveTo(-8, -20); g.lineTo(-14, -112); g.lineTo(14, -112); g.lineTo(8, -20); g.fill(); g.restore(); }
    g.strokeStyle = "#e4e8ee"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke(); g.fillStyle = "#3a3c42"; g.beginPath(); g.arc(128, 128, 24, 0, 7); g.fill(); g.fillStyle = "#c9ced6"; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill(); });
  const wheels: THREE.Group[] = [];
  for (const x of [xf, xr]) for (const s of [-1, 1]) {
    const wg = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(tr - 0.1, 0.105, 16, 40), tyreM); tyre.scale.z = 1.15; wg.add(tyre);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(tr - 0.09, 36), new THREE.MeshStandardMaterial({ map: rimTex, metalness: 0.8, roughness: 0.3, envMap: env })); rim.position.z = s * 0.05; if (s < 0) rim.rotation.y = Math.PI; wg.add(rim);
    wg.position.set(x, tr, s * (W / 2 - 0.12)); wg.traverse((o) => { o.castShadow = true; }); root.add(wg); wheels.push(wg);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(tr + 0.06, 0.03, 8, 24, Math.PI), blackM); arch.position.set(x, tr, s * (W / 2 - 0.02)); root.add(arch);
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
