import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionText, chunkWords } from "./Captions";
import W from "./demo_words.json";
const chunks = chunkWords(W.words);
export const CaptionDemo: React.FC = () => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig();
  const pick = [2, 9, 17, 26, 41, 63][f % 6];
  return <AbsoluteFill><Img src={staticFile(`capdemo/lab_${f % 6}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <CaptionText text={chunks[pick].text} width={width} height={height} /></AbsoluteFill>;
};
export const CAPTION_CHUNKS = chunks;
