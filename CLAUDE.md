# CLAUDE.md

Remotion project (`src/Root.tsx`, `src/Composition.tsx`). Static assets live in `public/`.

## Reference videos: `public/reference/`

Screen recordings of Instagram Reels used as **style inspiration** for new compositions.
All are vertical phone captures (720×1640, ~24 fps) with Instagram UI on top. Ignore the UI
(Reels header, like/comment rail, caption, comment bar). Only the content on the monitor or laptop screen is the reference.

| File | Length | Storyboard |
|---|---|---|
| `ref-long.mp4` | 95.6 s | `storyboard-long.jpg` (48 tiles, 10 rows) |
| `ref-short.mp4` | 16.9 s | `storyboard-short.jpg` (9 tiles) |
| `ref-short-2.mp4` | 13.8 s | `storyboard-short-2.jpg` (7 tiles) |

Storyboards: 1 frame every 2 s, 5 columns, 480 px tiles, timestamp burned in at the top left.
`storyboard-long.jpg` is 2416×10976. To view it, crop it into 2-row chunks first, for example:
`ffmpeg -i storyboard-long.jpg -vf "crop=2416:2194:0:$((i*2194))" chunk-$i.jpg`.

Regenerate a storyboard:
```bash
ffmpeg -i ref-X.mp4 -vf "fps=1/2,scale=480:-2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='%{pts\:hms}':x=10:y=10:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.7,tile=5xROWS:padding=4" -frames:v 1 storyboard-X.jpg
```

### ref-long.mp4: "Claude just killed it" (Claude replaces After Effects explainer, ~95 s)
- **Look:** dark charcoal background with a faint **perspective grid floor/wall** and a single **orange-red accent** (#ff4a1c-ish). Cinematic glow, bloom, light streaks and lens-flare crosshairs. Film grain and vignette.
- **Typography:** kinetic text, one phrase at a time. Small white sans lines ("you can create…", "without even opening") with **key words coloured orange**. Huge heavy extruded or bevelled words for punches ("After Effects?", "CLAUDE OPUS 5.5", "THIS", "CRAZY", "PRETTY INSANE" in a white-to-orange gradient). Monospace "prompt" text that types on with RGB-split or glitch ("Create a 15-second cinematic motion graphics sequence…").
- **UI motifs:** HUD panels, node diagrams (CLAUDE → .tsx → output.mp4), bezier easing-curve graphs, keyframe timelines, code panels with a "MOTION" preview card, film-strip frames ("frame by frame"), a red strikethrough over After Effects.
- **Contrast breaks:** full-screen **orange flashes** with giant black words (THIS / CRAZY), and paper-white **"FORM 2-B" / "FORM 9" questionnaire** inserts with a red hand-drawn line and a "NO KEYFRAMES" stamp.
- **Demos:** a dictionary card for "pro·ce·dur·al" in serif. A circle morphs to a square to an orange shape, with a prompt list ("Make this transition smoother", "Change the colour", "Slow this section down"). A dense keyframe-dot field. An "idea → working…" arc.
- **Pacing:** a new phrase every ~1–2 s, with fast whip, blur and glitch transitions between beats. It ends on "PRETTY INSANE", then fades to a dark screen with a single orange dot.

### ref-short.mp4: "This only took Claude 20 minutes" (product promo, ~17 s)
- **Look:** dark to **neon/lime green** (#8fe84a). Big chevron arrows sweep in from the sides with a green glow.
- **Beats:** "Be the **best** at what you do" (one green word with a cursor dot). Then big stat cards "95% ACCURACY", "99% SMARTER", "98% EFFICIENT" (huge outlined numerals, italic caps label). Then a light-mode leaderboard "Climb to the top" (green pill rows: You +1,000 EZ, Sam +500, Sarah +300) counting up. Then a white screen with a pill avatar ("Jimmy").
- **Pacing:** about 2 s per beat, with punchy scale-in and number count-ups. It switches between dark and light mode.

### ref-short-2.mp4: "5.5 is ridiculous at motion" (motion-designer reel, ~14 s)
- **Look:** **saturated orange** (#ff5a1f) full-bleed backgrounds, alternating with black and electric blue. Big bold condensed "CLAUDE." with a serif-italic "motion designer" subtitle. Tiny monospace HUD labels in the corners.
- **Beats:** title card, then a 3D extruded block wave with a glass sphere, then serif "on purpose" with an underline, then a black-and-white flow-field particle streak, then a blue "Render queue" UI dialog, then an orange starburst blob morph, then a dark "• Claude / motion designer / EVERY FRAME, ON PURPOSE." end card.
- **Pacing:** hard cuts about every 2 s, one strong visual idea per shot, Swiss/editorial layout.

### Common takeaways
- 9:16 vertical, but the content sits in a ~16:9 "screen", so a 16:9 composition also works.
- One accent colour per piece (orange, lime green), on a dark base, with occasional light-mode inserts for contrast.
- Kinetic typography carries the story. Emphasise 1–2 words per line with the accent colour.
- Beats last 1.5–2.5 s, with glitch, whip and blur transitions and big full-screen word slams for emphasis.

## Premium client re-edits (OPLA 2026 "Beyond the Grades")

Two vertical films were rebuilt from scratch in Remotion from client cuts (`public/input/v1.mp4` and `v2.mp4`, which are git-ignored because they're over 50MB):

| Composition | File | Length | Concept |
|---|---|---|---|
| `V1-YourDot` | `src/v1/V1.tsx` | 50.7 s | One continuous camera move. Dot → wave → layered waves → dot → code braces → phone UI → dot → pathway nodes → 3D starfield + 8,000+ counter → dot → full stop of "Grades." |
| `V2-GetThe60` | `src/v2/V2.tsx` | 54.0 s | Game HUD intro, then one continuous score chart. A custom projection tracks the line head through 8 chapters, then pulls back to reveal the full V-curve and 59/60. |

- **Shared toolkit** (`src/premium/`):
  - `lib.ts`: easing curves and `smoothKeys` (monotone-cubic camera keys).
  - `components.tsx`: `Kinetic` (word-by-word blur reveal with an accent light sweep), `Decode` (scramble text), `FilmLook` (grain + vignette), `Flash`, `Orb`.
  - `fonts.ts`: Inter and JetBrains Mono, loaded from `public/fonts`.
- **Look (current):** warm white paper (`PAPER #FBF7F0`) with ink type (`INK #1C1E24`), set in `src/premium/components.tsx`. `Ambience` adds drifting dust/bokeh and slow warm light leaks, `FilmLook` adds multiply paper grain and a warm vignette, and `Sparkles` is limited to 2 key moments per film. Headlines use a masked line reveal (lines wipe up from a hidden baseline with an easeOutExpo stagger and a light blur).
- **Music (current):** Mixkit free-licence tracks picked by the client: "Staring at the Night Sky" (V1) and "Finding Myself" (V2), in `public/audio/` with `ATTRIBUTION.md`. The splices are in `timeline.json` and use 0.8 s equal-power crossfades. The music `gain_db` is balanced per track before the −14 LUFS master.
- **Skill-driven upgrades:** V1 "8,000+" is a particle formation (`Formation`: glyphs sampled from canvas, burst → swirl gather → glint → implode, streak alpha falls with length; from motion-particles). V2 counts 0→59 on a critically damped curve with fixed digit slots and 0/30/60 axis ticks (from motion-charts). Both titles use a per-character masked reveal (`Kinetic chars`; from kinetic-typography).
- **Audio timelines:** `src/vN/timeline.json` holds the music edit (`[videoStart, musicStart, musicEnd]`) and the SFX cues `[t, name, gainDb, pan, maxDur?]`. A name starting with `@` is a real recorded sample from `public/sfx/` (Mixkit free licence, see `public/sfx/ATTRIBUTION.md`); any other name is synthesised in `mix.py` (`bloom`, `swell`, `riser`, `count`, `chip`…).
- **Mixing:** `python3 -I scripts/audio/mix.py src/v1/timeline.json public/audio/mix-v1.wav`. It ducks the music under blooms and normalises to −14 LUFS. Re-run it after changing any cue.
- **Stills for review:** `node scripts/stills.mjs <compId> <outDir> <seconds…>`.
- **Rendering:** pass `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, because remotion.media is not reachable from the cloud container.
