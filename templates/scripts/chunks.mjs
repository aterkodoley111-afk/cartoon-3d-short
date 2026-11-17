// usage: node scripts/chunks.mjs <budgetSeconds> [chunkFrames]  — renders the next missing chunks of the film
// (1080x1920, h264 crf 16, muted) into out/" + (process.env.PROJ ?? "tangiwai") + "/chunks/, stopping before the time budget runs out.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [budget = "540", size = "45"] = process.argv.slice(2);
const T0 = Date.now(), dir = "out/" + (process.env.PROJ ?? "tangiwai") + "/chunks"; fs.mkdirSync(dir, { recursive: true });
const browserExecutable = "/usr/bin/google-chrome", chromiumOptions = { gl: "swiftshader" };
const bf = "out/" + (process.env.PROJ ?? "tangiwai") + "/bundle.txt";
let serveUrl = fs.existsSync(bf) ? fs.readFileSync(bf, "utf8").trim() : "";
if (!serveUrl || !fs.existsSync(serveUrl)) { serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") }); fs.writeFileSync(bf, serveUrl); }
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "TangiwaiShort", browserExecutable, chromiumOptions });
const S = Number(size), total = composition.durationInFrames;
let perFrame = 6.5;
for (let a = 0; a < total; a += S) {
  const b = Math.min(total, a + S) - 1, out = `${dir}/c_${String(a).padStart(4, "0")}.mp4`;
  if (fs.existsSync(out)) continue;
  const left = Number(budget) - (Date.now() - T0) / 1000;
  if (left < (b - a + 1) * perFrame * 1.15 + 15) { console.log("budget reached"); break; }
  const t = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, muted: true, frameRange: [a, b], outputLocation: out + ".part.mp4",
    browserExecutable, chromiumOptions, concurrency: 1, timeoutInMilliseconds: 240000 });
  fs.renameSync(out + ".part.mp4", out);
  perFrame = (Date.now() - t) / 1000 / (b - a + 1);
  console.log(`chunk ${a}-${b} ${perFrame.toFixed(2)} s/frame`);
}
const done = fs.readdirSync(dir).filter((f) => /^c_\d+\.mp4$/.test(f)).length;
console.log(`done ${done}/${Math.ceil(total / S)} chunks`);
