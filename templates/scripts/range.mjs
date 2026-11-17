// usage: node scripts/range.mjs <out.mp4> <a> <b>   (renders frames a..b, 1080x1920, muted)
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [out, a, b] = process.argv.slice(2);
const browserExecutable = "/usr/bin/google-chrome", chromiumOptions = { gl: "swiftshader" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "TangiwaiShort", browserExecutable, chromiumOptions });
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, muted: true, frameRange: [Number(a), Number(b)], outputLocation: out, browserExecutable, chromiumOptions, concurrency: 1, timeoutInMilliseconds: 240000 });
console.log("done", out);
