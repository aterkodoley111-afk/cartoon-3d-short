// Test scene for templates/real/realism.ts: car + seat anchors, bus, a pour, grass in the wind (plain lights).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { car, bus, drive, Pour, grassField, WIND, carMaterials } from "./realism";
const L = (c: string, o: Partial<THREE.MeshLambertMaterialParameters> = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const Inner: React.FC<{ view: number }> = ({ view }) => {
  const f = useCurrentFrame(), t = f / 30, { camera } = useThree();
  const w = useMemo(() => {
    const g = new THREE.Group();
    const m = { body: L("#c8282e"), glass: L("#9fc3dc", { transparent: true, opacity: 0.45 }), trim: L("#2a2a30"), tyre: L("#1d1b22"), hub: L("#b8bec6"), light: L("#fff3c4"), seat: L("#3a4a6a"), interior: L("#4a4448") };
    const c = car(carMaterials("#1f5fae")); g.add(c.root);
    for (const s of [c.seats.driver, ...c.seats.rows]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12), L("#ffcc88")); b.position.copy(s).add(new THREE.Vector3(0, 0.62, 0)); c.body.add(b); }
    const b = bus(carMaterials("#c8282e")); b.root.position.set(0, 0, -6); g.add(b.root);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), L("#6e6b66")); g.add(ground);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), L("#4c4636")); water.position.set(0, 0.01, 8); g.add(water);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.4), L("#c9b48a")); wall.position.set(0, 1.5, 5.6); g.add(wall);
    const p = new Pour({ from: new THREE.Vector3(0, 1.6, 5.85), dir: new THREE.Vector3(0, -0.15, 1), speed: 1.2, radius: 0.12, surfaceY: 0.02, liquid: L("#1e1a1c"), foam: L("#6a645a"), slick: L("#2c2622", { transparent: true, opacity: 0.85 }), slickMax: 2.5 });
    g.add(p.group);
    const grass = grassField(6000, { x0: 6, x1: 16, z0: -4, z1: 6 }, L("#5aa83c")); g.add(grass);
    const sun = new THREE.DirectionalLight("#fff", 2.2); sun.position.set(10, 15, 12); g.add(sun, new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.2));
    return { g, c, p };
  }, []);
  WIND.time.value = t; drive(w.c, 0.8 * t, t, 0); w.p.update(t - 0.2);
  const cams: [number[], number[]][] = [[[4.4, 1.05, 2.4], [1.6, 0.65, 0.2]], [[0.2, 1.25, 5.2], [0, 0.8, 0]], [[-4.3, 1.1, -2.2], [-1.7, 0.7, -0.2]], [[1.95, 0.45, 2.0], [1.35, 0.35, 0.8]]];
  const [pp, lk] = cams[view];
  camera.position.set(pp[0], pp[1], pp[2]); camera.lookAt(lk[0], lk[1], lk[2]);
  return <primitive object={w.g} />;
};
export const RealTest: React.FC<{ view?: number }> = ({ view = 0 }) => (
  <ThreeCanvas width={1080} height={1920} camera={{ fov: 45, near: 0.05, far: 200 }} gl={{ antialias: true }} style={{ background: "#9cc4ea" }}><Inner view={view} /></ThreeCanvas>
);
