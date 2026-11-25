import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { MONO, SANS } from "./fonts";
import { clamp, easeInExpo, easeOutBack, easeOutExpo, mixColor, prog, rand } from "./lib";

/* Warm-white "paper" theme shared by both films */
export const PAPER = "#FBF7F0";
export const PAPER_DEEP = "#F1E9DC";
export const INK = "#1C1E24";
export const INK_SOFT = "#6B6F7A";

/* ------------------------------------------------------------------ */
/* Kinetic headline: word-by-word blur/rise reveal with accent sweep   */
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
  /** per-character mask reveal (for short titles) */
  chars?: boolean;
}> = ({ t, text, inAt, outAt, accent, y = 1150, size = 84, weight = 700, stagger = 0.07, accentGlow = true, color = INK, exitDir = -1, chars = false }) => {
  if (t < inAt - 0.05 || t > outAt + 0.6) return null;
  const lines = text.split("|");
  const hi = mixColor(accent, "#ffffff", 0.55);
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
        // mask: each line hides its words below a clean baseline (padding keeps descenders + glow unclipped)
        <div key={li} style={{ whiteSpace: "nowrap", overflow: "hidden", padding: "0.06em 0.3em 0.16em", margin: "-0.06em 0 -0.16em" }}>
          {line.split(" ").map((raw, wi, arr) => {
            const isAccent = raw.startsWith("*");
            const word = raw.replace(/\*/g, "");
            const i = idx++;
            const start = inAt + li * 0.09 + wi * stagger * 0.8 + (isAccent ? 0.05 : 0);
            const p = prog(t, start, start + 0.7, easeOutExpo);
            const e = prog(t, outAt + li * 0.05 + wi * 0.02, outAt + li * 0.05 + wi * 0.02 + 0.45, easeInExpo);
            const op = clamp(p * 1.6) * (1 - e);
            // rise from below the mask, leave upward through it
            const ty = (1 - p) * 1.1 * size * 1.1 + e * exitDir * 1.1 * size * 1.1;
            const blur = (1 - p) * 5 + e * 4;
            const sweep = prog(t, start + 0.35, start + 1.3, easeOutExpo);
            void i;
            if (chars) {
              const lineOffset = arr.slice(0, wi).join(" ").replace(/\*/g, "").length + (wi ? 1 : 0);
              return (
                <span key={wi} style={{ display: "inline-block", marginRight: wi === arr.length - 1 ? 0 : "0.24em", color: isAccent ? accent : undefined }}>
                  {word.split("").map((ch, ci) => {
                    const cs = inAt + li * 0.14 + (lineOffset + ci) * 0.032;
                    const cp = prog(t, cs, cs + 0.75, easeOutExpo);
                    const cty = (1 - cp) * 1.15 * size + e * exitDir * 1.1 * size;
                    return (
                      <span
                        key={ci}
                        style={{
                          display: "inline-block",
                          opacity: clamp(cp * 1.8) * (1 - e),
                          transform: `translateY(${cty}px)`,
                          filter: cp < 0.95 ? `blur(${(1 - cp) * 4}px)` : undefined,
                          textShadow: `0 10px 30px rgba(80,55,25,0.1)`,
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              );
            }
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  marginRight: wi === arr.length - 1 ? 0 : "0.24em",
                  opacity: op,
                  transform: `translateY(${ty}px)`,
                  filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                  color: isAccent ? accent : undefined,
                  textShadow: `0 10px 30px rgba(80,55,25,${0.1 * op})`,
                  backgroundImage: isAccent
                    ? `linear-gradient(100deg, ${accent} ${sweep * 140 - 40}%, ${hi} ${sweep * 140 - 20}%, ${accent} ${sweep * 140}%)`
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

/* Paper finishing: grain texture + warm vignette */
export const FilmLook: React.FC<{ grain?: number; vignette?: number }> = ({ grain = 0.07, vignette = 0.16 }) => {
  const frame = useCurrentFrame();
  const gx = Math.floor(rand(frame) * 512);
  const gy = Math.floor(rand(frame + 99) * 512);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 62% at 50% 45%, transparent 45%, rgba(150,110,70,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("fx/grain.png")})`,
          backgroundPosition: `${gx}px ${gy}px`,
          backgroundSize: "512px 512px",
          opacity: grain,
          mixBlendMode: "multiply",
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

/* Soft colour wash for transitions (light theme: tint, not a white flash) */
export const Flash: React.FC<{ t: number; at: number; color?: string; peak?: number; dur?: number }> = ({ t, at, color = "#ffffff", peak = 0.35, dur = 0.5 }) => {
  if (t < at || t > at + dur) return null;
  const p = (t - at) / dur;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${color} 0%, transparent 75%)`, opacity: peak * (1 - p) ** 2 }} />;
};

/* ------------------------------------------------------------------ */
/* "Alive" ambience: drifting dust/bokeh + slow warm light leaks       */
/* ------------------------------------------------------------------ */
const DUST = new Array(46).fill(0).map((_, i) => ({
  x: rand(i * 4.1) * 1080,
  y: rand(i * 7.3) * 1920,
  z: 0.3 + rand(i * 2.9) * 0.7,
  sp: 8 + rand(i * 1.7) * 22,
  ph: rand(i * 9.1) * 6.28,
  big: rand(i * 3.3) > 0.82,
}));
export const Ambience: React.FC<{ t: number; tint: string; tint2?: string; strength?: number }> = ({ t, tint, tint2 = "#FFC9A0", strength = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {/* light leaks */}
    <div
      style={{
        position: "absolute",
        left: -300 + Math.sin(t * 0.13) * 220,
        top: -200 + Math.cos(t * 0.11) * 160,
        width: 1200,
        height: 1000,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${tint2}55 0%, transparent 65%)`,
        opacity: 0.3 * strength,
        filter: "blur(30px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        right: -380 + Math.cos(t * 0.09) * 240,
        bottom: -240 + Math.sin(t * 0.12) * 200,
        width: 1300,
        height: 1100,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${tint}33 0%, transparent 65%)`,
        opacity: 0.3 * strength,
        filter: "blur(30px)",
      }}
    />
    {/* dust + bokeh */}
    {DUST.map((d, i) => {
      const y = (((d.y - t * d.sp * d.z) % 2000) + 2000) % 2000 - 40;
      const x = d.x + Math.sin(t * 0.5 + d.ph) * 26 * d.z;
      const r = d.big ? 10 + d.z * 18 : 1.6 + d.z * 3;
      const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + d.ph);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background: d.big ? `radial-gradient(circle, ${i % 2 ? tint : tint2}44 0%, transparent 70%)` : i % 3 ? "#B89B78" : tint,
            opacity: (d.big ? 0.7 : 0.28) * tw * d.z * strength,
            filter: d.big ? "blur(2px)" : undefined,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/* Sparkle burst: 4-point stars popping around a point */
export const Sparkles: React.FC<{ t: number; at: number; x: number; y: number; color: string; n?: number; spread?: number; seed?: number }> = ({ t, at, x, y, color, n = 9, spread = 170, seed = 1 }) => {
  if (t < at || t > at + 1.4) return null;
  return (
    <>
      {new Array(n).fill(0).map((_, i) => {
        const d = 0.05 * i;
        const p = prog(t, at + d, at + d + 1.1, easeOutExpo);
        const pop = prog(t, at + d, at + d + 0.35, easeOutBack);
        const fade = prog(t, at + d + 0.5, at + d + 1.2);
        const a = rand(seed * 13 + i * 3.7) * Math.PI * 2;
        const r = spread * (0.45 + rand(seed * 7 + i) * 0.55) * p;
        const s = (10 + rand(seed + i * 5.1) * 16) * pop * (1 - fade);
        if (s <= 0.2) return null;
        return (
          <svg
            key={i}
            width={s * 2}
            height={s * 2}
            viewBox="-10 -10 20 20"
            style={{ position: "absolute", left: x + Math.cos(a) * r - s, top: y + Math.sin(a) * r - s, transform: `rotate(${p * 90}deg)`, overflow: "visible" }}
          >
            <path d="M0,-10 Q1.2,-1.2 10,0 Q1.2,1.2 0,10 Q-1.2,1.2 -10,0 Q-1.2,-1.2 0,-10 Z" fill={i % 3 === 0 ? "#F2B544" : color} />
          </svg>
        );
      })}
    </>
  );
};

export { Img };
