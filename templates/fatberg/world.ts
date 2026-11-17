// The whole place as one three.js scene: Whitechapel Road (terraces with shopfronts, market stalls, buses, a tanker,
// a van, manholes), the Victorian sewer under it with the fatberg (a lumpy 250 m plug), the cutaway (soil face, the
// pipe sliced open, the fatberg's cross-section, the backed-up water), the CCTV crawler, and small interior sets for
// the inserts (kitchen, bathroom, office desk, museum gallery, fuel bench). update(id, f, camera) poses everything for
// shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, setSight, Kit, Ray, quad, inTheWay } from "./build";
import { ctex, rep, planksHD, cloudHD, brick, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, smooth, clamp01, ShotDef, setAt, SetName, Ws, SEW_Y, SEW_R, FLOOR_Y, FACE_X, END_X, MH_CAM, MH_FLOOD,
  LANE_OUT, LANE_IN, KITCHEN, BATH, OFFICE, MUSEUM, LAB, TABLE_H, CASE_AT, crawlX, crawlDrop, floodY, BUS_L, busIn, tankerX, busEndX,
  LID_T, TUB_AT3, FLIES_AT, W, SETUPS,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- painted textures ----------------
const asphaltTex = () => ctex("asphalt", 512, 512, (g, r) => {
  g.fillStyle = "#6e6b66"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, rad = 40 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() > 0.5 ? "rgba(90,92,100,0.35)" : "rgba(40,40,46,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
});
/** half-road tile 9 m (x) x 6 m (z): asphalt with the markings PAINTED IN (no decal geometry: thin strips a few mm
 *  above the road z-fight and flicker at distance, and the ink pass outlines them). north = centre at v = 0 */
const roadTex = (north: boolean) => ctex("road" + (north ? "N" : "S"), 1152, 768, (g, r) => {
  const P = 128; // px per metre
  g.fillStyle = "#6e6b66"; g.fillRect(0, 0, 1152, 768);
  for (let i = 0; i < 40; i++) { const x = r() * 1152, y = r() * 768, rad = 60 + r() * 140; for (const ox of [-1152, 0, 1152]) { const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad); gr.addColorStop(0, r() > 0.5 ? "rgba(96,94,92,0.3)" : "rgba(52,50,50,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad, 2 * rad, 2 * rad); } }
  // v (canvas y) runs across the road: y = 0 at z = 0 (centre) for the north half, y = 0 at z = -6 (kerb) for the south
  const yz = (z: number) => (north ? z : z + 6) * P;
  g.fillStyle = "#efece4"; g.fillRect(0, yz(north ? 0 : 0) - 0.06 * P, 4 * P, 0.12 * P); // centre dash (only drawn on the half that owns z = 0)
  if (!north) g.clearRect(0, 0, 0, 0);
  g.fillStyle = "#e8c03a";
  for (const z of north ? [5.55, 5.75] : [-5.75, -5.55]) g.fillRect(0, yz(z) - 0.05 * P, 1152, 0.1 * P);
  g.fillStyle = "#1c181b"; g.fillRect(0, north ? 768 - 0.13 * P : 0, 1152, 0.13 * P); // kerb edge (painted ink, steady)
});
const paveTex = () => ctex("pave", 512, 512, (g, r) => {
  g.fillStyle = "#aaa59c"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const v = 0.95 + 0.07 * r(); g.fillStyle = `rgb(${Math.round(188 * v)},${Math.round(182 * v)},${Math.round(172 * v)})`;
    g.fillRect(x * 256 + 6, y * 256 + 6, 244, 244);
  }
  for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(60,55,50,0.12)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 30, 6 + r() * 16, 0, 0, 7); g.fill(); }
});
const soilTex = () => ctex("soil", 1024, 1024, (g, r) => {
  g.fillStyle = "#86603e"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? "rgba(110,80,52,0.5)" : "rgba(98,68,44,0.45)"; const y = k * 150 + 40 * r(); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + 18 * Math.sin(x * 0.012 + k)); g.lineTo(1024, y + 70); g.lineTo(0, y + 70); g.fill(); }
  for (let i = 0; i < 140; i++) { const x = r() * 1024, y = r() * 1024, rx = 6 + r() * 18; g.fillStyle = ["#a99a86", "#8f8478", "#c2b49e", "#6e5a48"][i % 4]; g.beginPath(); g.ellipse(x, y, rx, rx * (0.6 + 0.3 * r()), r() * 3, 0, 7); g.fill(); g.strokeStyle = "rgba(50,35,25,0.6)"; g.lineWidth = 2.5; g.stroke(); }
});
const sewerBrickTex = () => ctex("sewerBrick", 512, 512, (g, r) => {
  g.fillStyle = "#5a3e30"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let i = 0; i < 8; i++) {
    const x = i * 64 + (row % 2) * 32 + 2, y = row * 32 + 2, v = 0.8 + 0.3 * r();
    for (const ox of [0, -512]) { g.fillStyle = `rgb(${Math.round(132 * v)},${Math.round(78 * v)},${Math.round(56 * v)})`; g.fillRect(x + ox, y, 60, 28); g.fillStyle = "rgba(255,220,190,0.1)"; g.fillRect(x + ox + 2, y, 56, 3); }
  }
  for (let i = 0; i < 16; i++) { const x = r() * 512, y = r() * 512, rad = 40 + r() * 80; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, i % 3 ? "rgba(60,62,40,0.35)" : "rgba(200,190,140,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, 2 * rad, 2 * rad); } }
});
export const fatTex = () => ctex("fatberg", 1024, 512, (g, r) => {
  g.fillStyle = "#c7b78c"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 90; i++) { const x = r() * 1024, y = r() * 512, rad = 20 + r() * 70; for (const ox of [-1024, 0, 1024]) { const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad); gr.addColorStop(0, ["rgba(150,138,104,0.55)", "rgba(222,212,178,0.55)", "rgba(120,108,82,0.45)", "rgba(184,170,120,0.5)"][i % 4]); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad, 2 * rad, 2 * rad); } }
  for (let i = 0; i < 70; i++) { // wipe fibres and scraps
    const x = r() * 1024, y = r() * 512, w = 14 + r() * 40, h = 6 + r() * 14, a = r() * 3;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = i % 5 ? "#f3f0e6" : "#e8d06a"; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = "rgba(60,50,40,0.5)"; g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
  }
  for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(90,80,60,0.45)"; g.lineWidth = 3; const x = r() * 1024, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 20 + 40 * r(), x + 70, y + 10 * r()); g.stroke(); }
});
const sludgeTex = () => ctex("sludge", 512, 512, (g, r) => {
  g.fillStyle = "#4d4532"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? "rgba(110,100,70,0.35)" : "rgba(30,28,20,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 40 + r() * 80, 16 + r() * 30, r() * 3, 0, 7); g.fill(); }
});
const floodTex = () => ctex("floodWater", 512, 512, (g, r) => {
  g.fillStyle = "#6b6a52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30; i++) { g.fillStyle = r() > 0.5 ? "rgba(140,140,110,0.4)" : "rgba(50,50,36,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 50 + r() * 90, 10 + r() * 20, 0, 0, 7); g.fill(); }
});
const tileTex = (key: string, a: string, grout: string, n = 8) => ctex("tile" + key, 512, 512, (g, r) => {
  g.fillStyle = grout; g.fillRect(0, 0, 512, 512);
  const s = 512 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = new THREE.Color(a).multiplyScalar(0.95 + 0.08 * r()); g.fillStyle = "#" + c.getHexString(); g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6); }
});
const plainTex = (key: string, a: string, b: string) => ctex("plain" + key, 512, 512, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20; i++) { const x = r() * 512, y = r() * 512, rad = 60 + r() * 100; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, b); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
});
const awningTex = (key: string, a: string, b: string) => ctex("awn" + key, 256, 128, (g) => {
  for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? a : b; g.fillRect(x, 0, 32, 128); }
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 112, 256, 16);
});
const picTex = (key: string, seed: number) => ctex("pic" + key, 256, 320, (g, r) => {
  g.fillStyle = "#c9a45a"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#efe6cf"; g.fillRect(18, 18, 220, 284);
  g.fillStyle = ["#7aa2c4", "#c48a6a", "#8ab07a"][seed % 3]; g.fillRect(34, 34, 188, 252);
  for (let i = 0; i < 5; i++) { g.fillStyle = ["#3f5a7a", "#efe6cf", "#a05a4a", "#5a7a4a", "#2e2a36"][(i + seed) % 5]; g.beginPath(); g.ellipse(60 + r() * 140, 80 + r() * 180, 20 + r() * 40, 14 + r() * 30, 0, 0, 7); g.fill(); }
});

/** a London Victorian terrace front: brick (yellow stock or red), sash windows with stone lintels, a shopfront with a
 *  plain coloured fascia (no lettering) and a dark glass window, a parapet line at the top */
const londonFacade = (seed: number, wm: number, hm: number) => {
  const PX = Math.min(64, 2048 / Math.max(wm, hm)), W2 = Math.round(wm * PX), H2 = Math.round(hm * PX), m = (v: number) => v * PX;
  return ctex(`lf${seed}_${wm}_${hm}`, W2, H2, (g) => {
    const r = rng(seed * 7 + 3);
    const red = seed % 3 === 1, base = red ? [168, 82, 58] : seed % 3 === 2 ? [176, 128, 84] : [190, 150, 98];
    g.fillStyle = red ? "#d9c2a4" : "#d8c9ac"; g.fillRect(0, 0, W2, H2);
    const bw = m(0.25), bh = m(0.085);
    for (let y = 0, row = 0; y < H2; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < W2; x += bw) {
      const v = 0.86 + 0.22 * r(); g.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`; g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
    for (let i = 0; i < 6; i++) { const x = r() * W2, y = r() * H2 * 0.7, rad = m(1 + r()); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(60,40,30,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    // shopfront (ground floor, 0 .. 3.6 m)
    const sf = H2 - m(3.6);
    const fasc = ["#2f5f4a", "#7a2e36", "#26324f", "#c9a03a", "#3f6a8a", "#5a3a5a", "#b85a2a"][seed % 7];
    g.fillStyle = "#e8e2d4"; g.fillRect(0, sf, W2, m(3.6));
    g.fillStyle = fasc; g.fillRect(m(0.15), sf + m(0.1), W2 - m(0.3), m(0.75));
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(m(0.15), sf + m(0.1), W2 - m(0.3), m(0.08));
    g.strokeStyle = "rgba(40,30,40,0.7)"; g.lineWidth = 3; g.strokeRect(m(0.15), sf + m(0.1), W2 - m(0.3), m(0.75));
    const gl = g.createLinearGradient(0, sf + m(1), 0, H2); gl.addColorStop(0, "#41506e"); gl.addColorStop(1, "#2c3650");
    const dw = m(1.0), win0 = m(0.35), win1 = W2 - m(0.35) - dw - m(0.25);
    g.fillStyle = gl; g.fillRect(win0, sf + m(1.05), win1 - win0, m(2.15));
    g.fillStyle = "rgba(255,255,255,0.22)"; for (const a of [0.25, 0.55]) { g.save(); g.translate(win0 + (win1 - win0) * a, sf + m(2.1)); g.rotate(0.7); g.fillRect(-m(0.06), -m(2), m(0.12), m(4)); g.restore(); }
    g.save(); g.beginPath(); g.rect(win0, sf + m(1.05), win1 - win0, m(2.15)); g.clip();
    for (let i = 0; i < 5; i++) { g.fillStyle = ["#d9a03a", "#c05a6a", "#5a8ac0", "#8ab07a", "#f2ead8"][(i + seed) % 5]; g.fillRect(win0 + m(0.3) + i * (win1 - win0 - m(0.6)) / 5, H2 - m(0.9), m(0.45), m(0.5)); }
    g.restore();
    g.strokeStyle = fasc; g.lineWidth = m(0.08); g.strokeRect(win0, sf + m(1.05), win1 - win0, m(2.15));
    g.fillStyle = fasc; g.fillRect(win1 + m(0.25), sf + m(1.05), dw, m(2.55)); // door
    g.fillStyle = "#41506e"; g.fillRect(win1 + m(0.37), sf + m(1.2), dw - m(0.24), m(1.1));
    // upper floors: sash windows
    const floors = Math.floor((hm - 3.6) / 2.9), nWin = Math.max(1, Math.floor(wm / 2.0));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W2) / nWin, by = sf - m(fl * 2.9 + 0.6), ww = m(0.95), wh = m(1.6 - fl * 0.12), x0 = cx - ww / 2, y0 = by - wh;
      g.fillStyle = "#ece4d2"; g.fillRect(x0 - m(0.12), y0 - m(0.22), ww + m(0.24), m(0.2)); // lintel
      g.fillStyle = "#ece4d2"; g.fillRect(x0 - m(0.1), by, ww + m(0.2), m(0.1)); // sill
      g.fillStyle = "#f4f0e6"; g.fillRect(x0, y0, ww, wh);
      const glw = g.createLinearGradient(0, y0, 0, by); glw.addColorStop(0, "#7d8fc4"); glw.addColorStop(1, "#4f5b96");
      g.fillStyle = glw; g.fillRect(x0 + m(0.07), y0 + m(0.07), ww - m(0.14), wh / 2 - m(0.1)); g.fillRect(x0 + m(0.07), y0 + wh / 2 + m(0.03), ww - m(0.14), wh / 2 - m(0.1));
      g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(x0 + m(0.14), y0 + m(0.12), m(0.06), wh / 2 - m(0.2));
      if (r() < 0.4) { g.fillStyle = ["#f3e3c6", "#d7e6cf", "#f5c4c8"][Math.floor(r() * 3)]; g.fillRect(x0 + m(0.07), y0 + m(0.07), m(0.2), wh - m(0.14)); }
      g.strokeStyle = "rgba(40,30,40,0.55)"; g.lineWidth = 2; g.strokeRect(x0, y0, ww, wh);
    }
    g.fillStyle = "#ece4d2"; g.fillRect(0, 0, W2, m(0.35)); g.fillStyle = "rgba(40,30,40,0.35)"; g.fillRect(0, m(0.35), W2, 3);
  });
};

/** street sight lines (houses/stalls in the way of any street camera are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    const set = setAt(s.id, Math.max(0, f));
    if (set !== "street") continue;
    const c = camAt(s.id, Math.max(0, f));
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

/** quad facing up at height y covering x0..x1, z0..z1 */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
/** road half quad: v = 0 at the z that the texture's top row maps to (north: z0 = centre; south: z0 = kerb) */
function quadUpUV(x0: number, x1: number, z0: number, z1: number, u: number, _v: number, south: boolean) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, 0, z1, x1, 0, z1, x1, 0, z0, x0, 0, z1, x1, 0, z0, x0, 0, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  // canvas y grows downward = texture v decreasing; canvas row 0 (v = 1) sits at z0
  const vz1 = 0, vz0 = 1; void south;
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, vz1, u, vz1, u, vz0, 0, vz1, u, vz0, 0, vz0], 2));
  return g;
}
/** quad facing +z (toward a camera at +z) at depth z */
const quadZ = (x0: number, x1: number, y0: number, y1: number, z: number, u = 1, v = 1) => quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z), u, v);
/** lumpy rock / blob geometry (smooth normals) */
const lumpGeo = (seed: number, det = 2, amp = 0.28) => {
  const g0 = new THREE.IcosahedronGeometry(1, det); g0.deleteAttribute("normal"); g0.deleteAttribute("uv");
  const g = mergeVertices(g0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * (Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 1.3) * Math.sin(z * 3.3 + seed * 0.7));
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
};

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
  private street = new THREE.Group(); private north = new THREE.Group(); private cut = new THREE.Group();
  private under = new THREE.Group(); private tubeFront = new THREE.Group(); private deposits = new THREE.Group();
  private sets: Record<"kitchen" | "bath" | "office" | "museum" | "lab", THREE.Group> = { kitchen: new THREE.Group(), bath: new THREE.Group(), office: new THREE.Group(), museum: new THREE.Group(), lab: new THREE.Group() };
  private fat3d!: THREE.Mesh; private fatCut!: THREE.Mesh; private flood!: THREE.Mesh;
  private crawler = new THREE.Group(); private cable!: THREE.Mesh;
  private buses: THREE.Group[] = []; private hookBus!: THREE.Group; private endBus!: THREE.Group;
  private tankers: THREE.Group[] = []; private parkedTanker!: THREE.Group;
  private lid!: THREE.Mesh; private pustules: THREE.Mesh[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    R.add(this.street, this.cut, this.under, ...Object.values(this.sets));
    this.street.add(this.north);
    this.under.add(this.tubeFront, this.deposits);
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
      this.clouds.push(m); this.street.add(m);
    }
    setSight(sightLines());
    this.buildStreet();
    this.buildUnder();
    this.buildCut();
    this.buildVehicles();
    this.buildSets();
  }

  // ---------------- Whitechapel Road ----------------
  private buildStreet() {
    const b = new Batch(), bn = new Batch(), gs = new Batch(), gn = new Batch();
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) })), pave = lam("pave", () => ({ map: rep(paveTex(), 1, 1) }));
    const kerb = lam("kerb", () => ({ color: "#a9a59c" })), white = lam("roadWhite", () => ({ color: "#efece4" })), yellow = lam("roadYellow", () => ({ color: "#e8c03a" }));
    // road halves with the markings painted in (u: 9 m tiles along x; v: 0..1 across the half)
    const roadS = lam("roadS", () => ({ map: roadTex(false) })), roadN = lam("roadN", () => ({ map: roadTex(true) }));
    gs.add(quadUpUV(-702, 702, -6, 0, 1404 / 9, 1, true), roadS); gn.add(quadUpUV(-702, 702, 0, 6, 1404 / 9, 1, false), roadN); void asph;
    // ground = road + kerb + pavement: ONE seamless surface per side and never inked (ground/ground seams open
    // sub-pixel cracks -> dashed ink lines; a 15 cm kerb seen edge-on is a 1-2 px sliver -> its line blinks).
    // The kerb edge is painted into the road texture instead, so it is always there.
    gs.add(quadUp(-700, 700, -60, -6.2, 700, 26.9, 0.15), pave); gn.add(quadUp(-700, 700, 6.2, 60, 700, 26.9, 0.15), pave);
    gs.add(boxGeo(V(-700, 0, -6.2), V(700, 0.15, -6)), kerb); gn.add(boxGeo(V(-700, 0, 6), V(700, 0.15, 6.2)), kerb);
    // flat decals (road paint, manhole covers) go on NOINK: a 6 mm "depth jump" makes a flickering ink line at distance
    const ds = new Batch(), dn = new Batch();
    void white; void yellow;
    // manhole covers dotted along the sewer line
    const iron = lam("manholeIron", () => ({ color: "#3a3a40" }));
    for (const x of [-190, -100, -60, -20, 20, 60, 100]) dn.add(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 24), iron, new THREE.Matrix4().makeTranslation(x, 0.01, 0));
    // the open manhole (crawler) + its lid lying beside it, barriers and cones
    dn.add(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24), lam("hole", () => ({ color: "#0e0c0c" })), new THREE.Matrix4().makeTranslation(MH_CAM[0], 0.012, MH_CAM[2]));
    bn.add(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 24), iron, new THREE.Matrix4().makeTranslation(MH_CAM[0] + 0.95, 0.025, MH_CAM[2] + 0.5));
    const cone = lam("cone", () => ({ color: "#f07a2a" })), band = lam("coneBand", () => ({ color: "#f6f4ee" }));
    const cones = (x: number, z: number) => { bn.add(new THREE.ConeGeometry(0.16, 0.6, 14).translate(0, 0.3, 0), cone, new THREE.Matrix4().makeTranslation(x, 0, z)); bn.add(new THREE.CylinderGeometry(0.105, 0.125, 0.1, 14), band, new THREE.Matrix4().makeTranslation(x, 0.34, z)); bn.add(boxGeo(V(x - 0.2, 0, z - 0.2), V(x + 0.2, 0.04, z + 0.2)), cone); };
    for (const [dx, dz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [-2.6, 0], [2.4, 1.2]]) cones(MH_CAM[0] + dx, MH_CAM[2] + dz);
    for (const [dx, dz] of [[1.5, -1.2], [-1.6, -1.3]]) cones(MH_FLOOD[0] + dx, MH_FLOOD[2] + dz);
    // terraces both sides: x from -300 to 90
    const terr = (bb: Batch, x0: number, side: 1 | -1, seedBase: number) => {
      let x = x0, k = seedBase;
      while (x < 90) {
        const w = [6.5, 7.5, 8.5, 9.5][k % 4], h = [12, 13.4, 15.2, 11.2][(k * 3) % 4], d = 12, zf = side * 10;
        const z0 = side > 0 ? zf : zf - d, z1 = side > 0 ? zf + d : zf;
        if (!inTheWay(x, x + w, 0, h + 1.5, z0, z1)) {
          const fac = lam(`lf${k % 14}_${w}_${h}`, () => ({ map: londonFacade(k % 14, w, h) }));
          const sideM = lam("terrSide" + (k % 3), () => ({ map: rep(brick(), w / 4, h / 4), color: ["#e0b090", "#c8a080", "#d8b890"][k % 3] }));
          if (side > 0) bb.add(quad(V(x + w, 0, zf), V(x, 0, zf), V(x, h, zf), V(x + w, h, zf)), fac);
          else bb.add(quad(V(x, 0, zf), V(x + w, 0, zf), V(x + w, h, zf), V(x, h, zf)), fac);
          bb.add(boxGeo(V(x + 0.02, 0, Math.min(z0, z1) + (side > 0 ? 0.02 : 0)), V(x + w - 0.02, h, Math.max(z0, z1) - (side > 0 ? 0 : 0.02))), sideM);
          // parapet + cornice + chimney stack
          bb.add(boxGeo(V(x, h - 0.05, zf - (side > 0 ? 0 : 0.25)), V(x + w, h + 0.7, zf + (side > 0 ? 0.25 : 0))), lam("parapet", () => ({ color: "#e4dccb" })));
          bb.add(boxGeo(V(x - 0.05, 3.55, zf - (side > 0 ? 0.05 : 0.3)), V(x + w + 0.05, 3.85, zf + (side > 0 ? 0.3 : 0.05))), lam("shopCornice", () => ({ color: "#efe6d4" })));
          const cx = x + w * (0.3 + 0.4 * hash(k, 3)), cz = zf + side * 6;
          bb.add(boxGeo(V(cx - 0.9, h, cz - 0.4), V(cx + 0.9, h + 1.9, cz + 0.4)), lam("stack", () => ({ map: rep(brick(), 1, 1), color: "#d8a080" })));
          for (let i = 0; i < 3; i++) bb.add(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 10).translate(0, 0.25, 0), lam("pot", () => ({ color: "#b8684a" })), new THREE.Matrix4().makeTranslation(cx - 0.55 + i * 0.55, h + 1.9, cz));
          // pitched slate roof behind the parapet
          const rm = lam("slate", () => ({ color: "#5d6474", side: THREE.DoubleSide }));
          const zr0 = zf + side * 0.3, zr1 = zf + side * 11.7, zm = (zr0 + zr1) / 2;
          bb.add(quad(V(x, h, zr0), V(x + w, h, zr0), V(x + w, h + 3, zm), V(x, h + 3, zm)), rm);
        }
        x += w; k++;
      }
    };
    terr(b, -300, -1, 2); terr(bn, -296, 1, 7);
    // Whitechapel market stalls on the north pavement
    for (let i = 0; i < 6; i++) {
      const x = -186 + i * 5.2, z = 7.8;
      if (inTheWay(x - 1.6, x + 1.6, 0, 2.8, z - 1.1, z + 1.1)) continue;
      const aw = lam("awn" + (i % 3), () => ({ map: awningTex("a" + (i % 3), ["#c8323a", "#2f6fb5", "#2f8a4f"][i % 3], "#f6f3ec"), side: THREE.DoubleSide }));
      bn.add(boxGeo(V(x - 1.5, 0.15, z - 0.9), V(x + 1.5, 1.0, z + 0.9)), lam("stallWood", () => ({ color: "#8a5a34" })));
      bn.add(quad(V(x - 1.7, 2.3, z - 1.2), V(x + 1.7, 2.3, z - 1.2), V(x + 1.7, 2.7, z + 1.0), V(x - 1.7, 2.7, z + 1.0)), aw);
      for (const dx of [-1.5, 1.5]) for (const dz of [-0.9, 0.9]) bn.add(boxGeo(V(x + dx - 0.04, 0.15, z + dz - 0.04), V(x + dx + 0.04, 2.5, z + dz + 0.04)), lam("stallPole", () => ({ color: "#3a3d47" })));
      for (let k = 0; k < 6; k++) bn.add(new THREE.SphereGeometry(0.13, 10, 8), lam("fruit" + (k % 4), () => ({ color: ["#e8a020", "#d23b3b", "#8ab03a", "#f3d35a"][k % 4] })), new THREE.Matrix4().makeTranslation(x - 1.1 + k * 0.45, 1.1, z - 0.4 + (k % 2) * 0.5));
    }
    b.build(this.street); bn.build(this.north);
    const decal = (bb: Batch, parent: THREE.Object3D) => { const g = new THREE.Group(); bb.build(g, false); g.traverse((o) => o.layers.set(NOINK)); parent.add(g); };
    decal(ds, this.street); decal(dn, this.north); decal(gs, this.street); decal(gn, this.north);
  }

  // ---------------- the sewer + the fatberg ----------------
  private buildUnder() {
    const brickM = new THREE.MeshLambertMaterial({ map: rep(sewerBrickTex(), 4, 120), side: THREE.DoubleSide });
    twoTone(brickM, 0.6);
    const L = 340;
    const half = (start: number) => { const g = new THREE.CylinderGeometry(SEW_R, SEW_R, L, 28, 1, true, start, Math.PI); g.rotateZ(Math.PI / 2); g.translate(0, SEW_Y, 0); return g; };
    const back = new THREE.Mesh(half(Math.PI / 2), brickM), front = new THREE.Mesh(half(-Math.PI / 2), brickM);
    for (const m of [back, front]) { m.receiveShadow = true; m.castShadow = false; }
    this.under.add(back); this.tubeFront.add(front);
    // sludge on the invert
    const hw = Math.sqrt(SEW_R * SEW_R - (FLOOR_Y - SEW_Y) ** 2) + 0.02;
    const sl = lam("sludge", () => ({ map: rep(sludgeTex(), 1, 1) })); // 2 m tiles, soft blotches only
    const ub = new Batch(), fb = new Batch();
    ub.add(quadUp(-170, 170, -hw, 0, 170, 1, FLOOR_Y), sl); fb.add(quadUp(-170, 170, 0, hw, 170, 1, FLOOR_Y), sl);
    // access shafts
    const shaftM = lam("shaft", () => ({ map: rep(sewerBrickTex(), 2, 3), side: THREE.DoubleSide }));
    for (const x of [MH_CAM[0], MH_FLOOD[0]]) ub.add(new THREE.CylinderGeometry(0.42, 0.42, -SEW_Y - 0.7, 18, 1, true), shaftM, new THREE.Matrix4().makeTranslation(x, (SEW_Y + 0.7) / 2 - 0.01, 0));
    ub.build(this.under, false); fb.build(this.tubeFront, false);
    // deposits on the walls in front of the plug: fat, more fat, then wipes and nappies (crawler ride)
    const db = new Batch();
    const fats = [lam("fatA", () => ({ color: "#d8c58e" })), lam("fatB", () => ({ color: "#bfb38c" })), lam("fatC", () => ({ color: "#9d9070" }))];
    const lumps = [0, 1, 2, 3].map((k) => lumpGeo(k * 1.7 + 0.4));
    let n = 0;
    for (let x = -158.5; x < FACE_X - 0.5; x += 0.14) {
      const dens = x < -148 ? 0.22 : x < -136 ? 0.5 : 0.85;
      if (hash(n++, 1) > dens) continue;
      const a = (-0.55 + 1.6 * hash(n, 2)) * Math.PI; // around the wall, most on the lower half and sides
      const ca = Math.cos(a), sa = Math.sin(a);
      if (SEW_Y + SEW_R * sa < FLOOR_Y + 0.05) continue;
      const s = (x < -148 ? 0.07 : 0.1) + 0.11 * hash(n, 3) + (x > -133 ? 0.08 : 0);
      const qn = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, sa, ca)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(n, 4) * 6));
      const m = new THREE.Matrix4().compose(V(x, SEW_Y + SEW_R * 0.97 * sa, SEW_R * 0.97 * ca), qn, V(s * 1.7, s * 0.6, s * 1.3));
      db.add(lumps[n % 4], fats[n % 3], m);
    }
    // grease drips hanging from the crown
    for (let i = 0; i < 40; i++) { const x = -150 + 24 * hash(i, 9), a = Math.PI / 2 + (hash(i, 10) - 0.5) * 1.2; db.add(new THREE.ConeGeometry(0.05, 0.25 + 0.2 * hash(i, 11), 8).rotateX(Math.PI), fats[0], new THREE.Matrix4().makeTranslation(x, SEW_Y + SEW_R * 0.9 * Math.sin(a) - 0.1, SEW_R * 0.9 * Math.cos(a))); }
    // lumps over the plug's nose (hides the pole of the nose mesh)
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2, rr2 = i ? 0.32 : 0;
      db.add(lumps[i % 4], fats[i % 2], new THREE.Matrix4().compose(V(FACE_X - 0.55 + (i ? 0.12 : 0), SEW_Y + rr2 * Math.sin(a), rr2 * Math.cos(a)), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, 0)), V(i ? 0.16 : 0.24, i ? 0.2 : 0.28, i ? 0.2 : 0.28)));
    }
    // wet wipes (crumpled sheets) and nappies
    const wipeM = lam("wipe", () => ({ color: "#f4f3ee", side: THREE.DoubleSide })), nappyM = lam("nappy", () => ({ color: "#f6f5f0" })), tabM = lam("nappyTab", () => ({ color: "#6fa8dc" }));
    for (let i = 0; i < 60; i++) {
      const x = -139 + 13 * hash(i, 12) ** 0.7, a = (-0.45 + 1.4 * hash(i, 13)) * Math.PI;
      const g = new THREE.PlaneGeometry(0.34, 0.3, 5, 5), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, 0.05 * Math.sin(p.getX(k) * 19 + i) * Math.cos(p.getY(k) * 17 + i));
      g.computeVertexNormals();
      const yy = Math.max(FLOOR_Y + 0.15, SEW_Y + SEW_R * 0.9 * Math.sin(a));
      db.add(g, wipeM, new THREE.Matrix4().compose(V(x, yy, SEW_R * 0.88 * Math.cos(a)), new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(i, 14) * 2, hash(i, 15) * 3, hash(i, 16))), V(1, 1, 1)));
    }
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 40) * Math.PI * 2, rr2 = 0.75 * Math.sqrt(hash(i, 41)), x = FACE_X - 0.5 * Math.sqrt(Math.max(0, 1 - (rr2 / 0.95) ** 2)) - 0.03;
      const g = new THREE.PlaneGeometry(0.3, 0.26, 4, 4), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, 0.04 * Math.sin(p.getX(k) * 21 + i) * Math.cos(p.getY(k) * 15 + i));
      g.computeVertexNormals();
      db.add(g, wipeM, new THREE.Matrix4().compose(V(x, SEW_Y + rr2 * Math.sin(a), rr2 * Math.cos(a)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3 * hash(i, 42), -Math.PI / 2 + 0.4 * (hash(i, 43) - 0.5), hash(i, 44) * 3)), V(1, 1, 1)));
    }
    for (let i = 0; i < 16; i++) {
      const x = -134 + 7.5 * hash(i, 17), zz = (hash(i, 18) > 0.5 ? 1 : -1) * (0.38 + 0.18 * hash(i, 18)), yy = FLOOR_Y + 0.06;
      const m = new THREE.Matrix4().compose(V(x, yy, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, hash(i, 19) * 3, 0.15)), V(1, 1, 1));
      db.add(new THREE.CapsuleGeometry(0.15, 0.34, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.75, 1.3), nappyM, m);
      db.add(boxGeo(V(-0.08, 0.04, -0.21), V(0.08, 0.12, 0.21)), tabM, m);
    }
    db.build(this.deposits, false);
    // the fatberg: a lumpy plug filling the pipe from FACE_X (a rounded nose) to END_X
    const fatM = twoTone(new THREE.MeshLambertMaterial({ map: rep(fatTex(), 1, 1) }), 0.6);
    const ND = 0.55, xs: number[] = []; for (let d = ND; d > 0; d -= 0.04) xs.push(FACE_X - d); for (let x = FACE_X; x <= END_X; x += 0.5) xs.push(x); for (let d = 0.06; d <= 0.9; d += 0.06) xs.push(END_X + d);
    const NR = 36, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    xs.forEach((x, i) => {
      const nose = x < FACE_X ? Math.sqrt(Math.max(0, 1 - ((FACE_X - x) / ND) ** 2)) : x > END_X ? Math.sqrt(Math.max(0, 1 - ((x - END_X) / 0.9) ** 2)) : 1;
      for (let j = 0; j <= NR; j++) {
        const a = (j / NR) * Math.PI * 2, lumpy = 1 - 0.07 * (0.5 + 0.5 * Math.sin(a * 5 + x * 1.7) * Math.cos(a * 3 - x * 0.9)) - 0.04 * hash(i * 7 + j, 2);
        const r = SEW_R * 0.975 * Math.max(0.04, nose) * (nose < 1 ? 0.92 + 0.08 * lumpy : lumpy);
        const bump = x < FACE_X ? 0.09 * Math.sin(a * 4 + 1.3) * Math.sin((FACE_X - x) * 9 + j * 0.7) - 0.05 * hash(i * 13 + j, 5) : 0;
        const yy = SEW_Y + r * Math.sin(a), zz = r * Math.cos(a);
        pos.push(x + bump, yy, zz); uv.push(x < FACE_X + 0.5 ? 0.5 + zz * 0.22 : j / NR, x < FACE_X + 0.5 ? (yy - SEW_Y) * 0.3 : x / 3);
      }
    });
    for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + 1, c = a + NR + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
    this.fat3d = new THREE.Mesh(fg, fatM); this.fat3d.receiveShadow = true;
    this.under.add(this.fat3d);
    // the CCTV crawler: yellow body, camera head with a glowing lens, four wheels, a cable behind
    const cb = new Batch();
    cb.add(boxGeo(V(-0.24, 0.07, -0.14), V(0.2, 0.25, 0.14)), lam("crawlBody", () => ({ color: "#f2c230" })));
    cb.add(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16).rotateZ(Math.PI / 2), lam("crawlHead", () => ({ color: "#3a3d47" })), new THREE.Matrix4().makeTranslation(0.22, 0.24, 0));
    for (const x of [-0.16, 0.12]) for (const z of [-0.16, 0.16]) cb.add(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14).rotateX(Math.PI / 2), lam("crawlWheel", () => ({ color: "#1d1b22" })), new THREE.Matrix4().makeTranslation(x, 0.075, z));
    cb.build(this.crawler, false);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.4) }));
    lens.position.set(0.305, 0.24, 0); lens.layers.set(NOINK); this.crawler.add(lens);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("glow", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,250,220,0.9)"); gr.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: false }));
    glow.scale.setScalar(0.35); glow.position.set(0.33, 0.24, 0); glow.layers.set(NOINK); this.crawler.add(glow);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), lam("cable", () => ({ color: "#1d1b22" })));
    this.root.add(this.crawler, this.cable);
  }

  // ---------------- the cutaway: soil face, pit, the fatberg's cross-section, the backed-up water ----------------
  private buildCut() {
    const b = new Batch();
    const soil = lam("soil", () => ({ map: rep(soilTex(), 1, 1) })), tar = lam("roadBed", () => ({ color: "#3a3a40" })), hard = lam("subbase", () => ({ color: "#8a8276" }));
    b.add(quadZ(-400, 400, -0.32, 0, 0, 1, 1), tar);
    b.add(quadZ(-400, 400, -0.75, -0.32, 0, 200, 1), hard);
    b.add(quadZ(-400, 400, SEW_Y + SEW_R + 0.22, -0.75, 0, 200, 1.0), soil);
    b.add(quadZ(-400, 400, -10, SEW_Y - SEW_R - 0.22, 0, 200, 3), soil);
    const rim = lam("rimBrick", () => ({ map: rep(brick(), 200, 0.45), color: "#c07858" }));
    const rb = new Batch();
    rb.add(quadZ(-400, 400, SEW_Y + SEW_R, SEW_Y + SEW_R + 0.22, 0.004, 200, 0.45), rim);
    rb.add(quadZ(-400, 400, SEW_Y - SEW_R - 0.22, SEW_Y - SEW_R, 0.004, 200, 0.45), rim);
    const rg = new THREE.Group(); rb.build(rg, false); rg.traverse((o) => o.layers.set(NOINK)); this.cut.add(rg);
    b.add(quadZ(-400, 400, 0.15 - 0.15, 0.15, -10 + 0.001, 1, 1), lam("kerbFace", () => ({ color: "#a9a59c" })));
    // the pit in front: floor and a far wall
    b.add(quadUp(-400, 400, 0, 45, 200, 22, -10), lam("pitFloor", () => ({ map: rep(soilTex(), 1, 1), color: "#a08a78" })));
    b.add(quad(V(400, -10, 45), V(-400, -10, 45), V(-400, 0, 45), V(400, 0, 45), 200, 5), soil);
    b.build(this.cut, false);
    // fatberg cross-section: flat lumpy-edged band from the nose to END_X
    const sh = new THREE.Shape(), r = SEW_R * 0.97;
    sh.moveTo(FACE_X, SEW_Y - r);
    sh.lineTo(END_X, SEW_Y - r); sh.lineTo(END_X, SEW_Y + r); sh.lineTo(FACE_X, SEW_Y + r);
    for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + (i / 24) * Math.PI, k = 1 + 0.04 * Math.sin(i * 2.3); sh.lineTo(FACE_X + 0.9 * Math.cos(a) * k, SEW_Y + r * Math.sin(a) * k); }
    const sg = new THREE.ShapeGeometry(sh, 4);
    const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 1.25);
    this.fatCut = new THREE.Mesh(sg, twoTone(new THREE.MeshLambertMaterial({ map: rep(fatTex(), 1, 1) }), 0.6));
    this.fatCut.position.z = 0.012; this.fatCut.receiveShadow = true; this.cut.add(this.fatCut);
    // the backed-up water (section), scaled in y per frame
    const fg = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
    this.flood = new THREE.Mesh(fg, twoTone(new THREE.MeshLambertMaterial({ map: rep(floodTex(), 30, 1) }), 0.6));
    this.flood.position.set(-200, FLOOR_Y, 0.008); this.flood.scale.set(FACE_X - 0.85 + 200, 0.01, 1);
    this.cut.add(this.flood);
  }

  // ---------------- vehicles ----------------
  private bus(): THREE.Group {
    const g = new THREE.Group(), b = new Batch(), L = BUS_L, w = 1.27;
    const red = lam("busRed", () => ({ color: "#cf2a2e" })), glass = lam("busGlass", () => ({ color: "#2c3652" })), dark = lam("busDark", () => ({ color: "#26242a" }));
    b.add(boxGeo(V(-L, 0.45, -w), V(0, 4.3, w)), red);
    b.add(boxGeo(V(-L + 0.4, 1.25, -w - 0.02), V(-0.6, 2.15, w + 0.02)), glass);
    b.add(boxGeo(V(-L + 0.4, 2.75, -w - 0.02), V(-0.3, 3.8, w + 0.02)), glass);
    b.add(boxGeo(V(-0.25, 1.1, -w + 0.12), V(0.02, 2.2, w - 0.12)), glass);
    b.add(boxGeo(V(-0.25, 2.75, -w + 0.12), V(0.02, 3.8, w - 0.12)), glass);
    b.add(boxGeo(V(-0.2, 3.85, -0.7), V(0.03, 4.15, 0.7)), dark);
    b.add(boxGeo(V(-L - 0.02, 2.75, -w + 0.12), V(-L + 0.2, 3.8, w - 0.12)), glass);
    b.add(boxGeo(V(-L, 0.35, -w), V(0, 0.55, w)), dark);
    b.add(boxGeo(V(-L, 2.25, -w - 0.03), V(0, 2.4, w + 0.03)), lam("busBand", () => ({ color: "#e8e2d4" })));
    for (const x of [-1.9, -L + 2.4]) for (const z of [-w + 0.05, w - 0.05]) b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 18).rotateX(Math.PI / 2), dark, new THREE.Matrix4().makeTranslation(x, 0.5, z));
    for (const z of [-0.85, 0.85]) b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12).rotateZ(Math.PI / 2), lam("lamp", () => ({ color: "#fff3c4" })), new THREE.Matrix4().makeTranslation(0.02, 0.85, z));
    b.build(g);
    return g;
  }
  private tanker(): THREE.Group {
    const g = new THREE.Group(), b = new Batch();
    const cab = lam("tankCab", () => ({ color: "#f2f2ee" })), steel = lam("tankSteel", () => ({ color: "#b9c0c8" })), blue = lam("tankBlue", () => ({ color: "#2f6fb5" })), dark = lam("busDark", () => ({ color: "#26242a" }));
    b.add(boxGeo(V(-2.3, 0.6, -1.25), V(0, 3.0, 1.25)), cab);
    b.add(boxGeo(V(-0.6, 1.8, -1.1), V(0.02, 2.7, 1.1)), lam("busGlass", () => ({ color: "#2c3652" })));
    b.add(boxGeo(V(-9.5, 0.5, -1.15), V(-2.3, 1.0, 1.15)), dark);
    b.add(new THREE.CylinderGeometry(1.15, 1.15, 6.8, 24).rotateZ(Math.PI / 2), steel, new THREE.Matrix4().makeTranslation(-6, 2.15, 0));
    b.add(new THREE.CylinderGeometry(1.17, 1.17, 0.6, 24).rotateZ(Math.PI / 2), blue, new THREE.Matrix4().makeTranslation(-6, 2.15, 0));
    b.add(boxGeo(V(-2.32, 1.0, -1.27), V(0.02, 1.25, 1.27)), blue);
    for (const x of [-1.2, -6.5, -8.3]) for (const z of [-1.05, 1.05]) b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16).rotateX(Math.PI / 2), dark, new THREE.Matrix4().makeTranslation(x, 0.5, z));
    b.build(g);
    return g;
  }
  private buildVehicles() {
    for (let i = 0; i < 11; i++) { const g = this.bus(); g.position.set(FACE_X + (i + 1) * (BUS_L + 2.6), 0, LANE_OUT); this.buses.push(g); this.street.add(g); }
    this.hookBus = this.bus(); this.street.add(this.hookBus);
    this.endBus = this.bus(); this.endBus.rotation.y = Math.PI; this.street.add(this.endBus);
    for (let i = 0; i < 3; i++) { const g = this.tanker(); this.tankers.push(g); this.street.add(g); }
    this.parkedTanker = this.tanker(); this.parkedTanker.position.set(-104, 0, 1.6); this.parkedTanker.rotation.y = Math.PI; this.street.add(this.parkedTanker);
    // the white van by the crawler manhole
    const vb = new Batch(), van = new THREE.Group();
    vb.add(boxGeo(V(-5.2, 0.4, -1.0), V(0, 2.5, 1.0)), lam("van", () => ({ color: "#f2f2ee" })));
    vb.add(boxGeo(V(-1.0, 1.4, -1.02), V(0.02, 2.2, 1.02)), lam("busGlass", () => ({ color: "#2c3652" })));
    vb.add(boxGeo(V(-5.2, 1.0, -1.02), V(0, 1.2, 1.02)), lam("tankBlue", () => ({ color: "#2f6fb5" })));
    for (const x of [-0.9, -4.2]) for (const z of [-0.9, 0.9]) vb.add(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 14).rotateX(Math.PI / 2), lam("busDark", () => ({ color: "#26242a" })), new THREE.Matrix4().makeTranslation(x, 0.4, z));
    vb.build(van); van.position.set(MH_CAM[0] - 3.2, 0, -3.4); this.street.add(van);
    // the flood manhole's lid (animated)
    this.lid = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 24), lam("manholeIron", () => ({ color: "#3a3a40" })));
    this.lid.position.set(MH_FLOOD[0], 0.025, MH_FLOOD[2]); this.lid.castShadow = true; this.street.add(this.lid);
  }

  // ---------------- interior sets ----------------
  private room(gr: THREE.Group, c: V3, wall: THREE.Texture, floor?: THREE.Texture) {
    const b = new Batch(), [x, , z] = c;
    const wm = lam("room" + x, () => ({ map: wall, side: THREE.DoubleSide }));
    b.add(quadUp(x - 6, x + 6, z - 6, z + 6, 3, 3, 0.002), lam("floor" + x, () => ({ map: floor ?? rep(planksHD(), 1, 1) })));
    b.add(quad(V(x - 6, 0, z + 6), V(x + 6, 0, z + 6), V(x + 6, 4, z + 6), V(x - 6, 4, z + 6)), wm);
    b.add(quad(V(x - 6, 0, z - 6), V(x - 6, 0, z + 6), V(x - 6, 4, z + 6), V(x - 6, 4, z - 6)), wm);
    b.add(quad(V(x + 6, 0, z + 6), V(x + 6, 0, z - 6), V(x + 6, 4, z - 6), V(x + 6, 4, z + 6)), wm);
    b.add(quad(V(x - 6, 4, z + 6), V(x + 6, 4, z + 6), V(x + 6, 4, z - 6), V(x - 6, 4, z - 6)), lam("ceiling", () => ({ color: "#f2ead8", side: THREE.DoubleSide })));
    b.add(boxGeo(V(x - 6, 0, z + 5.9), V(x + 6, 0.2, z + 6)), lam("skirting", () => ({ color: "#5a3a26" })));
    b.build(gr, false);
  }
  private buildSets() {
    const G = 0;
    // kitchen: worktop with the soap and sink inserts, cupboards behind
    this.room(this.sets.kitchen, KITCHEN, rep(tileTex("k", "#e9e2cc", "#b8b09c"), 6, 2));
    const kb = new Batch();
    kb.add(boxGeo(V(KITCHEN[0] - 3, G, KITCHEN[2] + 3.25), V(KITCHEN[0] + 3, TABLE_H, KITCHEN[2] + 3.95)), lam("cupboard", () => ({ color: "#5f8a76" })));
    kb.add(boxGeo(V(KITCHEN[0] - 3.05, TABLE_H, KITCHEN[2] + 2.75), V(KITCHEN[0] + 3.05, TABLE_H + 0.05, KITCHEN[2] + 3.98)), lam("worktop", () => ({ color: "#d8c4a0" })));
    for (let i = 0; i < 5; i++) kb.add(boxGeo(V(KITCHEN[0] - 2.8 + i * 1.15, 1.7, KITCHEN[2] + 5.4), V(KITCHEN[0] - 1.8 + i * 1.15, 2.6, KITCHEN[2] + 5.95)), lam("wallCup", () => ({ color: "#6f9a86" })));
    kb.build(this.sets.kitchen);
    // bathroom: the tub (hollow, white) with water and a chalky ring, a vanity table for the wipes insert
    this.room(this.sets.bath, BATH, rep(tileTex("b", "#cfe3ea", "#9fb6bf"), 6, 2), rep(tileTex("bf", "#e8e4dc", "#b8b2a6", 6), 6, 6));
    const bb = new Batch(), wh = lam("tubWhite", () => ({ color: "#f4f3ee" })), [tx, , tz] = TUB_AT3, hl = 0.38, hd = 0.85, th = 0.62, w = 0.07;
    bb.add(boxGeo(V(tx - hl, G, tz - hd), V(tx + hl, 0.1, tz + hd)), wh);
    bb.add(boxGeo(V(tx - hl, G, tz - hd), V(tx + hl, th, tz - hd + w)), wh); bb.add(boxGeo(V(tx - hl, G, tz + hd - w), V(tx + hl, th, tz + hd)), wh);
    bb.add(boxGeo(V(tx - hl, G, tz - hd), V(tx - hl + w, th, tz + hd)), wh); bb.add(boxGeo(V(tx + hl - w, G, tz - hd), V(tx + hl, th, tz + hd)), wh);
    bb.add(quadUp(tx - hl + w, tx + hl - w, tz - hd + w, tz + hd - w, 1, 1, 0.4), lam("bathWater", () => ({ color: "#a9d2e0" })));
    const ring = lam("scum", () => ({ color: "#9a8f6c" }));
    bb.add(boxGeo(V(tx - hl + w, 0.4, tz + hd - w - 0.02), V(tx + hl - w, 0.52, tz + hd - w)), ring);
    bb.add(boxGeo(V(tx - hl + w, 0.4, tz - hd + w), V(tx + hl - w, 0.52, tz - hd + w + 0.02)), ring);
    bb.add(boxGeo(V(tx - hl + w, 0.4, tz - hd + w), V(tx - hl + w + 0.02, 0.52, tz + hd - w)), ring);
    bb.add(boxGeo(V(tx + hl - w - 0.02, 0.4, tz - hd + w), V(tx + hl - w, 0.52, tz + hd - w)), ring);
    bb.add(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 10), lam("chrome", () => ({ color: "#c9ccd2" })), new THREE.Matrix4().makeTranslation(tx, th + 0.12, tz + hd - 0.12));
    bb.add(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10).rotateX(Math.PI / 2), lam("chrome", () => ({ color: "#c9ccd2" })), new THREE.Matrix4().makeTranslation(tx, th + 0.22, tz + hd - 0.18));
    bb.add(boxGeo(V(BATH[0] + 0.6, G, BATH[2] + 3.25), V(BATH[0] + 2.4, TABLE_H, BATH[2] + 3.95)), lam("vanity", () => ({ color: "#e9e2d4" })));
    bb.add(boxGeo(V(BATH[0] + 0.55, TABLE_H, BATH[2] + 2.75), V(BATH[0] + 2.45, TABLE_H + 0.05, BATH[2] + 3.98)), lam("worktop", () => ({ color: "#d8c4a0" })));
    bb.build(this.sets.bath);
    // office: a desk with the ban document, a lamp
    this.room(this.sets.office, OFFICE, rep(plainTex("off", "#cfd6c4", "rgba(150,160,140,0.25)"), 3, 1.4));
    const ob = new Batch();
    ob.add(boxGeo(V(OFFICE[0] - 1.2, G, OFFICE[2] + 2.7), V(OFFICE[0] + 1.2, TABLE_H, OFFICE[2] + 3.9)), lam("desk", () => ({ color: "#7a5236" })));
    ob.add(boxGeo(V(OFFICE[0] - 1.25, TABLE_H, OFFICE[2] + 2.6), V(OFFICE[0] + 1.25, TABLE_H + 0.05, OFFICE[2] + 3.95)), lam("deskTop", () => ({ color: "#3f5a3a" })));
    ob.add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), lam("lampBrass", () => ({ color: "#d8b04a" })), new THREE.Matrix4().makeTranslation(OFFICE[0] + 0.75, TABLE_H + 0.3, OFFICE[2] + 3.5));
    ob.add(new THREE.ConeGeometry(0.16, 0.18, 14, 1, true), lam("lampShade", () => ({ color: "#2f6a43", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(OFFICE[0] + 0.75, TABLE_H + 0.6, OFFICE[2] + 3.5));
    ob.build(this.sets.office);
    // museum gallery: dark walls, framed pictures, a bench, the plinth with its glass case and the chunk inside
    this.room(this.sets.museum, MUSEUM, rep(plainTex("mus", "#3d5560", "rgba(20,30,36,0.3)"), 3, 1.4), rep(tileTex("mf", "#8a7a6a", "#6a5a4c", 4), 6, 6));
    const mb = new Batch(), [cx, , cz] = CASE_AT;
    mb.add(boxGeo(V(cx - 0.4, G, cz - 0.4), V(cx + 0.4, 1.0, cz + 0.4)), lam("plinth", () => ({ color: "#f0ece2" })));
    const frame = lam("caseFrame", () => ({ color: "#2a2c32" }));
    for (const [x0, x1, y0, y1, z0, z1] of [[-0.33, 0.33, 1.0, 1.03, -0.33, 0.33], [-0.33, 0.33, 1.47, 1.5, -0.33, 0.33]]) mb.add(boxGeo(V(cx + x0, y0, cz + z0), V(cx + x1, y1, cz + z1)), frame);
    for (const dx of [-0.32, 0.32]) for (const dz of [-0.32, 0.32]) mb.add(boxGeo(V(cx + dx - 0.012, 1.0, cz + dz - 0.012), V(cx + dx + 0.012, 1.5, cz + dz + 0.012)), frame);
    mb.add(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), lam("stand", () => ({ color: "#2a2c32" })), new THREE.Matrix4().makeTranslation(cx, 1.06, cz));
    for (let i = 0; i < 3; i++) mb.add(quad(V(MUSEUM[0] - 3 + i * 2.2, 1.4, MUSEUM[2] + 5.95), V(MUSEUM[0] - 2 + i * 2.2, 1.4, MUSEUM[2] + 5.95), V(MUSEUM[0] - 2 + i * 2.2, 2.65, MUSEUM[2] + 5.95), V(MUSEUM[0] - 3 + i * 2.2, 2.65, MUSEUM[2] + 5.95)).scale(1, 1, 1), lam("pic" + i, () => ({ map: picTex("m" + i, i) })));
    for (const dx of [-2.6, 2.6]) { mb.add(boxGeo(V(cx + dx - 0.45, G, cz + 1.6), V(cx + dx + 0.45, 1.0, cz + 2.4)), lam("plinth", () => ({ color: "#f0ece2" }))); mb.add(lumpGeo(dx), lam("vase" + dx, () => ({ color: dx < 0 ? "#b8684a" : "#5a8ac0" })), new THREE.Matrix4().compose(V(cx + dx, 1.25, cz + 2.0), new THREE.Quaternion(), V(0.18, 0.25, 0.18))); }
    mb.build(this.sets.museum);
    const chunk = new THREE.Mesh(lumpGeo(7.3, 4, 0.5), twoTone(new THREE.MeshLambertMaterial({ map: rep(fatTex(), 1.5, 1.5), color: "#d8cdb0" }), 0.6));
    chunk.position.set(cx, 1.19, cz); chunk.scale.set(0.2, 0.11, 0.15); chunk.rotation.set(0.2, 0.6, 0.1); chunk.castShadow = true; chunk.receiveShadow = true;
    this.sets.museum.add(chunk);
    const glassM = new THREE.MeshBasicMaterial({ color: "#d8eef5", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    void glassM; // no glass panes: a depth-less transparent box made the lens blur stair-step and flicker behind it
    // yellow pustules of mould (scaled in on "toxic mould")
    for (let i = 0; i < 16; i++) {
      const a = hash(i, 30) * Math.PI * 2, e = (hash(i, 31) - 0.2) * 1.2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), lam("pustule", () => ({ color: "#e6cf2e" })));
      m.position.set(cx + 0.19 * Math.cos(a) * Math.cos(e), 1.19 + 0.1 * Math.sin(e) + 0.01, cz + 0.14 * Math.sin(a) * Math.cos(e));
      m.userData.s = 0.009 + 0.012 * hash(i, 32); m.userData.t = hash(i, 33);
      this.pustules.push(m); this.sets.museum.add(m);
    }
    // fuel bench
    this.room(this.sets.lab, LAB, rep(tileTex("l", "#dfe6e8", "#a9b4b8"), 6, 2), rep(tileTex("lf", "#9aa1aa", "#7a828c", 4), 6, 6));
    const lb = new Batch();
    lb.add(boxGeo(V(LAB[0] - 2, G, LAB[2] + 3.25), V(LAB[0] + 2, TABLE_H, LAB[2] + 3.95)), lam("benchGrey", () => ({ color: "#6a7480" })));
    lb.add(boxGeo(V(LAB[0] - 2.05, TABLE_H, LAB[2] + 2.75), V(LAB[0] + 2.05, TABLE_H + 0.05, LAB[2] + 3.98)), lam("benchTop", () => ({ color: "#2e3238" })));
    for (let i = 0; i < 4; i++) lb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16), lam("drum" + (i % 2), () => ({ color: i % 2 ? "#2f6fb5" : "#d9a03a" })), new THREE.Matrix4().makeTranslation(LAB[0] - 3 + i * 0.5, 0.45, LAB[2] + 5.3));
    lb.build(this.sets.lab);
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
  private shadowCache = new Map<string, { Rr: number; ctr: THREE.Vector3 }>();
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
    Rr = Math.min(95, s.light === "golden" ? Math.max(Rr, 30) : Rr);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], set = setAt(id, f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = set === "sewer" ? 0.05 : set === "street" ? 0.4 : 0.12; // street: 3x the depth precision (no z-fighting) cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const outdoor = set === "street";
    this.sun.castShadow = outdoor; // insert rooms: no sun shadows (a 2048 map over a 12 m+ frustum stair-steps and crawls on close props)
    // shadow map locked per camera setup (size from the widest frame of the setup, centre snapped to the shadow texel
    // grid): a shadow camera that follows the push-in every frame makes every shadow edge crawl (flicker)
    const { Rr, ctr } = this.shadowFrame(id, f, s, sunDir);
    void dist;
    this.sun.position.copy(ctr).addScaledVector(sunDir, 220); this.sun.target.position.copy(ctr);
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
    if (set === "sewer") {
      // underground: warm lamp-lit walls, deep brown dark down the pipe
      TONE.uLitCol.value.set(1.2, 1.06, 0.82); TONE.uShadeCol.value.set(0.17, 0.15, 0.16); TONE.uShadeLift.value.set(0.02, 0.02, 0.03); TONE.uTerm.value = 0.5; TONE.uLambert.value = 0.6;
      CHAR.uCharTint.value.set(0.95, 0.86, 0.72);
      untone("#1c1814", this.fog.color); this.fog.near = 1.2; this.fog.far = 16;
    }
    if (id === 12) { // backlit sunset: warm dusky shade (not bright blue) + warm bounce so the bus stays London red
      TONE.uBounce.value.set(0.75, 0.1, 0.03); TONE.uShadeCol.value.set(0.36, 0.24, 0.26); TONE.uShadeLift.value.set(0.05, 0.03, 0.04);
    }
    scene.fog = this.fog; scene.background = null;
    this.sky.visible = set !== "sewer";
    this.sunDisc.visible = s.light === "golden" && outdoor;
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // ---- which places are shown ----
    const cutting = set === "cut", sewer = set === "sewer";
    this.street.visible = outdoor || cutting; this.north.visible = outdoor;
    this.cut.visible = cutting; this.under.visible = cutting || sewer; this.tubeFront.visible = sewer; this.deposits.visible = sewer;
    this.fat3d.visible = sewer;
    for (const k of Object.keys(this.sets) as (keyof World["sets"])[]) this.sets[k].visible = set === (k as SetName);
    this.pose(id, s, t, f, set);
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
      a.mesh.castShadow = L.actorShadow && outdoor;
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

  private pose(id: number, s: ShotDef, t: number, f: number, set: SetName) {
    // crawler: on its cable in the manhole (shot 2b), on the invert in the pipe (shot 3)
    this.crawler.visible = (id === 2 && f >= W(16, 3)) || set === "sewer";
    this.cable.visible = this.crawler.visible;
    if (id === 2) {
      const y = crawlDrop(t);
      this.crawler.position.set(MH_CAM[0] + 0.05, y, MH_CAM[2]); this.crawler.rotation.set(0, 0, 0.25 * Math.sin(t * 2.2));
      const top = 1.2, len = top - (y + 0.25);
      this.cable.position.set(MH_CAM[0] + 0.05, y + 0.25 + len / 2, MH_CAM[2]); this.cable.scale.set(1, Math.max(0.01, len), 1); this.cable.rotation.set(0, 0, 0);
    } else if (set === "sewer") {
      const x = id === 1 ? FACE_X - 1.8 : crawlX(t);
      this.crawler.visible = id !== 1;
      this.cable.visible = id !== 1;
      this.crawler.position.set(x, FLOOR_Y - 0.03, 0); this.crawler.rotation.set(0, 0, 0.01 * Math.sin(t * 9));
      this.cable.position.set(x - 6, FLOOR_Y + 0.02, 0); this.cable.rotation.set(0, 0, Math.PI / 2); this.cable.scale.set(1, 12, 1);
    }
    // backed-up water behind the plug
    const lvl = id === 5 ? floodY(t) : id === 6 || id === 7 ? FLOOR_Y + 0.25 : FLOOR_Y + 0.05;
    this.flood.scale.y = Math.max(0.01, lvl - FLOOR_Y);
    // the manhole lid rattles and lifts on "flood"
    if (id === 5 && set === "street") {
      const jig = t > Ws(68) ? 0.012 * Math.sin(t * 70) * (0.5 + 0.5 * Math.sin(t * 9)) : 0, lift = t >= LID_T ? 0.18 * Math.sin(Math.PI * clamp01((t - LID_T) / 0.5)) : 0;
      this.lid.position.y = 0.025 + Math.abs(jig) + lift; this.lid.rotation.set(jig * 3 + lift * 0.4, 0, jig * 2);
    } else { this.lid.position.y = 0.025; this.lid.rotation.set(0, 0, 0); }
    this.lid.visible = !(id === 7 || (id === 6 && set === "street")); // opened up for the crew
    // buses: the hook bus driving away, the eleven on "eleven double-decker buses", the ending bus
    this.hookBus.visible = id === 1; this.hookBus.position.set(-30 + 7.5 * t, 0, LANE_OUT);
    this.buses.forEach((b, i) => { b.visible = id === 4 && t >= busIn(i); const k = smooth((t - busIn(i)) / 0.18); b.scale.set(1, 0.3 + 0.7 * k + 0.08 * Math.sin(Math.PI * k), 1); });
    this.endBus.visible = id === 12; this.endBus.position.set(busEndX(t), 0, LANE_IN);
    this.tankers.forEach((g, k) => { const x = tankerX(t, k); g.visible = id === 7 && set === "street" && x > -190 && x < -60; g.position.set(x, 0, LANE_OUT); });
    this.parkedTanker.visible = id === 6 || id === 2 && false;
    // museum mould
    for (const m of this.pustules) { const k = id === 10 ? smooth((t - Ws(161) + 0.1 - m.userData.t * 0.8) / 0.35) : 0; m.visible = k > 0.01; m.scale.setScalar(m.userData.s * Math.max(0.01, k)); }
    void FLIES_AT; void END_X;
  }
}
