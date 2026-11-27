import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import "../premium/fonts";
import timeline from "./timeline.json";

const warpT = makeWarp((timeline as { warp?: number[][] }).warp);
import { MONO, SANS } from "../premium/fonts";
import { Ambience, Cursor, Decode, Flash, FilmLook, GiantWord, INK, Kinetic, Orb, PAPER, SelectBox, Sparkles } from "../premium/components";
import { makeWarp, FPS, clamp, easeInExpo, easeInOut, easeOutBack, easeOutExpo, lerp, mixColor, prog, rand, smoothKeys } from "../premium/lib";

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
  [21.4, "#DDF3E6"], [35.3, "#DDF3E6"], [35.9, "#FDE8D6"], [42.6, "#FDE8D6"], [43.2, "#FFF0C8"], [52.6, "#F7EFDF"], [53.6, "#F4EEE4"], [54, "#F4EEE4"],
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
  const op = prog(t, 3.95, 4.6) * (1 - prog(t, 51.0, 51.8) * 0.72) * (1 - prog(t, 52.9, 53.4, easeInOut));
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
          {[0, 30].map((v) => (
            <text key={v} x={104} y={P.sy(WY(v)) - 10} fontFamily="JetBrains Mono" fontSize={28} fill={INK} opacity={0.45}>
              {v}
            </text>
          ))}
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
              <circle r={22 * p} fill={GREEN} />
              <text y={7} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={22} fontWeight={500} fill="#FFFFFF">
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
                <text x={m.x} y={m.y + 104} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={30} fill={ORANGE} opacity={lbl(famAt + 0.3)} letterSpacing={2}>
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
                fontSize={38}
                letterSpacing={3}
                fill={col}
                opacity={p}
              >
                {label}
              </text>
            );
          })}
        {P.r > 0.5 && (
          <text x={hxS - 30} y={hyS + 50} textAnchor="end" fontFamily="JetBrains Mono" fontWeight={500} fontSize={50} fill={YELLOW} opacity={lbl(46.45)}>
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

/* soft band of the chapter's colour sweeps across as the mood changes */
const ChapterSweep: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {CHAPTERS.map(([at], i) => {
      if (i === 0 || t < at || t > at + 1.0) return null;
      const p = easeInOut(clamp((t - at) / 1.0));
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: lerp(-700, 1500, p),
            top: -300,
            width: 520,
            height: 2600,
            transform: "rotate(18deg)",
            background: `linear-gradient(90deg, transparent, ${CH_COL[i]}24, transparent)`,
            opacity: Math.sin(Math.PI * p),
          }}
        />
      );
    })}
  </AbsoluteFill>
);

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
      <div style={{ fontSize: 44, letterSpacing: 4, color: "#5F636E", display: "flex", gap: 18, alignItems: "center" }}>
        <Decode t={t} text={num} at={at} dur={0.3} style={{ color: CH_COL[idx], fontWeight: 500 }} />
        <span style={{ width: 44 * line, height: 3, background: CH_COL[idx], display: "inline-block", opacity: 0.8 }} />
        <Decode t={t} text={name} at={at + 0.08} dur={0.55} />
      </div>
      <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 32, letterSpacing: 3, color: "#8A857C" }}>
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
    <div style={{ position: "absolute", left: 80, top: 350, fontFamily: MONO, fontSize: 34, letterSpacing: 2, color: RED, opacity: 1 - out, filter: out ? `blur(${out * 8}px)` : undefined }}>
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
  [26.0, 28.15, "TIP 01", "Studied in the|early mornings.", GREEN, "sun"],
  [28.37, 30.55, "TIP 02", "Used AI to explain|anything I didn't understand.", GREEN, "spark"],
  [30.79, 32.95, "TIP 03", "Locked in when|the exam got close.", GREEN, "clock"],
  [33.2, 35.35, "PRO TIP", "Lock in earlier|than I did.", YELLOW, "bolt"],
];
const Icon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  const s = { stroke: color, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "sun")
    return (
      <svg width={44} height={44} viewBox="0 0 44 44">
        <path d="M12 30a10 10 0 0 1 20 0" {...s} />
        <path d="M5 34h34M22 10v5M9.5 17.5l3.5 3.5M34.5 17.5L31 21M4 30h3M37 30h3" {...s} />
      </svg>
    );
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

const CARD = { left: 60, top: TY - 125, w: 960, h: 230 };
const FAN_A = 34.45;
const FAN_OUT = 35.3;
const TipFan: React.FC<{ t: number }> = ({ t }) => {
  if (t < FAN_A || t > 35.65) return null;
  const pose = [
    [-300, 40, -13, 14],
    [-100, 6, -4, 5],
    [100, 6, 4, -5],
    [300, 40, 13, -14],
  ];
  const out = prog(t, FAN_OUT, 35.6, easeInExpo);
  return (
    <AbsoluteFill style={{ perspective: 1200, perspectiveOrigin: `540px ${TY}px` }}>
      {TIPS.map(([, , lab, txt, c, icon], i) => {
        const p = prog(t, FAN_A + i * 0.05, FAN_A + 0.55 + i * 0.05, easeOutBack);
        const [px, py, rz, ry] = pose[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 - 190,
              top: TY - 80,
              width: 380,
              height: 170,
              borderRadius: 28,
              background: "linear-gradient(180deg, #FFFFFF, #FCF8F2)",
              border: `1.5px solid ${c === YELLOW ? "rgba(227,160,8,0.4)" : "rgba(60,45,30,0.1)"}`,
              boxShadow: "0 30px 60px rgba(90,60,25,0.18)",
              transform: `translate(${px * p}px, ${py * p - out * 160}px) rotateZ(${rz * p}deg) rotateY(${ry * p}deg) rotateX(${8 * p}deg) scale(${lerp(0.9, 1, p)})`,
              opacity: clamp(p * 2) * (1 - out),
              filter: out > 0.05 ? `blur(${out * 10}px)` : undefined,
              padding: "22px 24px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 18, background: `${c}1F`, border: `1.5px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ transform: "scale(0.75)" }}>
                <Icon kind={icon} color={c} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: c, marginBottom: 4 }}>{lab}</div>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: WHITE }}>
                {txt.split("|").map((l, k) => (
                  <div key={k}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
/** where a tip's milestone marker sits on screen (same maths as the Chart + the scene camera) */
const markerScreen = (at: number, t: number, sceneS: number, isPro: boolean) => {
  const P = project(t);
  const x = headX(at);
  const mx = P.sx(WX(x));
  const my = P.sy(WY(score(x))) - (isPro ? 70 : 46);
  return { x: (mx - 540) * sceneS + 540, y: (my - 820) * sceneS + 820 };
};
const TipCard: React.FC<{ t: number; sceneS: number }> = ({ t, sceneS }) => {
  if (t < 25.9 || t > 35.7) return null;
  if (t >= FAN_A + 0.25) return <TipFan t={t} />;
  const cardIn = prog(t, 26.28, 26.62, easeOutExpo);
  const cardOut = prog(t, FAN_A, FAN_A + 0.25, easeInExpo);
  let cur = 0;
  TIPS.forEach((tp, i) => {
    if (t >= tp[0] - 0.05) cur = i;
  });
  const col = TIPS[cur][4];
  const accentIsYellow = col === YELLOW;
  const landAt = TIPS[cur][0] + 0.32;
  const sweep = prog(t, landAt, landAt + 0.9, easeInOut);
  const bar = prog(t, landAt - 0.05, landAt + 0.45, easeOutExpo);
  return (
    <>
      {/* the milestone dot grows into the card (morph) */}
      {TIPS.map(([a, , , , c], i) => {
        const m = prog(t, a, a + 0.42, easeInOut);
        if (t < a || m >= 1) return null;
        const from = markerScreen(a, t, sceneS, i === 3);
        const w = lerp(44, CARD.w, m);
        const h = lerp(44, CARD.h, m);
        const cx = lerp(from.x, CARD.left + CARD.w / 2, m);
        const cy = lerp(from.y, CARD.top + CARD.h / 2, m);
        return (
          <div
            key={`g${i}`}
            style={{
              position: "absolute",
              left: cx - w / 2,
              top: cy - h / 2,
              width: w,
              height: h,
              borderRadius: lerp(22, 40, m),
              background: c,
              opacity: 0.85 * (1 - Math.pow(m, 3)),
              boxShadow: "0 20px 50px rgba(90,60,25,0.18)",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: CARD.top,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 40,
          background: "linear-gradient(180deg, #FFFFFF, #FCF8F2)",
          border: `1.5px solid ${accentIsYellow ? "rgba(227,160,8,0.35)" : "rgba(60,45,30,0.08)"}`,
          boxShadow: "0 34px 80px rgba(90,60,25,0.16), 0 8px 22px rgba(90,60,25,0.08)",
          opacity: cardIn * (1 - cardOut),
          transform: `translateY(${cardOut * 30}px) scale(${lerp(0.97, 1, cardIn)})`,
          filter: cardOut ? `blur(${cardOut * 10}px)` : undefined,
          overflow: "hidden",
        }}
      >
        {/* accent bar + light sweep on each landing */}
        <div style={{ position: "absolute", left: 0, top: (CARD.h * (1 - 0.62 * bar)) / 2, width: 8, height: CARD.h * 0.62 * bar, borderRadius: 4, background: col }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(100deg, transparent ${sweep * 160 - 60}%, rgba(255,255,255,0.85) ${sweep * 160 - 40}%, transparent ${sweep * 160 - 20}%)`,
            opacity: sweep > 0 && sweep < 1 ? 1 : 0,
          }}
        />
        {TIPS.map(([a, b, lab, txt, c, icon], i) => {
          const pin = prog(t, a + 0.3, a + 0.8, easeOutExpo);
          const pout = i === TIPS.length - 1 ? 0 : prog(t, b, b + 0.35, easeInExpo);
          if (pin <= 0 || pout >= 1) return null;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 28, padding: "0 40px", opacity: pin * (1 - pout), transform: `translateY(${(1 - pin) * 60 - pout * 60}px)`, filter: `blur(${(1 - pin) * 10 + pout * 10}px)` }}>
              <div style={{ width: 128, height: 128, borderRadius: 32, background: `${c}1F`, border: `1.5px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${lerp(0.6, 1, prog(t, a + 0.35, a + 0.85, easeOutBack))}) ` }}>
                <div style={{ transform: "scale(1.3)" }}>
                  <Icon kind={icon} color={c} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: c, marginBottom: 10 }}>{lab}</div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 44, lineHeight: 1.18, letterSpacing: "-0.02em", color: WHITE, whiteSpace: "nowrap" }}>
                  {txt.split("|").map((l, k) => (
                    <div key={k}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
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

/* Intro HUD: big + centred. Frame 0 shows it at rest; the film ends by rebuilding exactly this state (loop). */
const HUD_HIT = 1.81;
const IntroHUD: React.FC<{ t: number }> = ({ t }) => {
  const endBuild = t > 53.0;
  if (t > 4.3 && !endBuild) return null;
  const out = endBuild ? 0 : prog(t, 3.75, 4.15, easeInExpo);
  const glass = endBuild ? 0 : hudGlass(t);
  // slam: a quick punch right at the start (frame 0 is the rest state)
  const slam = t < 0.6 ? Math.sin(Math.PI * clamp(t / 0.45)) * 0.14 * (1 - clamp(t / 0.6)) : 0;
  const hit = t > HUD_HIT && t < HUD_HIT + 0.5 ? (1 - (t - HUD_HIT) / 0.5) ** 2 : 0;
  const drain = endBuild ? 0 : prog(t, HUD_HIT, HUD_HIT + 0.45, easeInOut);
  const hpCount = Math.round(lerp(10, 3, drain));
  const xp = endBuild ? 0 : prog(t, 0.4, 1.5, easeOutExpo) * 0.68;
  const sx = hit * 16 * (rand(Math.floor(t * 60)) - 0.5);
  const sy = hit * 16 * (rand(Math.floor(t * 60) + 9) - 0.5);
  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: 430,
        width: 0,
        height: 0,
        opacity: 1 - out,
        transform: `translate(${sx}px, ${sy}px) perspective(1100px) rotateX(${glass * 16}deg) scale(${(1 + slam + hit * 0.06 + glass * 0.06) * (1 + out * 1.2)})`,
        filter: out ? `blur(${out * 12}px)` : undefined,
      }}
    >
      <div style={{ position: "absolute", left: -420, top: -150, width: 840, height: 280, borderRadius: 36, background: "rgba(255,255,255,0.62)", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 40px 90px rgba(90,60,25,0.18), inset 0 1px 0 rgba(255,255,255,0.9)", opacity: glass }} />
      <div style={{ position: "absolute", left: -380, top: -110, width: 760 }}>
        <div style={{ fontFamily: MONO, fontSize: 40, letterSpacing: 4, color: WHITE, height: 50 }}>
          {!endBuild && <Decode t={t} text="PLAYER 1" at={0.15} dur={0.5} />}
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 18, alignItems: "center" }}>
          {new Array(10).fill(0).map((_, i) => {
            const alive = i < hpCount;
            const col = drain > 0 ? (alive ? RED : "#E2DCD2") : GREEN;
            // end: blocks pop back in one by one, landing exactly on the rest state
            const pop = endBuild ? prog(t, 53.25 + i * 0.05, 53.55 + i * 0.05, easeOutBack) : 1;
            return <div key={i} style={{ width: 58, height: 32, borderRadius: 4, background: col, transform: `scale(${pop})`, boxShadow: alive ? `0 6px 16px ${col}55` : undefined }} />;
          })}
          <span style={{ fontFamily: MONO, fontSize: 28, color: drain > 0 ? RED : GREEN, marginLeft: 12 }}>HP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
          <div style={{ width: 670, height: 9, borderRadius: 5, background: "#E6DFD3", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 9, borderRadius: 5, width: 670 * xp, background: YELLOW }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 28, color: YELLOW, marginLeft: 18 }}>XP</span>
        </div>
      </div>
    </div>
  );
};

const START_CLICK = 3.4;
const PressStart: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0.8 || t > 4.0) return null;
  const clicked = t >= START_CLICK;
  const blink = clicked ? 1 : Math.floor((t - 0.8) * 2.4) % 2 === 0 ? 1 : 0.35;
  const press = t > START_CLICK && t < START_CLICK + 0.25 ? Math.sin(Math.PI * ((t - START_CLICK) / 0.25)) : 0;
  const fade = prog(t, 0.8, 1.2) * (1 - prog(t, 3.6, 3.95));
  // cursor glides in from the lower right and clicks the button
  const cin = prog(t, 2.75, 3.3, easeInOut);
  const cx = lerp(900, 572, cin);
  const cy = lerp(1830, 1598, cin);
  const cop = prog(t, 2.75, 2.95) * (1 - prog(t, 3.55, 3.8));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1552, display: "flex", justifyContent: "center", opacity: fade }}>
        <div
          style={{
            padding: "14px 34px",
            borderRadius: 999,
            border: `2px solid ${clicked ? GREEN : "#CFC7BA"}`,
            background: clicked ? `${GREEN}18` : "rgba(255,255,255,0.6)",
            fontFamily: MONO,
            fontSize: 32,
            letterSpacing: 6,
            color: clicked ? GREEN : "#6F6A62",
            opacity: blink,
            transform: `scale(${1 - press * 0.08})`,
          }}
        >
          ▶ PRESS START
        </div>
      </div>
      <Cursor t={t} x={cx} y={cy} clickAt={START_CLICK} opacity={cop} />
    </>
  );
};

/* the clicked HUD turns into a tilted glass panel before the camera dives into the chart */
const hudGlass = (t: number) => prog(t, START_CLICK + 0.02, START_CLICK + 0.35, easeOutExpo);

const Result: React.FC<{ t: number }> = ({ t }) => {
  if (t < 43.2 || t > 47.55) return null;
  // critically damped count from 0 (motion-charts: no overshoot, no invented start value)
  const x = Math.max(0, t - 43.3) * 4.5;
  const val = Math.min(59, Math.round(59 * (1 - (1 + x) * Math.exp(-x))));
  const done = val >= 59;
  const land = prog(t, 44.9, 45.4, easeOutBack);
  const inP = prog(t, 43.2, 43.7, easeOutExpo);
  const out = prog(t, 47.22, 47.5, easeInExpo);
  const sub = prog(t, 44.95, 45.6, easeOutExpo);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TY - 140, textAlign: "center", opacity: inP * (1 - out), filter: out ? `blur(${out * 12}px)` : undefined }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
        <span style={{ fontSize: 250, color: done ? YELLOW : WHITE, display: "inline-block", minWidth: "1.25em", textAlign: "right", fontVariantNumeric: "tabular-nums", transform: `scale(${done ? lerp(1.15, 1, land) : 1})`, textShadow: done ? "0 18px 40px rgba(80,55,25,0.12)" : undefined }}>{val}</span>
        <span style={{ fontSize: 110, color: "#A6A198", marginLeft: 10 }}>/60</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 20 }}>
        <svg width={50} height={50} viewBox="0 0 50 50" style={{ opacity: inP }}>
          <circle cx={25} cy={25} r={21} fill="none" stroke="#E6DFD3" strokeWidth={4} />
          <circle cx={25} cy={25} r={21} fill="none" stroke={YELLOW} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(val / 60) * 132} 132`} transform="rotate(-90 25 25)" />
          <path d="M15 26 l7 7 l13 -15" fill="none" stroke={YELLOW} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="34" strokeDashoffset={34 * (1 - prog(t, 45.0, 45.45, easeInOut))} />
        </svg>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 38, color: "#5E5B55", opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>Outstanding Pearson Learner Award</div>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: YELLOW, marginTop: 6, opacity: prog(t, 45.15, 45.8, easeOutExpo) }}>Mathematics</div>
    </div>
  );
};

/* Title */
const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < 51.2 || t > 53.7) return null;
  const tags = prog(t, 52.1, 52.8, easeOutExpo);
  return (
    <>
      <Kinetic t={t} text="Beyond the|*Grades.*" inAt={51.3} outAt={52.95} accent={YELLOW} y={1280} size={156} weight={800} chars />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 34, color: "#8C877D", lineHeight: 1.6, opacity: tags * (1 - prog(t, 52.9, 53.3, easeInOut)), transform: `translateY(${(1 - tags) * 20}px)` }}>
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
const pushIn = smoothKeys([[0, 1.06], [3.7, 1.0], [13.89, 1.0], [20.6, 1.05], [21.4, 1.0], [45.2, 1.02], [46.8, 1.0], [52.6, 1.04], [54, 1.06]]);

/* fly-through: the hole of the "6" in "60." (measured: Inter 800 96px, "Now you go|get the 60." at y = TY) */
const HOLE6 = { x: 665.5, y: 1401.5 };
const FLY6_A = 50.55;
const FLY6_B = 51.15;
const fly6 = (t: number) => (t >= FLY6_B ? 1 : Math.exp(Math.log(130) * easeInExpo(prog(t, FLY6_A, FLY6_B))));

/* foreground depth: big soft numbers drifting past the lens, parallax tied to the chart camera */
const FG2: [string, number, number, number][] = [
  ["60", 200, 210, 360], ["+1", 1150, 1720, 300], ["×", 2050, 230, 340], ["59", 2900, 1700, 360],
  ["÷", 3700, 220, 320], ["√", 4500, 1720, 340], ["%", 5300, 240, 320], ["∞", 6100, 1700, 340],
];
const Foreground2: React.FC<{ t: number }> = ({ t }) => {
  if (t < 4.4 || t > 45.6) return null;
  const env = prog(t, 4.4, 5.2, easeInOut) * (1 - prog(t, 44.9, 45.6, easeInOut));
  const travel = headX(t) * 6400; // nearer than the chart: slides further per unit of story
  const col = CH_COL[chapterIdx(t)];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {FG2.map(([g, x, y, size], i) => {
        const sx = x - travel;
        if (sx < -400 || sx > 1480) return null;
        return (
          <div key={i} style={{ position: "absolute", left: sx, top: y, transform: "translate(-50%, -50%)", fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 1, color: i % 2 ? col : INK, opacity: 0.08 * env, filter: "blur(12px)" }}>
            {g}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const V2: React.FC = () => {
  const frame = useCurrentFrame();
  // beat-synced story clock (see scripts/audio/beatalign.py)
  const t = warpT(frame / FPS);
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
      <Orb x={760 + Math.sin((t / 54) * Math.PI * 2) * 120} y={700} r={700} color={`${tint}`} opacity={0.9} />
      <Ambience t={t} tint={t > 53.2 ? CH_COL[0] : CH_COL[chapterIdx(t)]} period={V2_DURATION} />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 260px rgba(232,54,79,${redPulse * 0.7})` }} />
      <Foreground2 t={t} />
      <AbsoluteFill style={{ transformOrigin: `${HOLE6.x}px ${HOLE6.y}px`, transform: `scale(${fly6(t)})` }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${s})`, transformOrigin: "540px 820px" }}>
        <Chart t={t} />
        <IntroHUD t={t} />
        <ChapterSweep t={t} />
        <ChapterLabel t={t} />
        <Terminal t={t} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translate(${sx * 0.5}px, ${sy * 0.5}px)` }}>
        {/* giant "gamer." slams in, then flies into its slot (measured centre 705.09, 1275) */}
        <GiantWord t={t} word="gamer." color={INK} size={96} weight={800} from={{ x: 540, y: 905, scale: 3.0 }} to={{ x: 705.09, y: 1275 }} inAt={0.12} moveAt={0.75} until={3.6} />
        <Kinetic t={t} text="I was a gamer." inAt={0.7} outAt={3.7} accent={RED} y={TY - 60} size={96} weight={800} hideWord="gamer." hideUntil={3.6} />
        <Kinetic t={t} text="Not a *studier.*" inAt={1.45} outAt={3.72} accent={RED} y={TY + 50} size={96} weight={800} />
        <PressStart t={t} />
        <Kinetic t={t} text="Maths always|came easy to me." inAt={4.6} outAt={6.4} accent={YELLOW} y={TY} />
        <Kinetic t={t} text="But talent alone|doesn't get you an *award.*" inAt={6.64} outAt={8.95} accent={YELLOW} y={TY} size={76} />
        <Kinetic t={t} text="I spent more time|[pad] *gaming* than studying." inAt={9.3} outAt={13.6} accent={RED} y={TY} size={74} />
        <Kinetic t={t} text="Then asthma|hit me [pulse] *hard.*" inAt={14.15} outAt={16.95} accent={RED} y={TY} />
        <Kinetic t={t} text="I had to|slow down." inAt={17.25} outAt={20.6} accent={RED} y={TY} stagger={0.12} />
        <Bubble t={t} at={21.3} outAt={25.3} who="BEST FRIEND" text="You can do it." color={GREEN} x={500} y={390} />
        <Kinetic t={t} text="So I came back.|With [spark] *confidence.*" inAt={22.3} outAt={25.25} accent={GREEN} y={TY} />
        <TipCard t={t} sceneS={s} />
        <Bubble t={t} at={35.7} outAt={37.75} who="FAMILY" text="You can do great." color={ORANGE} x={90} y={TY - 140} />
        <Bubble t={t} at={36.3} outAt={37.8} who="" text="Don't worry if you don't get 60." color={ORANGE} x={90} y={TY + 10} size={40} />
        <Kinetic t={t} text="No pressure.|Just *freedom.*" inAt={38.03} outAt={40.25} accent={ORANGE} y={TY} />
        <Kinetic t={t} text="And that freedom made|me want it even *more.*" inAt={40.45} outAt={42.7} accent={ORANGE} y={TY} size={76} />
        <Result t={t} />
        <Kinetic t={t} text="I got *59.*" inAt={47.52} outAt={48.5} accent={YELLOW} y={TY} size={100} weight={800} />
        {t < FLY6_B && <Kinetic t={t} text="Now you go|get the *60.*" inAt={48.95} outAt={99} accent={YELLOW} y={TY} size={96} weight={800} />}
        {t < FLY6_B && <SelectBox t={t} at={49.75} until={51.3} x={633.25} y={1337.88} w={150.75} h={105.59} color={YELLOW} />}
      </AbsoluteFill>
      </AbsoluteFill>
      {/* paper hides the switch from "inside the 6" back to the full view */}
      <AbsoluteFill style={{ background: PAPER, opacity: prog(t, FLY6_B - 0.12, FLY6_B) * (1 - prog(t, FLY6_B, FLY6_B + 0.3, easeInOut)) }} />
      <AbsoluteFill>
        <Title t={t} />
      </AbsoluteFill>
      <Sparkles t={t} at={44.95} x={470} y={TY - 40} color={YELLOW} n={14} spread={260} seed={4} />
      <Sparkles t={t} at={51.9} x={760} y={1340} color={YELLOW} n={12} spread={220} seed={6} />
      <Flash t={t} at={HUD_HIT} color={RED} peak={0.14} dur={0.5} />
      <Flash t={t} at={4.23} color="#FFFFFF" peak={0.5} dur={0.6} />
      <Flash t={t} at={42.86} color="#FFFFFF" peak={0.4} dur={0.6} />
      <FilmLook />
    </AbsoluteFill>
  );
};
