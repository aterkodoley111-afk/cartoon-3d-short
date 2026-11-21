// Cast v2 model sheet (stills only): outfits, expressions, actions.
import React, { useEffect, useRef } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { drawToon2, Look2, Pose2, Expr2, headCenter } from "./chars2";

export const CS_W = 2400, CS_H = 2050;
const CAST: [string, Look2, Pose2][] = [
  ["Farmer", { hair: "short", hat: "cap", hatCol: "#c8342e", top: "shirt", col: "#2f9a86", pat: "plain", belt: "#5a3a22" }, { expr: "smug", facing: 0.3, lean: 0.04, armR: { a: 0.6, e: -1.4 }, armL: { a: 0.15, e: 0 } }],
  ["Sheriff", { hat: "cowboy", hatCol: "#7a4f2a", top: "uniform", col: "#b49a64", badge: true, mustache: "#4a2e1c", glasses: "sun", belt: "#3a2a1c", build: "big" }, { expr: "determined", facing: -0.2, armL: { a: 0.6, e: -1.4 }, armR: { a: 0.6, e: -1.4 } }],
  ["Commander", { hat: "helmet", plume: "#d02a2a", top: "armor", col: "#2b4f8e", pat: "scales", col2: "#c23a3a", beard: "#5a3a22", belt: "#5a3a22" }, { expr: "angry", facing: 0.15, armR: { a: 1.2, e: 0.5 }, prop: "none" }],
  ["Inventor", { hair: "curly", hairCol: "#4a2e1e", hat: "headband", top: "tunic", col: "#c22a4e", pat: "quilt", belt: "#6b4a2a" }, { expr: "suspicious", facing: 0.35, lean: -0.05, armR: { a: 0.35, e: 1.9 }, prop: "hammer" }],
  ["Bookie", { hair: "side", hat: "visor", top: "vest", col: "#7a62c4", col2: "#f4f1e8", pat: "plaid", patCol: "#b7a6f0", bow: "#d23a46", belt: null as unknown as undefined }, { expr: "grin", facing: -0.25, prop: "cash", armR: { a: 0.35, e: 1.9 } }],
  ["Scientist", { hair: "side", hairCol: "#6a4024", top: "shirt", col: "#f2f2ee", tie: "#a8642a", glasses: "round", build: "slim" }, { expr: "proud", facing: 0.2, prop: "stopwatch", armR: { a: 0.35, e: 1.9 } }],
  ["Worker", { hat: "hardhat", top: "hivis", col: "#ff7a1a", col2: "#3b4a62", mustache: "#3a2a1c", belt: "#2a2a2a" }, { expr: "neutral", facing: -0.1, prop: "mug", armR: { a: 0.35, e: 1.9 } }],
  ["Chef", { top: "apron", col: "#f0f0f0", col2: "#ffffff", hat: "chef" }, { expr: "smug", facing: 0.25, prop: "pot", armR: { a: 0.35, e: 1.7 } }],
  ["Grandma", { hair: "bun", hairCol: "#c9c9cf", top: "dress", col: "#5f8fd0", col2: "#ffffff", pat: "dots", patCol: "#ffffff", glasses: "round" }, { expr: "smile", facing: -0.2, armL: { a: 0.3, e: -1.2 }, armR: { a: 0.3, e: -1.2 } }],
  ["Kid", { hair: "spiky", hairCol: "#d5732a", top: "shirt", col: "#f3c13a", pat: "stripes", patCol: "#e0563a", build: "kid" }, { expr: "laugh", facing: 0.1, armL: { a: 2.4, e: 0.3 }, armR: { a: 2.4, e: 0.3 }, legs: "wide" }],
  ["Captain", { hat: "bicorne", hatCol: "#1f2c66", top: "coat", col: "#2a3f8e", mustache: "#5a3a22", belt: "#e2c050" }, { expr: "scream", facing: 0.1, armR: { a: 1.4, e: 0.2 } }],
  ["Inmate", { hair: "bald", hairCol: "#3a2a1c", top: "tank", col: "#f2f2f2", pat: "knit", patCol: "#d7d9de", build: "big", beard: "#3a2a1c" }, { expr: "laugh", facing: 0, armL: { a: 0.5, e: -1.3 }, armR: { a: 0.5, e: -1.3 }, legs: "wide" }],
];
const EXPR: Expr2[] = ["neutral", "smug", "smile", "grin", "laugh", "proud", "suspicious", "determined", "angry", "furious", "shock", "scared", "scream", "sad", "cry", "sleepy"];
const ACT: [string, Look2, Pose2][] = [
  ["walk", CAST[0][1], { expr: "smile", legs: "walk", phase: 0.15, facing: 0.5, lean: 0.06, armL: { a: -0.5, e: 0.4 }, armR: { a: 0.6, e: 0.5 } }],
  ["run (panic)", CAST[9][1], { expr: "scream", legs: "run", phase: 0.2, facing: 0.6, lean: 0.22, armL: { a: 2.6, e: 0.4 }, armR: { a: 2.4, e: -0.3 } }],
  ["point + explain", CAST[5][1], { expr: "determined", facing: 0.4, armR: { a: 1.55, e: 0.05 }, armL: { a: 0.2, e: 0.2 } }],
  ["jump for joy", CAST[4][1], { expr: "laugh", legs: "jump", armL: { a: 2.8, e: 0.2 }, armR: { a: 2.8, e: 0.2 }, headTilt: 0.12 }],
  ["furious stomp", CAST[1][1], { expr: "furious", legs: "wide", lean: 0.05, armL: { a: 0.5, e: 1.5 }, armR: { a: 1.3, e: 0.9 }, prop: "axe" }],
  ["crouch + work", CAST[3][1], { expr: "determined", legs: "crouch", facing: 0.5, lean: 0.12, armR: { a: 1.0, e: 0.5 }, armL: { a: 0.9, e: 0.6 }, prop: "hammer" }],
  ["sit + sip", CAST[6][1], { expr: "smug", legs: "sit", seatH: 190, armR: { a: 0.35, e: 1.9 }, prop: "mug", headTilt: -0.08 }],
  ["shock recoil", CAST[2][1], { expr: "shock", lean: -0.18, armL: { a: 1.9, e: 0.6 }, armR: { a: 1.9, e: 0.6 }, headTilt: -0.1 }],
];

const draw = (c: HTMLCanvasElement) => {
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, CS_H); bg.addColorStop(0, "#9fd0f5"); bg.addColorStop(0.55, "#e6f2fb"); bg.addColorStop(1, "#cfe6c4"); g.fillStyle = bg; g.fillRect(0, 0, CS_W, CS_H);
  const label = (s: string, x: number, y: number, size = 30) => { g.font = `700 ${size}px sans-serif`; g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = "#16121a"; g.strokeText(s, x, y); g.fillStyle = "#fff"; g.fillText(s, x, y); };
  const char = (L: Look2, P: Pose2, x: number, y: number, s: number, seed: number, clipHead = false) => {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (!clipHead) { g.fillStyle = "rgba(20,30,20,0.22)"; g.beginPath(); g.ellipse(300, 975, 120, 18, 0, 0, Math.PI * 2); g.fill(); }
    if (clipHead) { const [, hy] = headCenter(L); g.translate(0, 300 - hy); g.beginPath(); g.rect(60, hy - 190, 480, 330); g.clip(); }
    drawToon2(g, L, P, seed); g.restore();
  };
  label("CAST v2 — outfits (painted hats/hair, fabric patterns, belts, badges)", CS_W / 2, 52, 40);
  CAST.forEach(([n, L, P], i) => { const x = (i % 12) * 200 - 60, y = 70; char(L, P, x, y, 0.53, i + 3); label(n, x + 160, y + 555, 26); });
  label("EXPRESSIONS — brows carry the acting; eyes: dots / half-lids / big-O / glow; mouths: line, smirk, D-teeth, O, tears", CS_W / 2, 700, 34);
  EXPR.forEach((e, i) => { const x = (i % 8) * 300 - 60, y = 640 + Math.floor(i / 8) * 330; const L = [CAST[0], CAST[3], CAST[9], CAST[10]][Math.floor(i / 4)][1]; char(L, { expr: e, facing: [0, 0.25, -0.25, 0.15][i % 4] }, x, y, 0.7, i, true); label(e, x + 210, y + 330, 28); });
  label("ACTIONS — leaning, tilted, never stiff; thin ink limbs bend at knees and elbows", CS_W / 2, 1420, 36);
  ACT.forEach(([n, L, P], i) => { const x = i * 300 - 10, y = 1430; char(L, P, x, y, 0.55, i + 11); label(n, x + 165, y + 585, 26); });
};

export const CharSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null); const [h] = React.useState(() => delayRender("sheet"));
  useEffect(() => { if (ref.current) draw(ref.current); continueRender(h); }, [h]);
  return <AbsoluteFill><canvas ref={ref} width={CS_W} height={CS_H} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
