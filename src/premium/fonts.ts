import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const faces: [string, string, string][] = [
  ["Inter", "500", "inter-latin-500-normal.woff2"],
  ["Inter", "600", "inter-latin-600-normal.woff2"],
  ["Inter", "700", "inter-latin-700-normal.woff2"],
  ["Inter", "800", "inter-latin-800-normal.woff2"],
  ["JetBrains Mono", "400", "jetbrains-mono-latin-400-normal.woff2"],
  ["JetBrains Mono", "500", "jetbrains-mono-latin-500-normal.woff2"],
];

for (const [family, weight, file] of faces) {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`), format: "woff2" });
}
// serif italic for single "feeling" words (SIL OFL, see public/fonts/InstrumentSerif-OFL.txt)
loadFont({ family: "Instrument Serif", weight: "400", style: "italic", url: staticFile("fonts/instrument-serif-latin-400-italic.woff2"), format: "woff2" });

export const SANS = "Inter, sans-serif";
export const MONO = "'JetBrains Mono', monospace";
export const SERIF = "'Instrument Serif', serif";
