// Framing checker: for each camera setup (first / middle / last frame) project named subject points to the screen
// (x, y in -1..1, 0 = centre; vertical frame), report whether terrain hides them and how high the lens is above ground.
import * as THREE from "three";
import { SHOTS, camAt, setAt, eraAt, FPS, V3, CONV_X, LANE_E, LANE_W, BUS_X, OFFICIAL_AT, MOUND, tankX, hayX, carNowX, CAR_NOW_Z, W, OLDROAD_AT, END_AT, TUB_AT, OFFICIAL_IN, SCI_IN, COOKIE_AT } from "../src/videos/hope/story";
import { hAt, LAKE, bumpAt, roadNewY, ROAD_NEW_Z } from "../src/videos/hope/terrain";
const cam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 5000);
const setups: [number, number, number][] = [];
const CUTS: Record<number, number[]> = {};
for (const s of SHOTS) CUTS[s.id] = [s.a];
const extra: [number, number][] = [[1, W(7, 3)], [2, W(21, 3)], [4, W(48, 3)], [4, W(54, 3)], [5, W(63, 3)], [7, W(79, 3)], [8, TUB_AT], [9, W(108, 3)], [11, OFFICIAL_IN], [11, SCI_IN], [11, W(142, 3)], [12, COOKIE_AT], [13, W(177, 3)], [14, OLDROAD_AT], [14, END_AT]];
for (const [id, f] of extra) CUTS[id].push(f);
for (const s of SHOTS) { const c = [...CUTS[s.id]].sort((a, b) => a - b); c.forEach((a, i) => setups.push([s.id, a, (c[i + 1] ?? s.b) - 1])); }
const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
for (const [id, a, b] of setups) {
  if (only && !only.includes(id)) continue;
  for (const f of [a, Math.round((a + b) / 2), b]) {
    const s = SHOTS[id - 1], t = f / FPS, set = setAt(id, f), era = eraAt(id, f), st = s.slide ? s.slide(t) : 0;
    if (set !== "valley" && set !== "today" && set !== "build") { if (f === a) console.log(`#${id} f${a}-${b} ${set} (insert)`); break; }
    const c = camAt(id, f);
    cam.fov = c.fov; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const E = (set === "build" ? "today" : era) as any;
    const g = hAt(c.pos[0], c.pos[2], E, st);
    const b0 = bumpAt(st);
    const pts: [string, V3][] = [
      ["peak", [10, hAt(10, -430, E, st), -430]], ["face", [10, hAt(10, -280, E, st), -280]], ["lake", [LAKE.x, 0, LAKE.z]],
      ["conv", [CONV_X - 2.5, 1.0, LANE_E]], ["tank", [tankX(t) - 1, 2, LANE_E]], ["hay", [hayX(t) - 1, 2, LANE_E]], ["mound", [MOUND[0], 1.5, 0]],
      ["bus", [BUS_X + 1, 2, LANE_W]], ["toe", [176, hAt(176, 0, E, st), 0]], ["official", [OFFICIAL_AT[0], 1.5, OFFICIAL_AT[2]]],
      ["massFront", [10, hAt(10, b0.zc, E, st), b0.zc]], ["coulter", [0, hAt(0, 160, E, st), 160]],
      ["carNow", [carNowX(t), roadNewY(carNowX(t)) + 1, CAR_NOW_Z]], ["oldRoad", [215, 0, 0]], ["newRoad60", [60, roadNewY(60), ROAD_NEW_Z]],
    ];
    const vis: string[] = [];
    for (const [n, p] of pts) {
      const v = new THREE.Vector3(...p).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      // terrain occlusion: sample the segment
      let hid = false;
      for (let k = 1; k < 40; k++) { const u = k / 40, x = c.pos[0] + (p[0] - c.pos[0]) * u, y = c.pos[1] + (p[1] - c.pos[1]) * u, z = c.pos[2] + (p[2] - c.pos[2]) * u; if (hAt(x, z, E, st) > y + 0.5) { hid = true; break; } }
      const d = Math.hypot(p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]);
      vis.push(`${n}(${v.x.toFixed(2)},${v.y.toFixed(2)} ${d.toFixed(0)}m${hid ? " HID" : ""})`);
    }
    // what fills the centre / top / bottom: distance to terrain along those rays
    const hit = (sy: number) => { const r = new THREE.Vector3(0, sy, 0.5).unproject(cam).sub(cam.position).normalize(); for (let d = 2; d < 3000; d *= 1.04) { const x = c.pos[0] + r.x * d, y = c.pos[1] + r.y * d, z = c.pos[2] + r.z * d; if (hAt(x, z, E, st) > y) return d.toFixed(0); } return "sky"; };
    console.log(`#${id} f${f} lens+${(c.pos[1] - g).toFixed(1)}m  top:${hit(0.9)} mid:${hit(0)} bot:${hit(-0.9)} | ${vis.join(" ")}`);
  }
}
