import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { MONO, SANS, SERIF } from "./fonts";
import { clamp, easeInExpo, easeInOut, easeOut, easeOutBack, easeOutExpo, lerp, mixColor, prog, rand } from "./lib";

/* icons for inline chips in Kinetic text ("[wave]" etc.), 24x24 stroke paths */
export const CHIP_ICONS: Record<string, string> = {
  wave: "M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3.5-4 5-2",
  code: "M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16",
  phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2",
  pad: "M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5.4 1.8L15 15H9l-1.6 1.8A3 3 0 0 1 2 15v-3a4 4 0 0 1 4-4z M7 11v3 M5.5 12.5h3 M16 12h.01 M18 13.5h.01",
  pulse: "M2 12h4l2-5 4 10 2-5h8",
  spark: "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z",
};

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
  /** keep this word's slot in the layout but don't draw it (a giant copy flies into it) */
  hideWord?: string;
  /** hideWord is hidden only before this time (then the real word takes over, e.g. for its exit) */
  hideUntil?: number;
  /** "focus": words slowly pull into focus in place; "streak": words open out of a light streak from the centre */
  mode?: "rise" | "focus" | "streak";
}> = ({ t, text, inAt, outAt, accent, y = 1150, size = 84, weight = 700, stagger = 0.07, accentGlow = true, color = INK, exitDir = -1, chars = false, hideWord, hideUntil = 1e9, mode = "rise" }) => {
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
            // "*word*" = accent colour; "~word~" = accent colour set in serif italic (one feeling word per line)
            const isSerif = raw.startsWith("~");
            const isAccent = raw.startsWith("*") || isSerif;
            const word = raw.replace(/[*~]/g, "");
            const i = idx++;
            const mid = (arr.length - 1) / 2;
            const start =
              mode === "focus"
                ? inAt + i * 0.36
                : mode === "streak"
                  ? inAt + Math.abs(wi - mid) * 0.07
                  : inAt + li * 0.09 + wi * stagger * 0.8 + (isAccent ? 0.05 : 0);
            const p = mode === "focus" ? prog(t, start, start + 1.3, easeOut) : prog(t, start, start + (mode === "streak" ? 0.65 : 0.7), easeOutExpo);
            const e = prog(t, outAt + li * 0.05 + wi * 0.02, outAt + li * 0.05 + wi * 0.02 + 0.45, easeInExpo);
            const op = word === hideWord && t < hideUntil ? 0 : clamp(p * (mode === "focus" ? 1.25 : 1.6)) * (1 - e);
            // rise from below the mask, leave upward through it (focus/streak: arrive in place)
            const rise = mode === "rise" ? (1 - p) * 1.1 * size * 1.1 : mode === "focus" ? (1 - p) * 0.12 * size : 0;
            const ty = rise + e * exitDir * 1.1 * size * 1.1;
            const blur = (1 - p) * (mode === "focus" ? 16 : mode === "streak" ? 9 : 5) + e * 4;
            const streakTf = mode === "streak" ? ` scale(${lerp(1.9, 1, p)}, ${lerp(0.35, 1, p)})` : "";
            const sweep = prog(t, start + 0.35, start + 1.3, easeOutExpo);
            void i;
            const chip = /^\[(\w+)\]$/.exec(raw);
            if (chip) {
              const pop = prog(t, start, start + 0.55, easeOutBack);
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "1.08em",
                    height: "0.8em",
                    marginRight: wi === arr.length - 1 ? 0 : "0.24em",
                    verticalAlign: "-0.08em",
                    borderRadius: "0.24em",
                    background: `${accent}1F`,
                    border: `2px solid ${accent}55`,
                    opacity: op,
                    transform: `translateY(${ty}px) scale(${lerp(0.6, 1, pop)})`,
                    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                  }}
                >
                  <svg width="0.56em" height="0.56em" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={CHIP_ICONS[chip[1]] ?? ""} />
                  </svg>
                </span>
              );
            }
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
                  transform: `translateY(${ty}px)${streakTf}`,
                  filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                  color: isAccent ? accent : mode === "streak" && p < 1 ? mixColor("#E9A93B", color.startsWith("#") ? color : INK, p) : undefined,
                  ...(isSerif ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "1.2em", letterSpacing: "-0.01em", lineHeight: 0.9, paddingRight: "0.06em" } : {}),
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
export const Ambience: React.FC<{ t: number; tint: string; tint2?: string; strength?: number; period?: number }> = ({ t, tint, tint2 = "#FFC9A0", strength = 1, period }) => {
  // With `period`, every drift/sway/twinkle completes whole cycles over the film, so the last
  // frame matches frame 0 (seamless loop). Each rate is snapped to the nearest whole cycle count.
  const w = (rate: number) => (period ? (Math.max(1, Math.round((rate * period) / (2 * Math.PI))) * 2 * Math.PI) / period : rate);
  const fall = (speed: number) => (period ? (Math.max(1, Math.round((speed * period) / 2000)) * 2000) / period : speed);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* light leaks */}
      <div
        style={{
          position: "absolute",
          left: -300 + Math.sin(t * w(0.13)) * 220,
          top: -200 + Math.cos(t * w(0.11)) * 160,
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
          right: -380 + Math.cos(t * w(0.09)) * 240,
          bottom: -240 + Math.sin(t * w(0.12)) * 200,
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
        const y = (((d.y - t * fall(d.sp * d.z)) % 2000) + 2000) % 2000 - 40;
        const x = d.x + Math.sin(t * w(0.5) + d.ph) * 26 * d.z;
        const r = d.big ? 10 + d.z * 18 : 1.6 + d.z * 3;
        const tw = 0.55 + 0.45 * Math.sin(t * w(1.3) + d.ph);
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
};

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

/* ------------------------------------------------------------------ */
/* GiantWord: a word slams in huge, holds, then flies + shrinks into    */
/* its exact slot in a Kinetic sentence (pair with hideWord/hideUntil). */
/* to.x / to.y are the measured centre of that word's span.             */
/* ------------------------------------------------------------------ */
export const GiantWord: React.FC<{
  t: number;
  word: string;
  color: string;
  size: number;
  weight: number;
  from: { x: number; y: number; scale: number };
  to: { x: number; y: number };
  inAt: number;
  moveAt: number;
  moveDur?: number;
  until: number;
}> = ({ t, word, color, size, weight, from, to, inAt, moveAt, moveDur = 0.65, until }) => {
  if (t < inAt || t >= until) return null;
  const pin = prog(t, inAt, inAt + 0.45, easeOutExpo);
  const mv = (tt: number) => {
    const x = clamp((tt - moveAt) / moveDur);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // easeInOutCubic
  };
  const m = mv(t);
  const x = lerp(from.x, to.x, m);
  const y = lerp(from.y, to.y, m);
  const sc = Math.exp(lerp(Math.log(from.scale), 0, m)) * lerp(1.12, 1, pin);
  const speed = Math.abs(mv(t + 1 / 30) - m) * 30; // fraction of the move per second
  const blur = (1 - pin) * 14 + Math.min(6, speed * 4);
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${sc}) translateY(${(1 - pin) * 0.35 * size}px)`,
        display: "inline-block",
        whiteSpace: "nowrap",
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: "-0.035em",
        lineHeight: 1.1,
        color,
        opacity: clamp(pin * 1.6),
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        textShadow: "0 10px 30px rgba(80,55,25,0.1)",
      }}
    >
      {word}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* SelectBox: a design-tool selection (dashed box + corner handles)     */
/* that draws on around a word. x/y/w/h = the word's box on screen.     */
/* ------------------------------------------------------------------ */
export const SelectBox: React.FC<{ t: number; at: number; until: number; x: number; y: number; w: number; h: number; color: string; pad?: number }> = ({ t, at, until, x, y, w, h, color, pad = 14 }) => {
  if (t < at || t > until + 0.4) return null;
  const draw = prog(t, at, at + 0.5, easeInOut);
  const hp = prog(t, at + 0.35, at + 0.7, easeOutBack);
  const out = prog(t, until, until + 0.35, easeInExpo);
  const X = x - pad;
  const Y = y - pad;
  const W = w + pad * 2;
  const Hh = h + pad * 2;
  const per = 2 * (W + Hh);
  const hs = 14 * hp;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - out }}>
      <rect x={X} y={Y} width={W} height={Hh} rx={6} fill={`${color}10`} fillOpacity={draw} stroke={color} strokeWidth={3} strokeDasharray={`${per * draw} ${per}`} />
      <rect x={X} y={Y} width={W} height={Hh} rx={6} fill="none" stroke={color} strokeOpacity={0.35 * draw} strokeWidth={1.5} strokeDasharray="8 7" />
      {[
        [X, Y],
        [X + W, Y],
        [X, Y + Hh],
        [X + W, Y + Hh],
      ].map(([cx, cy], i) => (
        <rect key={i} x={cx - hs / 2} y={cy - hs / 2} width={hs} height={hs} rx={2} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Cursor: an arrow pointer with a click (press + ripple)               */
/* (x, y) is the pointer tip. All motion is driven by the caller.       */
/* ------------------------------------------------------------------ */
export const Cursor: React.FC<{ t: number; x: number; y: number; clickAt: number; opacity: number; scale?: number }> = ({ t, x, y, clickAt, opacity, scale = 1 }) => {
  if (opacity <= 0.01) return null;
  const press = t > clickAt && t < clickAt + 0.25 ? Math.sin(Math.PI * ((t - clickAt) / 0.25)) : 0;
  const rp = prog(t, clickAt, clickAt + 0.6, easeOutExpo);
  return (
    <>
      {t > clickAt && t < clickAt + 0.6 && (
        <div style={{ position: "absolute", left: x - 10 - rp * 40, top: y - 10 - rp * 40, width: 20 + rp * 80, height: 20 + rp * 80, borderRadius: "50%", border: `3px solid ${INK}`, opacity: (1 - rp) * 0.5 * opacity }} />
      )}
      <svg
        width={44}
        height={56}
        viewBox="0 0 22 28"
        style={{ position: "absolute", left: x - 3, top: y - 2, opacity, transform: `scale(${scale * (1 - press * 0.16)})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 6px 10px rgba(60,40,20,0.3))", overflow: "visible" }}
      >
        <path d="M2 1 L2 21 L7.5 16 L11 24.5 L14.5 23 L11 14.8 L18.5 14.8 Z" fill={INK} stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* LightStreak: a warm horizontal glint that opens out from the centre  */
/* (pair with Kinetic mode="streak" so the line forms out of it).       */
/* ------------------------------------------------------------------ */
export const LightStreak: React.FC<{ t: number; at: number; y: number; x?: number; width?: number; color?: string }> = ({ t, at, y, x = 540, width = 780, color = "#F2B544" }) => {
  if (t < at || t > at + 1.2) return null;
  const p = prog(t, at, at + 0.5, easeOutExpo);
  const fade = prog(t, at + 0.35, at + 1.15, easeInOut);
  const w = width * p;
  const star = (sx: number, i: number) => (
    <svg key={i} width={34} height={34} viewBox="-10 -10 20 20" style={{ position: "absolute", left: sx - 17, top: y - 17, transform: `rotate(${p * 90}deg) scale(${lerp(0.4, 1, p)})`, opacity: 1 - fade, overflow: "visible" }}>
      <path d="M0,-10 Q1.2,-1.2 10,0 Q1.2,1.2 0,10 Q-1.2,1.2 -10,0 Q-1.2,-1.2 0,-10 Z" fill={color} />
    </svg>
  );
  return (
    <>
      <div style={{ position: "absolute", left: x - w * 0.6, top: y - 40, width: w * 1.2, height: 80, borderRadius: "50%", background: `radial-gradient(ellipse, ${color}50 0%, ${color}14 40%, transparent 70%)`, opacity: 1 - fade }} />
      <div style={{ position: "absolute", left: x - w / 2, top: y - 1.5, width: w, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${color} 25%, #FFFFFF 50%, ${color} 75%, transparent)`, opacity: 1 - fade }} />
      {star(x - w / 2, 0)}
      {star(x + w / 2, 1)}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* TypedTags: hashtag lines typed by a caret into pills that grow with   */
/* the text (one pill per line, typed one after the other).             */
/* ------------------------------------------------------------------ */
export const TypedTags: React.FC<{ t: number; at: number; lines: string[]; y: number; accent: string; speed?: number; out?: number; size?: number }> = ({ t, at, lines, y, accent, speed = 62, out = 1e9, size = 34 }) => {
  const starts: number[] = [];
  let acc = at;
  lines.forEach((l) => {
    starts.push(acc);
    acc += l.length / speed + 0.06;
  });
  if (t < at - 0.15 || t > out + 0.5) return null;
  const o = prog(t, out, out + 0.4, easeInOut);
  let active = 0;
  starts.forEach((s, i) => {
    if (t >= s - 0.12) active = i;
  });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: 1 - o, transform: `translateY(${o * 14}px)` }}>
      {lines.map((line, i) => {
        const s = starts[i];
        const pop = prog(t, s - 0.12, s + 0.18, easeOutBack);
        if (pop <= 0.001) return <div key={i} style={{ height: size * 1.25 + 18 }} />;
        const n = Math.floor(clamp((t - s) * speed, 0, line.length));
        const typing = n < line.length && t >= s;
        const caretOn = i === active && (typing || Math.floor(t * 3.2) % 2 === 0);
        return (
          <div
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 26px",
              minHeight: size * 1.25,
              borderRadius: 999,
              background: "rgba(255,255,255,0.72)",
              border: `1.5px solid ${accent}55`,
              boxShadow: "0 14px 30px rgba(90,60,25,0.10)",
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: size,
              letterSpacing: "-0.01em",
              color: "#6E6A62",
              whiteSpace: "pre",
              opacity: clamp(pop * 1.4),
              transform: `scale(${lerp(0.7, 1, pop)})`,
            }}
          >
            {line
              .slice(0, n)
              .split("")
              .map((ch, k) => (
                <span key={k} style={{ color: ch === "#" ? accent : undefined }}>
                  {ch}
                </span>
              ))}
            <span style={{ display: "inline-block", width: 3, height: size * 0.95, marginLeft: n ? 3 : 0, borderRadius: 2, background: accent, opacity: caretOn ? 1 : 0 }} />
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* RollWord: a whole word rolls up into place and out again (for a      */
/* cycling word, e.g. "Beyond the gaming. / asthma. / Grades.").        */
/* ------------------------------------------------------------------ */
export const RollWord: React.FC<{ t: number; text: string; inAt: number; outAt: number; x: number; y: number; size: number; weight: number; color: string; letterSpacing?: string }> = ({ t, text, inAt, outAt, x, y, size, weight, color, letterSpacing = "-0.035em" }) => {
  if (t < inAt || t > outAt + 0.14) return null;
  const pin = prog(t, inAt, inAt + 0.22, easeOutExpo);
  const pout = prog(t, outAt, outAt + 0.13, easeInExpo);
  const ty = (1 - pin) * 0.55 * size - pout * 0.55 * size;
  const blur = (1 - pin) * 10 + pout * 10;
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateY(${ty}px)`,
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size,
        letterSpacing,
        lineHeight: 1.1,
        color,
        whiteSpace: "nowrap",
        opacity: clamp(pin * 1.5) * (1 - pout),
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        textShadow: "0 10px 30px rgba(80,55,25,0.1)",
      }}
    >
      {text}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* FilmBlur: real camera motion blur (several sub-frame samples blended, */
/* 180° shutter) inside fast-motion windows; a single sample elsewhere,  */
/* so the component tree stays the same on every frame.                 */
/* Children must read the time themselves (useCurrentFrame) so each     */
/* sample sees its own sub-frame time.                                   */
/* ------------------------------------------------------------------ */
export const inWindows = (t: number, w: [number, number][]) => w.some(([a, b]) => t >= a && t <= b);
export const FilmBlur: React.FC<{ active: boolean; samples?: number; children: React.ReactNode }> = ({ active, samples = 6, children }) => (
  <CameraMotionBlur shutterAngle={180} samples={active ? samples : 1}>
    {children}
  </CameraMotionBlur>
);
