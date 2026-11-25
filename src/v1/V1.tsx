import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { measureText } from "@remotion/layout-utils";
import "../premium/fonts";
import { MONO, SANS } from "../premium/fonts";
import { Ambience, Flash, FilmLook, INK, Kinetic, Orb, PAPER, Sparkles } from "../premium/components";
import { FPS, clamp, easeInExpo, easeInOut, easeOut, easeOutBack, easeOutExpo, lerp, prog, rand, smoothKeys } from "../premium/lib";

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
  [33.8, 1.0], [36.15, 1.16], [36.6, 0.95], [40.1, 1.0], [40.95, 1.35], [41.6, 1.0],
  [47.4, 1.04], [48.1, 0.97], [50.7, 1.06],
]);
const camRot = smoothKeys([
  [0, -2.2], [3.9, 0], [9.5, 0], [10.3, 0.8], [14.3, 0], [15.05, -4], [15.8, 0], [26.4, 0], [27.0, 3.5],
  [27.6, 0], [40.1, 0], [40.95, -3], [41.6, 0], [50.7, 0],
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
      <Orb x={CX + Math.sin(t * 0.21) * 120} y={CY - 60 + Math.cos(t * 0.17) * 80} r={620} color="rgba(91,140,255,0.10)" opacity={pulse} />
      <Orb x={CX - 260 + Math.sin(t * 0.13) * 90} y={1380} r={520} color="rgba(255,170,110,0.16)" />
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
  const dotIn = prog(t, 0, 0.9, easeOutExpo);
  const toLeft = prog(t, 4.05, 4.9, easeInOut);
  let dx = lerp(CX, X0, toLeft);
  let dy = CY;
  if (t >= 5.6) {
    dx = penX;
    dy = headY;
  }
  const dotOp = (1 - prog(t, 9.7, 10.3)) + prog(t, 14.9, 15.2);
  const dotScale = lerp(0.2, 1, dotIn) * (1 + 0.12 * Math.sin(t * 5) * (t < 4 ? 1 : 0));
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
        <Dot x={dx} y={dy} r={11 * dotScale} color={t > 6 ? BLUE : INK} opacity={clamp(dotOp) * dotIn} />
      </div>
      <Ripple t={t} at={0.05} x={CX} y={CY} />
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
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Scene D — the pathway (27 – 36.2)                                   */
/* ================================================================== */
const STEPS = ["iPrimary", "iLowerSecondary", "International GCSE", "International A Level", "Universities worldwide"];
const NODE_T = [27.17, 28.38, 29.59, 30.8, 32.01];
const NX = 215;
const NY0 = 470;
const NGAP = 128;

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
            <Dot x={x} y={y} r={(isLast ? 11 : 8) * (i === 0 && t < at ? 1 : Math.max(0.2, p))} color={col} glow={isLast ? 1.4 : 0.7} />
            <Ripple t={t} at={at} x={n.x} y={n.y} color={col} size={isLast ? 160 : 90} />
            <div
              style={{
                position: "absolute",
                left: NX + 48,
                top: n.y,
                transform: `translate(${(1 - lp) * -30}px, -50%)`,
                fontFamily: SANS,
                fontWeight: isLast ? 700 : 600,
                fontSize: isLast ? 52 : 46,
                letterSpacing: "-0.02em",
                color: col,
                opacity: lp * (1 - labelsOut),
                filter: `blur(${(1 - lp) * 10 + labelsOut * 10}px)`,
                textShadow: isLast ? `0 0 30px ${BLUE}aa` : undefined,
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
  if (t < DROP - 0.02 || t > 41.2) return null;
  const pos = (tt: number) => {
    const burst = easeOutExpo(clamp((tt - DROP) / 1.2));
    const implode = easeInExpo(clamp((tt - 40.25) / 0.75));
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
      <line key={i} x1={x0} y1={y0} x2={x1 + 0.01} y2={y1} stroke={col} strokeWidth={size} strokeLinecap="round" opacity={(0.35 + s.z * 0.6) * tw} />
    );
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {lines}
    </svg>
  );
};

const Counter: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP || t > 40.8) return null;
  // critically damped count (no overshoot), lands exactly on 8,000 before the particles take over
  const cd = (tt: number) => {
    const x = Math.max(0, tt - (DROP + 0.1)) * 4.2;
    return 1 - (1 + x) * Math.exp(-x);
  };
  const p = t > 37.95 ? 1 : cd(t);
  const val = Math.round(p * 8000);
  const vel = (cd(t + 0.033) - cd(t)) * 8000;
  const handOver = prog(t, 37.75, 38.3, easeInOut);
  const blurY = Math.min(10, vel / 30);
  const inP = prog(t, DROP, DROP + 0.5, easeOutExpo);
  const out = prog(t, 40.0, 40.45, easeInExpo);
  const sub1 = prog(t, 37.0, 37.7, easeOutExpo);
  const sub2 = prog(t, 37.25, 37.95, easeOutExpo);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 16}px)` : undefined }}>
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
          opacity: inP * (1 - handOver),
          textShadow: "0 24px 60px rgba(91,140,255,0.22)",
        }}
      >
        <span style={{ filter: blurY > 0.3 ? `blur(${blurY * 0.3}px)` : undefined, display: "inline-block" }}>{val.toLocaleString("en-US")}</span>
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
    document.fonts.load("800 220px Inter").then(() => {
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
  if (t < DROP || t > 41.1 || !pts.length) return null;
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
  const gx = lerp(CX - 520, CX + 520, prog(t, 38.55, 39.55, easeInOut));
  const glintOn = t > 38.5 && t < 39.7;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {pts.map((p, i) => {
        const [x1, y1] = pos(t, p, i);
        const [x0, y0] = pos(t - 1 / FPS, p, i);
        const near = glintOn ? Math.max(0, 1 - Math.abs(x1 - gx) / 80) : 0;
        const r = 2.2 + near * 1.6;
        const col = p.plus ? BLUE : near > 0.3 ? "#3D63D9" : "#2A2F45";
        // streak alpha falls with its length, so fast particles read as light, not ink scribbles
        const len = Math.hypot(x1 - x0, y1 - y0);
        const op = 0.9 * Math.min(1, Math.sqrt(5 / Math.max(5, len)));
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
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [handle] = useState(() => delayRender("measure title"));
  useLayoutEffect(() => {
    let done = false;
    document.fonts.load(`800 ${TS}px Inter`).then(() => {
      if (done) return;
      const m = measureText({ text: "Grades", fontFamily: "Inter", fontWeight: "800", fontSize: TS, letterSpacing: "-0.05em", validateFontIsLoaded: true });
      const lineW = m.width + SLOT_GAP + SLOT;
      // line 2 is centred; the slot sits at its right end, on the baseline
      setAnchor({ x: CX + lineW / 2 - SLOT / 2, y: TITLE_TOP + TS + TS * 0.86 - SLOT / 2 });
      continueRender(handle);
    });
    return () => {
      done = true;
    };
  }, [handle]);

  const show = t > 40.5;
  const dotIn = prog(t, 40.55, 41.0, easeOutExpo);
  const fly = prog(t, TITLE_AT + 0.1, TITLE_AT + 0.75, easeInOut);
  const end = anchor ?? { x: 860, y: 1010 };
  const arcY = -140 * Math.sin(Math.PI * fly);
  const dx = lerp(CX, end.x, fly);
  const dy = lerp(CY, end.y, fly) + arcY;
  const beat = 1 + 0.08 * Math.exp(-((((t - 41.06) % 0.6037) + 0.6037) % 0.6037) * 6);
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
  const fadeEnd = prog(t, 50.2, 50.7);
  return (
    <AbsoluteFill data-root="1" style={{ opacity: 1 - fadeEnd }}>
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
      {show && <Dot x={dx} y={dy} r={14 * dotIn * (fly > 0 ? 1 : beat)} color={BLUE} glow={1.5} />}
      <Ripple t={t} at={40.95} x={CX} y={CY} color={BLUE} size={200} />
      <Ripple t={t} at={TITLE_AT + 0.75} x={end.x} y={end.y} color={BLUE} size={170} />
      <Sparkles t={t} at={TITLE_AT + 0.75} x={end.x} y={end.y} color={BLUE} n={12} spread={220} seed={5} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
export const V1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("audio/mix-v1.wav")} />
      <Backdrop t={t} />
      <Ambience t={t} tint={BLUE} />
      <Camera t={t}>
        <WaveScene t={t} />
        <BraceScene t={t} />
        <Phone t={t} />
        <Pathway t={t} />
        <Starfield t={t} />
        <Counter t={t} />
        <Formation t={t} />
        <Ending t={t} />
        <Sparkles t={t} at={38.4} x={880} y={CY - 50} color={BLUE} n={10} spread={170} seed={4} />
      </Camera>
      {/* headlines float on their own layer (subtle counter-parallax) */}
      <AbsoluteFill style={{ transform: `translateY(${(camScale(t) - 1) * -40}px)` }}>
        <Kinetic t={t} text="Every big thing|starts as one|small *dot.*" inAt={0.45} outAt={3.85} accent={BLUE} y={TY} />
        <Kinetic t={t} text="One question." inAt={4.35} outAt={5.75} accent={BLUE} y={TY} />
        <Kinetic t={t} text="One answer." inAt={6.04} outAt={7.0} accent={BLUE} y={TY} />
        <Kinetic t={t} text="One more *try.*" inAt={7.25} outAt={9.35} accent={BLUE} y={TY} />
        <Kinetic t={t} text="Maths taught me|to see *patterns.*" inAt={9.9} outAt={14.15} accent={BLUE} y={TY} />
        <Kinetic t={t} text="Patterns taught me|to *code.*" inAt={16.55} outAt={20.9} accent={BLUE} y={TY} />
        <Kinetic t={t} text="Code taught me|to *build.*" inAt={21.95} outAt={26.4} accent={BLUE} y={TY + 70} />
        <Kinetic t={t} text="With Pearson Edexcel,|every step|leads *somewhere.*" inAt={32.4} outAt={35.15} accent={BLUE} y={TY + 70} size={72} />
        <Kinetic t={t} text="This year,|I'm *one of them.*" inAt={41.06} outAt={43.2} accent={BLUE} y={1010} />
        <Kinetic t={t} text="Your dot|is *waiting.*" inAt={43.5} outAt={45.55} accent={BLUE} y={1010} />
        <Kinetic t={t} text="Start small.|Keep *going.*" inAt={45.9} outAt={47.1} accent={BLUE} y={1010} />
      </AbsoluteFill>
      <Flash t={t} at={DROP} color="#BCD0FF" peak={0.5} dur={0.8} />
      <Flash t={t} at={TITLE_AT + 0.75} color="#9DB6FF" peak={0.18} dur={0.6} />
      <FilmLook />
      <AbsoluteFill style={{ background: PAPER, opacity: 1 - prog(t, 0, 0.6, easeOut) }} />
    </AbsoluteFill>
  );
};
