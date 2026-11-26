// usage: node scripts/stills.mjs <compId> <outDir> t1 t2 ...   (seconds)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [, , id, outDir, ...times] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(s) * 30));
  await renderStill({ serveUrl, composition, frame, output: path.join(outDir, `${id}-${Number(s).toFixed(2).padStart(6, "0")}.jpg`), imageFormat: "jpeg", scale: 0.4, browserExecutable });
}
console.log("done");
