import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import "../premium/fonts";
import timeline from "./timeline.json";

const warpT = makeWarp((timeline as { warp?: number[][] }).warp);
import { MONO, SANS } from "../premium/fonts";
import { Ambience, Cursor, Flash, FilmLook, GiantWord, INK, Kinetic, Orb, PAPER, SelectBox, Sparkles } from "../premium/components";
import { makeWarp, FPS, clamp, easeInExpo, easeInOut, easeOutBack, easeOutExpo, lerp, prog, rand, smoothKeys } from "../premium/lib";

const BLUE = "#5B8CFF";
const VIOLET = "#9B7BFF";
const BG = PAPER;
const CX = 540;
const CY = 740; // hero line
const TY = 1235; // headline baseline zone

export const V1_DURATION = 50.7;

/* ================================================================== */
/* Camera: one continuous move through the whole film                  */
/* ================================================================== */
const camScale = smoothKeys([
  [0, 1.16], [3.9, 1.03], [4.3, 1.0], [9.5, 1.05], [10.3, 0.97], [14.3, 1.02], [15.05, 1.75],
  [15.8, 1.0], [20.9, 1.06], [21.7, 0.97], [26.4, 1.03], [27.0, 1.7], [27.6, 1.0],
  [33.8, 1.0], [36.15, 1.16], [36.6, 0.95], [39.6, 1.0], [41.6, 1.0],
  [47.4, 1.04], [48.1, 0.97], [50.7, 1.06],
]);
const camRot = smoothKeys([
  [0, -2.2], [3.9, 0], [9.5, 0], [10.3, 0.8], [14.3, 0], [15.05, -4], [15.8, 0], [26.4, 0], [27.0, 3.5],
  [27.6, 0], [50.7, 0],
]);

const Camera: React.FC<{ t: number; children: React.ReactNode }> = ({ t, children }) => {
  const s = camScale(t);
  const v = Math.abs(camScale(t + 1 / FPS) - s) * FPS; // scale velocity → motion blur
  const rv = Math.abs(camRot(t + 1 / FPS) - camRot(t)) * FPS;
  const blur = Math.min(7, v * 5 + rv * 0.25);
  // impact shake at the drop
  const sh = t > 36.23 && t < 36.9 ? (1 - (t - 36.23) / 0.67) ** 2 * 22 : 0;
  const sx = sh * (rand(Math.floor(t * 60)) - 0.5);
  const sy = sh * (rand(Math.floor(t * 60) + 5) - 0.5);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${CX}px ${CY}px`,
        transform: `translate(${sx}px, ${sy}px) scale(${s}) rotate(${camRot(t)}deg)`,
        filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Backdrop                                                            */
/* ================================================================== */
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const s = camScale(t);
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.3);
  const explode = t > 36.2 && t < 40.5 ? Math.min(1, (t - 36.2) / 0.3) * (1 - prog(t, 39.6, 40.5)) : 0;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 75% at 50% 36%, #FFFDF9 0%, #FAF5EC 55%, #EFE5D5 100%)" }} />
      <Orb x={CX + Math.sin(t * 0.21) * 120} y={CY - 60 + Math.cos(t * 0.17) * 80} r={620} color="rgba(91,140,255,0.05)" opacity={pulse} />
      <Orb x={CX - 260 + Math.sin(t * 0.13) * 90} y={1380} r={520} color="rgba(255,170,110,0.08)" />
      <Orb x={CX} y={CY} r={900} color="rgba(91,140,255,0.16)" opacity={explode} />
      {/* parallax grid */}
      <AbsoluteFill
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `scale(${1 + (s - 1) * 0.45})`,
          backgroundImage:
            "linear-gradient(rgba(70,55,40,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(70,55,40,0.055) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `${45}px ${(t * 6) % 90}px`,
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 40%, black 0%, transparent 75%)",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 40%, black 0%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* The hero dot                                                        */
/* ================================================================== */
const Dot: React.FC<{ x: number; y: number; r?: number; color?: string; glow?: number; opacity?: number }> = ({ x, y, r = 11, color = INK, glow = 1, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity }}>
    <div
      style={{
        position: "absolute",
        left: -r * 7,
        top: -r * 7,
        width: r * 14,
        height: r * 14,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}55 0%, ${color}14 35%, transparent 70%)`,
        opacity: glow,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: -r,
        top: -r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 ${r * 0.6}px ${r * 2.2}px ${color}66, 0 0 ${r * 4}px ${color}33`,
      }}
    />
  </div>
);

const Ripple: React.FC<{ t: number; at: number; x: number; y: number; color?: string; size?: number }> = ({ t, at, x, y, color = INK, size = 140 }) => {
  if (t < at || t > at + 1.1) return null;
  const p = easeOutExpo(clamp((t - at) / 1.1));
  const r = 10 + p * size;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        opacity: (1 - p) * 0.45,
      }}
    />
  );
};

/* ================================================================== */
/* Scene A — dot → wave → many waves (0 – 15.3)                       */
/* ================================================================== */
// opening hook / loop seam: the film starts on (and loops back to) a frame filled by the blue dot
const HOOK_END = 0.6;
const SWELLS = [4.2, 5.95, 7.15]; // soft light from the dot between the opening lines
const HOOK_R0 = 2300;
const GLYPHS = ["dy/dx", "√x", "x²", "∫", "n!", "Δ", "sin θ", "f(x)", "π", "%", "∞", "Σ", "θ", "≈", "e^x", "∂"];

const WaveScene: React.FC<{ t: number }> = ({ t }) => {
  if (t > 15.6) return null;
  const X0 = 150;
  const X1 = 930;
  const penX = lerp(X0, X1, prog(t, 5.6, 9.6, easeInOut));
  const multi = prog(t, 9.55, 10.6, easeOutExpo); // 0→1 into layered waves
  const collapse = prog(t, 14.45, 15.25, easeInExpo);
  const ampEnd = smoothKeys([[5.6, 30], [7.25, 60], [8.2, 95], [9.6, 120], [10.6, 140]])(t);
  const lam = 300;
  const left = lerp(lerp(X0, 20, multi), CX, collapse);
  const right = lerp(lerp(penX, 1060, multi), CX, collapse);
  const ampK = 1 - collapse;
  const phase = Math.max(0, t - 9.6) * 2.2;

  const path = (k: number) => {
    const pts: string[] = [];
    const steps = 160;
    for (let i = 0; i <= steps; i++) {
      const x = lerp(left, right, i / steps);
      const u = clamp((x - X0) / (X1 - X0));
      const envAlong = lerp(0.12 + u * 0.88, 1, multi);
      const a = ampEnd * envAlong * ampK * (1 - k * 0.06);
      const y = CY - a * Math.sin(((x - X0) / lam) * Math.PI * 2 + phase * (1 + k * 0.08) + k * 0.32 * multi);
      pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const drawing = t >= 5.6;
  // pen head position (wave end)
  const u = clamp((penX - X0) / (X1 - X0));
  const headY = CY - ampEnd * (0.12 + u * 0.88) * Math.sin(((penX - X0) / lam) * Math.PI * 2);

  // dot travel: centre → left start
  // HOOK: a giant blue disc fills frame 0 and rushes down into the small dot (lands at HOOK_END)
  const hook = prog(t, 0, HOOK_END, (x) => 1 - Math.pow(1 - x, 3.4));
  const hookR = lerp(HOOK_R0, 11, hook);
  const hookV = Math.abs(lerp(HOOK_R0, 11, prog(t + 1 / FPS, 0, HOOK_END, (x) => 1 - Math.pow(1 - x, 3.4))) - hookR);
  const toLeft = prog(t, 4.05, 4.9, easeInOut);
  let dx = lerp(CX, X0, toLeft);
  let dy = CY;
  if (t >= 5.6) {
    dx = penX;
    dy = headY;
  }
  const dotOp = (1 - prog(t, 9.7, 10.3)) + prog(t, 14.9, 15.2);
  const dotScale = 1 + 0.06 * Math.sin((t - HOOK_END) * 4) * (t > HOOK_END + 0.4 && t < 4 ? 1 : 0);
  if (t > 14.9) {
    dx = CX;
    dy = CY;
  }

  return (
    <AbsoluteFill>
      {/* glyph field */}
      {GLYPHS.map((g, i) => {
        const depth = 0.4 + rand(i * 3.1) * 0.8;
        const gx = 80 + rand(i * 1.7) * 920;
        const gy0 = 380 + rand(i * 2.3) * 320;
        const ap = prog(t, 9.9 + i * 0.06, 10.9 + i * 0.06, easeOutExpo);
        const gy = gy0 - (t - 9.9) * 14 * depth;
        const cx = lerp(gx, CX, collapse);
        const cy = lerp(gy, CY, collapse);
        const op = ap * (1 - collapse) * (0.25 + depth * 0.35);
        if (op <= 0.01) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              transform: `translate(-50%, -50%) scale(${0.7 + depth * 0.6})`,
              fontFamily: MONO,
              fontSize: 34,
              color: i % 3 === 0 ? BLUE : "#8C8577",
              opacity: op,
              filter: `blur(${(1.2 - depth) * 3 + (1 - ap) * 6}px)`,
            }}
          >
            {g}
          </div>
        );
      })}
      {drawing && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="wg" x1="0" x2="1080" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={INK} />
              <stop offset="0.55" stopColor="#3A6BEA" />
              <stop offset="1" stopColor={BLUE} />
            </linearGradient>
            <filter id="wglow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          {[5, 4, 3, 2, 1].map((k) => (
            <path key={k} d={path(k)} fill="none" stroke={k % 2 ? VIOLET : BLUE} strokeWidth={2} opacity={multi * (0.55 - k * 0.07) * ampK} />
          ))}
          <path d={path(0)} fill="none" stroke={BLUE} strokeWidth={10} opacity={0.18} filter="url(#wglow)" />
          <path d={path(0)} fill="none" stroke="url(#wg)" strokeWidth={4.5} strokeLinecap="round" />
        </svg>
      )}
      <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(1)` }}>
        {t < HOOK_END ? (
          <div
            style={{
              position: "absolute",
              left: CX - hookR,
              top: CY - hookR,
              width: hookR * 2,
              height: hookR * 2,
              borderRadius: "50%",
              background: BLUE,
              filter: hookV > 1 ? `blur(${Math.min(28, hookV * 0.12)}px)` : undefined,
            }}
          />
        ) : (
          <Dot x={dx} y={dy} r={11 * dotScale} color={BLUE} opacity={clamp(dotOp)} />
        )}
      </div>
      <Ripple t={t} at={HOOK_END} x={CX} y={CY} color={BLUE} size={220} />
      {SWELLS.map((at, i) => {
        if (t < at || t > at + 1.0) return null;
        const p = easeOutExpo(clamp((t - at) / 1.0));
        const r = 40 + p * 640;
        return <div key={i} style={{ position: "absolute", left: dx - r, top: dy - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${BLUE}2E 0%, ${BLUE}10 45%, transparent 70%)`, opacity: 1 - p }} />;
      })}
      <Ripple t={t} at={15.2} x={CX} y={CY} color={BLUE} size={220} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Scene B — braces + code (15.3 – 21.9)                               */
/* ================================================================== */
type Tok = [string, string];
const CODE: Tok[][] = [
  [["while", "#7A4DFF"], [" curious", INK], [":", "#9A9FAD"]],
  [["    learn", "#2F6BFF"], ["()", "#9A9FAD"]],
  [["    build", "#2F6BFF"], ["()", "#9A9FAD"]],
  [["print", "#2F6BFF"], ["(", "#9A9FAD"], ['"Hello, World"', "#169C5A"], [")", "#9A9FAD"]],
];
const CODE_START = 16.0;
const CODE_END = 19.6;

const BraceScene: React.FC<{ t: number }> = ({ t }) => {
  if (t < 15.3 || t > 22.4) return null;
  const open = prog(t, 15.55, 16.3, easeOutBack);
  const morph = prog(t, 21.15, 21.95, easeInOut);
  const spread = lerp(lerp(0, 300, open), 205, morph);
  const op = clamp(open * 1.4) * (1 - prog(t, 21.6, 22.0));
  const sy = lerp(1, 3.1, morph);
  const codeOp = prog(t, 15.9, 16.2) * (1 - prog(t, 20.85, 21.25, easeInExpo));
  const total = CODE.reduce((a, l) => a + l.reduce((b, k) => b + k[0].length, 0), 0) + CODE.length;
  const chars = Math.floor(prog(t, CODE_START, CODE_END, (x) => x) * total);
  let left = chars;
  const cursorOn = Math.floor(t * 2.2) % 2 === 0 || (t > CODE_START && t < CODE_END);
  const brace = (side: -1 | 1) => (
    <div
      style={{
        position: "absolute",
        left: CX + side * spread,
        top: CY,
        transform: `translate(-50%, -54%) scaleY(${sy}) scaleX(${lerp(1, 0.6, morph)})`,
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 230,
        color: BLUE,
        opacity: op,
        textShadow: `0 14px 40px ${BLUE}55`,
        filter: `blur(${(1 - clamp(open * 1.2)) * 12 + morph * 6}px)`,
      }}
    >
      {side < 0 ? "{" : "}"}
    </div>
  );
  return (
    <AbsoluteFill>
      {brace(-1)}
      {brace(1)}
      <div
        style={{
          position: "absolute",
          left: CX - 200,
          top: CY - 100,
          fontFamily: MONO,
          fontSize: 33,
          lineHeight: 1.55,
          opacity: codeOp,
          whiteSpace: "pre",
          filter: codeOp < 1 ? `blur(${(1 - codeOp) * 8}px)` : undefined,
        }}
      >
        {CODE.map((line, li) => {
          const shown: React.ReactNode[] = [];
          for (const [txt, col] of line) {
            const n = Math.max(0, Math.min(txt.length, left));
            left -= txt.length;
            if (n > 0) shown.push(<span key={shown.length} style={{ color: col }}>{txt.slice(0, n)}</span>);
          }
          const lineDone = left >= 0;
          left -= 1;
          const isLast = !lineDone || li === CODE.length - 1;
          const activeLine = left < 0 && left + line.reduce((b, k) => b + k[0].length, 0) + 1 >= 0;
          return (
            <div key={li} style={{ height: 51 }}>
              {shown}
              {(activeLine || (li === CODE.length - 1 && chars >= total)) && isLast && cursorOn && (
                <span style={{ display: "inline-block", width: 3, height: 36, background: INK, marginLeft: 3, verticalAlign: -6 }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Scene C — phone UI build (21.2 – 27.2)                              */
/* ================================================================== */
const PW = 420;
const PH = 760;
const Phone: React.FC<{ t: number }> = ({ t }) => {
  if (t < 21.2 || t > 27.3) return null;
  const draw = prog(t, 21.45, 22.25, easeInOut);
  const collapse = prog(t, 26.5, 27.05, easeInExpo);
  const re = prog(t, 24.15, 24.95, easeInOut); // relayout
  const w = lerp(PW, 24, collapse);
  const h = lerp(PH, 24, collapse);
  const x = CX - w / 2;
  const y = CY - h / 2;
  const per = 2 * (PW + PH);
  const a = (at: number) => prog(t, at, at + 0.55, easeOutExpo);
  const pop = (at: number) => prog(t, at, at + 0.6, easeOutBack);
  const inner = 1 - prog(t, 26.35, 26.7);
  const bar = (top: number, wd: number, hgt: number, col: string, at: number, extra?: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        left: 34,
        top: top + (1 - a(at)) * 18,
        width: wd * a(at),
        height: hgt,
        borderRadius: hgt / 2,
        background: col,
        opacity: a(at),
        ...extra,
      }}
    />
  );
  const cardTop = lerp(270, 96, re);
  // cursor: glides in, taps the blue button (phone-local 34+46, 206+13), the tap triggers the relayout
  const TAP = 23.95;
  const cin = prog(t, 23.3, 23.85, easeInOut);
  const cout = prog(t, 24.25, 24.75, easeInOut);
  const btn = { x: CX - PW / 2 + 34 + 46, y: CY - PH / 2 + 206 + 13 };
  const curX = lerp(lerp(780, btn.x, cin), 760, cout);
  const curY = lerp(lerp(1060, btn.y, cin), 1000, cout);
  const curOp = prog(t, 23.3, 23.5) * (1 - prog(t, 24.45, 24.75)) * (1 - collapse);
  return (
    <AbsoluteFill>
      {/* frame stroke draw-on */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - collapse }}>
        <rect
          x={CX - PW / 2}
          y={CY - PH / 2}
          width={PW}
          height={PH}
          rx={52}
          fill="none"
          stroke={BLUE}
          strokeWidth={2.5}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - draw)}
          opacity={0.9 * (1 - prog(t, 22.3, 22.8))}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: lerp(52, 12, collapse),
          background: collapse > 0.85 ? INK : "linear-gradient(180deg, #141A2B 0%, #0E1320 100%)",
          border: "1.5px solid rgba(160,180,255,0.18)",
          boxShadow: `0 60px 120px rgba(70,45,20,0.28), 0 18px 40px rgba(70,45,20,0.18), 0 0 ${60 + collapse * 60}px rgba(91,140,255,${0.1 + collapse * 0.4})`,
          opacity: prog(t, 21.9, 22.3),
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: inner }}>
          {/* status row */}
          <div style={{ position: "absolute", left: 34, top: 30, width: 12, height: 12, borderRadius: 6, background: "#fff", opacity: a(22.3) }} />
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: "absolute", right: 34 + i * 26, top: 35, width: 18, height: 3, borderRadius: 2, background: "#5C6684", opacity: a(22.35 + i * 0.05) }} />
          ))}
          {/* header (fades in relayout) */}
          <div style={{ opacity: 1 - re }}>
            {bar(76, 300, 24, "#F1F4FF", 22.5)}
            {bar(112, 220, 24, "#F1F4FF", 22.58)}
            {bar(156, 250, 7, "#4A5370", 22.7)}
            {bar(172, 190, 7, "#4A5370", 22.76)}
            {bar(206, 92, 26, BLUE, 22.88, { boxShadow: `0 0 18px ${BLUE}99` })}
          </div>
          {/* hero card */}
          <div
            style={{
              position: "absolute",
              left: 34,
              top: cardTop,
              width: PW - 68,
              height: 200,
              borderRadius: 22,
              background: `linear-gradient(120deg, ${BLUE} 0%, ${VIOLET} 100%)`,
              transform: `scale(${pop(23.0)})`,
              boxShadow: `0 20px 60px rgba(91,140,255,0.45)`,
            }}
          >
            <div style={{ position: "absolute", left: "50%", top: "50%" }}>
              <Dot x={0} y={0} r={10} glow={1.2} color="#FFFFFF" />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 22,
                background: `linear-gradient(100deg, transparent ${prog(t, 23.3, 24.2) * 160 - 40}%, rgba(255,255,255,0.35) ${prog(t, 23.3, 24.2) * 160 - 25}%, transparent ${prog(t, 23.3, 24.2) * 160 - 10}%)`,
              }}
            />
          </div>
          {/* bottom tiles (phase 1) */}
          <div style={{ opacity: 1 - re }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 34 + i * 182,
                  top: 494 + (1 - a(23.3 + i * 0.08)) * 30,
                  width: 170,
                  height: 120,
                  borderRadius: 18,
                  background: "#1A2133",
                  opacity: a(23.3 + i * 0.08),
                }}
              >
                <div style={{ position: "absolute", left: 18, top: 24, width: 70, height: 6, borderRadius: 3, background: "#C9D3F0" }} />
                <div style={{ position: "absolute", left: 18, top: 40, width: 110, height: 5, borderRadius: 3, background: "#4A5370" }} />
              </div>
            ))}
          </div>
          {/* phase 2 grid */}
          <div style={{ opacity: re }}>
            {[0, 1, 2, 3].map((i) => {
              const c = i % 2;
              const r = Math.floor(i / 2);
              const p = prog(t, 24.45 + i * 0.07, 25.05 + i * 0.07, easeOutExpo);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 34 + c * 182,
                    top: 322 + r * 118 + (1 - p) * 30,
                    width: 170,
                    height: 104,
                    borderRadius: 18,
                    background: "#1A2133",
                    opacity: p,
                  }}
                >
                  <div style={{ position: "absolute", left: 18, top: 20, width: 12, height: 12, borderRadius: 6, background: i % 2 ? VIOLET : BLUE, boxShadow: `0 0 12px ${BLUE}` }} />
                  <div style={{ position: "absolute", left: 18, top: 48, width: 96, height: 6, borderRadius: 3, background: "#C9D3F0" }} />
                  <div style={{ position: "absolute", left: 18, top: 64, width: 70, height: 5, borderRadius: 3, background: "#4A5370" }} />
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 34, top: 576, width: 150, height: 6, borderRadius: 3, background: "#C9D3F0", opacity: prog(t, 24.9, 25.3) }} />
            <div style={{ position: "absolute", left: 34, top: 602, width: PW - 68, height: 6, borderRadius: 3, background: "#232B40" }} />
            <div
              style={{
                position: "absolute",
                left: 34,
                top: 602,
                width: (PW - 68) * prog(t, 25.1, 26.2, easeInOut),
                height: 6,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${BLUE}, ${VIOLET})`,
                boxShadow: `0 0 14px ${VIOLET}`,
              }}
            />
            <div style={{ position: "absolute", left: 34, top: 640, width: 200, height: 6, borderRadius: 3, background: "#4A5370", opacity: prog(t, 25.2, 25.6) }} />
          </div>
        </div>
      </div>
      <Cursor t={t} x={curX} y={curY} clickAt={TAP} opacity={curOp} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Corridor of phone screens: the camera dollies through while the     */
/* real phone stays centre stage ("Code taught me to build")            */
/* ================================================================== */
const MiniPhone: React.FC<{ k: number }> = ({ k }) => {
  const grad = k % 3 === 0 ? `linear-gradient(120deg, ${BLUE}, ${VIOLET})` : k % 3 === 1 ? `linear-gradient(120deg, ${VIOLET}, #F28FB0)` : `linear-gradient(120deg, #4FC3A1, ${BLUE})`;
  return (
    <div style={{ position: "absolute", left: -150, top: -270, width: 300, height: 540, borderRadius: 40, background: "linear-gradient(180deg, #141A2B, #0E1320)", border: "1.5px solid rgba(160,180,255,0.2)", boxShadow: "0 30px 70px rgba(70,45,20,0.25)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 24, top: 40, width: 190, height: 16, borderRadius: 8, background: "#EEF1FA" }} />
      <div style={{ position: "absolute", left: 24, top: 66, width: 130, height: 16, borderRadius: 8, background: "#EEF1FA" }} />
      <div style={{ position: "absolute", left: 24, top: 104, width: 252, height: 150, borderRadius: 18, background: grad }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: "absolute", left: 24 + (i % 2) * 130, top: 272 + Math.floor(i / 2) * 92, width: 122, height: 80, borderRadius: 14, background: "#1A2133" }} />
      ))}
      <div style={{ position: "absolute", left: 24, top: 470, width: 252, height: 6, borderRadius: 3, background: grad }} />
    </div>
  );
};
const CORRIDOR_A = 24.55;
const CORRIDOR_B = 26.5;
const PhoneCorridor: React.FC<{ t: number }> = ({ t }) => {
  if (t < CORRIDOR_A || t > CORRIDOR_B) return null;
  const dolly = Math.pow(prog(t, CORRIDOR_A, CORRIDOR_B), 1.6) * 3800;
  const env = prog(t, CORRIDOR_A, CORRIDOR_A + 0.4, easeInOut) * (1 - prog(t, CORRIDOR_B - 0.35, CORRIDOR_B, easeInOut));
  // four walls x five deep; each phone faces the corridor's axis
  const walls: [number, number, string][] = [
    [-560, 0, "rotateY(68deg)"],
    [560, 0, "rotateY(-68deg)"],
    [0, -880, "rotateX(-62deg)"],
  ]; // (no floor wall: it would run through the headline)
  const items: React.ReactNode[] = [];
  walls.forEach(([wx, wy, rot], wi) => {
    for (let k = 0; k < 6; k++) {
      const z = -500 - k * 760 + dolly;
      if (z > 700 || z < -4500) continue;
      const near = clamp((z + 4500) / 1500); // fade in from the far end
      const off = wi < 2 ? (k % 2 ? 180 : -180) : k % 2 ? 260 : -260;
      const ox = wi < 2 ? 0 : off;
      const oy = wi < 2 ? off : 0;
      items.push(
        <div key={`${wi}-${k}`} style={{ position: "absolute", left: CX + wx + ox, top: CY + wy + oy, transform: `translateZ(${z}px) ${rot}`, opacity: near, transformStyle: "preserve-3d" }}>
          <MiniPhone k={wi * 6 + k} />
        </div>
      );
    }
  });
  return (
    <AbsoluteFill style={{ perspective: 900, perspectiveOrigin: `${CX}px ${CY}px`, opacity: env }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>{items}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Opening line that builds sideways: the camera tracks the newest      */
/* phrase, earlier phrases dim (widths measured: Inter 700 84px)        */
/* ================================================================== */
const PHRASES: [string, number, number][] = [
  ["One question.", 536.45, 4.35],
  ["One answer.", 480.03, 6.04],
  ["One more *try.*", 520.67, 7.25],
];
const PH_GAP = 30;
const PH_OUT = 9.35;
const SlidingLine: React.FC<{ t: number }> = ({ t }) => {
  if (t < PHRASES[0][2] - 0.05 || t > PH_OUT + 0.6) return null;
  const lefts: number[] = [];
  let acc = 0;
  PHRASES.forEach(([, w]) => {
    lefts.push(acc);
    acc += w + PH_GAP;
  });
  const centre = (i: number) => lefts[i] + PHRASES[i][1] / 2;
  let off = centre(0);
  for (let i = 1; i < PHRASES.length; i++) off = lerp(off, centre(i), prog(t, PHRASES[i][2] - 0.15, PHRASES[i][2] + 0.55, easeInOut));
  const e = prog(t, PH_OUT, PH_OUT + 0.45, easeInExpo);
  return (
    <div style={{ position: "absolute", left: 0, top: TY - 46, width: 4000, transform: `translate(${CX - off}px, 0px)`, fontFamily: SANS, fontWeight: 700, fontSize: 84, letterSpacing: "-0.035em", lineHeight: 1.1, color: INK, whiteSpace: "nowrap" }}>
      {PHRASES.map(([txt, , at], i) => {
        const p = prog(t, at, at + 0.7, easeOutExpo);
        const next = i < PHRASES.length - 1 ? PHRASES[i + 1][2] : 99;
        const dim = 1 - 0.7 * prog(t, next - 0.1, next + 0.4, easeInOut);
        const op = clamp(p * 1.6) * dim * (1 - e);
        return (
          <span key={i} style={{ position: "absolute", left: lefts[i], top: 0, transform: `translateY(${(1 - p) * 60 - e * 60}px)`, opacity: op, filter: (1 - p) * 5 + e * 4 > 0.3 ? `blur(${(1 - p) * 5 + e * 4}px)` : undefined }}>
            {txt.split(" ").map((w, j, arr) => (
              <span key={j} style={{ color: w.startsWith("*") ? BLUE : undefined }}>
                {w.replace(/\*/g, "")}
                {j < arr.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
};

/* ================================================================== */
/* Scene D — the pathway (27 – 36.2)                                   */
/* ================================================================== */
const STEPS = ["iPrimary", "iLowerSecondary", "International GCSE", "International A Level", "Universities worldwide"];
const NODE_T = [27.17, 28.38, 29.59, 30.8, 32.01];
const NX = 150;
const NY0 = 420;
const NGAP = 150;
const NR = 30; // badge radius
const ICONS = [
  "M4 20l4-1L19 8l-3-3L5 16l-1 4z M14 7l3 3", // pencil
  "M3 5c3-1 6-1 9 1v13c-3-2-6-2-9-1z M21 5c-3-1-6-1-9 1v13c3-2 6-2 9-1z", // book
  "M5 3h14v11H5z M8 7h8 M8 10h5 M12 14l-2 6 2-1 2 1-2-6", // certificate
  "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5 M22 9v5", // graduation cap
  "M12 3a9 9 0 1 0 0.01 0z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18", // globe
];
const NodeBadge: React.FC<{ x: number; y: number; s: number; color: string; filled: boolean; icon: string }> = ({ x, y, s, color, filled, icon }) => (
  <div
    style={{
      position: "absolute",
      left: x - NR,
      top: y - NR,
      width: NR * 2,
      height: NR * 2,
      borderRadius: "50%",
      background: filled ? color : "#FFFFFF",
      border: `2.5px solid ${color}`,
      boxShadow: "0 10px 24px rgba(80,55,25,0.14)",
      transform: `scale(${s})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={filled ? "#FFFFFF" : color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={icon} />
    </svg>
  </div>
);

const Pathway: React.FC<{ t: number }> = ({ t }) => {
  if (t < 26.9 || t > 36.4) return null;
  const merge = prog(t, 35.25, 36.2, easeInExpo);
  const shift = smoothKeys([[27.1, 120], [29.6, 60], [32.0, 0], [36.2, 0]])(t);
  const labelsOut = prog(t, 35.0, 35.45, easeInExpo);
  // travelling dot from phone centre to node 1
  const travel = prog(t, 26.95, 27.2, easeInOut);
  const nodes = STEPS.map((_, i) => ({ x: NX, y: NY0 + i * NGAP + shift }));
  const lineTo = (() => {
    let y = nodes[0].y;
    for (let i = 1; i < nodes.length; i++) {
      const p = prog(t, NODE_T[i] - 0.45, NODE_T[i], easeInOut);
      if (p > 0) y = lerp(nodes[i - 1].y, nodes[i].y, p);
    }
    return y;
  })();
  return (
    <AbsoluteFill>
      {/* spine */}
      <div
        style={{
          position: "absolute",
          left: NX - 1,
          top: nodes[0].y,
          width: 2,
          height: Math.max(0, (lineTo - nodes[0].y) * (1 - merge)),
          background: `linear-gradient(180deg, rgba(28,30,36,0.35), ${BLUE})`,
          opacity: (t > 27.2 ? 1 : 0) * (1 - merge),
        }}
      />
      {nodes.map((n, i) => {
        const at = NODE_T[i];
        if (t < at - 0.02 && !(i === 0 && t > 26.95)) return null;
        const isLast = i === STEPS.length - 1;
        const p = prog(t, at, at + 0.55, easeOutBack);
        let x = n.x;
        let y = n.y;
        if (i === 0 && t < at + 0.05) {
          x = lerp(CX, n.x, travel);
          y = lerp(CY, n.y, travel);
        }
        x = lerp(x, CX, merge);
        y = lerp(y, CY, merge);
        const lp = prog(t, at + 0.08, at + 0.8, easeOutExpo);
        const col = isLast ? BLUE : INK;
        return (
          <React.Fragment key={i}>
            {i === 0 && t < at + 0.05 ? (
              <Dot x={x} y={y} r={11} color={BLUE} glow={0.8} />
            ) : (
              <NodeBadge x={x} y={y} s={Math.max(0.05, p) * (1 - merge * 0.75)} color={col} filled={isLast} icon={ICONS[i]} />
            )}
            <Ripple t={t} at={at} x={n.x} y={n.y} color={col} size={isLast ? 180 : 110} />
            <div
              style={{
                position: "absolute",
                left: NX + NR + 34,
                top: n.y,
                transform: `translate(${(1 - lp) * -30}px, -50%)`,
                fontFamily: SANS,
                fontWeight: isLast ? 700 : 600,
                fontSize: isLast ? 62 : 58,
                letterSpacing: "-0.02em",
                color: col,
                opacity: lp * (1 - labelsOut),
                filter: `blur(${(1 - lp) * 10 + labelsOut * 10}px)`,
                textShadow: "0 10px 26px rgba(80,55,25,0.1)",
                whiteSpace: "nowrap",
              }}
            >
              {STEPS[i]}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Scene E — starfield + counter (36.2 – 41)                           */
/* ================================================================== */
const STARS = new Array(520).fill(0).map((_, i) => {
  const a = rand(i * 1.31) * Math.PI * 2;
  const r = Math.pow(rand(i * 2.17), 0.6);
  return { a, r, z: 0.25 + rand(i * 3.7) * 0.75, blue: rand(i * 5.3) > 0.82 };
});
const DROP = 36.23;

const Starfield: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP - 0.02 || t > 40.45) return null;
  const starFade = 1 - prog(t, 39.85, 40.4, easeInOut);
  const pos = (tt: number) => {
    const burst = easeOutExpo(clamp((tt - DROP) / 1.2));
    const implode = 0;
    const drift = 1 + Math.max(0, tt - DROP) * 0.05;
    return { burst, implode, drift };
  };
  const now = pos(t);
  const prev = pos(t - 1 / FPS);
  const R = 1150;
  const lines: React.ReactNode[] = [];
  STARS.forEach((s, i) => {
    const k = (st: typeof now) => (st.burst * s.r * R * st.drift * (0.6 + s.z * 0.5)) * (1 - st.implode);
    const r1 = k(now);
    const r0 = k(prev);
    const x1 = CX + Math.cos(s.a) * r1;
    const y1 = CY + Math.sin(s.a) * r1 * 1.5;
    const x0 = CX + Math.cos(s.a) * r0;
    const y0 = CY + Math.sin(s.a) * r0 * 1.5;
    const tw = (0.6 + 0.4 * Math.sin(t * 3 + i)) * (1 - 0.6 * prog(t, 37.6, 38.3) * (1 - prog(t, 39.9, 40.3)));
    const size = 1.1 + s.z * 2.4;
    const col = s.blue ? BLUE : "#2A2F45";
    lines.push(
      <line key={i} x1={x0} y1={y0} x2={x1 + 0.01} y2={y1} stroke={col} strokeWidth={size} strokeLinecap="round" opacity={(0.35 + s.z * 0.6) * tw * starFade} />
    );
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {lines}
    </svg>
  );
};

/* fly-through: hole of the second "0" in "8,000" (measured: Inter 800 220px, -0.055em, centred, top CY-40) */
const HOLE = { x: 566.0, y: 699.4 };
const FLY_A = 40.0;
const FLY_B = 40.75;
const flyZoom = (t: number) => Math.exp(Math.log(70) * easeInExpo(prog(t, FLY_A, FLY_B)));
/** where "your dot" sits: at the hole while flying through, then glides to the centre */
const dotOrigin = (t: number) => {
  const k = easeInOut(prog(t, FLY_B, FLY_B + 0.75));
  return { x: lerp(HOLE.x, CX, k), y: lerp(HOLE.y, CY, k) };
};

/* "This year, I'm one of them": the crowd of learners, your dot in the middle */
const CROWD = (() => {
  const out: { x: number; y: number; r: number; a: number; ph: number }[] = [];
  const SP = 30;
  let k = 0;
  for (let gy = -1950; gy <= 1950; gy += SP) {
    for (let gx = -1250; gx <= 1250; gx += SP) {
      const x = gx + (rand(k * 1.37) - 0.5) * SP * 0.8;
      const y = gy + (rand(k * 2.91) - 0.5) * SP * 0.8;
      k++;
      if (Math.hypot(x, y) < 40) continue; // keep clear room around your dot
      out.push({ x, y, r: 2.2 + rand(k * 5.3) * 1.8, a: 0.2 + rand(k * 7.1) * 0.35, ph: rand(k * 3.3) * 6.28 });
    }
  }
  return out;
})();
const crowdScale = smoothKeys([[40.3, 2.6], [FLY_B, 1.35], [41.6, 1.0], [43.25, 0.82], [44.05, 7.0]]);
const LearnersField: React.FC<{ t: number }> = ({ t }) => {
  if (t < 40.4 || t > 44.1) return null;
  const o = dotOrigin(t);
  const fs = crowdScale(t);
  const op = prog(t, 40.45, 40.66, easeInOut) * (1 - prog(t, 43.5, 44.05, easeInOut));
  const dots: React.ReactNode[] = [];
  CROWD.forEach((d, i) => {
    const x = o.x + d.x * fs;
    const y = o.y + d.y * fs;
    if (x < -20 || x > 1100 || y < -20 || y > 1940) return;
    // keep the headline band readable
    const band = Math.max(0, 1 - Math.abs(y - 1010) / 150);
    const tw = 0.75 + 0.25 * Math.sin(t * 1.6 + d.ph);
    dots.push(<circle key={i} cx={x} cy={y} r={d.r * Math.min(1.6, Math.sqrt(fs))} fill="#2A2F45" opacity={d.a * tw * (1 - 0.75 * band)} />);
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      {dots}
    </svg>
  );
};

const Counter: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP || t > FLY_B + 0.02) return null;
  // critically damped count (no overshoot), lands exactly on 8,000 before the particles take over
  const cd = (tt: number) => {
    const x = Math.max(0, tt - (DROP + 0.1)) * 4.2;
    return 1 - (1 + x) * Math.exp(-x);
  };
  const p = t > 37.95 ? 1 : cd(t);
  const val = Math.round(p * 8000);
  const vel = (cd(t + 0.033) - cd(t)) * 8000;
  // particles gather over a dimmed number, then dissolve into the crisp solid text
  const dim = prog(t, 36.9, 37.3, easeInOut) * (1 - prog(t, 38.15, 38.55, easeInOut));
  const plus = prog(t, 38.3, 38.75, easeOutBack);
  const glint = prog(t, 38.6, 39.6, easeInOut);
  const blurY = Math.min(10, vel / 30);
  const inP = prog(t, DROP, DROP + 0.5, easeOutExpo);
  const zoomS = flyZoom(t);
  const zoomV = Math.abs(flyZoom(t + 1 / FPS) - zoomS) / Math.max(1, zoomS);
  const out = prog(t, FLY_B - 0.1, FLY_B, easeInOut);
  const sub1 = prog(t, 37.0, 37.7, easeOutExpo);
  const sub2 = prog(t, 37.25, 37.95, easeOutExpo);
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - out,
        transformOrigin: `${HOLE.x}px ${HOLE.y}px`,
        transform: `scale(${zoomS})`,
        filter: zoomV > 0.02 ? `blur(${Math.min(5, zoomV * 30)}px)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY - 40,
          transform: `translateY(-50%) scale(${lerp(1.3, 1, inP)})`,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 220,
          letterSpacing: "-0.055em",
          color: INK,
          fontVariantNumeric: "tabular-nums",
          opacity: inP * (1 - 0.7 * dim),
          textShadow: "0 18px 40px rgba(80,55,25,0.12)",
        }}
      >
        <span
          style={{
            filter: blurY > 0.3 ? `blur(${blurY * 0.3}px)` : undefined,
            display: "inline-block",
            backgroundImage: `linear-gradient(100deg, ${INK} ${glint * 150 - 50}%, ${BLUE} ${glint * 150 - 30}%, ${INK} ${glint * 150 - 10}%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {val.toLocaleString("en-US")}
        </span>
        <span style={{ display: "inline-block", color: BLUE, marginLeft: 6, transform: `scale(${plus})`, opacity: clamp(plus * 2) }}>+</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 120, textAlign: "center", fontFamily: SANS }}>
        <div style={{ fontSize: 50, fontWeight: 600, color: INK, letterSpacing: "-0.02em", opacity: sub1, transform: `translateY(${(1 - sub1) * 24}px)`, filter: `blur(${(1 - sub1) * 8}px)` }}>
          learners honoured at OPLA
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, color: "#8C877D", marginTop: 10, opacity: sub2, transform: `translateY(${(1 - sub2) * 24}px)`, filter: `blur(${(1 - sub2) * 8}px)` }}>
          in Bangladesh since 2012
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Particle formation: the burst swirls into "8,000+" (motion-particles) */
/* ================================================================== */
type Pt = { x: number; y: number; plus: boolean };
const FORM_TEXT = "8,000";
const Formation: React.FC<{ t: number }> = ({ t }) => {
  const [pts, setPts] = useState<Pt[]>([]);
  const [handle] = useState(() => delayRender("sample formation"));
  useLayoutEffect(() => {
    let done = false;
    const ready = async () => {
      // wait until the real face is usable, so no render tab ever samples a fallback font
      for (let k = 0; k < 50 && !document.fonts.check("800 220px Inter"); k++) {
        await document.fonts.load("800 220px Inter");
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    ready().then(() => {
      if (done) return;
      const c = document.createElement("canvas");
      c.width = 1080;
      c.height = 420;
      const ctx = c.getContext("2d")!;
      ctx.font = "800 220px Inter";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "-12px";
      ctx.textBaseline = "middle";
      const wNum = ctx.measureText(FORM_TEXT).width;
      const wPlus = ctx.measureText("+").width;
      const gap = 6;
      const left = CX - (wNum + gap + wPlus) / 2;
      ctx.fillStyle = "#000";
      ctx.fillText(FORM_TEXT, left, 210);
      ctx.fillText("+", left + wNum + gap, 210);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const out: Pt[] = [];
      const SP = 4.3;
      let k = 0;
      for (let y = 0; y < c.height; y += SP) {
        for (let x = 0; x < c.width; x += SP) {
          const jx = x + (rand(k * 1.3) - 0.5) * 1.6;
          const jy = y + (rand(k * 2.1) - 0.5) * 1.6;
          k++;
          const a = data[(Math.round(jy) * c.width + Math.round(jx)) * 4 + 3];
          if (a > 140) out.push({ x: jx, y: CY - 40 + (jy - 210), plus: jx > left + wNum + gap * 0.5 });
        }
      }
      setPts(out.slice(0, 2800));
      continueRender(handle);
    });
    return () => {
      done = true;
    };
  }, [handle]);
  if (t < DROP || t > 38.7 || !pts.length) return null;
  const fadeOut = 1 - prog(t, 38.2, 38.62, easeInOut);
  const R = 900;
  const pos = (tt: number, p: Pt, i: number) => {
    const a = rand(i * 3.17 + 0.5) * Math.PI * 2;
    const r = Math.pow(rand(i * 5.71 + 0.2), 0.7);
    const burst = easeOutExpo(clamp((tt - DROP) / 1.1)) * (1 + Math.max(0, tt - DROP) * 0.05);
    const bx = CX + Math.cos(a) * r * R * burst;
    const by = CY + Math.sin(a) * r * R * 1.5 * burst;
    const d = rand(i * 7.7) * 0.45;
    const g = prog(tt, 36.95 + d, 37.95 + d * 0.9, easeInOut);
    // swirl: arc in from the side instead of flying straight
    const dx = p.x - bx;
    const dy = p.y - by;
    const len = Math.hypot(dx, dy) || 1;
    const sw = Math.sin(Math.PI * g) * 110 * (i % 2 ? 1 : -1);
    let x = lerp(bx, p.x, g) + (-dy / len) * sw;
    let y = lerp(by, p.y, g) + (dx / len) * sw;
    const hold = g >= 1 ? 0.35 : 0;
    x += hold * Math.sin(tt * 2.1 + i);
    y += hold * Math.cos(tt * 1.7 + i * 0.7);
    const k = easeInExpo(clamp((tt - 40.25) / 0.75));
    return [lerp(x, CX, k), lerp(y, CY, k)];
  };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {pts.map((p, i) => {
        const [x1, y1] = pos(t, p, i);
        const [x0, y0] = pos(t - 1 / FPS, p, i);
        const r = 2.2;
        const col = p.plus ? BLUE : "#2A2F45";
        // streak alpha falls with its length, so fast particles read as light, not ink scribbles
        const len = Math.hypot(x1 - x0, y1 - y0);
        const op = 0.9 * Math.min(1, Math.sqrt(5 / Math.max(5, len))) * fadeOut;
        const w = len > 6 ? r * 1.1 : r * 2;
        return <line key={i} x1={x0} y1={y0} x2={x1 + 0.01} y2={y1} stroke={col} strokeWidth={w} strokeLinecap="round" opacity={op} />;
      })}
    </svg>
  );
};

/* ================================================================== */
/* Scene F — ending: blue dot → full stop of the title (40.9 – end)    */
/* ================================================================== */
const TITLE_AT = 47.69;
const TS = 156;
const TITLE_TOP = 860;
const SLOT = 34;
const SLOT_GAP = 8;
const Ending: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLSpanElement>(null);
  // Full-stop slot centre, measured once in a clean browser with the real Inter 800 file
  // ("Grades" = 507.4 px wide at 156 px, -0.05em). Fixed here so every render tab agrees
  // (measuring per tab made the dot alternate between two positions -> visible shake).
  const anchor = { x: 805.7, y: TITLE_TOP + TS + 125 };

  const show = t > 40.62;
  const dotIn = prog(t, 40.62, 40.85, easeOutExpo);
  const o = dotOrigin(t);
  // LOOP: zoom into the full stop until blue fills the frame (= frame 0 of the film)
  const loopZ = Math.exp(Math.log(260) * Math.pow(prog(t, 49.6, 50.62), 3));
  const fly = prog(t, TITLE_AT + 0.1, TITLE_AT + 0.75, easeInOut);
  const end = anchor;
  const arcY = -140 * Math.sin(Math.PI * fly);
  const dx = lerp(o.x, end.x, fly);
  const dy = lerp(o.y, end.y, fly) + arcY;
  const sweep = prog(t, TITLE_AT + 1.2, TITLE_AT + 2.2, easeInOut);
  const charReveal = (txt: string, at: number) =>
    txt.split("").map((ch, i) => {
      const cp = prog(t, at + i * 0.035, at + i * 0.035 + 0.8, easeOutExpo);
      return (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - cp) * TS * 1.15}px)`, opacity: clamp(cp * 1.8), filter: cp < 0.95 ? `blur(${(1 - cp) * 4}px)` : undefined }}>
          {ch}
        </span>
      );
    });
  const tags = prog(t, 48.6, 49.3, easeOutExpo);
  return (
    <AbsoluteFill data-root="1" style={{ transformOrigin: `${end.x}px ${end.y}px`, transform: `scale(${loopZ})` }}>
      {/* title */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: TITLE_TOP,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: TS,
          lineHeight: 1.0,
          letterSpacing: "-0.05em",
          color: INK,
        }}
      >
        <div style={{ overflow: "hidden", padding: "0.05em 0.2em 0.15em", margin: "-0.05em 0 -0.15em" }}>{charReveal("Beyond the", TITLE_AT)}</div>
        <div style={{ position: "relative", display: "inline-block" }}>
          {t < TITLE_AT + 1.2 ? (
            <span style={{ display: "inline-block", overflow: "hidden", padding: "0.05em 0 0.15em", margin: "-0.05em 0 -0.15em", verticalAlign: "bottom" }}>{charReveal("Grades", TITLE_AT + 0.3)}</span>
          ) : (
          <span
            style={{
              display: "inline-block",
              backgroundImage: `linear-gradient(100deg, ${INK} ${sweep * 150 - 50}%, ${BLUE} ${sweep * 150 - 30}%, ${INK} ${sweep * 150 - 10}%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Grades
          </span>
          )}
          <span ref={ref} style={{ display: "inline-block", width: SLOT, height: SLOT, marginLeft: SLOT_GAP, verticalAlign: "baseline" }} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: "0em", color: "#8C877D", marginTop: 60, lineHeight: 1.6, opacity: tags, transform: `translateY(${(1 - tags) * 20}px)` }}>
          #OPLA2026&nbsp;&nbsp;#BeyondTheGrades
          <br />
          #PearsonLearnerCreator
        </div>
      </div>
      {show && <Dot x={dx} y={dy} r={14 * dotIn} color={BLUE} glow={1.5} />}
      <Ripple t={t} at={40.95} x={dotOrigin(40.95).x} y={dotOrigin(40.95).y} color={BLUE} size={200} />
      <Ripple t={t} at={42.2} x={CX} y={CY} color={BLUE} size={160} />
      <Ripple t={t} at={TITLE_AT + 0.75} x={end.x} y={end.y} color={BLUE} size={170} />
      <Sparkles t={t} at={TITLE_AT + 0.75} x={end.x} y={end.y} color={BLUE} n={12} spread={220} seed={5} />
    </AbsoluteFill>
  );
};


/* ================================================================== */
/* Foreground depth: big, soft, out-of-focus symbols drifting past      */
/* the lens near the frame edges (never behind the headline band).      */
/* ================================================================== */
type Fg = [number, number, string, number, number, number, number, number, string];
// [from, to, glyph, x, y, vx (px/s), vy, size, colour]
const FG: Fg[] = [
  [9.7, 15.3, "∫", 110, 300, 26, -10, 380, INK],
  [9.7, 15.3, "π", 960, 1660, -30, -8, 340, BLUE],
  [10.1, 14.6, "Σ", 990, 330, -18, 12, 300, INK],
  [10.1, 14.6, "x²", 70, 1690, 22, -14, 260, BLUE],
  [14.7, 21.3, "{ }", 120, 1660, 24, -12, 300, BLUE],
  [14.7, 21.3, "</>", 950, 290, -26, 10, 260, INK],
  [15.8, 21.3, ";", 1000, 1700, -20, -16, 360, INK],
  [15.8, 21.3, "( )", 90, 300, 20, 14, 280, INK],
  [21.9, 26.5, "○", 980, 1680, -22, -10, 380, BLUE],
  [21.9, 26.5, "+", 80, 330, 26, 12, 360, INK],
  [27.3, 35.2, "●", 990, 1640, -16, -14, 300, BLUE],
  [27.3, 35.2, "○", 70, 260, 18, 10, 340, INK],
];
const Foreground: React.FC<{ t: number }> = ({ t }) => {
  const depth = 1 + (camScale(t) - 1) * 2.4; // nearer than the scene: moves more with the camera
  return (
    <AbsoluteFill style={{ pointerEvents: "none", transformOrigin: `${CX}px ${CY}px`, transform: `scale(${depth})` }}>
      {FG.map(([a, b, g, x, y, vx, vy, size, col], i) => {
        if (t < a || t > b) return null;
        const env = prog(t, a, a + 0.7, easeInOut) * (1 - prog(t, b - 0.7, b, easeInOut));
        const dt = t - a;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + vx * dt,
              top: y + vy * dt,
              transform: "translate(-50%, -50%)",
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: size,
              lineHeight: 1,
              color: col,
              opacity: 0.1 * env,
              filter: "blur(12px)",
              whiteSpace: "nowrap",
            }}
          >
            {g}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== */
export const V1: React.FC = () => {
  const frame = useCurrentFrame();
  // beat-synced story clock (see scripts/audio/beatalign.py)
  const t = warpT(frame / FPS);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("audio/mix-v1.wav")} />
      <Backdrop t={t} />
      <Ambience t={t} tint={BLUE} />
      <Camera t={t}>
        <WaveScene t={t} />
        <BraceScene t={t} />
        <PhoneCorridor t={t} />
        <Phone t={t} />
        <Pathway t={t} />
        <LearnersField t={t} />
        <Starfield t={t} />
        <Counter t={t} />
        <Formation t={t} />
        <Ending t={t} />
        <Sparkles t={t} at={38.4} x={880} y={CY - 50} color={BLUE} n={10} spread={170} seed={4} />
      </Camera>
      <Foreground t={t} />
      {/* headlines float on their own layer (subtle counter-parallax) */}
      <AbsoluteFill style={{ transform: `translateY(${(camScale(t) - 1) * -40}px)` }}>
        {/* giant "dot." slams in, then flies into its slot in the sentence (measured: scripts in scratch, Inter 700 84px) */}
        <GiantWord t={t} word="dot." color={BLUE} size={84} weight={700} from={{ x: CX, y: 1000, scale: 3.6 }} to={{ x: 651.73, y: 1332.42 }} inAt={0.5} moveAt={1.2} until={3.7} />
        <Kinetic t={t} text="Every big thing|starts as one|small *dot.*" inAt={1.15} outAt={3.85} accent={BLUE} y={TY} hideWord="dot." hideUntil={3.7} />
        <SlidingLine t={t} />
        <Kinetic t={t} text="Maths taught me|to see [wave] *patterns.*" inAt={9.9} outAt={14.15} accent={BLUE} y={TY} />
        <Kinetic t={t} text="Patterns taught me|to [code] *code.*" inAt={16.55} outAt={20.9} accent={BLUE} y={TY} />
        <Kinetic t={t} text="Code taught me|to [phone] *build.*" inAt={21.95} outAt={26.4} accent={BLUE} y={TY + 70} />
        <Kinetic t={t} text="With Pearson Edexcel,|every step|leads *somewhere.*" inAt={32.4} outAt={35.15} accent={BLUE} y={TY + 70} size={72} />
        <SelectBox t={t} at={33.7} until={35.1} x={432.48} y={1348.91} w={410.33} h={79.19} color={BLUE} />
        <Kinetic t={t} text="This year,|I'm *one of them.*" inAt={41.06} outAt={43.2} accent={BLUE} y={1010} />
        <Kinetic t={t} text="Your dot|is *waiting.*" inAt={43.5} outAt={45.55} accent={BLUE} y={1010} />
        <Kinetic t={t} text="Start small.|Keep *going.*" inAt={45.9} outAt={47.1} accent={BLUE} y={1010} />
      </AbsoluteFill>
      <Flash t={t} at={DROP} color="#FFFFFF" peak={0.45} dur={0.6} />
      <FilmLook />
    </AbsoluteFill>
  );
};
