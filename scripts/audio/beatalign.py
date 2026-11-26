"""Beat-align the music edit to the film's big moves (sound-effects skill, step 3-4).

usage: python3 -I scripts/audio/beatalign.py src/v1/timeline.json <hits...> [--apply] [--plot out.png]

- builds the track's beat grid with librosa and checks it against the low end / onsets:
  if the onsets sit consistently off the grid, the grid is shifted by the median offset
- for every music segment, searches a shift of its music start (+-0.6 s) that minimises
  the error between the hits inside that segment and the nearest beat
- prints the cut-to-beat error per hit in ms; --apply writes the shifted segments back
"""
import json
import sys

import librosa
import numpy as np
from scipy.signal import butter, sosfilt

args = sys.argv[1:]
tl_path = args[0]
apply = "--apply" in args
plot = args[args.index("--plot") + 1] if "--plot" in args else None
hits = [float(a) for a in args[1:] if a.replace(".", "", 1).isdigit()]

tl = json.load(open(tl_path))
y, sr = librosa.load(tl["music"]["file"], sr=22050, mono=True)

# beat grid + verification against onsets (piano tracks have no kick: use the onset envelope)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, tightness=200)
bt = librosa.frames_to_time(beats, sr=sr)
on = librosa.onset.onset_detect(y=y, sr=sr, units="time", backtrack=False)
offs = []
for o in on:
    i = np.searchsorted(bt, o)
    cands = [bt[j] for j in (i - 1, i) if 0 <= j < len(bt)]
    if cands:
        d = o - min(cands, key=lambda b: abs(b - o))
        if abs(d) < 0.12:
            offs.append(d)
shift = float(np.median(offs)) if offs else 0.0
if abs(shift) > 0.02:
    bt = bt + shift
period = float(np.median(np.diff(bt)))
print(f"tempo {float(np.atleast_1d(tempo)[0]):.1f} BPM, beat {period*1000:.0f} ms, grid shift {shift*1000:+.0f} ms ({len(offs)} onsets checked)")

if plot:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    lo = sosfilt(butter(4, 250, btype="low", fs=sr, output="sos"), y)
    t0 = bt[2] if len(bt) > 3 else 0
    sel = slice(int(t0 * sr), int((t0 + period * 16) * sr))
    tt = np.arange(len(y))[sel] / sr
    plt.figure(figsize=(14, 3))
    plt.plot(tt, np.abs(lo[sel]), lw=0.5, color="#555")
    for b in bt[(bt >= tt[0]) & (bt <= tt[-1])]:
        plt.axvline(b, color="#3A6BEA", lw=1)
    for o in on[(on >= tt[0]) & (on <= tt[-1])]:
        plt.axvline(o, color="#E8364F", lw=0.6, ls=":")
    plt.title(f"{tl['music']['file']}: |low-passed| (grey), beat grid (blue), onsets (red)")
    plt.tight_layout()
    plt.savefig(plot, dpi=110)


def nearest_err(mt):
    i = np.searchsorted(bt, mt)
    c = [bt[j] for j in (i - 1, i) if 0 <= j < len(bt)]
    b = min(c, key=lambda b: abs(b - mt))
    return mt - b


segs = tl["music"]["segments"]
ends = [s[0] for s in segs[1:]] + [tl["duration"]]
new = []
for (vs, ms, me), ve in zip(segs, ends):
    hs = [h for h in hits if vs <= h < ve]
    best = (0.0, 9e9)
    if hs:
        for d in np.arange(-0.6, 0.601, 0.005):
            if ms + d < 0 or me + d > len(y) / sr:
                continue  # never start before / run past the track
            e = np.mean([abs(nearest_err(ms + d + (h - vs))) for h in hs])
            if e < best[1]:
                best = (float(d), e)
    d = round(best[0], 3)
    new.append([vs, round(ms + d, 3), round(me + d, 3)])
    for h in hs:
        e = nearest_err(ms + d + (h - vs))
        print(f"  hit {h:6.2f}s  seg@{vs:5.2f} shift {d*1000:+5.0f} ms  -> beat error {e*1000:+6.0f} ms")
# --- time-warp: move every hit onto a beat by gently re-timing the film between hits
def video_beats(seg_list):
    vb = []
    for (vs, ms, me), ve in zip(seg_list, ends):
        for b in bt:
            v = vs + (b - ms)
            if vs <= v < ve:
                vb.append(v)
    return np.array(sorted(vb))


vbeats = video_beats(new)
warp = [[0.0, 0.0]]
for h in sorted(hits):
    if h <= 0.05:
        continue
    i = np.searchsorted(vbeats, h)
    cands = [vbeats[j] for j in (i - 1, i) if 0 <= j < len(vbeats)]
    pv, ps = warp[-1]
    best = None
    for c in sorted(cands, key=lambda c: abs(c - h)):
        ratio = (h - ps) / max(1e-3, c - pv)  # story seconds per video second
        if c > pv + 0.2 and 0.8 <= ratio <= 1.25:
            best = c
            break
    if best is None:
        best = h  # leave this hit where it is
    print(f"  warp hit {h:6.2f}s -> {best:6.2f}s ({(best-h)*1000:+5.0f} ms)")
    warp.append([round(float(best), 3), h])
warp.append([tl["duration"], tl["duration"]])
if apply:
    tl["music"]["segments"] = new
    tl["warp"] = warp
    json.dump(tl, open(tl_path, "w"), indent=1)
    print("applied:", new)
