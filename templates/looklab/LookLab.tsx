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
import { bodyFront, bodySide, ELLIS, DRIVER07, local07, HIVIS, kid53, pass53, Outfit, FrontOpts } from "../tangiwai/toon";

export const LAB_FRAMES = 6;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FARMER: Outfit = { jacket: "#3f8f7a", pants: "#3a3e4c", boots: "#4a3626", hat: "cap", cap: "#d23b3b" };

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const lab = useMemo(() => {
    const L = new Lab();
    scene.environment = envMap(); scene.fog = new THREE.Fog("#cfe0f2", 250, 3200);
    const fr = (o: Outfit, fo: FrontOpts) => (p: Parameters<typeof bodyFront>[0]) => bodyFront(p, o, { light: -2.1, seed: 3, ...fo });
    // 0: the farmer in the long grass by the oak, pointing at the road
    L.card(fr(FARMER, { mode: "stand", expr: "grin", prop: "point", look: 1 }), 7.35, 0, -15.0);
    // 2: the driver in the red hatchback (seated behind the wheel)
    L.car1.root.updateMatrixWorld(true); const d = L.car1.root.localToWorld(L.car1.driver.clone());
    L.card(fr(DRIVER07, { mode: "sit", seatH: 150, expr: "smile", look: 0, handsOn: "knees" }), d.x, d.y - 0.32, d.z, 0.72);
    // 4: an old local in a lawn chair under the oak with a mug of tea
    L.card(fr(local07(3), { mode: "sit", seatH: 176, expr: "smile_closed", prop: "mug", look: 1 }), 6.3, 0, -16.6);
    // 5: a line-up of the cast on the verge: actions + expressions
    const line: [Outfit, FrontOpts][] = [[HIVIS(0), { mode: "stand", expr: "stern", prop: ["hammer", 0.3] }], [kid53(0), { mode: "stand", expr: "shock", prop: "armsUp" }],
      [ELLIS, { mode: "stand", expr: "laugh", prop: "torch", wave: 0.5 }], [pass53(1), { mode: "stand", expr: "pained", prop: "present" }], [local07(1), { mode: "stand", expr: "nervous", prop: "phone" }]];
    line.forEach(([o, fo], i) => L.card(fr(o, fo), 6.0 + i * 0.85, 0, -10.2 - 0.25 * (i % 2), o.build === "kid" ? 0.9 : 1));
    return L;
  }, [scene]);
  const [fx] = useState(() => ({ lens: new LensBlur({ maxCoC: 24, nearScale: 1.0 }), bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 0.85, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), sat: new HueSaturationEffect({ saturation: 0.18 }), bc: new BrightnessContrastEffect({ brightness: 0.02, contrast: 0.1 }), vig: new VignetteEffect({ offset: 0.35, darkness: 0.35 }) }));
  useEffect(() => { gl.toneMapping = THREE.NoToneMapping; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; }, [gl]);
  const S: Setup[] = [
    { pos: V(6.1, 0.75, -10.6), look: V(7.6, 1.6, -15.3), fov: 50, dof: 11 },
    { pos: V(0.4, 2.0, 16), look: V(2.6, 3.4, -60), fov: 50, dof: 0 },
    { pos: V(4.6, 1.25, 0.2), look: V(1.8, 0.95, -5.6), fov: 42, dof: 9 },
    { pos: V(0.6, 0.55, 7.5), look: V(1.8, 0.85, -6), fov: 36, dof: 7 },
    { pos: V(4.7, 1.15, -13.7), look: V(6.3, 0.9, -16.4), fov: 44, dof: 12 },
    { pos: V(5.3, 1.35, -4.6), look: V(7.7, 1.0, -10.3), fov: 44, dof: 7 },
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
export const LookLab: React.FC = () => {
  const [h] = useState(() => delayRender("lab")); useEffect(() => { const id = setTimeout(() => continueRender(h), 50); return () => clearTimeout(id); }, [h]);
  return (<AbsoluteFill style={{ background: "#9cc4ea" }}><ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false }} camera={{ fov: 46, near: 0.05, far: 6000 }}><Inner /></ThreeCanvas></AbsoluteFill>);
};
void bodySide;
