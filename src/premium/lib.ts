import { Easing } from "remotion";

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Premium easing curves
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeInExpo = Easing.bezier(0.7, 0, 0.84, 0);
export const easeOutBack = Easing.bezier(0.34, 1.4, 0.64, 1);
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/** 0→1 progress between a and b seconds, eased */
export const prog = (t: number, a: number, b: number, ease: (x: number) => number = easeInOut) =>
  ease(clamp((t - a) / (b - a)));

/** Fade window: rises over [a, a+inD], falls over [b-outD, b] */
export const win = (t: number, a: number, b: number, inD = 0.4, outD = 0.4) =>
  Math.min(prog(t, a, a + inD, easeOut), 1 - prog(t, b - outD, b, easeInExpo));

/** Monotone cubic (Fritsch–Carlson) interpolation through keyframes: silky, no overshoot */
export const smoothKeys = (keys: [number, number][]) => {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]);
      const w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]);
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  // flat ends => gentle ease in/out of the whole move
  m[0] = 0;
  m[n - 1] = 0;
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const s = (x - xs[i]) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
    const h10 = s ** 3 - 2 * s ** 2 + s;
    const h01 = -2 * s ** 3 + 3 * s ** 2;
    const h11 = s ** 3 - s ** 2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
};

/** Hold-style keyframes: value eases from one key to the next over `dur` seconds starting at each key time */
export const stepKeys = (keys: [number, number][], dur = 0.8, ease = easeInOut) => (t: number) => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [kt, kv] = keys[i];
    v = lerp(v, kv, prog(t, kt, kt + dur, ease));
  }
  return v;
};

export const mixColor = (a: string, b: string, p: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, p));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, p));
  const bl = Math.round(lerp(pa & 255, pb & 255, p));
  return `rgb(${r},${g},${bl})`;
};

/** deterministic pseudo random */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Beat-sync time-warp: maps video time -> story time through [video, story] points (piecewise linear). */
export const makeWarp = (pts: number[][] | undefined) => (tv: number) => {
  if (!pts || pts.length < 2) return tv;
  for (let i = 0; i < pts.length - 1; i++) {
    const [v0, s0] = pts[i];
    const [v1, s1] = pts[i + 1];
    if (tv <= v1) return s0 + ((tv - v0) / (v1 - v0)) * (s1 - s0);
  }
  return tv;
};
