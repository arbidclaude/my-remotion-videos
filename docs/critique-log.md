# Senior motion-designer critique log (third pass, Nov 2026)

Method per round: render both films at half resolution with motion blur on, look at a frame every 0.5 s
(12×5 contact sheets) plus 8 fps strips of every transition, critique story, layout, spacing, type,
timing, depth, readability and sound-to-picture, fix everything, re-render.

New in this pass: serif-italic feeling words (Instrument Serif), V1 viewfinder lock-on ("YOU"),
V2 level rail, V2 hand-drawn circle on "59.", V2 59 → 60 odometer transform, real sub-frame motion blur.

## Round 1

**V1, what was weak**
- 47.7 s title: "numbers" rolled in before "Beyond the" existed, so the line read "numbers" alone for a beat.
- 43.5 s: "This year, I'm one of them." was still leaving while "Your dot is waiting." rose into the same
  lines, so the two sentences overlapped for ~0.25 s.
- 27–32 s pathway: the five steps hugged the top-left; the lower 60 % of the frame was empty for 4 s.
- 49.6 s loop zoom: at 6 blur samples the extreme zoom broke into stepped ghost copies of the "s".

**V1, what changed**
- "Beyond the" types faster (20 ms/char), "numbers" enters only after it (47.86 s) and "Grades" locks at 48.32 s.
- "Your dot is waiting." enters at 43.66 s, after the previous line has cleared.
- Pathway moved 60 px lower (balanced against the headline that follows).
- Fly-through and loop zoom now use 16 blur samples (smooth smear, no ghost steps).

**V2, what was weak**
- 48.5 s: the odometer rolled 59 → 60 while "I got" was still on screen, so it read "I got 60." (wrong
  fact), and the units-first roll briefly showed "50".
- 50.6 s fly-through the "6": 6 blur samples produced visible stepped ghost copies of the text.
- 40.5 s: "No pressure. Just freedom." and "And that freedom made…" overlapped mid-swap.
- 43.2 s: the 0→59 count-up appeared a few frames before "even more." had left.

**V2, what changed**
- The number first slides to its new line (48.5–49.1 s) and only rolls to 60 at 49.02 s, after "I got"
  has gone; tens and units roll together (no "50").
- Fly-through window rendered with 16 samples.
- "And that freedom…" enters at 40.6 s; the count-up block fades in from 43.28 s.

## Round 2

Checked every round-1 fix in motion (8 fps strips): title order, 43.5 s swap, loop zoom and fly-through
blur, and the 59 → 60 roll (it now never reads "I got 60" or "50") are all clean. Then a close-up type pass
at the QA render's full width.

**What was weak**
- V2 40.6 s: a sliver of overlap was left ("And" rose while "freedom." was still leaving).
- Serif-italic feeling words read a touch light next to the bold sans (Instrument Serif has thin strokes),
  "waiting." especially.
- V2 22 s: the "BEST FRIEND" label slid up from behind the message pill and was briefly clipped by it.
- V2 48 s: the hand-drawn circle still grazed the "t" of "got".

**What changed**
- "And that freedom made…" enters at 40.72 s.
- Serif words set at 1.25 em (was 1.2 em) so they hold their weight on a phone.
- The label now settles down from above the pill (never behind it).
- Circle moved 8 px right and made 6 px narrower; it now sits clear of "got".

Checked and kept: level rail legibility and colours per chapter, viewfinder + "YOU" tag, callout leader
lines, serif words in every line they appear in.

## Round 3

Full-film pass at a frame every 0.5 s for story and pacing, plus a sound-to-picture check: the audio of the
QA renders was run through onset detection and every new cue (full-stop hop and bounce, landing swell,
viewfinder hunt/lock, 59 flight, circle, odometer ticks, title-word ticks, wipe, pill, callout) has its
onset within ±80 ms (≈2 frames) of its visual event.

**What was weak**
- V1 27.6–33.8 s: the camera was dead still for ~6 s while the pathway built (every other scene breathes).
- Checked a suspicion of colour blotching from 16-sample blending in the fly-through and loop zoom
  (6× saturation comparison of frames inside vs outside the blur windows): identical; the warm shading is the
  existing light leaks and vignette. No change needed.

**What changed**
- A slow 3.5 % push-in over the pathway (27.6 → 33.8 s) that hands straight into the existing push before
  the drop.

Verified from round 2: "BEST FRIEND" now settles from above the pill; the circle sits clear of "got"; the 40.7 s
line swap is clean.

## Round 4 (full-resolution renders)

Critiqued the exact delivery files (1080×1920, 30 fps, motion blur on): a frame every 0.5 s for both films,
8 fps strips of every fast move, loudness, frame counts, loop seams, and frame-by-frame background brightness
across every blur-window edge.

**What was weak**
- Picture, type and timing: nothing new; every fix from rounds 1–3 holds at full resolution.
- But a measurement caught a real defect: the blur library adds its samples together at 1/n opacity
  ("plus-lighter"), and the 8-bit rounding made every blurred frame ~3 levels (≈1.4 %) brighter. The whole
  frame therefore stepped up and down at every blur-window edge, ~30 faint flickers across the two films,
  and V1's last frame came out lighter than its first (loop seam 35.8 dB vs 43.7 dB for a normal step).

**What changed**
- Replaced the library with an own FilmBlur: the samples are a running mean (layer k at opacity 1/k over the
  layers below), which has no rounding bias, and the 180° shutter is now centred on the frame instead of
  trailing ahead of it. The first sample keeps its key, so state stays mounted.
- Re-tested at the window edges: brightness is flat across the edge (V1 216.1 → 216.1; V2 step 0.7 levels,
  ordinary frame-to-frame change, was 3.6). Blur quality checked mid-window on the "8,000" zoom, the
  "gamer." slam and the fly-through the "6": smooth smear.

## Round 5 (final renders after the blur fix)

Re-rendered both films with the new blur and re-measured: background brightness across every blur-window edge
now changes by at most 0.5 levels in V1 (was 3+); in V2 the only large step is the intended cut from the
yellow inside of the "6" to paper. V1's loop seam is back to 44.4 dB (normal step 45.5 dB).

**What was weak:** frame by frame, the two fastest frames of V2's fly-through the "6" (thin, high-contrast
text accelerating towards the lens) still broke into a few stepped copies at 16 samples.

**What changed:** 32 samples on just that 0.3 s (40 ran Chrome out of memory; 32 at two render tabs
fits). The frames are now a continuous radial smear.

**Final checks:** V1 1521 frames, V2 1620 frames, 1080×1920 at 30 fps; −16.0 LUFS integrated, true peak
−5.8 / −5.3 dBFS; loop seams as close as a normal frame step. A full critique finds nothing left to fix.

## Round 6 (fourth pass: chart dot → full stop, "patterns." wave grid, drift on holds)

Critiqued the final files at a frame every 0.5 s plus 8 fps strips of each new moment.
- V1 10.2–11.8 s: "patterns." rises letter by letter on a wave over thin design guides, flattens into the word at
  10.95 s and hands over seamlessly to the Kinetic word at 11.6 s (identical position, no jump).
- V2 26–35 s: the tip card now floats and breathes slightly (±7 px, ±0.45°); the dot→card morph lands on the
  moving card.
- V2 43.3–47.2 s: the 59/60 result slowly grows 4 % around its digits; the flyer starts from that scale.
- V2 47.32–47.75 s: the head of the score line lifts off the chart, arcs down and lands exactly as the full stop
  of "I got 59." (measured offset), then the circle draws.
- No regressions elsewhere; 1521 / 1620 frames, −16.0 LUFS, true peak −5.8 / −5.3 dBFS, loop seams as close as
  a normal frame step.
