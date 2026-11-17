// Test scene for templates/real/realism.ts: a car driving along a real road past grass and trees in the wind.
// Views: 0 windscreen 3/4 (glass + driver), 1 tree close (bark, leaves), 2 wheel while driving, 3 wide road scene.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { car, bus, drive, Pour, grassField, WIND, carMaterials, tree, turfTex, asphaltRealTex, seatWorld, steer } from "./realism";
import { Pen, bodyFront, londoner } from "../fatberg/toon";
const SU = 0.00216;
/** the driver as a lit flat card (same construction as cast.ts): sit mode, hands on the wheel, seatbelt */
const driverCard = (steerA: number) => {
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1800; const g = cv.getContext("2d")!; g.setTransform(1.8, 0, 0, 1.8, 0, 0);
  bodyFront(new Pen(g), { ...londoner(0), hat: "hair", hair: "#2a1e1a" }, { mode: "sit", prop: "wheel", belt: true, expr: "smile_closed", steer: steerA, look: 0 });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(600 * SU, 1000 * SU); geo.translate(0, (975 - 500) * SU, 0);
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
};
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
    if (c.steering) c.steering.visible = false; // the driver card draws the wheel under its hands
    const drv = driverCard(0.15); drv.scale.setScalar(0.7); g.add(drv);
    const sun = new THREE.DirectionalLight("#fff4e0", 2.4); sun.position.set(20, 30, 25); g.add(sun, new THREE.HemisphereLight("#cfe6ff", "#6c7c4c", 1.1));
    void bus; void Pour;
    return { g, c, drv };
  }, []);
  WIND.time.value = t;
  const x = -12 + SPEED * t; w.c.root.position.x = x; drive(w.c, SPEED * t, t, 0, 1, SPEED); steer(w.c, 0.04);
  const sp = seatWorld(w.c, w.c.seats.driver); w.drv.position.set(sp.x - 0.05, sp.y + 0.04, sp.z);
  w.drv.rotation.y = Math.atan2(camera.position.x - sp.x, camera.position.z - sp.z);
  const cams: [number[], number[]][] = [[[x + 4.2, 1.3, -1.1], [x + 0.4, 1.12, -1.22]], [[x - 0.3, 1.3, 1.9], [x - 0.15, 1.08, -1.3]], [[x + 6.5, 1.8, 3.8], [x, 0.8, -1.6]], [[x - 5.5, 1.3, 2.4], [x - 1.5, 0.6, -1.6]]];
  const [pp, lk] = cams[view];
  camera.position.set(pp[0], pp[1], pp[2]); camera.lookAt(lk[0], lk[1], lk[2]);
  return <primitive object={w.g} />;
};
export const RealTest: React.FC<{ view?: number }> = ({ view = 0 }) => (
  <ThreeCanvas width={1080} height={1920} camera={{ fov: 45, near: 0.05, far: 300 }} gl={{ antialias: true }} style={{ background: "#9cc4ea" }}><Inner view={view} /></ThreeCanvas>
);
