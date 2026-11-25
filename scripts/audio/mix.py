"""Synthesised SFX + music edit + master for the premium OPLA cuts.

usage: python3 -I scripts/audio/mix.py src/v1/timeline.json public/audio/mix-v1.wav

timeline.json:
  duration: seconds
  music: { file, segments: [[videoStart, musicStart, musicEnd], ...], fadeIn, fadeOut, gain_db }
  sfx: [[time, name, gain_db, pan], ...]
"""
import json
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env_exp(d, k):
    return np.exp(-t_(d) * k)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def sweep_filter_noise(d, f0, f1, q=0.35, curve=1.0):
    """noise through a band-pass whose centre glides f0->f1 (block-wise)"""
    n = int(d * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 256
    zi = None
    for i in range(0, n, blk):
        p = (i / n) ** curve
        fc = f0 * (f1 / f0) ** p
        lo, hi = max(30, fc * (1 - q)), min(SR / 2 - 100, fc * (1 + q))
        sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg, zi = sosfilt(sos, noise[i : i + blk], zi=zi)
        out[i : i + blk] = seg
    return out


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


# ---------------------------------------------------------------- SFX bank
def whoosh(d=0.7, up=True):
    n = sweep_filter_noise(d, 300 if up else 4000, 4000 if up else 300, 0.5)
    tt = t_(d)
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    return norm(n * e, 0.9)


def whoosh_soft(d=0.9):
    return norm(lp(whoosh(d), 2500), 0.7)


def riser(d=1.6):
    tt = t_(d)
    n = sweep_filter_noise(d, 400, 7000, 0.4, curve=1.6)
    tone = np.sin(2 * np.pi * (220 * tt + (880 - 220) * tt**2 / (2 * d)))
    e = (tt / d) ** 2.2
    return norm((n * 0.8 + tone * 0.25) * e, 0.85)


def suck(d=0.8):
    return norm(riser(d)[::-1][::-1] * 1.0, 0.8)


def impact(d=1.8, f0=70, f1=34):
    tt = t_(d)
    ph = 2 * np.pi * (f0 * tt + (f1 - f0) * (1 - np.exp(-tt * 6)) / 6)
    sub = np.sin(ph) * np.exp(-tt * 2.6)
    click = hp(rng.standard_normal(len(tt)), 2000) * np.exp(-tt * 60) * 0.4
    body = lp(rng.standard_normal(len(tt)), 400) * np.exp(-tt * 9) * 0.6
    tail = bp(rng.standard_normal(len(tt)), 200, 3000) * np.exp(-tt * 3.5) * 0.12
    return norm(sub + click + body + tail, 1.0)


def thump(d=0.5):
    tt = t_(d)
    s = np.sin(2 * np.pi * (90 * tt - 40 * tt**2)) * np.exp(-tt * 12)
    return norm(s + lp(rng.standard_normal(len(tt)), 300) * np.exp(-tt * 30) * 0.4, 0.9)


def heartbeat():
    a = thump(0.45)
    out = np.zeros(int(0.9 * SR))
    out[: len(a)] += a
    o = int(0.24 * SR)
    out[o : o + len(a)] += a * 0.7
    return out


def tick(f=2600, d=0.05):
    tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 140) + hp(rng.standard_normal(len(tt)), 5000) * np.exp(-tt * 400) * 0.3, 0.6)


def pop(d=0.12):
    tt = t_(d)
    s = np.sin(2 * np.pi * (320 * tt + 2200 * tt**2)) * np.exp(-tt * 38)
    return norm(s, 0.7)


def ping(f=1320, d=1.4):
    tt = t_(d)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.2) + 0.35 * np.sin(2 * np.pi * f * 2.01 * tt) * np.exp(-tt * 6)
    return norm(s, 0.6)


def chime(d=3.0, base=660):
    tt = t_(d)
    parts = [(1, 1), (2.0, 0.5), (2.76, 0.3), (5.4, 0.15), (8.93, 0.08)]
    s = sum(a * np.sin(2 * np.pi * base * r * tt) * np.exp(-tt * (1.4 + r * 0.5)) for r, a in parts)
    return norm(s * (1 - np.exp(-tt * 200)), 0.7)


def shimmer(d=1.6, n=26, lo=2000, hi=7000):
    out = np.zeros(int(d * SR))
    for i in range(n):
        st = int(rng.uniform(0, d * 0.7) * SR)
        f = rng.uniform(lo, hi)
        g = ping(f, 0.5) * rng.uniform(0.2, 0.6)
        e = min(len(g), len(out) - st)
        out[st : st + e] += g[:e]
    return norm(out * np.linspace(1, 0.4, len(out)), 0.5)


def typing(d=1.0, rate=14):
    out = np.zeros(int(d * SR))
    t = 0.0
    while t < d - 0.05:
        k = hp(rng.standard_normal(int(0.025 * SR)), 1800) * np.exp(-t_(0.025) * 220)
        k = bp(k, 1500, 6000) * rng.uniform(0.5, 1.0)
        st = int(t * SR)
        out[st : st + len(k)] += k
        t += rng.uniform(0.6, 1.4) / rate
    return norm(out, 0.45)


def glitch(d=0.35):
    n = int(d * SR)
    x = rng.standard_normal(n)
    hold = (np.arange(n) // 60) * 60
    x = x[hold] * (np.sin(2 * np.pi * 70 * t_(d)) > 0)
    x = bp(x, 400, 6000)
    gate = (rng.uniform(size=n // 900 + 1) > 0.35).repeat(900)[:n]
    return norm(x * gate * np.exp(-t_(d) * 4), 0.5)


def count_roll(d=1.8):
    out = np.zeros(int(d * SR))
    t = 0.0
    k = 0
    while t < d:
        g = tick(3200 + (k % 3) * 300, 0.03) * 0.6
        st = int(t * SR)
        e = min(len(g), len(out) - st)
        out[st : st + e] += g[:e]
        # decelerating ticks
        t += 0.035 + 0.12 * (t / d) ** 2.5
        k += 1
    return out


def chip(notes=(523, 659, 784, 1046), step=0.07):
    """8-bit 'press start' arpeggio"""
    out = []
    for f in notes:
        tt = t_(step)
        sq = np.sign(np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 10) * 0.35
        out.append(sq)
    return lp(np.concatenate(out), 6000)


def chip_down():
    return chip((784, 659, 523, 392, 330), 0.07)


def sparkle_up():
    return shimmer(1.2, 18, 3000, 9000)


def swell(d=2.2):
    tt = t_(d)
    pad = sum(np.sin(2 * np.pi * f * tt) for f in (220, 277.2, 329.6, 440)) / 4
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5
    return norm(lp(pad, 2000) * e, 0.5)


def bloom(d=2.4):
    """soft low swell: warm sub + filtered air, no transient (calm 'impact')"""
    tt = t_(d)
    att = 1 - np.exp(-tt * 9)
    sub = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 1.6) * att
    air = lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 2.2) * att * 0.35
    pad = sum(np.sin(2 * np.pi * f * tt) for f in (261.6, 392.0, 523.3)) / 3 * np.exp(-tt * 1.2) * att * 0.25
    return norm(sub + air + pad, 0.8)


def whoosh_air(d=1.2):
    return norm(lp(whoosh(d), 1400) * 0.8, 0.55)


BANK = {
    "bloom": bloom,
    "whoosh_air": whoosh_air,
    "whoosh": lambda: whoosh(0.7),
    "whoosh_long": lambda: whoosh(1.1),
    "whoosh_down": lambda: whoosh(0.7, False),
    "whoosh_soft": lambda: whoosh_soft(0.9),
    "riser": lambda: riser(1.6),
    "riser_long": lambda: riser(2.4),
    "impact": impact,
    "thump": thump,
    "heartbeat": heartbeat,
    "tick": tick,
    "tick_lo": lambda: tick(1500),
    "pop": pop,
    "ping": ping,
    "ping_lo": lambda: ping(880),
    "chime": chime,
    "chime_lo": lambda: chime(3.5, 440),
    "shimmer": shimmer,
    "sparkle": sparkle_up,
    "typing": typing,
    "typing_long": lambda: typing(2.6),
    "glitch": glitch,
    "count": count_roll,
    "chip": chip,
    "chip_down": chip_down,
    "swell": swell,
}


def load_music(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def main(tl_path, out_path):
    tl = json.load(open(tl_path))
    dur = tl["duration"]
    N = int(dur * SR)
    mus = np.zeros((N, 2))
    m = tl["music"]
    src = load_music(m["file"])
    xf = int(m.get("xfade", 0.12) * SR)  # crossfade at splices
    for vs, ms, me in m["segments"]:
        a, b = int(ms * SR), int(me * SR)
        seg = src[a : b + xf].copy()
        st = int(vs * SR)
        # fade edges for crossfades
        ramp = np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
        if vs > 0:
            seg[:xf] *= ramp
        seg[-xf:] *= ramp[::-1]
        e = min(len(seg), N - st)
        mus[st : st + e] += seg[:e]
    tt = np.arange(N) / SR
    fi, fo = m.get("fadeIn", 0.05), m.get("fadeOut", 1.5)
    mus *= np.clip(tt / max(fi, 1e-3), 0, 1)[:, None]
    mus *= np.clip((dur - tt) / fo, 0, 1)[:, None] ** 1.5
    mus *= 10 ** (m.get("gain_db", -3) / 20)

    sfx = np.zeros((N, 2))
    duck = np.ones(N)
    for t, name, gdb, pan in tl["sfx"]:
        s = BANK[name]()
        g = 10 ** (gdb / 20)
        st = int(t * SR)
        if name.startswith("riser") or name == "suck":
            st = int(t * SR) - len(s)  # risers END on the cue time
        st = max(0, st)
        e = min(len(s), N - st)
        L = np.cos((pan + 1) * np.pi / 4)
        R = np.sin((pan + 1) * np.pi / 4)
        sfx[st : st + e, 0] += s[:e] * g * L * 1.414
        sfx[st : st + e, 1] += s[:e] * g * R * 1.414
        if name in ("impact", "heartbeat"):
            d = np.ones(e)
            k = np.minimum(1, np.arange(e) / (0.6 * SR))
            d = 0.55 + 0.45 * k
            duck[st : st + e] = np.minimum(duck[st : st + e], d)
    mix = mus * duck[:, None] + sfx
    # glue: gentle high-shelf air + soft clip limiter
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    # loudness normalise to ~-14 LUFS (integrated)
    try:
        import pyloudnorm as pyln

        meter = pyln.Meter(SR)
        lufs = meter.integrated_loudness(mix)
        mix *= 10 ** ((-14 - lufs) / 20)
        print("LUFS before", round(lufs, 2))
    except Exception as ex:  # noqa
        print("no pyloudnorm", ex)
    peak = np.max(np.abs(mix))
    if peak > 0.95:
        mix = np.tanh(mix / 0.95 * 1.0) * 0.95 / np.tanh(1.0) if peak > 1.2 else mix * 0.95 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    import wave

    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", out_path, dur, "s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
