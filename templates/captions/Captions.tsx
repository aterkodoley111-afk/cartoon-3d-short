// Burned-in captions in the style measured from the 13 reference shorts:
// 1-3 words at a time, heavy white sans with a thick black outline, centred at ~70% of the height,
// each chunk pops in (scale 0.86 -> 1 in 4 frames) exactly on its first word and stays until the next chunk.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { w: string; s: number; e: number };
export type Chunk = { text: string; s: number; e: number };

/** group timed words into 1-3 word chunks: break after punctuation, keep chunks <= 16 characters, never span a pause > 0.35 s */
export const chunkWords = (words: Word[], maxWords = 3, maxChars = 16): Chunk[] => {
  const out: Chunk[] = []; let cur: Word[] = [];
  const flush = () => { if (cur.length) out.push({ text: cur.map((w) => w.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (cur.length && (cur.length >= maxWords || (cur.map((x) => x.w).join(" ") + " " + w.w).length > maxChars || w.s - cur[cur.length - 1].e > 0.35)) flush();
    cur.push(w);
    if (/[.,!?;:]$/.test(w.w) || (next && next.s - w.e > 0.35)) flush();
  });
  flush();
  // each chunk stays on screen until the next one starts (no blank flashes between words)
  for (let i = 0; i < out.length - 1; i++) out[i].e = Math.max(out[i].e, out[i + 1].s);
  return out;
};

export const CaptionText: React.FC<{ text: string; pop?: number; width: number; height: number }> = ({ text, pop = 1, width, height }) => {
  const u = width / 1080, fs = 66 * u;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.7 - fs * 0.6, display: "flex", justifyContent: "center" }}>
      <div style={{
        fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, fontSize: fs, lineHeight: 1.05,
        color: "#ffffff", WebkitTextStroke: `${11 * u}px #0b0b0f`, paintOrder: "stroke fill", letterSpacing: 0.5 * u,
        textShadow: `0 ${5 * u}px ${10 * u}px rgba(0,0,0,0.45)`, textAlign: "center", maxWidth: width * 0.8,
        transform: `scale(${pop})`, transformOrigin: "50% 60%",
      }}>{text}</div>
    </div>
  );
};

/** drop on top of the whole short: <Captions words={words.words} /> */
export const Captions: React.FC<{ words: Word[]; offset?: number }> = ({ words, offset = 0 }) => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps - offset;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const c = chunks.find((k) => t >= k.s && t < k.e);
  if (!c) return null;
  const age = (t - c.s) * fps, pop = 0.86 + 0.14 * Math.min(1, age / 4) + 0.03 * Math.sin(Math.min(1, age / 4) * Math.PI);
  return <AbsoluteFill style={{ pointerEvents: "none" }}><CaptionText text={c.text} pop={pop} width={width} height={height} /></AbsoluteFill>;
};
