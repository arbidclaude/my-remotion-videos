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
