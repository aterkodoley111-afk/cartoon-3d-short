// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bowler") {
    const yb = crown + 0.24 * HH, col = "#2a2630", deg = (a * 180) / Math.PI;
    const dome: P2[] = []; for (let i = 0; i <= 24; i++) { const t = Math.PI * (i / 24); dome.push([cx - 0.36 * W * Math.cos(t), yb - 0.36 * HH * Math.sin(t) - 2 * u]); }
    const body = R(dome);
    p.shadedFill(body, col, mul(col, SH_FELT), light, 0.36 * W, 0.4);
    p.clip(body, () => p.band(R([[cx - 0.4 * W, yb - 0.06 * HH], [cx + 0.4 * W, yb - 0.06 * HH]]), "#4a3a2a", 0.07 * HH, 0.6 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx + (side ? 6 * u : 0), yb]])[0];
    p.ell(bx, by, 0.47 * W, 0.045 * HH, "#1d1b22", ow, 0, 360, deg);
  } else if (o.hat === "sailor") {
    const yb = crown + 0.22 * HH, deg = (a * 180) / Math.PI;
    const body = R([[cx - 0.34 * W, yb], [cx + 0.34 * W, yb], [cx + 0.3 * W, yb - 0.17 * HH], [cx - 0.3 * W, yb - 0.17 * HH]]);
    p.shadedFill(body, "#f6f3ec", "#c9cbd6", light, 0.34 * W, 0.4);
    p.poly(body, null, ow * 0.9);
    const [bx, by] = R([[cx, yb - 0.17 * HH]])[0];
    p.ell(bx, by, 0.3 * W, 0.035 * HH, "#ffffff", ow * 0.8, 0, 360, deg);
  } else if (o.hat === "firehelmet" || o.hat === "hardhat") {
    const fire = o.hat === "firehelmet", yb = crown + 0.26 * HH, col = fire ? "#22202a" : (o.cap ?? "#e8c03a"), deg = (a * 180) / Math.PI;
    const dome: P2[] = []; for (let i = 0; i <= 24; i++) { const t = Math.PI * (i / 24); dome.push([cx - 0.4 * W * Math.cos(t), yb - 0.4 * HH * Math.sin(t) - 2 * u]); }
    const body = R(dome);
    p.shadedFill(body, col, mul(col, SH_FELT), light, 0.4 * W, 0.4);
    p.clip(body, () => { for (const dx of [-0.2, 0, 0.2]) p.band(R([[cx + dx * W, yb - 0.4 * HH], [cx + dx * W * 1.05, yb]]), shade(col, fire ? 1.6 : 0.85), 0.035 * W, 0.3 * u); });
    p.poly(body, null, ow);
    if (fire) {
      // long back brim, then the brass front shield
      if (side) p.poly(R([[cx - 0.62 * W, yb + 0.08 * HH], [cx - 0.3 * W, yb - 0.02 * HH], [cx + 0.42 * W, yb - 0.01 * HH], [cx + 0.5 * W, yb + 0.03 * HH], [cx - 0.3 * W, yb + 0.05 * HH]]), "#16151b", ow * 0.8);
      else { const [bx, by] = R([[cx, yb + 1 * u]])[0]; p.ell(bx, by, 0.56 * W, 0.06 * HH, "#16151b", ow, 0, 360, deg); }
      const [sx, sy] = R([[cx + (side ? 0.3 * W : 0), yb - 0.2 * HH]])[0];
      p.poly([[sx - 9 * u, sy - 11 * u], [sx + 9 * u, sy - 11 * u], [sx + 10 * u, sy + 4 * u], [sx, sy + 12 * u], [sx - 10 * u, sy + 4 * u]], "#e8c45a", 2.2 * u);
      p.ell(sx, sy - 1 * u, 4 * u, 4 * u, "#c0353a", 1.2 * u);
    } else {
      const [bx, by] = R([[cx + (side ? 10 * u : 0), yb]])[0];
      if (side) p.poly(R([[cx + 0.2 * W, yb - 2 * u], [cx + 0.58 * W, yb + 4 * u], [cx + 0.2 * W, yb + 5 * u]]), shade(col, 0.85), ow * 0.8);
      else p.ell(bx, by, 0.46 * W, 0.045 * HH, shade(col, 0.85), ow, 0, 360, deg);
    }
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | "bucket" | "point" | "armsUp" | "watch" | "jar" | "camera" | "magazine" | "phone" | "photo" | "fish" | "nozzle"
  | ["hammer" | "brush" | "pen" | "bat" | "rod", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    if (prop === "armsUp") {
      for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.3 * HH + 6 * u * sw * side], [tcx + side * (1.25 * T.a + 18 * u), sh(side)[1] - 0.75 * HH + 8 * u * sw * side]], front: false });
    } else arms.push({ pts: prop === "shako" ? hang(-1, 0) : prop === "bucket" ? hang(-1, 0.6) : hang(-1, -sw), front: false });
    if (prop === "armsUp") { /* both arms placed above */ }
    else if (prop === "point") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.2 * T.a + 22 * u, S[1] - 0.05 * HH], [tcx + 1.3 * T.a + 50 * u, S[1] - 0.12 * HH]], front: true });
    } else if (prop === "bucket") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.12 * T.a + 8 * u, S[1] + 0.3 * HH], [tcx + 0.9 * T.a + 6 * u, S[1] + 0.52 * HH]], front: true });
    } else if (prop === "watch" || prop === "jar" || prop === "camera" || prop === "magazine" || prop === "phone" || prop === "photo" || prop === "fish") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.42 * HH], [tcx + 0.45 * T.a, S[1] + 0.3 * HH]], front: true });
    } else if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      if (prop[0] === "hammer") {
        p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
        p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      } else if (prop[0] === "brush") { // long-handled paint brush, bristles dipped brown
        p.band(Rh([[hx, hy + 10 * u], [hx, hy - 60 * u]]), "#b07a48", 4 * u, 1.4 * u, "round");
        p.poly(Rh([[hx - 11 * u, hy - 60 * u], [hx + 11 * u, hy - 60 * u], [hx + 13 * u, hy - 82 * u], [hx - 13 * u, hy - 82 * u]]), "#5a2e14", 2 * u);
        p.poly(Rh([[hx - 9 * u, hy - 56 * u], [hx + 9 * u, hy - 56 * u], [hx + 9 * u, hy - 62 * u], [hx - 9 * u, hy - 62 * u]]), "#c9ccd2", 1.6 * u);
      } else if (prop[0] === "pen") { // fountain pen
        p.band(Rh([[hx + 2 * u, hy + 18 * u], [hx + 2 * u, hy - 22 * u]]), "#1f2a44", 3.4 * u, 1.2 * u, "round");
        p.poly(Rh([[hx - 1 * u, hy + 18 * u], [hx + 5 * u, hy + 18 * u], [hx + 2 * u, hy + 28 * u]]), "#e8c45a", 1 * u);
      } else if (prop[0] === "rod") { // fishing rod: up and out to the right, line hanging from the tip
        const k = clamp(prop[1], 0, 1), tip: P2 = [hx + 150 * u, hy - 150 * u + 40 * u * k];
        p.stroke(curve([hx, hy + 14 * u], [hx + 80 * u, hy - 100 * u + 30 * k * u], tip), 3.4 * u, "#3a2a22");
        p.stroke([tip, [tip[0] + 6 * u, tip[1] + 140 * u - 60 * k * u]], 1.1 * u, "#f6f3ec");
        p.ell(hx + 8 * u, hy + 4 * u, 6 * u, 6 * u, "#9aa1aa", 1.4 * u);
      } else { // baseball bat
        p.band(Rh([[hx, hy + 10 * u], [hx, hy - 70 * u]]), "#d9a35a", 5 * u, 1.5 * u, "round");
        p.band(Rh([[hx, hy - 30 * u], [hx, hy - 72 * u]]), "#d9a35a", 9 * u, 1.5 * u, "round");
      }
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "bucket") {
      p.arc(hx, hy + 14 * u, 15 * u, 14 * u, 180, 360, 2.2 * u);
      p.poly([[hx - 17 * u, hy + 14 * u], [hx + 17 * u, hy + 14 * u], [hx + 13 * u, hy + 46 * u], [hx - 13 * u, hy + 46 * u]], "#9aa1aa", 2.2 * u);
      p.ell(hx, hy + 14 * u, 17 * u, 4 * u, "#4a2412", 1.8 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "watch") {
      p.ell(hx, hy - 6 * u, 11 * u, 11 * u, "#e8c45a", 2.2 * u);
      p.ell(hx, hy - 6 * u, 8 * u, 8 * u, "#fbf6e8", 1.2 * u);
      p.stroke([[hx, hy - 6 * u], [hx, hy - 12 * u]], 1.4 * u); p.stroke([[hx, hy - 6 * u], [hx - 3 * u, hy - 2 * u]], 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "jar") {
      p.poly([[hx - 13 * u, hy - 30 * u], [hx + 13 * u, hy - 30 * u], [hx + 14 * u, hy + 4 * u], [hx - 14 * u, hy + 4 * u]], "#d9952e", 2.2 * u);
      p.poly([[hx - 14 * u, hy - 36 * u], [hx + 14 * u, hy - 36 * u], [hx + 14 * u, hy - 29 * u], [hx - 14 * u, hy - 29 * u]], "#c9373a", 1.8 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "camera") { // 1960s press camera with a flash reflector
      p.poly(rrect(hx - 26 * u, hy - 26 * u, hx + 26 * u, hy + 8 * u, 4 * u), "#2a2a30", 2.2 * u);
      p.ell(hx, hy - 9 * u, 11 * u, 11 * u, "#5a6a7a", 2 * u); p.ell(hx, hy - 9 * u, 5 * u, 5 * u, "#1d1b22", 0);
      p.stroke([[hx + 22 * u, hy - 26 * u], [hx + 30 * u, hy - 48 * u]], 3 * u, "#9aa1aa");
      p.ell(hx + 32 * u, hy - 58 * u, 16 * u, 13 * u, "#dfe4ea", 2 * u); p.ell(hx + 32 * u, hy - 58 * u, 7 * u, 6 * u, "#ffffff", 1.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "magazine") { // open magazine held up: red border, a photo of flames on the cover
      p.poly([[hx - 44 * u, hy - 46 * u], [hx, hy - 40 * u], [hx, hy + 10 * u], [hx - 42 * u, hy + 6 * u]], "#f6f3ec", 2.2 * u);
      p.poly([[hx, hy - 40 * u], [hx + 44 * u, hy - 46 * u], [hx + 42 * u, hy + 6 * u], [hx, hy + 10 * u]], "#f6f3ec", 2.2 * u);
      p.poly([[hx - 38 * u, hy - 38 * u], [hx - 6 * u, hy - 34 * u], [hx - 6 * u, hy - 8 * u], [hx - 37 * u, hy - 10 * u]], "#5e564c", 1.2 * u);
      for (let i = 0; i < 4; i++) p.poly([[hx - 35 * u + i * 7.5 * u, hy - 10 * u], [hx - 31 * u + i * 7.5 * u, hy - 26 * u - (i % 2) * 6 * u], [hx - 27 * u + i * 7.5 * u, hy - 10 * u]], "#f2ead8", 0);
      for (let k = 0; k < 4; k++) { p.stroke([[hx + 6 * u, hy - 34 * u + k * 10 * u], [hx + 36 * u, hy - 37 * u + k * 10 * u]], 2 * u, "#9a96a0"); p.stroke([[hx - 38 * u, hy - 2 * u], [hx - 8 * u, hy]], 2 * u, "#9a96a0"); }
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "phone") {
      p.poly(rrect(hx - 9 * u, hy - 34 * u, hx + 9 * u, hy + 4 * u, 3 * u), "#1d1b22", 1.8 * u);
      p.poly(rrect(hx - 6 * u, hy - 30 * u, hx + 6 * u, hy, 1.5 * u), "#8fd0ff", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "photo") {
      p.poly([[hx - 26 * u, hy - 40 * u], [hx + 26 * u, hy - 42 * u], [hx + 27 * u, hy + 2 * u], [hx - 25 * u, hy + 4 * u]], "#efe6cf", 1.8 * u);
      p.poly([[hx - 20 * u, hy - 34 * u], [hx + 20 * u, hy - 36 * u], [hx + 21 * u, hy - 4 * u], [hx - 19 * u, hy - 2 * u]], "#8a7458", 0);
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "fish") { // a fish held up by the tail
      const f2: P2[] = []; for (let i = 0; i <= 30; i++) { const t = (i / 30) * Math.PI * 2; f2.push([hx + 14 * u * Math.sin(t), hy - 40 * u + 38 * u * Math.cos(t) * (Math.cos(t) > 0 ? 0.9 : 1)]); }
      p.poly([[hx - 12 * u, hy + 6 * u], [hx + 12 * u, hy + 6 * u], [hx, hy - 8 * u]], "#9fb0bc", 1.8 * u);
      p.poly(f2, "#c9d4dc", 2 * u); p.stroke([[hx - 8 * u, hy - 40 * u], [hx + 8 * u, hy - 40 * u]], 1.2 * u, "#7a8a96"); p.stroke([[hx, hy - 60 * u], [hx, hy - 10 * u]], 2.5 * u, "#e0a060");
      p.dot(hx - 3 * u, hy - 56 * u, 2.2 * u); p.dot(hx, hy, 5.5 * u);
    } else if (prop === "point") p.dot(hx, hy, 5.5 * u);
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "sailor";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "sailor";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

// ======================= Molasses Flood cast + effects (our own) =======================
const MOL = "#4a2412", MOL_L = "#8a4a1e", MOL_H = "#c98a4a";
export const worker = (v = 0): Outfit => {
  const caps = ["#5a4a3a", "#3b3f52", "#6b5a44", "#2f3a2f"], coats = ["#6b4f3a", "#3b4a6b", "#5d5a3a", "#7a3f34", "#4a5560"];
  const o: Outfit = { jacket: coats[v % 5], pants: ["#4a4a52", "#5a4e44", "#3f4448"][v % 3], boots: "#3a2a1e", hat: "cap", cap: caps[v % 4], skin: SKINS[v % 4] };
  if (v % 3 === 1) o.moustache = "#4a3426";
  return o;
};
export const JELL: Outfit = { jacket: "#3b3f52", pants: "#34374a", boots: "#1d1b22", hat: "bowler", moustache: "#5a3b2a", build: "stout", buttons: "#c9ccd2" };
export const EXEC: Outfit = { jacket: "#2e2a36", pants: "#2e2a36", boots: "#1d1b22", hat: "tophat", moustache: "#8a8890", build: "stout", buttons: "#e8c45a" };
export const PAINTER: Outfit = { jacket: "#e9e4d6", pants: "#d8d2c4", boots: "#5a3b2a", hat: "cap", cap: "#f2efe6", skin: SKINS[1] };
export const woman = (v = 0): Outfit => ({ jacket: ["#7a3f5a", "#3f5a7a", "#6b6a3a", "#8a5a3a"][v % 4], pants: "#3b3f52", boots: "#3a2a1e", hat: "hair",
  hair: ["#5a3b2a", "#2a201a", "#8a5a34", "#3a2a22"][v % 4], dress: ["#4a5a8a", "#8a4a5a", "#c9a24a", "#5a7a5a"][v % 4], skin: SKINS[(v + 1) % 4] });
export const kid1919 = (v = 0): Outfit => ({ jacket: ["#8a5a3a", "#4a6a8a", "#7a4a4a"][v % 3], pants: "#4a4a52", boots: "#3a2a1e", hat: "cap", cap: ["#5a5a62", "#7a5a3a", "#3b4a6b"][v % 3], build: "kid", skin: SKINS[v % 4] });
export const SAILOR: Outfit = { jacket: "#26324f", pants: "#26324f", boots: "#1d1b22", hat: "sailor", buttons: "#f6f3ec" };
export const sailor = (v = 0): Outfit => ({ ...SAILOR, skin: SKINS[v % 4], moustache: v % 3 === 2 ? "#4a3426" : undefined });
export const JUDGE: Outfit = { jacket: "#1d1b22", pants: "#1d1b22", boots: "#1d1b22", hat: "hair", hair: "#dcd8d0", build: "stout", buttons: "#1d1b22", moustache: "#dcd8d0" };
export const ENGINEER: Outfit = { jacket: "#6b4f3a", pants: "#4a4a52", boots: "#3a2a1e", hat: "hair", hair: "#3a2a1e", buttons: "#e8c45a", skin: SKINS[2] };
export const modernKid = (v = 0): Outfit => ({ jacket: ["#f4f1ea", "#3f6fb5", "#f4f1ea", "#d23b3b"][v % 4], pants: ["#3f6fb5", "#f4f1ea", "#9aa1aa", "#3b3f52"][v % 4], boots: "#f4f1ea",
  hat: "cap", cap: ["#d23b3b", "#2f4a8a", "#2f8a4f", "#f3d35a"][v % 4], build: "kid", skin: SKINS[v % 4] });
export const OLD_LOCAL: Outfit = { jacket: "#c46a4a", pants: "#6b6a72", boots: "#5a3b2a", hat: "hair", hair: "#e6e2da", build: "stout", moustache: "#e6e2da", skin: SKINS[2] };

/** a falling molasses drop on a 120 x 300 canvas; t 0..1 (bead grows on top, then stretches and falls) */
export const fxDrip = (p: Pen, t: number) => {
  const y = 40 + 240 * Math.max(0, t - 0.4) ** 2 / 0.36, r = 14 + 10 * Math.min(1, t * 2);
  if (t < 0.4) p.poly([[60 - 10, 0], [60 + 10, 0], [60 + r * 0.8, 30], [60, 40 + r], [60 - r * 0.8, 30]], MOL_L, 5);
  else p.ell(60, y, r * 0.8, r * 1.15, MOL_L, 5);
  p.ell(60 - r * 0.25, (t < 0.4 ? 30 : y) - r * 0.35, r * 0.18, r * 0.3, MOL_H, 0);
};
/** thermometer + snowflake (cold end) + sun (warm end), no text, on a 300 x 800 canvas; k = level 0..1 */
export const fxThermo = (p: Pen, k: number) => {
  p.poly(rrect(70, 40, 230, 780, 70), "#f6ecd2", 10);
  p.poly(rrect(128, 110, 172, 640, 22), "#ffffff", 8);
  const top = 630 - 500 * clamp(k, 0, 1);
  p.poly(rrect(134, top, 166, 650, 16), "#d63a2f", 0);
  p.ell(150, 680, 46, 46, "#d63a2f", 9);
  for (let i = 0; i < 9; i++) p.stroke([[176, 150 + i * 55], [196, 150 + i * 55]], 6);
  // snowflake low-left, sun top-right
  for (let i = 0; i < 3; i++) { const a = rad(i * 60); p.stroke([[40 - 26 * Math.cos(a), 600 - 26 * Math.sin(a)], [40 + 26 * Math.cos(a), 600 + 26 * Math.sin(a)]], 7, "#5aa0e6"); }
  for (let i = 0; i < 8; i++) { const a = rad(i * 45); p.stroke([[262 + 26 * Math.cos(a), 120 + 26 * Math.sin(a)], [262 + 38 * Math.cos(a), 120 + 38 * Math.sin(a)]], 6, "#f0a020"); }
  p.ell(262, 120, 18, 18, "#ffd84a", 6);
};
/** open pocket watch at 12:40 on a 400 x 460 canvas */
export const fxWatch = (p: Pen) => {
  p.ell(200, 40, 26, 26, null, 10);
  p.ell(200, 250, 180, 180, "#e8c45a", 12);
  p.ell(200, 250, 150, 150, "#fbf6e8", 8);
  for (let i = 0; i < 12; i++) { const a = rad(i * 30 - 90); p.stroke([[200 + 120 * Math.cos(a), 250 + 120 * Math.sin(a)], [200 + 138 * Math.cos(a), 250 + 138 * Math.sin(a)]], i % 3 ? 6 : 12); }
  const hr = rad((12 + 40 / 60) * 30 - 90), mn = rad(40 * 6 - 90);
  p.stroke([[200, 250], [200 + 70 * Math.cos(hr), 250 + 70 * Math.sin(hr)]], 16);
  p.stroke([[200, 250], [200 + 112 * Math.cos(mn), 250 + 112 * Math.sin(mn)]], 10);
  p.dot(200, 250, 14);
};
/** flying rivet head on a 100 x 100 canvas */
export const fxRivet = (p: Pen) => { p.ell(50, 50, 30, 26, "#7d848c", 7); p.ell(42, 42, 10, 7, "#c9ccd2", 0); };
/** thought bubble with a cartoon bomb (blame) on a 600 x 520 canvas */
export const fxBlameBubble = (p: Pen, t: number) => {
  const s = Math.min(1, t * 3);
  for (const [x, y, r] of [[90, 470, 18], [140, 420, 28]] as const) p.ell(x, y, r * s, r * s, "#ffffff", 7);
  if (s < 0.6) return;
  const blobs: [number, number, number][] = [[230, 250, 120], [350, 200, 130], [460, 260, 110], [340, 320, 130]];
  for (const [x, y, r] of blobs) p.ell(x, y, r, r * 0.8, "#ffffff", 9);
  for (const [x, y, r] of blobs) p.ell(x, y, r - 8, r * 0.8 - 8, "#ffffff", 0);
  p.ell(345, 270, 70, 70, "#2a2630", 9);
  p.ell(322, 245, 16, 12, "#6a6670", 0);
  p.poly(rrect(330, 185, 362, 205, 6), "#4a4650", 6);
  p.line([[346, 185], [360, 160], [380, 150]], "#c9a24a", 6, false);
  fxBurstSmall(p, 388, 146, 0.5 + 0.5 * Math.sin(t * 40));
};
const fxBurstSmall = (p: Pen, x: number, y: number, k: number) => {
  for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 15); p.stroke([[x + 8 * Math.cos(a), y + 8 * Math.sin(a)], [x + (20 + 10 * k) * Math.cos(a), y + (20 + 10 * k) * Math.sin(a)]], 6, "#ff9a2a"); }
};
/** blueprint of the tank (no words): elevation + plan, scribbled maths appear with `maths`, a signature with `sign`,
 *  an engineer's seal with `seal` (0..1 each), on a 1000 x 720 canvas */
export const fxBlueprint = (p: Pen, sign: number, maths: number, seal: number) => {
  const g = p.g, B = "#2f5f9e", L = "#dce9f8";
  p.poly(rrect(10, 10, 990, 710, 18), B, 10);
  g.strokeStyle = "rgba(220,233,248,0.18)"; g.lineWidth = 2;
  for (let x = 40; x < 980; x += 40) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 700); g.stroke(); }
  for (let y = 40; y < 700; y += 40) { g.beginPath(); g.moveTo(20, y); g.lineTo(980, y); g.stroke(); }
  // tank elevation: rectangle + rivet rows, plan: circle
  p.stroke([[90, 520], [90, 170], [400, 170], [400, 520], [90, 520]], 6, L);
  for (let r = 0; r < 6; r++) p.stroke([[90, 220 + r * 55], [400, 220 + r * 55]], 2.5, L);
  p.arc(245, 170, 155, 30, 180, 360, 5, L);
  p.arc(620, 300, 120, 120, 0, 360, 5, L);
  p.stroke([[500, 300], [740, 300]], 2.5, L); p.stroke([[620, 180], [620, 420]], 2.5, L);
  // maths: rows of squiggles + = signs, appearing left to right
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const k = clamp(maths * rows - r, 0, 1); if (k <= 0) break;
    const y = 470 + r * 38, x0 = 480, x1 = x0 + 440 * k, pts: P2[] = [];
    for (let x = x0; x <= x1; x += 6) pts.push([x, y + 8 * Math.sin(x * 0.21 + r) * Math.sin(x * 0.05)]);
    if (pts.length > 1) p.stroke(pts, 4, L);
    if (k > 0.6) { p.stroke([[x0 + 300, y - 4], [x0 + 320, y - 4]], 4, L); p.stroke([[x0 + 300, y + 6], [x0 + 320, y + 6]], 4, L); }
  }
  // signature: one flowing line, drawn progressively
  if (sign > 0) {
    const pts: P2[] = [], n = Math.floor(80 * clamp(sign, 0, 1));
    for (let i = 0; i <= n; i++) { const u = i / 80; pts.push([110 + 330 * u, 640 - 26 * Math.sin(u * 18) * (1 - u * 0.5) - 20 * u]); }
    if (pts.length > 1) p.stroke(pts, 5, "#ffffff");
    p.stroke([[100, 668], [470, 668]], 3, L);
  }
  if (seal > 0) {
    const s = 1 + 0.5 * (1 - clamp(seal * 3, 0, 1));
    p.ell(860, 600, 70 * s, 70 * s, "rgba(214,58,47,0.9)", 0);
    p.ell(860, 600, 56 * s, 56 * s, null, 0); p.arc(860, 600, 56 * s, 56 * s, 0, 360, 5, "#fbe3dc");
    for (let i = 0; i < 5; i++) { const a = rad(i * 72 - 90), b = rad(i * 72 + 54); p.stroke([[860 + 26 * s * Math.cos(a), 600 + 26 * s * Math.sin(a)], [860 + 26 * s * Math.cos(b), 600 + 26 * s * Math.sin(b)]], 5, "#fbe3dc"); }
  }
};
/** rising wavy "sweet smell" lines on a 300 x 600 canvas, t 0..1 loop */
export const fxSmell = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const u = (t + k / 3) % 1, a = Math.sin(u * Math.PI), pts: P2[] = [];
    for (let i = 0; i <= 30; i++) { const y = 560 - i * 14 - u * 120; pts.push([90 + k * 60 + 22 * Math.sin(i * 0.5 + u * 8 + k), y]); }
    p.g.globalAlpha = a; p.stroke(pts, 14, "#c98a4a"); p.g.globalAlpha = 1;
  }
};
/** spoon over a pancake stack with one very slow molasses drip (insert), on an 800 x 900 canvas; t = 0..1 */
export const fxSpoon = (p: Pen, t: number) => {
  p.ell(400, 790, 330, 70, "#f6f3ec", 10);                       // plate
  for (let i = 0; i < 4; i++) p.ell(400, 740 - i * 42, 250, 55, "#e8b86a", 9); // pancakes
  p.ell(400, 616, 230, 46, "#f0c87a", 0);
  p.ell(400, 612, 120, 26, MOL, 0);                              // puddle on top
  p.band([[60, 160], [330, 225]], "#c9ccd2", 26, 6, "round");    // spoon handle
  p.ell(420, 240, 110, 52, "#c9ccd2", 9);
  p.ell(420, 236, 90, 34, MOL, 0);
  const len = 30 + 330 * clamp(t, 0, 1);                         // the drip stretches very slowly
  p.poly([[500, 255], [520, 255], [516, 255 + len * 0.7], [510, 255 + len]], MOL_L, 6);
  p.ell(510, 262 + len, 20, 26, MOL_L, 6);
  p.ell(504, 254 + len, 5, 8, MOL_H, 0);
};
/** honey jar insert on a 700 x 900 canvas: cold (upside down, honey stuck, frost) or warm (tipped, pouring stream) */
export const fxHoney = (p: Pen, warm: number, t: number) => {
  const H1 = "#e8a23a", H2 = "#f6c45a", tilt = warm > 0.5 ? -100 : 180;
  const cx = 350, cy = warm > 0.5 ? 300 : 360, g = p.g;
  g.save(); g.translate(cx, cy); g.rotate(rad(tilt)); g.translate(-cx, -cy);
  p.poly(rrect(cx - 120, cy - 150, cx + 120, cy + 150, 40), "#eef6fb", 10);   // glass
  const fill = warm > 0.5 ? 0.45 : 0.85;
  p.poly(rrect(cx - 108, cy + 140 - 280 * fill, cx + 108, cy + 138, 30), H1, 0);
  p.poly(rrect(cx - 100, cy - 190, cx + 100, cy - 150, 12), "#c9373a", 8);    // lid band (opened)
  g.restore();
  if (warm <= 0.5) { // frost sparkles + blue shiver ticks
    for (const [x, y] of [[190, 200], [520, 260], [230, 520], [500, 560]] as const) {
      for (let i = 0; i < 3; i++) { const a = rad(i * 60); p.stroke([[x - 18 * Math.cos(a), y - 18 * Math.sin(a)], [x + 18 * Math.cos(a), y + 18 * Math.sin(a)]], 6, "#9fd0f6"); }
    }
    p.ell(350, 520, 60, 14, H1, 6); // a stubborn blob at the rim, not falling
  } else {
    p.ell(240, 820, 200, 40, "#f6f3ec", 8);                                   // plate
    p.poly(rrect(110, 740, 370, 812, 30), "#e8b86a", 8);                       // bread
    const len = clamp(t * 2.2, 0, 1) * 420, pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const y = 330 + (len * i) / 20; pts.push([222 + 10 * Math.sin(i * 0.9 + t * 20) * (i / 20), y]); }
    if (len > 5) { p.stroke(pts, 30, INK); p.stroke(pts, 18, H2); }
    if (len >= 400) p.ell(240, 744, 90, 18, H1, 6);
    for (const [x, y] of [[560, 180], [600, 260]] as const) p.arc(x, y, 30, 30, 200, 340, 7, "#f08a2c"); // warm ticks
  }
};


// ======================= The River That Caught Fire: cast + effect cards =======================
export const FIREMAN = (v = 0): Outfit => ({ jacket: "#2b2f3a", pants: "#2b2f3a", boots: "#1d1b22", hat: "firehelmet", buttons: "#e8c45a", skin: SKINS[v % 4],
  moustache: v % 3 === 1 ? "#5a3b2a" : undefined, build: v % 2 ? "stout" : "adult" });
export const STEEL = (v = 0): Outfit => ({ jacket: ["#4f6a8a", "#6a5a4a", "#5a6a5a"][v % 3], pants: "#3b3f52", boots: "#3a2a1e", hat: "hardhat", cap: ["#c9ccd2", "#e8c03a", "#d8d2c4"][v % 3], skin: SKINS[(v + 1) % 4], build: "stout" });
export const PHOTOG: Outfit = { jacket: "#9a7a52", pants: "#4a4a52", boots: "#3a2a1e", hat: "hair", hair: "#3a2a1e", buttons: "#e9e4d6", skin: SKINS[0] };
export const EDITOR: Outfit = { jacket: "#e9edf0", pants: "#3b3f52", boots: "#1d1b22", hat: "hair", hair: "#7a7a80", buttons: "#2e3a5a", moustache: "#7a7a80", build: "stout", skin: SKINS[1] };
export const SENATOR: Outfit = { jacket: "#5a6070", pants: "#4a5060", boots: "#1d1b22", hat: "hair", hair: "#d8d4cc", buttons: "#5a6070", build: "stout", skin: SKINS[0], moustache: "#d8d4cc" };
export const reader69 = (v = 0): Outfit => v % 2 ? { jacket: ["#b5543c", "#3f6a8a", "#7a8a3a"][v % 3], pants: "#3b3f52", boots: "#3a2a1e", hat: "hair", hair: ["#5a3b2a", "#e0c070", "#2a1e1a"][v % 3], dress: ["#d9a03a", "#5a8ac0", "#c05a6a"][v % 3], skin: SKINS[v % 4] }
  : { jacket: ["#6a5a4a", "#4a5a7a", "#8a4a3a"][v % 3], pants: "#4a4a52", boots: "#3a2a1e", hat: "hair", hair: ["#3a2a1e", "#8a5a3a", "#1d1b22"][v % 3], skin: SKINS[(v + 2) % 4] };
export const FISHER: Outfit = { jacket: "#3f7a5a", pants: "#4a5a7a", boots: "#5a3b2a", hat: "cap", cap: "#d23b3b", skin: SKINS[3], build: "adult" };

const rr = (s: number) => { const v = Math.sin(s * 91.37) * 43758.5453; return v - Math.floor(v); };
/** cartoon flame on a 300 x 500 canvas, base at the bottom centre; ph = flicker phase 0..1, seed = shape */
export const fxFlame = (p: Pen, ph: number, seed: number) => {
  const tw = Math.PI * 2;
  const tongue = (w: number, h: number, col: string, k: number, ol: number) => {
    const pts: P2[] = [], n = 26;
    for (let i = 0; i <= n; i++) { // right side up to the tip, then back down the left
      const t = i / n, y = 490 - h * t, wob = Math.sin(t * 7 + ph * tw + seed * 3) * 14 * k * t;
      pts.push([150 + w * Math.sin(Math.PI * Math.min(1, t * 1.35 + 0.12)) * (1 - t * 0.85) + wob, y]);
    }
    const tipX = 150 + Math.sin(ph * tw + seed) * 26 * k;
    pts.push([tipX, 490 - h - 18]);
    for (let i = n; i >= 0; i--) {
      const t = i / n, y = 490 - h * t, wob = Math.sin(t * 6 + ph * tw + seed * 5 + 1.2) * 14 * k * t;
      pts.push([150 - w * Math.sin(Math.PI * Math.min(1, t * 1.35 + 0.12)) * (1 - t * 0.85) + wob, y]);
    }
    p.poly(pts, col, ol);
  };
  const s = 0.85 + 0.15 * Math.sin(ph * tw * 2 + seed);
  tongue(118, 420 * s, "#e8401e", 1.2, 9);
  tongue(84, 300 * s, "#ff8a1e", 1.0, 0);
  tongue(48, 175 * s, "#ffd84a", 0.8, 0);
  // two side licks
  for (const sd of [-1, 1]) {
    const x = 150 + sd * 70, h = 120 + 60 * Math.sin(ph * tw + seed * sd);
    p.poly([[x - 20, 470], [x + sd * 8 + Math.sin(ph * tw * 2) * 10, 470 - h], [x + 20, 470]], "#ff6a1e", 6);
  }
};
/** soft rising smoke puff (300 x 300); t 0..1 life, col rgb triple */
export const fxSmoke = (p: Pen, t: number, rgb: string, a0 = 0.85) => {
  const a = a0 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t, d = 34 + 40 * t, r = 52 + 22 * (i % 2) + 30 * t;
    p.ell(150 + d * Math.cos(ang), 150 + d * 0.8 * Math.sin(ang), r, r * 0.9, `rgba(${rgb},${a.toFixed(3)})`, 0);
  }
  p.ell(150, 150, 70 + 30 * t, 64 + 30 * t, `rgba(${rgb},${a.toFixed(3)})`, 0);
};
/** a falling spark (200 x 200) */
export const fxSpark = (p: Pen) => {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.stroke([[100 + 18 * Math.cos(a), 100 + 18 * Math.sin(a)], [100 + (i % 2 ? 60 : 85) * Math.cos(a), 100 + (i % 2 ? 60 : 85) * Math.sin(a)]], 10, "#ffb02e"); }
  p.ell(100, 100, 26, 26, "#fff3b0", 6);
};
/** pour stream (160 x 600): col fill, wobble phase ph */
export const fxStream = (p: Pen, col: string, ph: number, w = 34) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([80 + w * (0.9 - 0.3 * t) + 8 * Math.sin(t * 9 + ph * 6.28), 10 + 580 * t]); }
  for (let i = 20; i >= 0; i--) { const t = i / 20; pts.push([80 - w * (0.9 - 0.3 * t) + 8 * Math.sin(t * 9 + ph * 6.28 + 0.6), 10 + 580 * t]); }
  p.poly(pts, col, 8);
  p.stroke([[80 - w * 0.3, 40], [80 - w * 0.25 + 6 * Math.sin(ph * 6.28), 520]], 6, "rgba(255,255,255,0.35)");
};
/** chalk tally marks on a dark wall panel (900 x 420): n finished marks, the next one drawn k 0..1 */
export const fxTally = (p: Pen, n: number, k: number) => {
  const g = p.g; g.fillStyle = "#3a3f3a"; g.fillRect(0, 0, 900, 420);
  p.poly(rrect(8, 8, 892, 412, 10), null, 12);
  const mark = (i: number, kk: number) => {
    const grp = Math.floor(i / 5), j = i % 5, x0 = 70 + grp * 230;
    if (j < 4) { const x = x0 + j * 40 + 6 * rr(i); p.stroke([[x, 100 + 8 * rr(i + 9)], [x + 4, 100 + (230 + 10 * rr(i + 3)) * kk]], 14, "#f2efe6"); }
    else p.stroke([[x0 - 22, 300], [x0 - 22 + (190) * kk, 300 - 170 * kk]], 14, "#f2efe6");
  };
  for (let i = 0; i < n; i++) mark(i, 1);
  if (k > 0) mark(n, k);
};
/** an old black-and-white press photo of a big river fire (760 x 600), yellowed, with dust 0..1 */
export const fxOldPhoto = (p: Pen, dust: number) => {
  const g = p.g;
  p.poly([[20, 30], [740, 14], [748, 580], [12, 590]], "#efe3c4", 8);
  const inner: P2[] = [[60, 64], [700, 52], [706, 520], [54, 530]];
  p.clip(inner, () => {
    const gr = g.createLinearGradient(0, 50, 0, 530); gr.addColorStop(0, "#cfc4ae"); gr.addColorStop(1, "#8a7e6a"); g.fillStyle = gr; g.fillRect(40, 40, 680, 500);
    // billowing smoke
    for (let i = 0; i < 9; i++) p.ell(120 + i * 70, 170 + 40 * Math.sin(i * 1.7), 90, 70, i % 2 ? "#5e564c" : "#6e665a", 0);
    // the river and a wall of flames across it
    g.fillStyle = "#4a443c"; g.fillRect(40, 380, 680, 160);
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * 75, h = 150 + 90 * rr(i + 4), pts: P2[] = [];
      for (let k = 0; k <= 16; k++) { const t2 = k / 16; pts.push([x + 42 * (1 - t2) + 16 * Math.sin(t2 * 7 + i), 410 - h * t2]); }
      for (let k = 16; k >= 0; k--) { const t2 = k / 16; pts.push([x - 42 * (1 - t2) + 16 * Math.sin(t2 * 6 + i + 1), 410 - h * t2]); }
      p.poly(pts, "#e8dfcb", 0);
      p.poly(pts.map(([a, b2]) => [x + (a - x) * 0.5, 410 - (410 - b2) * 0.55] as P2), "#ffffff", 0);
    }
    // a tug and a bridge in silhouette
    p.poly([[430, 440], [640, 440], [610, 480], [450, 480]], "#2a2622", 0); p.poly([[500, 410], [570, 410], [570, 440], [500, 440]], "#2a2622", 0); p.poly([[540, 370], [556, 370], [556, 410], [540, 410]], "#2a2622", 0);
  });
  p.poly(inner, null, 5);
  // yellowing, a dog-eared corner, dust and a cobweb
  g.fillStyle = "rgba(190,150,70,0.18)"; g.fillRect(20, 14, 728, 576);
  p.poly([[740, 14], [748, 120], [640, 22]], "#d8caa6", 5);
  if (dust > 0) {
    g.fillStyle = `rgba(150,140,125,${(0.55 * dust).toFixed(3)})`;
    for (let i = 0; i < 140; i++) g.fillRect(30 + 700 * rr(i), 30 + 540 * rr(i + 300), 5 + 8 * rr(i + 7), 4 + 5 * rr(i + 11));
    g.globalAlpha = dust; for (let i = 0; i < 5; i++) p.stroke([[22, 600 - 26 * i], [22 + 30 * i, 590]], 3, "#e8e4dc");
    p.stroke([[22, 590], [150, 470]], 3, "#e8e4dc"); g.globalAlpha = 1;
  }
};
/** a glass of water, a lit match drops in and goes out (700 x 900); u 0..1 */
export const fxMatch = (p: Pen, u: number) => {
  const g = p.g;
  const glass: P2[] = [[190, 260], [510, 260], [480, 860], [220, 860]];
  p.poly(glass, "rgba(220,238,250,0.55)", 10);
  p.clip(glass, () => { g.fillStyle = "#8fc6ec"; g.fillRect(150, 420, 400, 460); g.fillStyle = "#b5dcf6"; g.fillRect(150, 420, 400, 26); });
  p.stroke([[250, 300], [262, 820]], 14, "rgba(255,255,255,0.7)");
  const fall = Math.min(1, u / 0.55), y = 20 + 420 * fall * fall, rot = 0.6 * fall;
  if (u < 0.62) {
    const R = (x: number, yy: number): P2 => [350 + (x - 350) * Math.cos(rot) - (yy - y) * Math.sin(rot), y + (x - 350) * Math.sin(rot) + (yy - y) * Math.cos(rot)];
    p.band([R(350, y), R(350, y + 170)], "#e8c08a", 14, 4, "round");
    p.ell(R(350, y)[0], R(350, y)[1] - 6, 16, 20, "#c0353a", 5);
    fxFlameSmall(p, R(350, y)[0], R(350, y)[1] - 26, 1);
  } else {
    p.band([[300, 470], [430, 520]], "#d8b080", 14, 4, "round"); p.ell(296, 468, 15, 17, "#3a2a22", 5);
    const k = (u - 0.62) / 0.38;
    for (let i = 0; i < 3; i++) p.ell(300 + 30 * i - 20, 400 - 140 * k - 30 * i, 40 + 30 * k, 30 + 22 * k, `rgba(235,235,240,${(0.9 * (1 - k)).toFixed(3)})`, 0);
  }
};
const fxFlameSmall = (p: Pen, x: number, y: number, s: number) => {
  p.poly([[x - 16 * s, y + 14 * s], [x, y - 40 * s], [x + 16 * s, y + 14 * s]], "#ff8a1e", 5);
  p.poly([[x - 8 * s, y + 10 * s], [x, y - 16 * s], [x + 8 * s, y + 10 * s]], "#ffd84a", 0);
};
/** a bowl of cold soup with discs of fat floating on top, a spoon (900 x 700); u drifts the fat */
export const fxSoup = (p: Pen, u: number) => {
  p.ell(450, 380, 410, 250, "#f2efe6", 12);
  p.ell(450, 360, 340, 190, "#c97a3a", 8);
  p.ell(450, 360, 340, 190, null, 6);
  for (let i = 0; i < 14; i++) {
    const a = rr(i) * 6.28 + u * 0.8 * (rr(i + 5) - 0.5), d = 60 + 210 * rr(i + 2);
    const x = 450 + d * Math.cos(a), y = 360 + d * 0.52 * Math.sin(a), r = 18 + 26 * rr(i + 9);
    p.ell(x, y, r, r * 0.6, "#f4d26a", 4); p.ell(x - r * 0.3, y - r * 0.18, r * 0.3, r * 0.14, "#fff3b8", 0);
  }
  p.band([[700, 300], [880, 90]], "#c9ccd2", 22, 5, "round");
  p.ell(640, 360, 70, 34, "#c9ccd2", 6, 0, 360, -20);
};
/** a bill on parchment: wavy lines, a signature (sign 0..1) and a gold seal (seal 0/1) (1000 x 720) */
export const fxLaw = (p: Pen, sign: number, seal: number) => {
  const g = p.g;
  p.poly([[30, 30], [970, 22], [976, 700], [24, 708]], "#f3e9cf", 10);
  p.stroke([[300, 100], [700, 96]], 16, "#3a3236");
  for (let i = 0; i < 9; i++) { const y = 170 + i * 42, x1 = 860 - 160 * rr(i); const pts: P2[] = []; for (let x = 120; x < x1; x += 20) pts.push([x, y + 4 * Math.sin(x * 0.11 + i)]); p.stroke(pts, 5, "#6a6066"); }
  if (sign > 0) { const pts: P2[] = []; for (let k = 0; k <= 40 * sign; k++) { const t = k / 40; pts.push([140 + 360 * t, 600 - 30 * Math.sin(t * 19) * (0.6 + 0.4 * Math.sin(t * 5)) - 20 * t]); } if (pts.length > 1) p.stroke(pts, 7, "#1f2a44"); }
  if (seal) {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; p.poly([[780 + 70 * Math.cos(a - 0.2), 580 + 70 * Math.sin(a - 0.2)], [780 + 96 * Math.cos(a), 580 + 96 * Math.sin(a)], [780 + 70 * Math.cos(a + 0.2), 580 + 70 * Math.sin(a + 0.2)]], "#d9a63a", 4); }
    p.ell(780, 580, 76, 76, "#e8c45a", 8); p.ell(780, 580, 52, 52, null, 4);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * 6.28; p.dot(780 + 28 * Math.cos(a), 580 + 28 * Math.sin(a), 9, "#b07a28"); }
    p.band([[730, 650], [700, 710]], "#2e5a9a", 26, 4); p.band([[830, 650], [860, 710]], "#c0353a", 26, 4);
  }
  g.fillStyle = "rgba(0,0,0,0)";
};
/** a standing gull (300 x 300) */
export const fxGull = (p: Pen) => {
  p.stroke([[140, 230], [134, 290]], 6, "#e8a33a"); p.stroke([[160, 230], [166, 290]], 6, "#e8a33a");
  p.ell(150, 190, 70, 46, "#f6f3ec", 9);
  p.poly([[110, 175], [40, 200], [120, 215]], "#9aa1aa", 7);
  p.ell(205, 140, 34, 30, "#f6f3ec", 9);
  p.poly([[232, 140], [276, 146], [234, 152]], "#e8c03a", 5);
  p.dot(214, 132, 6);
};
/** a jumping fish on the line (400 x 260), u 0..1 wiggle */
export const fxFish = (p: Pen, u: number) => {
  const b = 10 * Math.sin(u * 6.28 * 3);
  p.poly([[60, 130 + b], [10, 80], [10, 180]], "#6a8a5a", 7);
  p.ell(200, 130, 140, 62, "#8ab474", 9, 0, 360, b * 0.6);
  p.stroke([[120, 130], [300, 125]], 4, "#5a7a4a");
  p.ell(280, 118, 14, 14, "#ffffff", 5); p.dot(284, 118, 6);
  p.stroke([[330, 140], [345, 150]], 5);
};
