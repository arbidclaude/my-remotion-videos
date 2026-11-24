import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { MONO, SANS } from "./fonts";
import { clamp, easeInExpo, easeOutExpo, prog, rand } from "./lib";

/* ------------------------------------------------------------------ */
/* Kinetic headline: word-by-word blur/rise reveal with accent glow    */
/* text syntax: "line one|line *accent*"                               */
/* ------------------------------------------------------------------ */
export const Kinetic: React.FC<{
  t: number;
  text: string;
  inAt: number;
  outAt: number;
  accent: string;
  y?: number;
  size?: number;
  weight?: number;
  stagger?: number;
  accentGlow?: boolean;
  color?: string;
  exitDir?: 1 | -1;
}> = ({ t, text, inAt, outAt, accent, y = 1150, size = 84, weight = 700, stagger = 0.07, accentGlow = true, color = "#F4F6FB", exitDir = -1 }) => {
  if (t < inAt - 0.05 || t > outAt + 0.6) return null;
  const lines = text.split("|");
  let idx = 0;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        transform: "translateY(-50%)",
        textAlign: "center",
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: "-0.035em",
        lineHeight: 1.1,
        color,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((raw, wi) => {
            const isAccent = raw.startsWith("*");
            const word = raw.replace(/\*/g, "");
            const i = idx++;
            const start = inAt + i * stagger + (isAccent ? 0.06 : 0);
            const p = prog(t, start, start + 0.75, easeOutExpo);
            const e = prog(t, outAt + i * 0.025, outAt + i * 0.025 + 0.42, easeInExpo);
            const op = p * (1 - e);
            const ty = (1 - p) * 0.55 * size + e * exitDir * 0.45 * size;
            const blur = (1 - p) * 14 + e * 12;
            const sc = isAccent ? 1 + (1 - p) * 0.12 : 1;
            // accent: a light sweep passes through the word once it lands
            const sweep = prog(t, start + 0.25, start + 1.05, easeOutExpo);
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  marginRight: "0.24em",
                  opacity: op,
                  transform: `translateY(${ty}px) scale(${sc})`,
                  filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                  color: isAccent ? accent : undefined,
                  textShadow: isAccent && accentGlow ? `0 0 ${28 * op}px ${accent}88` : undefined,
                  backgroundImage: isAccent
                    ? `linear-gradient(100deg, ${accent} ${sweep * 140 - 40}%, #ffffff ${sweep * 140 - 20}%, ${accent} ${sweep * 140}%)`
                    : undefined,
                  WebkitBackgroundClip: isAccent ? "text" : undefined,
                  WebkitTextFillColor: isAccent ? "transparent" : undefined,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* Decode / scramble text (for HUD + chapter labels) */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_";
export const Decode: React.FC<{ t: number; text: string; at: number; dur?: number; style?: React.CSSProperties }> = ({ t, text, at, dur = 0.6, style }) => {
  const p = clamp((t - at) / dur);
  if (t < at) return null;
  const shown = text
    .split("")
    .map((ch, i) => {
      if (ch === " " || ch === "·") return ch;
      const r = (i / text.length) * 0.8;
      if (p > r + 0.15) return ch;
      if (p < r) return "";
      return GLYPHS[Math.floor(rand(i * 7 + Math.floor(t * 30)) * GLYPHS.length)];
    })
    .join("");
  return <span style={{ fontFamily: MONO, ...style }}>{shown}</span>;
};

/* Film finishing: grain, vignette, subtle chromatic edge & light leak */
export const FilmLook: React.FC<{ grain?: number; vignette?: number }> = ({ grain = 0.09, vignette = 0.75 }) => {
  const frame = useCurrentFrame();
  const gx = Math.floor(rand(frame) * 512);
  const gy = Math.floor(rand(frame + 99) * 512);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 45%, transparent 40%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("fx/grain.png")})`,
          backgroundPosition: `${gx}px ${gy}px`,
          backgroundSize: "512px 512px",
          opacity: grain,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};

/* Soft glow orb */
export const Orb: React.FC<{ x: number; y: number; r: number; color: string; opacity?: number }> = ({ x, y, r, color, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity,
    }}
  />
);

/* Flash overlay for impacts */
export const Flash: React.FC<{ t: number; at: number; color?: string; peak?: number; dur?: number }> = ({ t, at, color = "#ffffff", peak = 0.35, dur = 0.5 }) => {
  if (t < at || t > at + dur) return null;
  const p = (t - at) / dur;
  return <AbsoluteFill style={{ background: color, opacity: peak * (1 - p) ** 2, mixBlendMode: "screen" }} />;
};

export { Img };
