// Look lab composition: one frame per setup (no video): a stills sheet of the reference-matched look.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect, HueSaturationEffect, BrightnessContrastEffect } from "postprocessing";
import { Lab, Setup, envMap, seatWorld } from "./scene";
import { LensBlur } from "../tangiwai/lensblur";
import { drawToon2, Look2, Pose2 } from "./chars2";
import { CaptionText } from "../captions/Captions";

export const LAB_FRAMES = 7;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CAPS = ["He points", "Cars slow down", "except one.", "It never brakes.", "Grandpa just sips.", "Wait, what?", "He steps out."];

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const lab = useMemo(() => {
    const L = new Lab();
    scene.environment = envMap(); scene.fog = new THREE.Fog("#cfe0f2", 250, 3200);
    // Cast v2 characters (templates/cast2/chars2.ts); K = card scale so an adult stands ~1.7 m
    const K = 1.15, c2 = (L2: Look2, P2: Pose2, seed = 1) => (p: { g: CanvasRenderingContext2D }) => drawToon2(p.g, L2, P2, seed);
    const FARM2: Look2 = { hair: "short", hat: "cap", hatCol: "#c8342e", top: "shirt", col: "#2f9a86", belt: "#5a3a22" };
    // 0: the farmer in the long grass by the oak, pointing at the road
    L.card(c2(FARM2, { expr: "determined", facing: 0.45, lean: 0.03, armR: { a: 1.55, e: 0.05 }, armL: { a: 0.6, e: -1.4 } }, 3), 7.35, 0, -15.0, K);
    // 2: the driver behind the wheel of the red car
    L.car1.root.updateMatrixWorld(true); const d = L.car1.root.localToWorld(L.car1.driver.clone());
    L.card(c2({ hair: "side", hairCol: "#3a2a1c", top: "shirt", col: "#f3c13a" }, { expr: "grin", legs: "sit", seatH: 150, facing: 0.2, armL: { a: 1.1, e: 0.6 }, armR: { a: 1.1, e: 0.6 } }, 5), d.x, d.y - 0.32, d.z, 0.72 * K);
    // 3: a sheriff at the roadside, furious at the speeding car
    L.card(c2({ hat: "cowboy", hatCol: "#7a4f2a", top: "uniform", col: "#b49a64", badge: true, mustache: "#4a2e1c", belt: "#3a2a1c", build: "big" }, { expr: "furious", legs: "wide", lean: 0.04, armL: { a: 0.6, e: -1.4 }, armR: { a: 1.4, e: 0.5 } }, 7), 4.3, 0, -10.5, K);
    // 4: an old local in a lawn chair under the oak with a mug of tea
    L.card(c2({ hair: "bald", hairCol: "#d8d8dc", top: "coat", col: "#8a5a3a", mustache: "#dcdcdc", glasses: "round" }, { expr: "smug", legs: "sit", seatH: 176, facing: 0.3, armR: { a: 0.35, e: 1.9 }, prop: "mug", headTilt: -0.06 }, 9), 6.3, 0, -16.6, K);
    // 5: a line-up of the cast on the verge: actions + expressions
    const line: [Look2, Pose2][] = [
      [{ hat: "hardhat", top: "hivis", col: "#ff7a1a", col2: "#3b4a62", mustache: "#3a2a1c", belt: "#2a2a2a" }, { expr: "determined", armR: { a: 0.35, e: 1.9 }, prop: "hammer", facing: 0.2 }],
      [{ hair: "spiky", hairCol: "#d5732a", top: "shirt", col: "#e8532e", build: "kid" }, { expr: "shock", armL: { a: 2.5, e: 0.3 }, armR: { a: 2.5, e: 0.3 }, legs: "wide" }],
      [{ hair: "side", hat: "visor", top: "vest", col: "#7a62c4", col2: "#f4f1e8", pat: "plaid", patCol: "#b7a6f0", bow: "#d23a46" }, { expr: "laugh", prop: "cash", armR: { a: 0.35, e: 1.9 }, headTilt: 0.1 }],
      [{ hair: "bun", hairCol: "#c9c9cf", top: "dress", col: "#5f8fd0", col2: "#ffffff", glasses: "round" }, { expr: "cry", armL: { a: 0.3, e: -1.2 }, armR: { a: 0.3, e: -1.2 } }],
      [{ hair: "side", hairCol: "#6a4024", top: "shirt", col: "#f2f2ee", tie: "#a8642a", build: "slim" }, { expr: "scared", prop: "stopwatch", armR: { a: 0.35, e: 1.9 }, facing: -0.2 }],
    ];
    // 6: the farmer walks out onto the asphalt (shadow check on a hard surface)
    L.card(c2(FARM2, { expr: "determined", legs: "walk", phase: 0.15, facing: -0.5, lean: -0.05, armL: { a: 0.6, e: 0.4 }, armR: { a: -0.5, e: 0.4 } }, 4), 0.6, 0, -24, K);
    // dust kicked up behind the speeding car, and under the farmer's step
    L.dust(1.8, 0.1, -10.8, 22, [2.4, 0.9, 5], 1.3, 0.32); L.dust(0.62, 0.07, -23.85, 6, [0.7, 0.12, 0.4], 0.32, 0.5);
    line.forEach(([o, po], i) => L.card(c2(o, po, 20 + i), 6.0 + i * 0.85, 0, -10.2 - 0.25 * (i % 2), K));
    return L;
  }, [scene]);
  const [fx] = useState(() => ({ lens: new LensBlur({ maxCoC: 24, nearScale: 1.0 }), bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 0.85, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), sat: new HueSaturationEffect({ saturation: 0.24 }), bc: new BrightnessContrastEffect({ brightness: -0.06, contrast: -0.03 }), vig: new VignetteEffect({ offset: 0.35, darkness: 0.35 }) }));
  useEffect(() => { gl.toneMapping = THREE.NoToneMapping; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; }, [gl]);
  const S: Setup[] = [
    { pos: V(6.55, 1.3, -11.7), look: V(7.45, 1.3, -15.0), fov: 46, dof: 12 },
    { pos: V(0.4, 2.0, 16), look: V(2.6, 3.4, -60), fov: 50, dof: 0 },
    { pos: V(4.6, 1.25, 0.2), look: V(1.8, 0.95, -5.6), fov: 42, dof: 9 },
    { pos: V(0.6, 0.55, 7.5), look: V(1.8, 0.85, -6), fov: 36, dof: 7 },
    { pos: V(5.55, 1.0, -14.55), look: V(6.3, 0.95, -16.5), fov: 44, dof: 12 },
    { pos: V(7.7, 1.15, -6.1), look: V(7.7, 1.0, -10.3), fov: 52, dof: 6 },
    { pos: V(1.6, 1.0, -21.4), look: V(0.55, 0.95, -24), fov: 42, dof: 9 },
  ];
  const s = S[Math.min(f, S.length - 1)];
  lab.frame(s, camera as THREE.PerspectiveCamera, f / 30 + 1.3);
  fx.lens.cInf = s.dof; fx.lens.focus = Math.max(0.5, s.pos.distanceTo(s.look));
  return (<><primitive object={lab.root} dispose={null} />
    <EffectComposer multisampling={4}>{[
      s.dof > 0 ? <primitive key="pre" object={fx.lens.pre} dispose={null} /> : null,
      s.dof > 0 ? <primitive key="lens" object={fx.lens.main} dispose={null} /> : null,
      <primitive key="bloom" object={fx.bloom} dispose={null} />, <primitive key="tone" object={fx.tone} dispose={null} />,
      <primitive key="sat" object={fx.sat} dispose={null} />, <primitive key="bc" object={fx.bc} dispose={null} />, <primitive key="vig" object={fx.vig} dispose={null} />,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ].filter(Boolean) as any}</EffectComposer></>);
};
const Cap: React.FC = () => { const f = useCurrentFrame(); return <CaptionText text={CAPS[Math.min(f, CAPS.length - 1)]} width={1080} height={1920} />; };
export const LookLab: React.FC = () => {
  const [h] = useState(() => delayRender("lab")); useEffect(() => { const id = setTimeout(() => continueRender(h), 50); return () => clearTimeout(id); }, [h]);
  return (<AbsoluteFill style={{ background: "#9cc4ea" }}><ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false }} camera={{ fov: 46, near: 0.05, far: 6000 }}><Inner /></ThreeCanvas><Cap /></AbsoluteFill>);
};
