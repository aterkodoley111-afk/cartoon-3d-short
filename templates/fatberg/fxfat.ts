// Our own 2D insert drawings for the fatberg short (all on the Pen API, plum ink): soap from fat, the kitchen sink
// with hard water, wipes vs toilet paper and the wipe skeleton, the plastic-wipes ban, biodiesel, flies, the jet,
// a rubber duck. Canvas units = pixels of the card canvas; u = animation 0..1.
import { Pen, INK } from "./toon";
type P2 = [number, number];
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const rr = (s: number) => { const v = Math.sin(s * 91.37 + 3.1) * 43758.5453; return v - Math.floor(v); };
/** lumpy closed outline */
const lump = (cx: number, cy: number, rx: number, ry: number, seed: number, n = 40, amp = 0.12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + amp * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2.3) * 0.4);
    out.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  return out;
};
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 8; i++) { const t = ((a + (90 * i) / 8) * Math.PI) / 180; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return pts;
};
const alpha = (p: Pen, a: number, fn: () => void) => { if (a <= 0.01) return; const g = p.g; g.save(); g.globalAlpha *= Math.min(1, a); fn(); g.restore(); };
/** a chunk of fatberg: grey-beige lump, darker marbling, white wipe flecks */
export const fatChunk = (p: Pen, cx: number, cy: number, rx: number, ry: number, seed = 1, ol = 9) => {
  const L = lump(cx, cy, rx, ry, seed);
  p.poly(L, "#cbbd94", ol);
  p.clip(L, () => {
    p.ell(cx + rx * 0.25, cy + ry * 0.45, rx * 0.9, ry * 0.5, "#a89a74", 0);
    for (let i = 0; i < 14; i++) p.ell(cx + (rr(i + seed) - 0.5) * 1.6 * rx, cy + (rr(i * 3 + seed) - 0.5) * 1.6 * ry, rx * (0.06 + 0.08 * rr(i * 7)), ry * (0.04 + 0.06 * rr(i * 5)), i % 3 ? "#f2eee2" : "#8a7a58", 0, 0, 360, rr(i) * 180);
    p.ell(cx - rx * 0.35, cy - ry * 0.45, rx * 0.35, ry * 0.18, "rgba(255,255,240,0.35)", 0);
  });
  p.poly(L, null, ol);
};

/** the fat chunk turning into a bar of soap (u 0..1, the pop at ~0.5) */
export const fxSoap = (p: Pen, u: number) => {
  p.poly(rrect(20, 560, 880, 690, 20), "#d8c4a0", 0); // counter top edge, under the subject
  const k = sm((u - 0.42) / 0.16);
  alpha(p, 1 - k, () => fatChunk(p, 450, 360, 240 * (1 - 0.15 * k), 190 * (1 - 0.15 * k), 2, 12));
  alpha(p, k, () => {
    const s = 0.85 + 0.15 * sm((u - 0.42) / 0.3);
    p.ell(450, 520, 250 * s, 40, "rgba(40,30,50,0.25)", 0);
    p.poly(rrect(450 - 220 * s, 360 - 130 * s, 450 + 220 * s, 360 + 140 * s, 70 * s), "#f4ead2", 12);
    p.poly(rrect(450 - 180 * s, 360 - 100 * s, 450 + 180 * s, 360 + 90 * s, 55 * s), "#fbf5e6", 0);
    p.ell(400, 300, 90 * s, 22 * s, "rgba(255,255,255,0.8)", 0);
    for (let i = 0; i < 9; i++) {
      const b = sm((u - 0.5 - i * 0.03) / 0.2), x = 210 + rr(i) * 480, y = 220 - 160 * b * (0.5 + rr(i * 2)), r = 14 + 22 * rr(i * 3);
      if (b > 0.02) p.ell(x, y, r * b, r * b, "rgba(214,238,255,0.65)", 5);
    }
  });
};

/** top view of a kitchen sink: fat poured in (0..0.35), hard-water calcium specks (0.35..0.6), chalky clumps (0.6..1) */
export const fxSink = (p: Pen, u: number) => {
  p.poly(rrect(10, 10, 890, 690, 30), "#c8cdd2", 12);                    // steel bowl rim
  p.poly(rrect(70, 70, 830, 630, 60), "#9aa3ad", 10);                      // bowl
  p.ell(450, 350, 300, 230, "#a9c9da", 0);                                 // standing water
  p.ell(380, 300, 140, 50, "rgba(255,255,255,0.35)", 0);
  p.ell(450, 350, 62, 62, "#5a626c", 9); p.ell(450, 350, 40, 40, "#2a2c32", 0); // drain
  for (let i = 0; i < 6; i++) p.stroke([[450 - 36 + i * 14, 322], [450 - 36 + i * 14, 378]], 5, "#7a828c");
  // the pan tipping in from the top left, pouring golden fat
  const pour = sm(u / 0.08) * (1 - sm((u - 0.42) / 0.08));
  if (pour > 0.02) {
    p.g.save(); p.g.translate(150, 90); p.g.rotate(0.6 * pour);
    p.poly(rrect(-150, -60, 90, 40, 30), "#2e2c34", 10); p.band([[80, -10], [230, -40]], "#2e2c34", 26, 9);
    p.g.restore();
    const ph = (u * 9) % 1;
    p.line([[215, 130], [300, 230 + 10 * Math.sin(ph * 6.3)], [440, 340]], "#e8b84a", 26);
  }
  // fat blobs on the water
  const fat = sm((u - 0.04) / 0.25);
  for (let i = 0; i < 12; i++) {
    const a = rr(i) * 6.28, d = 90 + 150 * rr(i * 2), x = 450 + d * Math.cos(a) * 1.15, y = 350 + d * Math.sin(a) * 0.85;
    const clump = sm((u - 0.6 - i * 0.015) / 0.2), cx = x + (450 - x) * 0.55 * clump, cy = y + (350 - y) * 0.55 * clump;
    const r = (14 + 14 * rr(i * 3)) * fat;
    if (r > 1) p.ell(cx, cy, r * (1 + 0.6 * clump), r * (0.8 + 0.5 * clump), clump > 0.5 ? "#efe9d8" : "#f0c55a", 6);
  }
  // calcium specks arriving from the tap water
  const ca = sm((u - 0.33) / 0.2);
  for (let i = 0; i < 40; i++) {
    const a = rr(i + 50) * 6.28, d = 60 + 190 * rr(i + 80), x = 450 + d * Math.cos(a) * 1.15, y = 350 + d * Math.sin(a) * 0.85;
    const clump = sm((u - 0.6 - (i % 12) * 0.015) / 0.2);
    if (ca > 0.02) p.ell(x + (450 - x) * 0.5 * clump, y + (350 - y) * 0.5 * clump, 7 * ca, 7 * ca, "#ffffff", 3);
  }
  // the chalky collar round the drain
  const col = sm((u - 0.75) / 0.2);
  if (col > 0.02) for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 + 0.3; p.ell(450 + 78 * Math.cos(a), 350 + 70 * Math.sin(a), 30 * col, 24 * col, "#e9e3d0", 6, 0, 360, a * 57); }
};

/** toilet paper falls apart, a wet wipe does not (u 0..0.5); then wipes knit into a net inside a lump of fat (0.5..1) */
export const fxWipes = (p: Pen, u: number) => {
  const k = sm((u - 0.5) / 0.12);
  alpha(p, 1 - k, () => {
    for (const cx of [230, 670]) { p.poly(rrect(cx - 200, 140, cx + 200, 640, 40), "#a9cde0", 12); p.ell(cx - 80, 220, 70, 20, "rgba(255,255,255,0.45)", 0); }
    // toilet paper: a square that breaks into soggy bits
    const br = sm((u - 0.08) / 0.3);
    for (let i = 0; i < 9; i++) {
      const gx = (i % 3) - 1, gy = Math.floor(i / 3) - 1, x = 230 + gx * (50 + 60 * br) + (rr(i) - 0.5) * 50 * br, y = 390 + gy * (50 + 70 * br) + (rr(i * 2) - 0.5) * 50 * br + 60 * br;
      p.poly(lump(x, y, 48 - 18 * br, 48 - 18 * br, i, 20, 0.05 + 0.25 * br), "#fbf9f2", 6);
    }
    // wet wipe: whole, quilted, just sways
    const sw = Math.sin(u * 20) * 0.06;
    p.g.save(); p.g.translate(670, 390); p.g.rotate(sw);
    const wp: P2[] = [[-130, -140], [130, -150], [140, 130], [-135, 140]];
    p.poly(wp, "#fdfdf8", 10);
    for (let j = -100; j <= 100; j += 40) { p.stroke([[-120, j], [125, j - 6]], 3, "#d6dde2"); p.stroke([[j, -135], [j + 6, 130]], 3, "#d6dde2"); }
    p.g.restore();
  });
  alpha(p, k, () => {
    // "x-ray" of a lump of fatberg: beige body, white wipes knitted through it like bones
    const L = lump(450, 380, 380, 270, 4, 48, 0.1);
    p.poly(L, "#d9c99c", 12);
    p.clip(L, () => {
      p.ell(500, 470, 340, 160, "#c4b386", 0);
      const g = sm((u - 0.6) / 0.35);
      for (let i = 0; i < 9; i++) {
        const y0 = 170 + i * 48, x0 = 90 + 40 * rr(i);
        const pts: P2[] = []; for (let s = 0; s <= 8; s++) pts.push([x0 + s * 90 * g, y0 + 30 * Math.sin(s * 1.3 + i)]);
        p.line(pts, "#fbfaf4", 18);
      }
      for (let i = 0; i < 8; i++) {
        const x0 = 150 + i * 85, pts: P2[] = []; for (let s = 0; s <= 6; s++) pts.push([x0 + 22 * Math.sin(s + i), 120 + s * 85 * g]);
        p.line(pts, "#f4f2ea", 14);
      }
    });
    p.poly(L, null, 12);
  });
};

/** the ban: a document with a crossed-out wipes pack, signed (sign 0..1), sealed (seal 0/1) */
export const fxBan = (p: Pen, sign: number, seal: number) => {
  p.poly([[60, 30], [940, 22], [950, 700], [52, 706]], "#f6f1e3", 12);
  for (let i = 0; i < 4; i++) p.stroke([[110, 80 + i * 34], [i === 3 ? 520 : 880, 80 + i * 34]], 12, "#b9b2a4");
  // wipes pack icon (soft pack with an oval flap)
  p.poly(rrect(300, 250, 700, 500, 70), "#7fc2dc", 11);
  p.poly(rrect(330, 280, 670, 470, 55), "#a8d9ea", 0);
  p.ell(500, 320, 120, 42, "#ffffff", 8);
  p.ell(500, 320, 70, 20, "#dfeff5", 0);
  for (let i = 0; i < 3; i++) p.ell(400 + i * 100, 420, 26, 26, i === 1 ? "#ffffff" : "#e8f6fb", 5);
  // red circle-slash
  p.g.lineCap = "round";
  p.ell(500, 375, 200, 200, null, 0);
  p.arc(500, 375, 200, 200, 0, 360, 34, "#c8323a");
  p.stroke([[360, 235], [640, 515]], 34, "#c8323a");
  // signature line + scribble growing with sign
  p.stroke([[110, 640], [520, 640]], 5, "#7a7468");
  if (sign > 0.02) {
    const pts: P2[] = []; const n = Math.max(2, Math.round(40 * sign));
    for (let i = 0; i <= n; i++) { const s = (i / 40) * 380; pts.push([130 + s, 610 - 26 * Math.sin(s * 0.06) * Math.cos(s * 0.023) - (i % 7 === 0 ? 12 : 0)]); }
    p.stroke(pts, 7, "#1f2a44");
  }
  if (seal) { p.poly(lump(800, 600, 82, 82, 3, 28, 0.08), "#b8323a", 9); p.ell(800, 600, 52, 52, "#d24a4a", 5); p.ell(800, 600, 22, 22, "#b8323a", 0); }
};

/** biodiesel: a lump drops into a funnel, the jug fills with golden fuel (u 0..1) */
export const fxFuel = (p: Pen, u: number) => {
  // jug
  const J: P2[] = [[300, 300], [600, 300], [640, 660], [260, 660]];
  p.poly(J, "rgba(225,240,248,0.85)", 12);
  const lvl = sm((u - 0.25) / 0.65);
  if (lvl > 0.01) p.clip(J, () => { const y = 660 - 330 * lvl; p.poly([[200, y + 8 * Math.sin(u * 30)], [700, y - 8 * Math.sin(u * 30)], [700, 700], [200, 700]], "#f2b42c", 0); p.ell(450, y, 200, 14, "#ffd66a", 0); for (let i = 0; i < 6; i++) { const by = 640 - ((u * 3 + i / 6) % 1) * 300 * lvl; p.ell(330 + rr(i) * 240, by, 8, 8, "rgba(255,240,190,0.9)", 3); } });
  p.poly(J, null, 12);
  p.ell(380, 420, 30, 120, "rgba(255,255,255,0.35)", 0);
  // funnel
  p.poly([[290, 150], [610, 150], [480, 290], [420, 290]], "#9aa3ad", 11);
  p.poly([[420, 285], [480, 285], [478, 330], [422, 330]], "#8a929c", 9);
  // the lump falling into the funnel and melting away
  const fall = sm(u / 0.3), melt = sm((u - 0.22) / 0.2);
  if (melt < 0.98) alpha(p, 1 - melt, () => fatChunk(p, 450, -40 + 200 * fall, 120 * (1 - 0.5 * melt), 90 * (1 - 0.6 * melt), 5, 9));
  if (u > 0.2 && u < 0.92) p.line([[450, 300], [450, 660 - 330 * lvl]], "#f2b42c", 18, false);
};

/** a fly: dark body, two pale wings flapping (ph 0..1) */
export const fxFly = (p: Pen, ph: number) => {
  const w = 0.25 + 0.75 * Math.abs(Math.sin(ph * Math.PI));
  p.ell(78, 64, 46 * w + 8, 22, "rgba(225,235,245,0.8)", 4, 0, 360, -30);
  p.ell(122, 64, 46 * w + 8, 22, "rgba(225,235,245,0.8)", 4, 0, 360, 30);
  p.ell(100, 112, 30, 42, "#2a2c36", 6);
  p.ell(100, 70, 24, 22, "#2a2c36", 6);
  p.dot(90, 64, 7, "#b8323a"); p.dot(110, 64, 7, "#b8323a");
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.stroke([[100 + s * 20, 104 + i * 14], [100 + s * 48, 116 + i * 20]], 4, INK);
};

/** the high-pressure jet, nozzle at the left edge, spray fanning right (ph 0..1) */
export const fxJet = (p: Pen, ph: number) => {
  p.g.save(); p.g.globalAlpha = 0.95;
  const col = "rgba(236,246,255,0.95)";
  p.poly([[0, 70], [600, 30], [600, 130], [0, 90]], col, 0);
  p.poly([[0, 76], [600, 62], [600, 98], [0, 84]], "#ffffff", 0);
  for (let i = 0; i < 18; i++) { const x = ((rr(i) + ph) % 1) * 600, y = 80 + (rr(i * 3) - 0.5) * (20 + x * 0.18); p.ell(x, y, 6 + x * 0.012, 4 + x * 0.01, "#ffffff", 2.5); }
  p.g.restore();
  p.stroke([[0, 70], [600, 30]], 3, "rgba(60,90,130,0.6)"); p.stroke([[0, 90], [600, 130]], 3, "rgba(60,90,130,0.6)");
};

/** rubber duck */
export const fxDuck = (p: Pen) => {
  p.ell(150, 200, 105, 62, "#f6c93c", 10);
  p.ell(110, 120, 60, 56, "#f6c93c", 10);
  p.poly([[50, 120], [8, 132], [52, 146]], "#f08a2c", 7);
  p.dot(100, 108, 9);
  p.arc(170, 190, 50, 26, 200, 330, 7, "#d9a826");
};

/** gloop of water spurting round a manhole lid (u 0..1) */
export const fxSpurt = (p: Pen, u: number) => {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32, h = 260 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * (0.6 + 0.4 * rr(i)), x0 = 300 + (i - 3) * 30;
    const pts: P2[] = [[x0, 380], [x0 + Math.cos(a) * h * 0.6, 380 + Math.sin(a) * h * 0.7], [x0 + Math.cos(a) * h * 1.1, 380 + Math.sin(a) * h * 0.5 + 40]];
    p.line(pts, "#b9d2dc", 16);
    p.ell(pts[2][0], pts[2][1], 12, 12, "#d6e8ef", 4);
  }
};
