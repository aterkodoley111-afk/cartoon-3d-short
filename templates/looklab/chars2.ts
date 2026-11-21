// Cast v2: the character look learned from the 13-video reference study (Nov 2026).
// Construction (no copied characters, only the general recipe):
//  - a white, slightly squashed round head with a heavy ink outline (thicker on the shadow side), soft grey shading
//    at the jaw, tiny vertical-oval dot eyes, thick tapered brows that carry most of the acting
//  - hair and hats are painted objects: shaded, textured (curl strokes, cap seams, straw weave, rivets), outlined
//  - a bean torso with REAL fabric pattern (quilting, stripes, plaid, polka dots, scale armour, knit) + light/shadow,
//    belts, buckles, buttons, pockets, badges, bow ties, ties
//  - long thin ink limbs, small ink-blob hands and feet, ~3.6 heads tall; poses lean and tilt (never stiff)
// Draws into the 600 x 1000 card space used by Lab.card (feet at y = 975).
export type HatK = "none" | "cap" | "cowboy" | "helmet" | "bowler" | "straw" | "visor" | "headband" | "hardhat" | "beanie" | "chef" | "police" | "bicorne";
export type HairK = "none" | "short" | "curly" | "side" | "bun" | "long" | "bald" | "spiky" | "afro";
export type TopK = "shirt" | "uniform" | "overalls" | "vest" | "tunic" | "armor" | "dress" | "coat" | "hivis" | "suit" | "tank" | "apron";
export type PatK = "plain" | "quilt" | "stripes" | "dots" | "plaid" | "scales" | "knit" | "denim" | "check";
export type Expr2 = "neutral" | "smug" | "smile" | "grin" | "laugh" | "shock" | "scared" | "angry" | "furious" | "cry" | "sleepy" | "determined" | "scream" | "suspicious" | "proud" | "sad";
export type Look2 = {
  hair?: HairK; hairCol?: string; hat?: HatK; hatCol?: string; hatCol2?: string;
  top: TopK; col: string; col2?: string; pat?: PatK; patCol?: string;
  pants?: string; bow?: string; tie?: string; belt?: string; badge?: boolean; mustache?: string; beard?: string; glasses?: "round" | "sun";
  build?: "adult" | "big" | "kid" | "slim"; plume?: string;
};
export type Arm2 = { a: number; e: number }; // shoulder angle (0 = hanging down, + = forward/out to that side), elbow bend
export type Pose2 = {
  expr: Expr2; lean?: number; headTilt?: number; facing?: number; legs?: "stand" | "walk" | "run" | "sit" | "jump" | "crouch" | "wide";
  phase?: number; armL?: Arm2; armR?: Arm2; prop?: "mug" | "phone" | "cash" | "hammer" | "stopwatch" | "sign" | "axe" | "pot" | "none"; seatH?: number; blink?: boolean;
};
const INK = "#16121a", LIMB = "#1b1519";
/** scene light on the cast: shadow tint (sky bounce by day, warm by lamps) and strength; set per shot */
export const SHADE = { c: "34,48,104", k: 1.25, head0: "#e2e6f0", head1: "#b9c2da" };
type P = [number, number];
const R = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hex = (c: string): [number, number, number] => { const h = c.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]; };
const sh = (c: string, k: number) => { const [r, g, b] = hex(c); const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))).toString(16).padStart(2, "0"); return `#${f(r)}${f(g)}${f(b)}`; };

export class Toon2 {
  constructor(public g: CanvasRenderingContext2D) {}
  path(pts: P[], close = true) { const g = this.g; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); }
  fillInk(pts: P[], fill: string | CanvasGradient, w = 9) { const g = this.g; this.path(pts); g.fillStyle = fill; g.fill(); if (w > 0) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); } }
  line(pts: P[], w: number, col = INK, cap: CanvasLineCap = "round") { const g = this.g; this.path(pts, false); g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = "round"; g.stroke(); }
  circ(x: number, y: number, r: number, fill: string | CanvasGradient | null, w = 0, col = INK) { const g = this.g; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (w) { g.lineWidth = w; g.strokeStyle = col; g.stroke(); } }
  ell(x: number, y: number, rx: number, ry: number, rot: number, fill: string | CanvasGradient | null, w = 0) { const g = this.g; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (w) { g.lineWidth = w; g.strokeStyle = INK; g.stroke(); } }
  clip(pts: P[], fn: () => void) { const g = this.g; g.save(); this.path(pts); g.clip(); fn(); g.restore(); }
  /** light from the upper left: a soft highlight + a shadow on the lower right, inside the shape */
  shade(pts: P[], x0: number, y0: number, x1: number, y1: number, k = 0.38) {
    const g = this.g; this.clip(pts, () => {
      const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, "rgba(255,250,235,0.26)"); lg.addColorStop(0.38, "rgba(255,255,255,0)"); lg.addColorStop(0.55, `rgba(${SHADE.c},0)`); lg.addColorStop(1, `rgba(${SHADE.c},${k * SHADE.k})`);
      g.fillStyle = lg; g.fillRect(Math.min(x0, x1) - 400, Math.min(y0, y1) - 400, 1400, 1400);
    });
  }
}
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 64, a0 = 0, a1 = Math.PI * 2): P[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P; });
/** the head: superellipse, slightly pointed crown, fuller jaw, a little wider on the facing side */
const headPts = (cx: number, cy: number, W: number, facing: number, seed: number): P[] => Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), n = s < 0 ? 2.15 : 2.5;
  let x = Math.sign(c) * Math.abs(c) ** (2 / n), y = Math.sign(s) * Math.abs(s) ** (2 / n);
  x *= 1 + 0.06 * Math.sign(x) * facing + (s > 0 ? -0.05 * s : 0); y *= 1 + 0.015 * Math.sin(a * 3 + seed);
  return [cx + (W / 2) * x, cy + (W * 0.47) * y] as P;
});

const BUILD = { adult: { tw: 172, th: 236, leg: 300, head: 214 }, slim: { tw: 150, th: 236, leg: 318, head: 206 }, big: { tw: 250, th: 270, leg: 262, head: 222 }, kid: { tw: 138, th: 168, leg: 196, head: 200 } };

export const drawToon2 = (gctx: CanvasRenderingContext2D, L: Look2, P0: Pose2, seed = 1) => {
  const t = new Toon2(gctx), g = gctx, B = BUILD[L.build ?? "adult"], f = P0.facing ?? 0, legs = P0.legs ?? "stand", ph = P0.phase ?? 0;
  g.save();
  // whole-body lean about the feet
  g.translate(300, 975); g.rotate(P0.lean ?? 0); g.translate(-300, -975);
  const sit = legs === "sit", seatY = 975 - (P0.seatH ?? 170);
  const hipY = sit ? seatY : legs === "crouch" ? 975 - B.leg * 0.62 : legs === "jump" ? 975 - B.leg * 0.95 : 975 - B.leg;
  const tTop = hipY - B.th + 34, tBot = hipY + 30, cx = 300, tw = B.tw;
  // ---- legs (behind the torso)
  const legW = L.build === "big" ? 19 : L.build === "kid" ? 13 : 15, legC = L.pants ?? "#262b3c", armC = "#1e2130";
  const foot = (x: number, y: number, dir: number) => { t.ell(x + dir * 9, y - 6, 17, 10, 0, LIMB); };
  const legPair: [P, P, P][] = [];
  for (const sd of [-1, 1]) {
    const hx = cx + sd * tw * 0.2;
    if (sit) { const kx = hx + sd * 26, ky = seatY + 16 + 6; legPair.push([[hx, hipY], [kx, ky - 30], [kx + sd * 6, 975]]); }
    else if (legs === "walk" || legs === "run") {
      const amp = legs === "run" ? 0.75 : 0.38, s = Math.sin(ph * Math.PI * 2 + (sd > 0 ? 0 : Math.PI)), lift = Math.max(0, Math.cos(ph * Math.PI * 2 + (sd > 0 ? 0 : Math.PI)));
      const ax = hx + s * B.leg * amp * 0.55 + f * 10, ay = 975 - lift * (legs === "run" ? 70 : 26), kx = (hx + ax) / 2 + (legs === "run" ? 30 * lift : 8) * (f >= 0 ? 1 : -1), ky = (hipY + ay) / 2;
      legPair.push([[hx, hipY], [kx, ky], [ax, ay]]);
    } else if (legs === "jump") { legPair.push([[hx, hipY], [hx + sd * 50, hipY + B.leg * 0.4], [hx + sd * 20, hipY + B.leg * 0.72]]); }
    else if (legs === "crouch") { legPair.push([[hx, hipY], [hx + sd * 62, hipY + B.leg * 0.2], [hx + sd * 38, 975]]); }
    else if (legs === "wide") { legPair.push([[hx, hipY], [hx + sd * 50, (hipY + 975) / 2], [hx + sd * 78, 975]]); }
    else legPair.push([[hx, hipY], [hx + sd * 6 + f * 6, (hipY + 975) / 2], [hx + sd * 12 + f * 4, 975]]);
  }
  for (const [h, k, a] of legPair) { t.line([h, k, a], legW + 4, INK); t.line([h, k, a], legW, legC); foot(a[0], a[1] + 6, f >= 0 ? 1 : -1); }
  // ---- arms behind? (an arm reaching back is drawn before the torso)
  const shY = tTop + 40;
  const armPts = (sd: number, A: Arm2): P[] => {
    const sx = cx + sd * (tw * 0.47), up = 112, lo = 104;
    const a1 = A.a, a2 = A.a + A.e;
    const e: P = [sx + sd * Math.sin(a1) * up, shY + Math.cos(a1) * up], hnd: P = [e[0] + sd * Math.sin(a2) * lo, e[1] + Math.cos(a2) * lo];
    return [[sx - sd * 8, shY], e, hnd];
  };
  const aL = P0.armL ?? { a: 0.18, e: -0.05 }, aR = P0.armR ?? { a: 0.18, e: -0.05 };
  const hand = (p: P) => { t.circ(p[0], p[1], 13, LIMB); t.circ(p[0] + 7, p[1] - 6, 6, LIMB); };
  const drawArm = (sd: number, A: Arm2) => { const pts = armPts(sd, A); t.line(pts, legW - 3, armC); hand(pts[2]); return pts[2]; };
  // ---- torso
  const big = L.build === "big";
  const torso: P[] = [];
  for (let i = 0; i <= 48; i++) {
    const u = i / 48, a = u * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const wy = s < 0 ? 1 - 0.12 * (-s) ** 3 : 1 + (big ? 0.12 : 0.04) * s;
    torso.push([cx + (tw / 2) * Math.sign(c) * Math.abs(c) ** 0.72 * wy, (tTop + tBot) / 2 + ((tBot - tTop) / 2) * Math.sign(s) * Math.abs(s) ** 0.85]);
  }
  const dress = L.top === "dress";
  const body: P[] = dress ? (() => { const sk: P[] = []; for (let i = 0; i <= 24; i++) { const u = i / 24; sk.push([cx + (tw / 2) * (0.82 + 0.62 * u), tTop + 60 + (hipY + 120 - tTop - 60) * u]); }
    const bot: P[] = ellPts(cx, hipY + 120, tw * 0.72, 22, 24, 0, Math.PI); const top = ellPts(cx, tTop + 70, tw * 0.41, 70, 24, Math.PI, Math.PI * 2);
    return [...top, ...sk, ...bot, ...sk.map(([x, y]) => [2 * cx - x, y] as P).reverse()]; })() : torso;
  // fill + pattern
  t.path(body); g.fillStyle = L.col; g.fill();
  t.clip(body, () => pattern(t, L, cx, tTop, tw, tBot - tTop + (dress ? 140 : 0), seed));
  details(t, L, cx, tTop, tBot, hipY, tw, f);
  t.shade(body, cx - tw * 0.6, tTop, cx + tw * 0.55, tBot + 10, 0.5);
  t.clip(body, () => { g.save(); g.translate(-7, -5); t.path(body); g.lineWidth = 10; g.strokeStyle = "rgba(255,248,230,0.22)"; g.stroke(); g.restore(); });
  t.path(body); g.lineWidth = 9; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke();
  // sleeves: short cloth stubs at the shoulders
  const sleeve = (sd: number, A: Arm2) => { if (L.top === "tank" || L.top === "vest" && !L.col2) return; const pts = armPts(sd, A); const d = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]], n = Math.hypot(d[0], d[1]);
    const ex: P = [pts[0][0] + (d[0] / n) * 52, pts[0][1] + (d[1] / n) * 52]; t.line([[pts[0][0], pts[0][1] + 4], ex], 30, INK); t.line([[pts[0][0], pts[0][1] + 4], ex], 21, sleeveCol(L)); };
  const hL = drawArm(-1, aL), hR = drawArm(1, aR); sleeve(-1, aL); sleeve(1, aR);
  if (P0.prop && P0.prop !== "none") prop(t, P0.prop, hR, seed);
  // ---- head
  const hw = B.head, hcx = cx + f * 8, hcy = tTop - hw * 0.36;
  g.save(); g.translate(hcx, hcy + hw * 0.4); g.rotate(P0.headTilt ?? 0); g.translate(-hcx, -(hcy + hw * 0.4));
  hairBack(t, L, hcx, hcy, hw, f);
  const hp = headPts(hcx, hcy, hw, f, seed);
  // heavy ink: an offset black head under the white one (thicker at the lower right)
  g.save(); g.translate(3, 4); t.path(headPts(hcx, hcy, hw + 16, f, seed)); g.fillStyle = INK; g.fill(); g.restore();
  t.path(headPts(hcx, hcy, hw + 13, f, seed)); g.fillStyle = INK; g.fill();
  const rg = g.createRadialGradient(hcx - hw * 0.18, hcy - hw * 0.2, hw * 0.1, hcx, hcy, hw * 0.62); rg.addColorStop(0, "#ffffff"); rg.addColorStop(0.5, "#f7f7f8"); rg.addColorStop(0.82, SHADE.head0); rg.addColorStop(1, SHADE.head1);
  t.path(hp); g.fillStyle = rg; g.fill();
  face(t, L, P0, hcx, hcy, hw, f, seed);
  hairFront(t, L, hcx, hcy, hw, f, seed);
  hat(t, L, hcx, hcy, hw, f, seed);
  g.restore();
  void hL;
  g.restore();
};
const sleeveCol = (L: Look2) => L.top === "vest" || L.top === "overalls" || L.top === "apron" ? (L.col2 ?? "#f2f0ea") : L.top === "hivis" ? (L.col2 ?? "#3b4a62") : L.col;

const pattern = (t: Toon2, L: Look2, cx: number, y0: number, w: number, h: number, seed: number) => {
  const g = t.g, pc = L.patCol ?? sh(L.col, 0.72), x0 = cx - w, x1 = cx + w, y1 = y0 + h + 40;
  switch (L.pat ?? "plain") {
    case "quilt": for (let k = -20; k < 20; k++) { t.line([[x0 + k * 26, y0], [x0 + k * 26 + h + 40, y1]], 2.4, pc); t.line([[x1 - k * 26, y0], [x1 - k * 26 - h - 40, y1]], 2.4, pc); }
      for (let k = -20; k < 20; k++) for (let j = 0; j < 20; j++) { const x = x0 + k * 26 + j * 13, y = y0 + j * 13; if ((k + j) % 2 === 0) t.circ(x, y, 2.2, sh(pc, 0.8)); } break;
    case "stripes": for (let x = x0; x < x1; x += 22) { g.fillStyle = pc; g.fillRect(x, y0, 9, h + 60); } break;
    case "dots": for (let y = y0 + 8; y < y1; y += 24) for (let x = x0 + ((y / 24) % 2 ? 12 : 0); x < x1; x += 24) t.circ(x, y, 5, pc); break;
    case "scales": for (let y = y0 + 6; y < y1; y += 17) for (let x = x0 + ((Math.round(y / 17)) % 2 ? 9 : 0); x < x1; x += 18) { t.circ(x, y, 6.5, sh(L.col, 1.35), 1.5, sh(L.col, 0.55)); t.circ(x - 1.5, y - 1.5, 2, "rgba(255,255,255,0.6)"); } break;
    case "plaid": for (let x = x0; x < x1; x += 34) { g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x, y0, 12, h + 60); g.fillStyle = pc; g.fillRect(x + 20, y0, 3, h + 60); }
      for (let y = y0; y < y1; y += 34) { g.fillStyle = "rgba(0,0,0,0.13)"; g.fillRect(x0, y, 2 * w, 12); g.fillStyle = pc; g.fillRect(x0, y + 20, 2 * w, 3); } break;
    case "check": for (let y = y0; y < y1; y += 16) for (let x = x0; x < x1; x += 16) if ((Math.round(x / 16) + Math.round(y / 16)) % 2) { g.fillStyle = pc; g.fillRect(x, y, 16, 16); } break;
    case "knit": for (let y = y0; y < y1; y += 12) for (let x = x0; x < x1; x += 14) { t.line([[x, y], [x + 7, y + 8], [x + 14, y]], 2, pc); } break;
    case "denim": for (let k = 0; k < 900; k++) { const x = x0 + R(seed + k) * 2 * w, y = y0 + R(seed + k * 1.7) * (h + 40); t.line([[x, y], [x + 4, y + 7]], 1.4, k % 2 ? pc : sh(L.col, 1.25)); } break;
    default: for (let k = 0; k < 260; k++) { const x = x0 + R(seed + k) * 2 * w, y = y0 + R(seed + k * 2.3) * (h + 40); t.line([[x, y], [x + 5, y + 1]], 1.2, "rgba(0,0,0,0.06)"); }
  }
};

const details = (t: Toon2, L: Look2, cx: number, y0: number, yb: number, hipY: number, w: number, f: number) => {
  const c2 = L.col2 ?? "#f2f0ea", bx = cx + f * 10;
  const button = (x: number, y: number, c = "#e9d9a8") => { t.circ(x, y, 5.5, c, 2.2); };
  const belt = (y: number, c: string) => { const pts: P[] = [[cx - w / 2 - 4, y - 12], [cx + w / 2 + 4, y - 9], [cx + w / 2 + 4, y + 11], [cx - w / 2 - 4, y + 9]]; t.fillInk(pts, c, 3); t.fillInk([[bx - 13, y - 14], [bx + 13, y - 14], [bx + 13, y + 13], [bx - 13, y + 13]], "#d9c27a", 3); t.fillInk([[bx - 6, y - 7], [bx + 6, y - 7], [bx + 6, y + 6], [bx - 6, y + 6]], c, 2); };
  switch (L.top) {
    case "shirt": case "uniform": {
      t.fillInk([[bx - 34, y0 + 14], [bx, y0 + 44], [bx - 14, y0 + 58], [bx - 46, y0 + 30]], sh(L.col, 1.15), 3);
      t.fillInk([[bx + 34, y0 + 14], [bx, y0 + 44], [bx + 14, y0 + 58], [bx + 46, y0 + 30]], sh(L.col, 1.15), 3);
      t.line([[bx, y0 + 46], [bx, yb - 26]], 2.5, sh(L.col, 0.6)); for (let y = y0 + 70; y < yb - 30; y += 34) button(bx + 5, y);
      const pk = (x: number) => { t.fillInk([[x - 24, y0 + 74], [x + 24, y0 + 74], [x + 22, y0 + 118], [x - 22, y0 + 118]], sh(L.col, 0.93), 2.5); t.fillInk([[x - 26, y0 + 70], [x + 26, y0 + 70], [x + 26, y0 + 86], [x, y0 + 94], [x - 26, y0 + 86]], sh(L.col, 1.08), 2.5); button(x, y0 + 84); };
      if (L.top === "uniform") { pk(bx - 46); pk(bx + 46); }
      else pk(bx - 44);
      if (L.badge) star(t, bx + 46, y0 + 80, 20, "#e2b84a");
      break; }
    case "overalls": {
      const yb2 = y0 + 92; t.fillInk([[bx - 50, yb2], [bx + 50, yb2], [bx + 60, yb + 40], [bx - 60, yb + 40]], L.col2 ?? "#3d5f9c", 3);
      t.clip([[bx - 50, yb2], [bx + 50, yb2], [bx + 60, yb + 40], [bx - 60, yb + 40]], () => pattern(t, { ...L, col: L.col2 ?? "#3d5f9c", pat: "denim", patCol: "#2b4677" }, cx, yb2, w, 200, 7));
      t.line([[bx - 50, yb2 + 2], [bx - 70, y0 + 8]], 16, INK); t.line([[bx - 50, yb2 + 2], [bx - 70, y0 + 8]], 10, L.col2 ?? "#3d5f9c");
      t.line([[bx + 50, yb2 + 2], [bx + 70, y0 + 8]], 16, INK); t.line([[bx + 50, yb2 + 2], [bx + 70, y0 + 8]], 10, L.col2 ?? "#3d5f9c");
      button(bx - 42, yb2 + 10, "#d8d8d8"); button(bx + 42, yb2 + 10, "#d8d8d8"); t.fillInk([[bx - 22, yb2 + 26], [bx + 22, yb2 + 26], [bx + 20, yb2 + 62], [bx - 20, yb2 + 62]], sh(L.col2 ?? "#3d5f9c", 0.9), 2);
      for (let x = bx - 46; x < bx + 46; x += 9) t.line([[x, yb2 + 6], [x + 4, yb2 + 6]], 1.6, "#e6c070");
      break; }
    case "vest": case "suit": {
      const sc = L.col2 ?? "#f4f1e8";
      t.fillInk([[bx - 26, y0 + 4], [bx + 26, y0 + 4], [bx + 18, yb - 10], [bx - 18, yb - 10]], sc, 0);
      if (L.top === "suit") { t.fillInk([[bx - 26, y0 + 6], [bx - 4, y0 + 96], [bx - 42, y0 + 50]], sh(L.col, 1.12), 3); t.fillInk([[bx + 26, y0 + 6], [bx + 4, y0 + 96], [bx + 42, y0 + 50]], sh(L.col, 1.12), 3); }
      t.line([[bx - 26, y0 + 4], [bx - 4, yb - 6]], 3, INK); t.line([[bx + 26, y0 + 4], [bx + 4, yb - 6]], 3, INK);
      for (let y = y0 + 90; y < yb - 20; y += 30) button(bx + 14, y, "#c9a54a");
      break; }
    case "tunic": case "armor": {
      t.line([[bx - 30, y0 + 12], [bx + 2, y0 + 50], [bx + 30, y0 + 12]], 4, sh(L.col, 0.55));
      if (L.top === "armor") { const sk: P[] = [[cx - w / 2 - 2, hipY - 4], [cx + w / 2 + 2, hipY - 4], [cx + w / 2 + 10, yb + 6], [cx - w / 2 - 10, yb + 6]]; t.fillInk(sk, L.col2 ?? "#c23a3a", 3); for (let x = cx - w / 2; x < cx + w / 2; x += 18) t.line([[x, hipY], [x - 2, yb + 4]], 2, sh(L.col2 ?? "#c23a3a", 0.6)); }
      break; }
    case "hivis": {
      const o = L.col; for (const y of [y0 + 120, y0 + 160]) { t.fillInk([[cx - w, y], [cx + w, y], [cx + w, y + 14], [cx - w, y + 14]], "#e8eef0", 0); t.line([[cx - w, y + 7], [cx + w, y + 7]], 1.5, "#b7c4c8"); }
      t.line([[bx, y0 + 30], [bx, yb - 20]], 3, sh(o, 0.6)); break; }
    case "apron": { t.fillInk([[bx - 50, y0 + 70], [bx + 50, y0 + 70], [bx + 58, yb + 34], [bx - 58, yb + 34]], L.col2 ?? "#f4f4f2", 3); t.line([[bx - 50, y0 + 72], [bx - 24, y0 + 4]], 4, INK); t.line([[bx + 50, y0 + 72], [bx + 24, y0 + 4]], 4, INK);
      t.fillInk([[bx - 22, y0 + 120], [bx + 22, y0 + 120], [bx + 20, y0 + 150], [bx - 20, y0 + 150]], sh(L.col2 ?? "#f4f4f2", 0.92), 2); break; }
    case "coat": { t.fillInk([[bx - 30, y0 + 6], [bx - 6, y0 + 110], [bx - 50, y0 + 60]], sh(L.col, 1.15), 3); t.fillInk([[bx + 30, y0 + 6], [bx + 6, y0 + 110], [bx + 50, y0 + 60]], sh(L.col, 1.15), 3);
      for (let y = y0 + 120; y < yb - 10; y += 32) { button(bx - 16, y, "#3a2a20"); button(bx + 16, y, "#3a2a20"); } break; }
    case "tank": { t.line([[bx - 40, y0 + 2], [bx - 34, y0 + 40], [bx, y0 + 58], [bx + 34, y0 + 40], [bx + 40, y0 + 2]], 4, sh(L.col, 0.7)); break; }
    case "dress": { t.fillInk([[bx - 28, y0 + 10], [bx, y0 + 34], [bx + 28, y0 + 10], [bx + 20, y0 + 22], [bx - 20, y0 + 22]], L.col2 ?? "#ffffff", 2.5); break; }
  }
  if (L.belt) belt(hipY - 14, L.belt);
  if (L.bow) { const y = y0 + 16; t.fillInk([[bx, y], [bx - 30, y - 15], [bx - 30, y + 15]], L.bow, 3); t.fillInk([[bx, y], [bx + 30, y - 15], [bx + 30, y + 15]], L.bow, 3); for (const [dx, dy] of [[-20, -4], [-16, 7], [18, -5], [22, 6]]) t.circ(bx + dx, y + dy, 3, "#ffffff"); t.circ(bx, y, 8, sh(L.bow, 0.8), 3); }
  if (L.tie) { const y = y0 + 14; t.fillInk([[bx - 10, y], [bx + 10, y], [bx + 6, y + 14], [bx - 6, y + 14]], L.tie, 2.5); t.fillInk([[bx - 6, y + 14], [bx + 6, y + 14], [bx + 14, y + 120], [bx, y + 138], [bx - 14, y + 120]], L.tie, 2.5);
    for (let k = 0; k < 6; k++) t.line([[bx - 10, y + 30 + k * 18], [bx + 10, y + 20 + k * 18]], 3, sh(L.tie, 1.35)); }
};
const star = (t: Toon2, x: number, y: number, r: number, c: string) => { const pts: P[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); } t.fillInk(pts, c, 2.5); t.circ(x - 4, y - 4, 3, "rgba(255,255,255,0.7)"); };

// --------------------------------------------------------------------------------------------- face
const face = (t: Toon2, L: Look2, P0: Pose2, cx: number, cy: number, W: number, f: number, seed: number) => {
  const g = t.g, ex = cx + f * W * 0.12, ey = cy + W * 0.02, sp = W * 0.17, e = P0.expr;
  const big = e === "shock" || e === "scared" || e === "scream";
  const furious = e === "furious";
  // eyes
  for (const sd of [-1, 1]) {
    const x = ex + sd * sp * (1 - 0.18 * f * sd), y = ey;
    if (P0.blink || e === "laugh") { t.line([[x - 13, y + 3], [x, y - 8], [x + 13, y + 3]], 6); continue; }
    if (e === "cry") { t.line([[x - 14, y - 2], [x, y + 6], [x + 14, y - 2]], 6); continue; }
    if (e === "sleepy") { t.line([[x - 13, y + 2], [x + 13, y + 2]], 6); continue; }
    if (big) { t.circ(x, y - 2, 25, "#ffffff", 7); t.circ(x + f * 5, y - 2, e === "scared" ? 5 : 7, INK); continue; }
    if (furious) { const rg = g.createRadialGradient(x, y, 2, x, y, 30); rg.addColorStop(0, "rgba(255,90,60,1)"); rg.addColorStop(0.5, "rgba(230,30,20,0.85)"); rg.addColorStop(1, "rgba(230,30,20,0)"); t.circ(x, y, 30, rg); t.ell(x, y, 10, 13, 0, "#ff2a1a"); t.ell(x, y - 3, 4, 5, 0, "#ffe9a0"); continue; }
    t.ell(x + f * 3, y, 9.5, 14, 0, INK); t.circ(x + f * 3 - 3, y - 6, 2.6, "rgba(255,255,255,0.85)");
    if (e === "smug" || e === "suspicious" || e === "proud") { g.save(); g.fillStyle = "#f8f8f8"; g.fillRect(x - 16, y - 22, 32, 18); g.restore(); t.line([[x - 15, y - 3 - (sd > 0 && e === "suspicious" ? 3 : 0)], [x + 15, y - 3]], 6); }
  }
  // brows: thick tapered strokes (most of the acting)
  const brow: Record<Expr2, [number, number]> = { neutral: [-4, 0], smug: [-14, 6], smile: [-8, 0], grin: [-12, 0], laugh: [-16, 0], shock: [-30, 0], scared: [-24, -16], angry: [8, 22], furious: [12, 30], cry: [-12, -24], sleepy: [-2, 0], determined: [6, 14], scream: [-30, -6], suspicious: [4, 16], proud: [-12, 6], sad: [-10, -20] };
  const [lift, tilt] = brow[e];
  for (const sd of [-1, 1]) {
    const x = ex + sd * sp, y = ey - (big ? 42 : 30) + lift * 0.6, tl = tilt * (e === "smug" && sd < 0 ? -0.2 : 1);
    const inner: P = [x - sd * 16, y + tl * 0.5], outer: P = [x + sd * 18, y - tl * 0.35 - (e === "suspicious" && sd > 0 ? 10 : 0)];
    const nx = 0, ny = 1; void nx; void ny;
    t.fillInk([[inner[0], inner[1] - 5.5], [outer[0], outer[1] - 3.5], [outer[0] + sd * 2, outer[1] + 1.5], [inner[0], inner[1] + 5.5]], INK, 2);
  }
  // cheek / sweat / tears / extras
  if (e === "scared") { const x = cx + W * 0.36, y = cy - W * 0.18; t.fillInk([[x, y - 22], [x + 10, y], [x, y + 9], [x - 10, y]], "#9fd8ff", 3); }
  if (e === "cry") for (const sd of [-1, 1]) { const x = ex + sd * sp; t.fillInk([[x - 7, ey + 4], [x + 7, ey + 4], [x + 9 + sd * 4, cy + W * 0.5], [x - 9 + sd * 4, cy + W * 0.5]], "#7cc8ff", 2.5); }
  if (furious) { t.line([[cx + W * 0.36, cy - W * 0.36], [cx + W * 0.44, cy - W * 0.44]], 5); t.line([[cx + W * 0.42, cy - W * 0.3], [cx + W * 0.52, cy - W * 0.34]], 5); }
  // facial hair under the mouth line
  const mx = cx + f * W * 0.14, my = cy + W * 0.21;
  if (L.beard) { const pts: P[] = [...Array.from({ length: 20 }, (_, i) => { const a = Math.PI * 0.08 + (Math.PI * 0.84 * i) / 19; return [cx + Math.cos(a) * W * 0.45, cy + W * 0.06 + Math.sin(a) * W * 0.42] as P; })]; pts.push([cx - W * 0.3, cy + W * 0.16], [cx + W * 0.3, cy + W * 0.16]);
    t.fillInk(pts, L.beard, 4); for (let k = 0; k < 40; k++) { const a = R(seed + k) * Math.PI, r = W * (0.2 + 0.2 * R(seed + k * 3)); const x = cx + Math.cos(a) * r, y = cy + W * 0.1 + Math.sin(a) * r * 0.9; t.line([[x, y], [x + 2, y + 9]], 2, sh(L.beard, 0.6)); } }
  // mouth
  const D = (w: number, h: number, teeth = false, tongue = false) => { const pts = ellPts(mx, my - 2, w, h, 30, 0, Math.PI); pts.push([mx - w, my - 2]); t.fillInk(pts, "#5a1420", 5.5);
    if (teeth) t.clip(pts, () => { t.g.fillStyle = "#ffffff"; t.g.fillRect(mx - w, my - 4, 2 * w, h * 0.34); for (let x = mx - w + w / 3; x < mx + w; x += w / 3) t.line([[x, my - 2], [x, my + h * 0.3]], 2); });
    if (tongue) t.clip(pts, () => t.ell(mx + 4, my + h, w * 0.55, h * 0.45, 0, "#e86a78")); };
  switch (e) {
    case "neutral": case "sleepy": t.line([[mx - 14, my], [mx + 14, my]], 5.5); break;
    case "smug": case "proud": t.line([[mx - 18, my + 2], [mx + 6, my + 4], [mx + 22, my - 6]], 5.5); break;
    case "suspicious": t.line([[mx - 14, my + 2], [mx + 4, my], [mx + 14, my + 3]], 5.5); break;
    case "smile": t.line(ellPts(mx, my - 8, 22, 12, 14, 0.3, Math.PI - 0.3), 5.5); break;
    case "grin": D(34, 24, true); break;
    case "laugh": D(36, 40, true, true); break;
    case "shock": t.ell(mx, my + 6, 13, 18, 0, "#5a1420", 5.5); t.ell(mx, my + 14, 7, 6, 0, "#e86a78"); break;
    case "scream": t.ell(mx, my + 10, 26, 36, 0, "#5a1420", 5.5); t.ell(mx, my + 26, 14, 10, 0, "#e86a78"); t.clip(ellPts(mx, my + 10, 26, 36), () => { t.g.fillStyle = "#fff"; t.g.fillRect(mx - 26, my - 28, 52, 12); }); break;
    case "scared": { const pts: P[] = []; for (let i = 0; i <= 8; i++) pts.push([mx - 24 + i * 6, my + (i % 2 ? -4 : 4)]); t.line(pts, 5); break; }
    case "angry": case "determined": if (e === "angry") { const pts: P[] = [[mx - 26, my + 8], [mx + 26, my + 8], [mx + 22, my - 6], [mx - 22, my - 6]]; t.fillInk(pts, "#ffffff", 5); t.line([[mx - 22, my + 1], [mx + 22, my + 1]], 2); for (let x = mx - 13; x < mx + 22; x += 11) t.line([[x, my - 6], [x, my + 8]], 2); } else t.line([[mx - 16, my + 2], [mx + 16, my]], 6); break;
    case "furious": { const pts: P[] = [[mx - 30, my + 10], [mx + 30, my + 10], [mx + 26, my - 8], [mx - 26, my - 8]]; t.fillInk(pts, "#ffffff", 5); t.line([[mx - 26, my + 1], [mx + 26, my + 1]], 2); for (let x = mx - 18; x < mx + 26; x += 10) t.line([[x, my - 8], [x, my + 10]], 2); break; }
    case "cry": D(26, 30, false, true); break;
    case "sad": t.line(ellPts(mx, my + 10, 18, 10, 14, Math.PI + 0.3, Math.PI * 2 - 0.3), 5.5); break;
  }
  if (L.mustache) { const y = my - 14, c = L.mustache; t.fillInk([[mx, y - 4], [mx - 30, y - 2], [mx - 42, y + 12], [mx - 22, y + 8], [mx, y + 6], [mx + 22, y + 8], [mx + 42, y + 12], [mx + 30, y - 2]], c, 4);
    for (let k = -3; k <= 3; k++) t.line([[mx + k * 9, y], [mx + k * 10, y + 7]], 1.5, sh(c, 0.6)); }
  if (L.glasses) { for (const sd of [-1, 1]) { const x = ex + sd * sp; if (L.glasses === "sun") { const lg = g.createLinearGradient(x, ey - 18, x, ey + 18); lg.addColorStop(0, "rgba(250,190,60,0.9)"); lg.addColorStop(1, "rgba(200,110,20,0.9)"); t.ell(x, ey, 26, 19, 0, lg, 5); t.line([[x - 14, ey - 8], [x - 2, ey - 12]], 3, "rgba(255,255,255,0.8)"); }
    else t.circ(x, ey - 1, 25, null, 5.5); }
    t.line([[ex - sp + 25, ey - 4], [ex + sp - 25, ey - 4]], 5); }
};

// --------------------------------------------------------------------------------------------- hair & hats
const hairBack = (t: Toon2, L: Look2, cx: number, cy: number, W: number, f: number) => {
  const c = L.hairCol ?? "#5b3a24";
  if (L.hair === "long") t.fillInk([[cx - W * 0.52, cy - W * 0.1], [cx + W * 0.52, cy - W * 0.1], [cx + W * 0.58, cy + W * 0.62], [cx + W * 0.2, cy + W * 0.55], [cx - W * 0.2, cy + W * 0.55], [cx - W * 0.58, cy + W * 0.62]], c, 9);
  if (L.hair === "bun") t.circ(cx - f * 10, cy - W * 0.56, W * 0.2, c, 9);
  if (L.hair === "afro") t.circ(cx, cy - W * 0.08, W * 0.66, c, 9);
};
const tex = (t: Toon2, c: string, cx: number, cy: number, rx: number, ry: number, n: number, seed: number, curly: boolean) => {
  for (let k = 0; k < n; k++) { const a = R(seed + k) * Math.PI * 2, r = Math.sqrt(R(seed + k * 1.9)), x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    if (curly) t.line(ellPts(x, y, 7, 6, 8, 0, Math.PI * 1.4), 2.4, sh(c, 0.55)); else t.line([[x, y], [x + 8, y + 3]], 2.2, sh(c, 0.6)); if (k % 3 === 0) t.line([[x + 3, y - 3], [x + 8, y - 2]], 1.8, sh(c, 1.35)); }
};
const hairFront = (t: Toon2, L: Look2, cx: number, cy: number, W: number, f: number, seed: number) => {
  const h = L.hair ?? "none", c = L.hairCol ?? "#5b3a24"; if (h === "none" || h === "afro" && L.hat && L.hat !== "none") return;
  if (L.hat && L.hat !== "none" && L.hat !== "headband" && L.hat !== "visor") { // tufts under a hat
    for (const sd of [-1, 1]) t.fillInk([[cx + sd * W * 0.5, cy - W * 0.16], [cx + sd * W * 0.38, cy - W * 0.22], [cx + sd * W * 0.43, cy + W * 0.04]], c, 5); return; }
  const top = cy - W * 0.47;
  let pts: P[] = [];
  if (h === "bald") { for (const sd of [-1, 1]) { const p: P[] = [[cx + sd * W * 0.5, cy - W * 0.12], [cx + sd * W * 0.42, cy - W * 0.2], [cx + sd * W * 0.38, cy + W * 0.06], [cx + sd * W * 0.5, cy + W * 0.04]]; t.fillInk(p, c, 5); } return; }
  const n = 26;
  for (let i = 0; i <= n; i++) { const a = Math.PI + (Math.PI * i) / n; const r = h === "curly" || h === "afro" ? 1.06 + 0.05 * Math.sin(i * 2.2 + seed) : h === "spiky" ? (i % 2 ? 1.14 : 1.0) : 1.04; pts.push([cx + Math.cos(a) * W * 0.52 * r, cy - W * 0.05 + Math.sin(a) * W * 0.47 * r]); }
  // fringe line
  const fr: P[] = [];
  if (h === "side") { fr.push([cx + W * 0.5, cy - W * 0.1], [cx + W * 0.25, cy - W * 0.3], [cx - W * 0.1, cy - W * 0.22 - 10], [cx - W * 0.42, cy - W * 0.12], [cx - W * 0.52, cy - W * 0.02]); }
  else if (h === "bun" || h === "long") { fr.push([cx + W * 0.52, cy + W * 0.1], [cx + W * 0.3, cy - W * 0.26], [cx + f * 20, cy - W * 0.3], [cx - W * 0.3, cy - W * 0.24], [cx - W * 0.52, cy + W * 0.1]); }
  else { for (let i = 0; i <= 8; i++) { const u = i / 8, x = cx + W * 0.52 - u * W * 1.04; fr.push([x, cy - W * 0.24 + (i % 2 ? -12 : 6) + (h === "curly" ? Math.sin(i * 1.7) * 6 : 0)]); } }
  pts = [...pts, ...fr];
  t.fillInk(pts, c, 8);
  t.clip(pts, () => { tex(t, c, cx, top + W * 0.15, W * 0.5, W * 0.2, h === "curly" || h === "afro" ? 70 : 46, seed, h === "curly" || h === "afro"); t.shade(pts, cx - W * 0.4, top, cx + W * 0.5, cy, 0.3); });
};
const hat = (t: Toon2, L: Look2, cx: number, cy: number, W: number, f: number, seed: number) => {
  const k = L.hat ?? "none", c = L.hatCol ?? "#c73a34", c2 = L.hatCol2 ?? "#f4f2ea", g = t.g, top = cy - W * 0.47;
  const dome = (y: number, rx: number, ry: number, col: string, w = 8): P[] => { const p = ellPts(cx, y, rx, ry, 36, Math.PI, Math.PI * 2); t.fillInk(p, col, w); return p; };
  switch (k) {
    case "cap": {
      const d = dome(top + W * 0.24, W * 0.5, W * 0.36, c); t.clip(d, () => { g.fillStyle = c2; g.fillRect(cx - W * 0.22 + f * 20, top - 40, W * 0.44, W * 0.4); t.line([[cx - W * 0.22 + f * 20, top + W * 0.24], [cx - W * 0.1, top - 10]], 3, sh(c, 0.6)); t.line([[cx + W * 0.22 + f * 20, top + W * 0.24], [cx + W * 0.1, top - 10]], 3, sh(c, 0.6)); t.shade(d, cx - W * 0.5, top - 20, cx + W * 0.5, top + W * 0.3, 0.35); });
      t.path(d); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
      t.fillInk(ellPts(cx + f * 30, top + W * 0.25, W * 0.46, W * 0.07, 30, 0, Math.PI).concat(ellPts(cx + f * 30, top + W * 0.25, W * 0.4, W * 0.025, 20, Math.PI, 0) as P[]), sh(c, 0.8), 7);
      t.circ(cx, top - W * 0.11, 7, sh(c, 0.75), 3); break; }
    case "police": {
      t.fillInk([[cx - W * 0.5, top + W * 0.2], [cx - W * 0.56, top - W * 0.06], [cx + W * 0.56, top - W * 0.06], [cx + W * 0.5, top + W * 0.2]], c, 8);
      t.fillInk([[cx - W * 0.5, top + W * 0.14], [cx + W * 0.5, top + W * 0.14], [cx + W * 0.5, top + W * 0.24], [cx - W * 0.5, top + W * 0.24]], "#111318", 5);
      t.fillInk(ellPts(cx + f * 20, top + W * 0.25, W * 0.42, W * 0.08, 24, 0, Math.PI), "#0c0d10", 6); star(t, cx + f * 10, top + W * 0.05, 16, "#e9c45a"); break; }
    case "cowboy": {
      t.fillInk(ellPts(cx, top + W * 0.18, W * 0.86, W * 0.16), sh(c, 0.85), 8);
      const cr: P[] = [[cx - W * 0.36, top + W * 0.18], [cx - W * 0.34, top - W * 0.2], [cx - W * 0.12, top - W * 0.14], [cx, top - W * 0.2], [cx + W * 0.12, top - W * 0.14], [cx + W * 0.34, top - W * 0.2], [cx + W * 0.36, top + W * 0.18]];
      t.fillInk(cr, c, 8); t.clip(cr, () => { g.fillStyle = sh(c, 0.55); g.fillRect(cx - W * 0.4, top + W * 0.06, W * 0.8, W * 0.1); t.shade(cr, cx - W * 0.4, top - 30, cx + W * 0.4, top + W * 0.2, 0.4); });
      t.path(cr); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); break; }
    case "helmet": {
      const d = dome(top + W * 0.2, W * 0.52, W * 0.42, "#b9c0c8"); t.clip(d, () => { const lg = g.createLinearGradient(cx - W * 0.5, 0, cx + W * 0.5, 0); lg.addColorStop(0, "#eef2f6"); lg.addColorStop(0.35, "#c3cad2"); lg.addColorStop(1, "#5d6670"); g.fillStyle = lg; g.fillRect(cx - W, top - W, 2 * W, 2 * W); });
      t.path(d); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
      t.fillInk([[cx - W * 0.6, top + W * 0.16], [cx + W * 0.6, top + W * 0.16], [cx + W * 0.62, top + W * 0.24], [cx - W * 0.62, top + W * 0.24]], "#8d969f", 6);
      for (let i = -4; i <= 4; i++) t.circ(cx + i * W * 0.12, top + W * 0.2, 4, "#e3e7ea", 2);
      if (L.plume) { const pl: P[] = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * 1.1 + (Math.PI * 0.8 * i) / 14; pl.push([cx + Math.cos(a) * W * 0.28, top - W * 0.2 + Math.sin(a) * W * 0.3]); } pl.push([cx, top - W * 0.18]); t.fillInk(pl, L.plume, 6); for (let i = 0; i < 9; i++) t.line([[cx - W * 0.22 + i * 12, top - W * 0.32], [cx, top - W * 0.2]], 2, sh(L.plume, 0.65)); }
      break; }
    case "bowler": {
      t.fillInk(ellPts(cx, top + W * 0.18, W * 0.6, W * 0.08), sh(c, 0.8), 7); const d = dome(top + W * 0.18, W * 0.38, W * 0.34, c); t.clip(d, () => { g.fillStyle = sh(c, 0.55); g.fillRect(cx - W, top + W * 0.07, 2 * W, W * 0.08); t.shade(d, cx - W * 0.4, top - 30, cx + W * 0.4, top + W * 0.2); }); t.path(d); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); break; }
    case "straw": {
      const br = ellPts(cx, top + W * 0.16, W * 0.82, W * 0.14); t.fillInk(br, "#e8c35a", 7); t.clip(br, () => { for (let r = 0.4; r < 0.85; r += 0.06) t.line(ellPts(cx, top + W * 0.16, W * r, W * r * 0.17, 40), 1.6, "#b78f2c"); });
      const cr: P[] = [[cx - W * 0.36, top + W * 0.16], [cx - W * 0.33, top - W * 0.12], [cx + W * 0.33, top - W * 0.12], [cx + W * 0.36, top + W * 0.16]]; t.fillInk(cr, "#f0cd68", 7);
      t.clip(cr, () => { for (let y = top - W * 0.12; y < top + W * 0.16; y += 7) t.line([[cx - W * 0.4, y], [cx + W * 0.4, y]], 1.4, "#b78f2c"); g.fillStyle = c; g.fillRect(cx - W * 0.4, top + W * 0.03, W * 0.8, W * 0.09); }); t.path(cr); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); break; }
    case "visor": { t.fillInk([[cx - W * 0.5, top + W * 0.12], [cx + W * 0.5, top + W * 0.12], [cx + W * 0.48, top + W * 0.24], [cx - W * 0.48, top + W * 0.24]], "#ffffff", 6);
      const v: P[] = ellPts(cx + f * 20, top + W * 0.24, W * 0.46, W * 0.1, 24, 0, Math.PI); const lg = g.createLinearGradient(0, top + W * 0.2, 0, top + W * 0.36); lg.addColorStop(0, "rgba(40,170,90,0.95)"); lg.addColorStop(1, "rgba(20,110,60,0.85)"); t.fillInk(v, lg, 6); break; }
    case "headband": { const y = top + W * 0.2; t.fillInk([[cx - W * 0.53, y - 14], [cx + W * 0.53, y - 8], [cx + W * 0.53, y + 12], [cx - W * 0.53, y + 6]], c2, 5); t.fillInk([[cx + W * 0.5, y], [cx + W * 0.66, y - 16], [cx + W * 0.64, y + 6]], c2, 4); t.fillInk([[cx + W * 0.5, y + 2], [cx + W * 0.68, y + 20], [cx + W * 0.56, y + 22]], c2, 4); break; }
    case "hardhat": { const d = dome(top + W * 0.2, W * 0.5, W * 0.4, "#f5c21b"); t.clip(d, () => { t.fillInk([[cx - 12, top - W * 0.3], [cx + 12, top - W * 0.3], [cx + 10, top + W * 0.2], [cx - 10, top + W * 0.2]], "#ffd84a", 3); t.shade(d, cx - W * 0.5, top - 30, cx + W * 0.5, top + W * 0.2); }); t.path(d); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
      t.fillInk([[cx - W * 0.62, top + W * 0.16], [cx + W * 0.62, top + W * 0.16], [cx + W * 0.6, top + W * 0.25], [cx - W * 0.6, top + W * 0.25]], "#e2ac10", 6); break; }
    case "beanie": { const d = dome(top + W * 0.22, W * 0.5, W * 0.4, c); t.clip(d, () => { for (let x = cx - W * 0.5; x < cx + W * 0.5; x += 11) t.line([[x, top - W * 0.3], [x, top + W * 0.24]], 3, sh(c, 0.75)); t.shade(d, cx - W * 0.5, top - 30, cx + W * 0.5, top + W * 0.2); });
      t.path(d); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); t.fillInk([[cx - W * 0.53, top + W * 0.1], [cx + W * 0.53, top + W * 0.1], [cx + W * 0.53, top + W * 0.25], [cx - W * 0.53, top + W * 0.25]], sh(c, 0.9), 6); t.circ(cx, top - W * 0.2, 18, c2, 6); break; }
    case "chef": { const p: P[] = [[cx - W * 0.4, top + W * 0.2], [cx - W * 0.42, top - W * 0.1]]; for (let i = 0; i <= 18; i++) { const a = Math.PI * 1.0 + (Math.PI * i) / 18; p.push([cx + Math.cos(a) * W * 0.46 * (1 + 0.08 * Math.sin(i * 1.7)), top - W * 0.22 + Math.sin(a) * W * 0.36 * (1 + 0.1 * Math.cos(i * 2.1))]); }
      p.push([cx + W * 0.42, top - W * 0.1], [cx + W * 0.4, top + W * 0.2]); t.fillInk(p, "#fbfbfb", 8); t.clip(p, () => { for (const x of [-0.18, 0.06, 0.24]) t.line([[cx + W * x, top - W * 0.35], [cx + W * x - 6, top - W * 0.05]], 2.5, "#c8ccd6"); t.shade(p, cx - W * 0.4, top - W * 0.5, cx + W * 0.5, top + W * 0.2, 0.3); });
      t.line([[cx - W * 0.41, top + W * 0.06], [cx + W * 0.41, top + W * 0.06]], 3, "#b9bdc6"); break; }
    case "bicorne": { const p: P[] = [[cx - W * 0.66, top + W * 0.18]]; for (let i = 0; i <= 16; i++) { const a = Math.PI + (Math.PI * i) / 16; p.push([cx + Math.cos(a) * W * 0.66, top + W * 0.18 + Math.sin(a) * W * 0.36]); } t.fillInk(p, c, 8);
      t.line(ellPts(cx, top + W * 0.18, W * 0.6, W * 0.3, 20, Math.PI * 1.05, Math.PI * 1.95), 5, "#e9c45a"); t.circ(cx, top - W * 0.02, 18, "#e2e7f2", 4); t.circ(cx, top - W * 0.02, 9, "#c23a3a", 3); break; }
  }
  void seed; void c2;
};

// --------------------------------------------------------------------------------------------- props in the right hand
const prop = (t: Toon2, k: NonNullable<Pose2["prop"]>, h: P, seed: number) => {
  const [x, y] = h, g = t.g;
  switch (k) {
    case "mug": { const m: P[] = [[x - 22, y - 34], [x + 22, y - 34], [x + 20, y + 14], [x - 20, y + 14]]; t.fillInk(m, "#f3efe6", 5); t.circ(x + 26, y - 10, 12, null, 6); t.ell(x, y - 33, 20, 5, 0, "#6b3f22"); for (let i = 0; i < 3; i++) t.line([[x - 8 + i * 8, y - 46], [x - 4 + i * 8, y - 62], [x - 8 + i * 8, y - 76]], 2.5, "rgba(255,255,255,0.7)"); break; }
    case "phone": t.fillInk([[x - 15, y - 44], [x + 15, y - 44], [x + 15, y + 8], [x - 15, y + 8]], "#2a2d34", 4); t.fillInk([[x - 10, y - 38], [x + 10, y - 38], [x + 10, y + 2], [x - 10, y + 2]], "#7fc3ff", 0); break;
    case "cash": for (let i = 0; i < 4; i++) { g.save(); g.translate(x, y - 10); g.rotate(-0.5 + i * 0.25); t.fillInk([[-10, -50], [14, -50], [14, 0], [-10, 0]], "#9ccf7a", 3); t.circ(2, -25, 7, null, 2, "#4f8a3a"); g.restore(); } break;
    case "hammer": t.line([[x, y + 20], [x, y - 90]], 9, "#8a5a2c"); t.fillInk([[x - 30, y - 110], [x + 26, y - 110], [x + 26, y - 82], [x - 30, y - 82]], "#7d8790", 5); break;
    case "axe": t.line([[x, y + 30], [x + 10, y - 120]], 10, "#a06a34"); t.fillInk([[x + 10, y - 120], [x + 60, y - 140], [x + 66, y - 86], [x + 12, y - 96]], "#a9b3bb", 5); t.line([[x + 58, y - 136], [x + 64, y - 90]], 4, "#eef3f6"); break;
    case "stopwatch": t.circ(x, y - 30, 34, "#f6f6f2", 7); t.line([[x, y - 30], [x + 14, y - 48]], 4); t.fillInk([[x - 8, y - 72], [x + 8, y - 72], [x + 8, y - 62], [x - 8, y - 62]], "#c8ccd2", 4); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; t.line([[x + Math.cos(a) * 26, y - 30 + Math.sin(a) * 26], [x + Math.cos(a) * 21, y - 30 + Math.sin(a) * 21]], 2); } break;
    case "sign": t.line([[x, y + 30], [x, y - 140]], 9, "#8a5a2c"); t.fillInk([[x - 70, y - 220], [x + 70, y - 220], [x + 70, y - 130], [x - 70, y - 130]], "#f3e6c4", 6); for (let i = 0; i < 3; i++) t.line([[x - 50, y - 196 + i * 24], [x + 50 - i * 18, y - 196 + i * 24]], 6, "#c23a3a"); break;
    case "pot": t.fillInk([[x - 60, y - 30], [x + 40, y - 30], [x + 34, y + 36], [x - 54, y + 36]], "#d77a2c", 6); t.ell(x - 10, y - 30, 50, 10, 0, "#b8e04a", 5); t.line([[x + 40, y - 20], [x + 66, y - 26]], 7); break;
  }
  void seed;
};
/** head centre (card units) for a standing character, used to frame head close-ups */
export const headCenter = (L: Look2): [number, number] => { const B = BUILD[L.build ?? "adult"]; return [300, 975 - B.leg - B.th + 34 - B.head * 0.36]; };
