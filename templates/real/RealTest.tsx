// Test scene for templates/real/realism.ts: a car driving along a real road past grass and trees in the wind.
// Views: 0 windscreen 3/4 (glass + driver), 1 tree close (bark, leaves), 2 wheel while driving, 3 wide road scene.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { car, bus, drive, Pour, grassField, WIND, carMaterials, tree, turfTex, asphaltRealTex } from "./realism";
const L = (c: string, o: Partial<THREE.MeshLambertMaterialParameters> = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const rep = (t: THREE.Texture, x: number, y: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
export const SPEED = 9; // m/s (~32 km/h)
const Inner: React.FC<{ view: number }> = ({ view }) => {
  const f = useCurrentFrame(), t = f / 30, { camera } = useThree();
  const w = useMemo(() => {
    const g = new THREE.Group();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 7).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: rep(asphaltRealTex(), 100, 1.75) })); g.add(road);
    const turf = new THREE.Mesh(new THREE.PlaneGeometry(400, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: rep(turfTex(), 100, 15) })); turf.position.set(0, -0.01, 33); g.add(turf);
    const turf2 = turf.clone(); turf2.position.z = -33; g.add(turf2);
    g.add(grassField(26000, { x0: -30, x1: 30, z0: 3.6, z1: 14 }, new THREE.MeshLambertMaterial(), 0.32));
    for (let i = 0; i < 6; i++) { const tr = tree(7 + 2 * (i % 3), i + 1); tr.group.position.set(-26 + i * 10, 0, 8 + 3 * (i % 2)); g.add(tr.group); }
    const c = car(carMaterials("#1f5fae")); c.root.position.z = -1.6; g.add(c.root);
    for (const s of [c.seats.driver, c.seats.rows[0]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11), L("#ffcc88")); b.position.copy(s).add(new THREE.Vector3(0, 0.66, 0)); const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3), L("#3f6a8a")); bd.position.copy(s).add(new THREE.Vector3(-0.05, 0.3, 0)); c.body.add(b, bd); }
    const sun = new THREE.DirectionalLight("#fff4e0", 2.4); sun.position.set(20, 30, 25); g.add(sun, new THREE.HemisphereLight("#cfe6ff", "#6c7c4c", 1.1));
    void bus; void Pour;
    return { g, c };
  }, []);
  WIND.time.value = t;
  const x = -12 + SPEED * t; w.c.root.position.x = x; drive(w.c, SPEED * t, t, 0, 1, SPEED);
  const cams: [number[], number[]][] = [[[x + 4.4, 1.5, 0.6], [x + 0.6, 1.05, -1.6]], [[-13, 3.0, 0.5], [-16, 4.6, 8]], [[x + 2.2, 0.5, 0.4], [x + 1.35, 0.35, -0.75]], [[x - 9, 1.8, -3.5], [x + 3, 1.6, 4]]];
  const [pp, lk] = cams[view];
  camera.position.set(pp[0], pp[1], pp[2]); camera.lookAt(lk[0], lk[1], lk[2]);
  return <primitive object={w.g} />;
};
export const RealTest: React.FC<{ view?: number }> = ({ view = 0 }) => (
  <ThreeCanvas width={1080} height={1920} camera={{ fov: 45, near: 0.05, far: 300 }} gl={{ antialias: true }} style={{ background: "#9cc4ea" }}><Inner view={view} /></ThreeCanvas>
);
