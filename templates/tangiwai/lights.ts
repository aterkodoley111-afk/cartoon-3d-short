// Light presets per time of day. The sun (or the moon, at night) is CAMERA-RELATIVE and frozen per shot (world.ts
// update()): az = degrees from the shot camera's forward axis (0 = straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// night: a clear, starry Christmas Eve read as cartoon "day for night": a cool blue key from a high moon off screen,
// navy shade, the warm lights of the train / torch / headlights carried by emissive materials and bloom.
// lamp: warm carriage / bathroom interiors.
type C3 = [number, number, number];
export type LightName = "night" | "day" | "lamp";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  blob: C3; actorShadow: boolean;
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
};
export const LIGHTS: Record<LightName, LightPreset> = {
  night: {
    az: 135, el: 38,
    lit: [0.3, 0.38, 0.66], shade: [0.08, 0.1, 0.21], lift: [0.02, 0.03, 0.06], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [0.84, 0.9, 1.06], charShade: 0.84, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.8, 0.86, 1.0],
    blob: [0.5, 0.52, 0.66], actorShadow: false,
    top: "#081230", hor: "#2b3f70", skyCurve: [0.0, 0.5, 0.6], fog: "#22335e", fogNear: 120, fogFar: 9000, sunDisc: "#000000",
    sunCol: "#c8d8ff", sunI: 1.2, sky: "#3a4c80", ground: "#1c2238", hemiI: 0.35,
    bias: -0.0004, normalBias: 0.02,
  },
  day: {
    az: 118, el: 46,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 160, fogFar: 20000, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  lamp: {
    az: 150, el: 55,
    lit: [1.36, 1.16, 0.92], shade: [0.42, 0.34, 0.4], lift: [0.06, 0.05, 0.06], lambert: 0.35, sideK: 0.86, term: 0.2,
    charTint: [1.0, 0.9, 0.8], charShade: 0.88, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.95, 0.88, 0.86],
    blob: [0.6, 0.52, 0.5], actorShadow: false,
    top: "#2a2030", hor: "#5a4048", skyCurve: [0.0, 0.5, 0.6], fog: "#3a2c30", fogNear: 60, fogFar: 300, sunDisc: "#000000",
    sunCol: "#ffd9a8", sunI: 2.0, sky: "#e8c8a8", ground: "#6a4a3a", hemiI: 0.5,
    bias: -0.0004, normalBias: 0.01,
  },
};

/** world-only look per light (sky stops by elevation in degrees, water colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };
  water: { body: string; foam: string; stream: string };
  bounce: C3; sat: number; stars: number;
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  night: {
    sky: { c: ["#33477a", "#26386a", "#18275a", "#0f1b44", "#08112e"], e: [0, 3, 9, 20, 50] },
    water: { body: "#4e4640", foam: "#9a948e", stream: "#3e4e72" },
    cloud: { lit: "#56649a", mid: "#3c4a7c", shade: "#2a3460" },
    bounce: [0, 0, 0], sat: 0.62, stars: 1,
  },
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { body: "#7a6a5a", foam: "#e2dccf", stream: "#7e958a" },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0], sat: 1.06, stars: 0,
  },
  lamp: {
    sky: { c: ["#3a2c30", "#3a2c30", "#2a2030", "#2a2030", "#2a2030"], e: [0, 3, 8, 16, 40] },
    water: { body: "#8a7a68", foam: "#efe8dc", stream: "#5c8fb0" },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.03, 0.015, 0.0], sat: 1.05, stars: 0,
  },
};
