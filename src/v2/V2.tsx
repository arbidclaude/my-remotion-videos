import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import "../premium/fonts";
import { MONO, SANS } from "../premium/fonts";
import { Ambience, Decode, Flash, FilmLook, INK, Kinetic, Orb, PAPER, Sparkles } from "../premium/components";
import { FPS, clamp, easeInExpo, easeInOut, easeOut, easeOutBack, easeOutExpo, lerp, mixColor, prog, rand, smoothKeys } from "../premium/lib";

export const V2_DURATION = 54;

const BG = PAPER;
const WHITE = INK; // ink on paper
const RED = "#E8364F";
const GREEN = "#13B26B";
const YELLOW = "#E3A008";
const ORANGE = "#EE7430";
const TY = 1335;

/* ================================================================== */
/* Story data                                                           */
/* ================================================================== */
const WW = 2600; // world width of the whole journey
const HH = 760; // world height of score 0..60

// where the line head is along the journey (0..1) over time
const headX = smoothKeys([
  [4.4, 0], [8.9, 0.12], [13.8, 0.3], [17.0, 0.41], [20.6, 0.47], [22.2, 0.48], [23.8, 0.505],
  [25.96, 0.55], [35.4, 0.8], [42.6, 0.965], [43.1, 1.0],
]);
const baseScore = smoothKeys([
  [0, 52], [0.12, 55], [0.2, 50], [0.3, 43], [0.36, 29], [0.42, 14], [0.48, 8], [0.52, 9.5],
  [0.6, 20], [0.7, 32], [0.8, 42], [0.88, 50], [0.95, 56], [1.0, 59],
]);
const score = (x: number) => {
  let s = baseScore(x);
  if (x > 0.12 && x < 0.32) {
    const u = (x - 0.12) / 0.2;
    s += 3.4 * Math.sin(u * Math.PI * 2 * 4.5) * Math.sin(Math.PI * u);
  }
  if (x > 0.3 && x < 0.42) {
    const u = (x - 0.3) / 0.12;
    s += 1.1 * Math.sin(u * Math.PI * 2 * 7) * Math.sin(Math.PI * u);
  }
  return s;
};
const WX = (x: number) => x * WW;
const WY = (s: number) => ((60 - s) / 60) * HH;

const STOPS: [number, string][] = [
  [0, "#3A3D47"], [0.12, "#3A3D47"], [0.21, "#EF6A82"], [0.3, RED], [0.49, RED], [0.535, GREEN], [0.79, GREEN], [0.88, "#FFB347"], [1, YELLOW],
];
const colorAt = (x: number) => {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (x <= b) return mixColor(ca, cb, clamp((x - a) / (b - a)));
  }
  return YELLOW;
};

/* chapter tint for the room light */
const TINTS: [number, string][] = [
  [0, "#F4EEE4"], [8.6, "#F4EEE4"], [9.4, "#FBE6E6"], [13.6, "#FBE6E6"], [14.2, "#F8D8DC"], [20.4, "#F6E3E3"],
  [21.4, "#DDF3E6"], [35.3, "#DDF3E6"], [35.9, "#FDE8D6"], [42.6, "#FDE8D6"], [43.2, "#FFF0C8"], [54, "#F7EFDF"],
];
const tintAt = (t: number) => {
  for (let i = 0; i < TINTS.length - 1; i++) {
    const [a, ca] = TINTS[i];
    const [b, cb] = TINTS[i + 1];
    if (t <= b) return mixColor(ca, cb, easeInOut(clamp((t - a) / (b - a))));
  }
  return TINTS[TINTS.length - 1][1];
};

/* ================================================================== */
/* Chart camera (custom projection: separate x / y zoom)               */
/* ================================================================== */
const REVEAL = 45.28;
const reveal = (t: number) => prog(t, REVEAL, REVEAL + 1.35, easeInOut);
const intro = (t: number) => prog(t, 3.95, 4.75, easeOutExpo);

const project = (t: number) => {
  const r = reveal(t);
  const hx = headX(t);
  const hy = WY(score(hx));
  const zx0 = lerp(1.5, 1.0, intro(t));
  const zx = lerp(zx0, 960 / WW, r);
  const zy = lerp(lerp(1.2, 0.95, intro(t)), 1.0, r);
  const camX = lerp(WX(hx), WW / 2, r);
  const camY = lerp(lerp(HH / 2, hy, 0.55), HH / 2, r);
  const ax = lerp(690, 540, r);
  const ay = lerp(700, 760, r);
  return {
    sx: (X: number) => (X - camX) * zx + ax,
    sy: (Y: number) => (Y - camY) * zy + ay,
    zx,
    zy,
    r,
  };
};

/* ================================================================== */
/* Chart                                                               */
/* ================================================================== */
const Pad: React.FC<{ x: number; y: number; s?: number; color: string; rot?: number; op?: number }> = ({ x, y, s = 1, color, rot = 0, op = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`} opacity={op}>
    <path d="M-38,-14 Q-40,-24 -26,-24 L26,-24 Q40,-24 38,-14 L44,14 Q46,30 30,26 L18,14 L-18,14 L-30,26 Q-46,30 -44,14 Z" fill={color} />
    <rect x={-27} y={-10} width={14} height={4} rx={2} fill="#0B0D10" />
    <rect x={-22} y={-15} width={4} height={14} rx={2} fill="#0B0D10" />
    <circle cx={20} cy={-10} r={3.5} fill="#0B0D10" />
    <circle cx={28} cy={-3} r={3.5} fill="#0B0D10" />
  </g>
);

const Chart: React.FC<{ t: number }> = ({ t }) => {
  if (t < 3.9) return null;
  const P = project(t);
  const hx = headX(t);
  const N = 320;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = (hx * i) / N;
    pts.push([P.sx(WX(x)), P.sy(WY(score(x)))]);
  }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const base = P.sy(WY(0));
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;
  const [hxS, hyS] = pts[pts.length - 1];
  const headCol = colorAt(hx);
  const op = prog(t, 3.95, 4.6) * (1 - prog(t, 51.0, 51.8) * 0.72);
  const dimBlur = prog(t, 51.0, 51.8) * 3;
  const gx1 = P.sx(0);
  const gx2 = P.sx(WW);
  const top = P.sy(WY(60));

  // grid
  const grid: React.ReactNode[] = [];
  for (let i = 0; i <= 20; i++) {
    const X = P.sx((WW * i) / 20);
    if (X < -50 || X > 1130) continue;
    grid.push(<line key={`v${i}`} x1={X} x2={X} y1={top} y2={base} stroke={INK} strokeOpacity={0.06} />);
  }
  for (let s = 0; s <= 50; s += 10) {
    const Y = P.sy(WY(s));
    grid.push(<line key={`h${s}`} x1={-20} x2={1100} y1={Y} y2={Y} stroke={INK} strokeOpacity={s === 0 ? 0.16 : 0.06} />);
  }

  // milestones (placed where the head was at that moment)
  const mk = (at: number) => {
    const x = headX(at);
    return { x: P.sx(WX(x)), y: P.sy(WY(score(x))) };
  };
  const tipAt = [26.0, 28.37, 30.79];
  const proAt = 33.2;
  const famAt = 35.62;
  const ctrlIn = prog(t, 11.47, 11.9, easeOutBack);
  const ctrlOut = prog(t, 13.7, 14.1, easeInExpo);
  const lbl = (at: number) => prog(t, at, at + 0.7, easeOutExpo);
  const pulse = (period: number, at: number) => {
    if (t < at) return 0;
    return ((t - at) % period) / period;
  };
  const asthma = t > 14.0 && t < 21.0;
  const hb = pulse(0.85, 14.1);
  const target = { x: P.sx(WX(1.0) + 180), y: P.sy(WY(60)) };
  const ext = prog(t, 49.2, 50.2, easeInOut);

  return (
    <AbsoluteFill style={{ opacity: op, filter: dimBlur > 0.1 ? `blur(${dimBlur}px)` : undefined, transform: `scale(${lerp(0.9, 1, intro(t))})`, transformOrigin: "690px 700px" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="lg" gradientUnits="userSpaceOnUse" x1={gx1} x2={gx2} y1={0} y2={0}>
            {STOPS.map(([o, c], i) => (
              <stop key={i} offset={o} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id="fadeV" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.9} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fadeH" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.08" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.92" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="areaMask" maskUnits="userSpaceOnUse" x={-200} y={top - 100} width={1500} height={base - top + 200}>
            <rect x={-200} y={top} width={1500} height={base - top} fill="url(#fadeV)" />
          </mask>
          <linearGradient id="sf" gradientUnits="userSpaceOnUse" x1={gx1} x2={gx1 + 320} y1={0} y2={0}>
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="1" stopColor="#fff" stopOpacity={1} />
          </linearGradient>
          <mask id="startFade" maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={6000} height={6000}>
            <rect x={-2000} y={-2000} width={6000} height={6000} fill="url(#sf)" />
          </mask>
          <mask id="edge" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
            <rect x={0} y={0} width={1080} height={1920} fill="url(#fadeH)" />
          </mask>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <g mask="url(#edge)">
          {grid}
          {/* 60/60 target line */}
          <line x1={-20} x2={1100} y1={top} y2={top} stroke={YELLOW} strokeOpacity={0.35 + P.r * 0.3} strokeDasharray="10 10" strokeWidth={2} />
          <g mask="url(#startFade)">
            <path d={area} fill="url(#lg)" opacity={0.15 * clamp(hx * 9)} mask="url(#areaMask)" />
          </g>
          <path d={line} fill="none" stroke="url(#lg)" strokeWidth={14} opacity={0.22} filter="url(#glow)" />
          <path d={line} fill="none" stroke="url(#lg)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* distraction: controllers */}
        {t > 11.4 && t < 14.2 &&
          [0, 1, 2].map((i) => {
            const p = prog(t, 11.47 + i * 0.12, 11.9 + i * 0.12, easeOutBack);
            const bob = Math.sin(t * 4 + i) * 6;
            return (
              <Pad
                key={i}
                x={hxS - 60 + i * 70}
                y={hyS - 150 - i * 26 + bob - (1 - p) * 60}
                s={0.9 * p}
                rot={-12 + i * 12}
                color={i === 1 ? RED : "#B9BDC7"}
                op={p * (1 - ctrlOut) * ctrlIn}
              />
            );
          })}

        {/* asthma heartbeat rings at the head */}
        {asthma &&
          [0, 0.5].map((o, i) => {
            const ph = (hb + o) % 1;
            return <circle key={i} cx={hxS} cy={hyS} r={14 + ph * 90} fill="none" stroke={RED} strokeOpacity={(1 - ph) * 0.55 * (1 - prog(t, 20.2, 21))} strokeWidth={2} />;
          })}

        {/* turning point ring */}
        {t > 22.0 && t < 25.5 && (
          <circle cx={hxS} cy={hyS} r={20 + (1 - prog(t, 23.4, 24.2, easeOutExpo)) * 50} fill="none" stroke={GREEN} strokeOpacity={0.6 * (1 - prog(t, 24.6, 25.4))} strokeWidth={2} />
        )}

        {/* tip markers */}
        {tipAt.map((at, i) => {
          if (t < at) return null;
          const m = mk(at);
          const p = prog(t, at, at + 0.5, easeOutBack);
          return (
            <g key={i} transform={`translate(${m.x},${m.y - 46})`} opacity={clamp(p * 2) * (1 - P.r * 0.6)}>
              <line x1={0} y1={18} x2={0} y2={46} stroke={GREEN} strokeOpacity={0.5} strokeWidth={2} />
              <circle r={18 * p} fill={GREEN} />
              <text y={7} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={18} fontWeight={500} fill="#FFFFFF">
                {i + 1}
              </text>
            </g>
          );
        })}
        {t > proAt &&
          (() => {
            const m = mk(proAt);
            const p = prog(t, proAt, proAt + 0.5, easeOutBack);
            return (
              <g transform={`translate(${m.x},${m.y - 70})`} opacity={clamp(p * 2) * (1 - P.r * 0.6)}>
                <circle r={20 * p} fill={YELLOW} />
                <circle r={34 * p} fill="none" stroke={YELLOW} strokeOpacity={0.3} />
                <text y={8} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={22} fill="#FFFFFF">
                  !
                </text>
              </g>
            );
          })()}
        {t > famAt &&
          (() => {
            const m = mk(famAt);
            return (
              <g opacity={1 - P.r * 0.5}>
                {[0, 1, 2].map((i) => {
                  const p = prog(t, famAt + i * 0.1, famAt + 0.5 + i * 0.1, easeOutBack);
                  const a = (-120 + i * 50) * (Math.PI / 180);
                  const rr = 52;
                  const x = m.x + Math.cos(a) * rr;
                  const y = m.y + 40 + Math.sin(a) * -rr * -1;
                  return (
                    <g key={i}>
                      <line x1={m.x} y1={m.y} x2={lerp(m.x, x, p)} y2={lerp(m.y, y, p)} stroke={ORANGE} strokeOpacity={0.4} />
                      <circle cx={lerp(m.x, x, p)} cy={lerp(m.y, y, p)} r={7 * p} fill={ORANGE} />
                    </g>
                  );
                })}
                <text x={m.x} y={m.y + 104} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={20} fill={ORANGE} opacity={lbl(famAt + 0.3)} letterSpacing={2}>
                  FAMILY
                </text>
              </g>
            );
          })()}

        {/* reveal labels */}
        {P.r > 0.5 &&
          (
            [
              [0.22, "GAMING", RED, -1, 46.0],
              [0.48, "ASTHMA", RED, 1, 46.15],
              [0.85, "FREEDOM", ORANGE, -1, 46.3],
            ] as [number, string, string, number, number][]
          ).map(([x, label, col, side, at]) => {
            const px = P.sx(WX(x));
            const py = P.sy(WY(score(x)));
            const p = lbl(at);
            return (
              <text
                key={label}
                x={px + (side < 0 ? 22 : 0)}
                y={py + side * 52 + (1 - p) * 16}
                textAnchor={side < 0 ? "start" : "middle"}
                fontFamily="JetBrains Mono"
                fontWeight={500}
                fontSize={26}
                letterSpacing={3}
                fill={col}
                opacity={p}
              >
                {label}
              </text>
            );
          })}
        {P.r > 0.5 && (
          <text x={hxS - 30} y={hyS + 50} textAnchor="end" fontFamily="JetBrains Mono" fontWeight={500} fontSize={34} fill={YELLOW} opacity={lbl(46.45)}>
            59/60
          </text>
        )}

        {/* your turn: dashed extension to the 60 */}
        {t > 49.0 && (
          <g>
            <line x1={hxS} y1={hyS} x2={lerp(hxS, target.x, ext)} y2={lerp(hyS, target.y, ext)} stroke={YELLOW} strokeWidth={3} strokeDasharray="10 9" strokeDashoffset={-t * 30} />
            <g transform={`translate(${target.x},${target.y}) rotate(${t * 40})`} opacity={prog(t, 49.8, 50.3)}>
              <circle r={26 * prog(t, 49.8, 50.4, easeOutBack)} fill="none" stroke={YELLOW} strokeWidth={3} strokeDasharray="8 7" />
            </g>
            <circle cx={target.x} cy={target.y} r={60 * prog(t, 50.2, 51.2, easeOutExpo)} fill="none" stroke={YELLOW} strokeOpacity={1 - prog(t, 50.2, 51.2)} />
          </g>
        )}

        {/* head */}
        <circle cx={hxS} cy={hyS} r={26} fill={headCol} opacity={0.3} filter="url(#glow)" />
        <circle cx={hxS} cy={hyS} r={14 + 4 * Math.sin(t * 4)} fill="none" stroke={headCol} strokeOpacity={0.35} strokeWidth={1.5} />
        <circle cx={hxS} cy={hyS} r={9 * prog(t, 4.35, 4.75, easeOutBack)} fill={headCol} />
        <circle cx={hxS} cy={hyS} r={4} fill="#fff" opacity={0.9} />
        {/* summit burst */}
        {t > 42.86 && t < 44.4 && (
          <g>
            {[0, 1].map((i) => {
              const p = prog(t, 42.86 + i * 0.15, 44.0 + i * 0.15, easeOutExpo);
              return <circle key={i} cx={hxS} cy={hyS} r={10 + p * 160} fill="none" stroke={YELLOW} strokeWidth={3 - i} strokeOpacity={1 - p} />;
            })}
            {new Array(14).fill(0).map((_, i) => {
              const p = prog(t, 42.86, 43.7, easeOutExpo);
              const a = (i / 14) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={hxS + Math.cos(a) * (20 + p * 50)}
                  y1={hyS + Math.sin(a) * (20 + p * 50)}
                  x2={hxS + Math.cos(a) * (30 + p * 95)}
                  y2={hyS + Math.sin(a) * (30 + p * 95)}
                  stroke={YELLOW}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={1 - p}
                />
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* HUD / overlays                                                      */
/* ================================================================== */
const CHAPTERS: [number, string, string][] = [
  [4.6, "01", "TALENT"],
  [9.06, "02", "DISTRACTION"],
  [13.89, "03", "ASTHMA"],
  [21.13, "04", "TURNING POINT"],
  [25.96, "05", "THE CLIMB"],
  [35.62, "06", "FREEDOM"],
  [42.86, "07", "RESULTS"],
  [48.9, "08", "YOUR TURN"],
];
const CH_COL = ["#5B6070", RED, RED, GREEN, GREEN, ORANGE, YELLOW, YELLOW];
const chapterIdx = (t: number) => {
  let idx = 0;
  CHAPTERS.forEach(([at], i) => {
    if (t >= at) idx = i;
  });
  return idx;
};

const ChapterLabel: React.FC<{ t: number }> = ({ t }) => {
  if (t < 4.6 || t > 51.2) return null;
  let idx = 0;
  CHAPTERS.forEach(([at], i) => {
    if (t >= at) idx = i;
  });
  const [at, num, name] = CHAPTERS[idx];
  const out = prog(t, 50.8, 51.2);
  const line = prog(t, at, at + 0.6, easeOutExpo);
  return (
    <div style={{ position: "absolute", left: 80, top: 230, opacity: 1 - out }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: "#6B6F7A", display: "flex", gap: 16, alignItems: "center" }}>
        <Decode t={t} text={num} at={at} dur={0.3} style={{ color: CH_COL[idx], fontWeight: 500 }} />
        <span style={{ width: 36 * line, height: 2, background: CH_COL[idx], display: "inline-block", opacity: 0.8 }} />
        <Decode t={t} text={name} at={at + 0.08} dur={0.55} />
      </div>
      <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: "#9A968E" }}>
        SCORE <span style={{ color: YELLOW, marginLeft: 10 }}>60 / 60</span>
      </div>
    </div>
  );
};

const Terminal: React.FC<{ t: number }> = ({ t }) => {
  if (t < 11.4 || t > 14.2) return null;
  const out = prog(t, 13.7, 14.1, easeInExpo);
  const lines = [11.5, 12.1, 12.7, 13.2];
  const txt = "> JUST ONE MORE MATCH";
  return (
    <div style={{ position: "absolute", left: 80, top: 330, fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: RED, opacity: 1 - out, filter: out ? `blur(${out * 8}px)` : undefined }}>
      {lines.map((at, i) => {
        if (t < at) return null;
        const n = Math.floor(clamp((t - at) / 0.42) * txt.length);
        const cursor = n < txt.length || i === lines.length - 1;
        return (
          <div key={i} style={{ opacity: 0.55 + 0.45 * (i === lines.length - 1 ? 1 : 0.6), textShadow: `0 4px 14px ${RED}33` }}>
            {txt.slice(0, n)}
            {cursor && Math.floor(t * 4) % 2 === 0 && <span style={{ background: RED, color: RED }}>_</span>}
          </div>
        );
      })}
    </div>
  );
};

/* tip card with swapping content */
const TIPS: [number, number, string, string, string, string][] = [
  [26.0, 28.15, "TIP 01", "Past papers,|again and again.", GREEN, "doc"],
  [28.37, 30.55, "TIP 02", "Used AI to explain|anything I didn't understand.", GREEN, "spark"],
  [30.79, 32.95, "TIP 03", "Locked in when|the exam got close.", GREEN, "clock"],
  [33.2, 35.35, "PRO TIP", "Lock in earlier|than I did.", YELLOW, "bolt"],
];
const Icon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  const s = { stroke: color, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "doc")
    return (
      <svg width={44} height={44} viewBox="0 0 44 44">
        <rect x={9} y={6} width={24} height={32} rx={4} {...s} />
        <path d="M15 15h12M15 21h12M15 27h8" {...s} />
      </svg>
    );
  if (kind === "spark")
    return (
      <svg width={44} height={44} viewBox="0 0 44 44">
        <path d="M22 6 L25.5 18.5 L38 22 L25.5 25.5 L22 38 L18.5 25.5 L6 22 L18.5 18.5 Z" {...s} fill={color} />
      </svg>
    );
  if (kind === "clock")
    return (
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={22} cy={23} r={14} {...s} />
        <path d="M22 15v8l5 4M18 5h8" {...s} />
      </svg>
    );
  return (
    <svg width={44} height={44} viewBox="0 0 44 44">
      <path d="M25 5 L11 25 h10 l-3 14 l15 -21 h-10 z" {...s} fill={color} />
    </svg>
  );
};

const TipCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < 25.9 || t > 35.7) return null;
  const cardIn = prog(t, 25.96, 26.5, easeOutExpo);
  const cardOut = prog(t, 35.2, 35.6, easeInExpo);
  let cur = 0;
  TIPS.forEach((tp, i) => {
    if (t >= tp[0] - 0.05) cur = i;
  });
  const [, , label, text, col] = TIPS[cur];
  const accentIsYellow = col === YELLOW;
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        right: 110,
        top: TY - 95,
        height: 190,
        borderRadius: 34,
        background: "linear-gradient(180deg, #FFFFFF, #FCF8F2)",
        border: `1.5px solid ${accentIsYellow ? "rgba(227,160,8,0.35)" : "rgba(60,45,30,0.08)"}`,
        boxShadow: `0 34px 80px rgba(90,60,25,0.16), 0 8px 22px rgba(90,60,25,0.08), 0 0 60px ${col}${accentIsYellow ? "22" : "10"}`,
        opacity: cardIn * (1 - cardOut),
        transform: `translateY(${(1 - cardIn) * 50 + cardOut * 30}px) scale(${lerp(0.94, 1, cardIn)})`,
        filter: cardOut ? `blur(${cardOut * 10}px)` : undefined,
        overflow: "hidden",
      }}
    >
      {TIPS.map(([a, b, lab, txt, c, icon], i) => {
        const pin = i === 0 ? 1 : prog(t, a, a + 0.55, easeOutExpo);
        const pout = i === TIPS.length - 1 ? 0 : prog(t, b, b + 0.35, easeInExpo);
        if (pin <= 0 || pout >= 1) return null;
        return (
          <div key={i} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 34, padding: "0 40px", opacity: pin * (1 - pout), transform: `translateY(${(1 - pin) * 60 - pout * 60}px)`, filter: `blur(${(1 - pin) * 10 + pout * 10}px)` }}>
            <div style={{ width: 108, height: 108, borderRadius: 28, background: `${c}1F`, border: `1.5px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${lerp(0.6, 1, prog(t, a + 0.05, a + 0.6, easeOutBack))})` }}>
              <Icon kind={icon} color={c} />
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: c, marginBottom: 8 }}>{lab}</div>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 42, lineHeight: 1.18, letterSpacing: "-0.02em", color: WHITE }}>
                {txt.split("|").map((l, k) => (
                  <div key={k}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {/* keep label/text referenced for type narrowing */}
      <span style={{ display: "none" }}>{label + text}</span>
    </div>
  );
};

const Bubble: React.FC<{ t: number; at: number; outAt: number; who: string; text: string; color: string; x: number; y: number; size?: number }> = ({ t, at, outAt, who, text, color, x, y, size = 46 }) => {
  if (t < at || t > outAt + 0.5) return null;
  const p = prog(t, at, at + 0.55, easeOutBack);
  const o = prog(t, outAt, outAt + 0.4, easeInExpo);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: clamp(p * 1.5) * (1 - o), transform: `translateY(${(1 - p) * 30 - o * 20}px) scale(${lerp(0.8, 1, p)})`, transformOrigin: "0% 100%", filter: o ? `blur(${o * 8}px)` : undefined }}>
      {who && <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 3, color, marginBottom: 12, marginLeft: 6 }}>{who}</div>}
      <div style={{ display: "inline-block", padding: "20px 32px", borderRadius: 30, borderBottomLeftRadius: 8, background: "#FFFFFF", border: `1.5px solid ${color}40`, fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", color: WHITE, boxShadow: `0 24px 50px rgba(90,60,25,0.15), 0 6px 16px rgba(90,60,25,0.08)` }}>
        {text}
      </div>
    </div>
  );
};

/* Intro HUD */
const IntroHUD: React.FC<{ t: number }> = ({ t }) => {
  if (t > 4.3) return null;
  const out = prog(t, 3.7, 4.15, easeInExpo);
  const drain = prog(t, 2.35, 2.95, easeInOut);
  const hpCount = Math.round(lerp(10, 3, drain));
  const xp = prog(t, 0.4, 1.5, easeOutExpo) * 0.68;
  return (
    <div style={{ position: "absolute", left: 80, top: 230, opacity: 1 - out, transform: `scale(${1 + out * 0.6})`, transformOrigin: "0 0", filter: out ? `blur(${out * 12}px)` : undefined }}>
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: WHITE }}>
        <Decode t={t} text="PLAYER 1" at={0.15} dur={0.5} />
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 18, alignItems: "center" }}>
        {new Array(10).fill(0).map((_, i) => {
          const on = prog(t, 0.25 + i * 0.05, 0.4 + i * 0.05);
          const alive = i < hpCount;
          const col = drain > 0 ? (alive ? RED : "#E2DCD2") : GREEN;
          return <div key={i} style={{ width: 44, height: 22, borderRadius: 3, background: col, opacity: on, boxShadow: alive ? `0 0 12px ${col}88` : undefined }} />;
        })}
        <span style={{ fontFamily: MONO, fontSize: 20, color: drain > 0 ? RED : GREEN, marginLeft: 10 }}>HP</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
        <div style={{ width: 500, height: 6, borderRadius: 3, background: "#E6DFD3", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3, width: 500 * xp, background: YELLOW, boxShadow: `0 0 12px ${YELLOW}` }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 20, color: YELLOW, marginLeft: 16 }}>XP</span>
      </div>
    </div>
  );
};

const PressStart: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0.8 || t > 4.0) return null;
  const blink = Math.floor((t - 0.8) * 2.4) % 2 === 0 ? 1 : 0.25;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1560, textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 6, color: "#8C877D", opacity: blink * prog(t, 0.8, 1.2) * (1 - prog(t, 3.6, 3.95)) }}>
      ▶ PRESS START
    </div>
  );
};

/* Result counter */
const Result: React.FC<{ t: number }> = ({ t }) => {
  if (t < 43.2 || t > 47.7) return null;
  const p = prog(t, 43.3, 44.9, (x) => 1 - Math.pow(1 - x, 2.6));
  const val = Math.round(lerp(44, 59, p));
  const done = val >= 59;
  const land = prog(t, 44.9, 45.4, easeOutBack);
  const inP = prog(t, 43.2, 43.7, easeOutExpo);
  const out = prog(t, 47.2, 47.6, easeInExpo);
  const sub = prog(t, 44.95, 45.6, easeOutExpo);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TY - 140, textAlign: "center", opacity: inP * (1 - out), filter: out ? `blur(${out * 12}px)` : undefined }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
        <span style={{ fontSize: 250, color: done ? YELLOW : WHITE, display: "inline-block", fontVariantNumeric: "tabular-nums", transform: `scale(${done ? lerp(1.15, 1, land) : 1})`, textShadow: done ? `0 24px 60px ${YELLOW}55` : undefined }}>{val}</span>
        <span style={{ fontSize: 110, color: "#A6A198", marginLeft: 10 }}>/60</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 38, color: "#5E5B55", marginTop: 20, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>Outstanding Pearson Learner Award</div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: YELLOW, marginTop: 6, opacity: prog(t, 45.15, 45.8, easeOutExpo) }}>Mathematics</div>
    </div>
  );
};

/* Title */
const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < 51.2) return null;
  const tags = prog(t, 52.1, 52.8, easeOutExpo);
  return (
    <>
      <Kinetic t={t} text="Beyond the|*Grades.*" inAt={51.3} outAt={99} accent={YELLOW} y={1280} size={156} weight={800} stagger={0.1} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 34, color: "#8C877D", lineHeight: 1.6, opacity: tags, transform: `translateY(${(1 - tags) * 20}px)` }}>
        #OPLA2026&nbsp;&nbsp;#BeyondTheGrades
        <br />
        #PearsonLearnerCreator
      </div>
    </>
  );
};

/* ================================================================== */
/* Global camera (screen-level kicks + breathe)                        */
/* ================================================================== */
const KICKS = [1.81, 4.23, 11.47, 13.89, 21.13, 35.62, 42.86, 48.9, 51.3];
const kick = (t: number) => {
  let k = 0;
  for (const a of KICKS) {
    if (t >= a && t < a + 0.8) k += Math.exp(-(t - a) * 6) * (a === 35.62 || a === 42.86 ? 0.05 : 0.025);
  }
  return k;
};
const pushIn = smoothKeys([[0, 1.06], [3.7, 1.0], [13.89, 1.0], [20.6, 1.05], [21.4, 1.0], [45.2, 1.02], [46.8, 1.0], [54, 1.05]]);

export const V2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = pushIn(t) + kick(t);
  const tint = tintAt(t);
  const redPulse = t > 14 && t < 20.8 ? Math.exp(-(((t - 14.1) % 0.85) * 5)) * 0.35 * (1 - prog(t, 20, 20.8)) : 0;
  const shake = t > 35.62 && t < 36.1 ? (1 - (t - 35.62) / 0.48) * 10 : t > 42.86 && t < 43.3 ? (1 - (t - 42.86) / 0.44) * 12 : 0;
  const sx = shake * (rand(frame) - 0.5);
  const sy = shake * (rand(frame + 3) - 0.5);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("audio/mix-v2.wav")} />
      {/* room light */}
      <AbsoluteFill style={{ background: `radial-gradient(110% 70% at 60% 38%, ${tint} 0%, ${BG} 62%)` }} />
      <Orb x={760 + Math.sin(t * 0.2) * 120} y={700} r={700} color={`${tint}`} opacity={0.9} />
      <Ambience t={t} tint={CH_COL[chapterIdx(t)]} />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 260px rgba(232,54,79,${redPulse * 0.7})` }} />
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${s})`, transformOrigin: "540px 820px" }}>
        <Chart t={t} />
        <IntroHUD t={t} />
        <ChapterLabel t={t} />
        <Terminal t={t} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translate(${sx * 0.5}px, ${sy * 0.5}px)` }}>
        <Kinetic t={t} text="I was a gamer." inAt={0.3} outAt={3.7} accent={RED} y={TY - 60} size={96} weight={800} />
        <Kinetic t={t} text="Not a *studier.*" inAt={1.45} outAt={3.72} accent={RED} y={TY + 50} size={96} weight={800} />
        <PressStart t={t} />
        <Kinetic t={t} text="Maths always|came easy to me." inAt={4.6} outAt={6.4} accent={YELLOW} y={TY} />
        <Kinetic t={t} text="But talent alone|doesn't get you an *award.*" inAt={6.64} outAt={8.95} accent={YELLOW} y={TY} size={76} />
        <Kinetic t={t} text="I spent more time|*gaming* than studying." inAt={9.3} outAt={13.6} accent={RED} y={TY} size={78} />
        <Kinetic t={t} text="Then asthma|hit me *hard.*" inAt={14.15} outAt={16.95} accent={RED} y={TY} />
        <Kinetic t={t} text="I had to|slow down." inAt={17.25} outAt={20.6} accent={RED} y={TY} stagger={0.12} />
        <Bubble t={t} at={21.3} outAt={25.3} who="BEST FRIEND" text="You can do it." color={GREEN} x={500} y={390} />
        <Kinetic t={t} text="So I came back.|With *confidence.*" inAt={22.3} outAt={25.55} accent={GREEN} y={TY} />
        <TipCard t={t} />
        <Bubble t={t} at={35.7} outAt={37.75} who="FAMILY" text="You can do great." color={ORANGE} x={90} y={TY - 140} />
        <Bubble t={t} at={36.3} outAt={37.8} who="" text="Don't worry if you don't get 60." color={ORANGE} x={90} y={TY + 10} size={40} />
        <Kinetic t={t} text="No pressure.|Just *freedom.*" inAt={38.03} outAt={40.25} accent={ORANGE} y={TY} />
        <Kinetic t={t} text="And that freedom made|me want it even *more.*" inAt={40.45} outAt={42.7} accent={ORANGE} y={TY} size={76} />
        <Result t={t} />
        <Kinetic t={t} text="I got *59.*" inAt={47.69} outAt={48.8} accent={YELLOW} y={TY} size={100} weight={800} />
        <Kinetic t={t} text="Now you go|get the *60.*" inAt={48.95} outAt={50.95} accent={YELLOW} y={TY} size={96} weight={800} />
        <Title t={t} />
      </AbsoluteFill>
      <Flash t={t} at={1.81} color={RED} peak={0.08} dur={0.5} />
      <Sparkles t={t} at={44.95} x={470} y={TY - 40} color={YELLOW} n={14} spread={260} seed={4} />
      <Sparkles t={t} at={51.9} x={760} y={1340} color={YELLOW} n={12} spread={220} seed={6} />
      <Flash t={t} at={4.23} color="#FFFFFF" peak={0.5} dur={0.6} />
      <Flash t={t} at={35.62} color={ORANGE} peak={0.18} dur={0.6} />
      <Flash t={t} at={42.86} color="#FFE7A3" peak={0.5} dur={0.8} />
      <Flash t={t} at={48.9} color={YELLOW} peak={0.12} dur={0.5} />
      <FilmLook />
      <AbsoluteFill style={{ background: PAPER, opacity: (1 - prog(t, 0, 0.5, easeOut)) + prog(t, 53.4, 54) }} />
    </AbsoluteFill>
  );
};
