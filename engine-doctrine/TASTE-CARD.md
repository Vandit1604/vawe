# vawe taste card: short motion-graphics films

One page, CSS and WAAPI, 5 to 40 s. The author reads this at the brief. The judge scores against
the same 15 rules and the same 5 anti-patterns. Every rule is observable from frames or from an
ffmpeg measurement. Evidence tags: **feedback** (review notes on our films), **judge** (fresh judges
of 2026-09-30: judge1 on a private 5 s sting, judge2 on its second version), **ref** (the liked
kinetic-promo film, `quality/refs/kinetic-promo/beats.md`) and **doc** (`engine-doctrine/RULES/*.md`, `CRAFT/*.md`,
`TASTE.md`). No source outranks another: where two disagree, the frames and the measurements decide.

## The 15 rules

| # | Rule (do X / never Y) | How the judge checks | Source |
|---|---|---|---|
| 1 | Show the subject in the first frame: the brand colour or the carrying element is visible by 0.1 s. Never an empty ground for the first 0.5 s. | Frame at 0.1 s has a subject. | judge1: sting-5s near-black 0–0.5 s, hook 5/10. judge2: v2 "tiny dot", hook 6/10. ref: star at frame 0. |
| 2 | Turn the world every 1–2 beats: a new element, a cut or a ground swap at most every 2 s. Never one colour field with one lockup held longer than 2 s, and never a static frame in the last 1 s. Cut any beat the viewer would not miss. | Count identical adjacent tiles on the 4 fps sheet: at most 8 in a row, at most 4 at the tail. | feedback: "the world should turn every 1-2 beats; 7 beats on one colour field are events, not scenes". vawe-sting: cobalt held 2.3–5.0 s. judge1: static 1.1 s tail. judge2: 1.4 s static lockup. ref: ground inverts at 5.5, 7.7, 19.3, 21.3 s; a new word cuts in every 0.5–1.5 s. doc TASTE.md: "every frame must fight for its value". |
| 3 | One element carries through: the thing that opens the film becomes the next thing (the caret writes, then expands), and each beat shows a real thing, not a word in a box. Never dot, then arch, then wordmark, then tagline, each in turn; never a slogan on black. | Trace one object across the sheet from row 1 to the last row. | feedback: "the caret writes, then expands" (vawe-sting); "it shows so little" (launch film). judge2: "one element after another = template", 6/10. doc TASTE.md: show a real artifact, "produced, not generated". |
| 4 | Every mark rides the thing it belongs to. Never a dot or shape that sits still while its parent moves, and never a dot that points at nothing. | Any dot: name its parent and confirm it moves with it. | feedback: "The blue dot is stationary." judge2: still dot 1.0–1.6 s, stray dot at 4.6 s. |
| 5 | Entrances ease out on a strong curve and exits run shorter and accelerate. Never `ease-in` on an entrance, never an exit as long as its entrance, never a `scale(0)` start (use 0.9–0.97 with opacity 0). | Count the frames of one entrance and its exit on the sheet; frame 1 of an entrance already shows most of the move. | feedback 2026-09-11: "exits faster than entrances, with an accelerating ease". doc MOTION-STANDARDS: `easeOutQuint` default, never ease-in on an entrance, zero `scale: 0`. doc banned-defaults: "an exit as slow as its entrance". |
| 6 | Real physics, not an imitation: a spring or exponential as sampled WAAPI keyframes or `linear()` with 8 or more stops, and a named effect that looks like its real-world thing (a flap has a hinge, perspective and shading). Never one `cubic-bezier` sold as an exponential, never a glyph scramble sold as a flap. | Frame 1 of a move shows no jump; the move does not stop early; a full frame mid-effect matches the physical object. | feedback: "CSS curves must be smooth (never approximate an exponential with cubic-bezier)"; "a flap must look like a flap" (commit f67c43549). |
| 7 | A reveal mask clears the glyphs: pad the clip box at least 0.3 em below the baseline and above the cap height. Never letters cut by their own reveal. | Full frame mid-reveal: every descender is whole. | feedback: "letters cut by their reveal". judge1: sting-5s 2.5 s, descenders chopped. |
| 8 | Speed is a voice: every move sits in a named band (energy 0.15–0.3 s, professional 0.3–0.5 s, gravity 0.5–0.8 s; cinematic 0.8–2 s only when the film has the seconds), the slowest beat runs at least 3x the fastest, and a group enters on a 30–80 ms stagger. Never every move at one duration, never a group that lands on one frame, never one stagger spacing on every reveal. | List each move's frame count on the sheet; the max/min ratio is 3 or more. | doc speed-bands: four bands, 3x rule. doc banned-defaults and MOTION-STANDARDS: stagger 30–80 ms (engine default 45 ms). doc TASTE.md: `uniform-cadence` reads as template. feedback: "more done in 5 seconds, quick continuous motion". |
| 9 | Readable: a line the viewer must read has a cap height of at least 6% of frame height (about 65 px at 1080p) and holds fully legible for at least max(1.2 s, words/3 s); prose holds words x 0.6 s. When a hold is short, add hold time, never slow the move. Never a tagline at 4% of the frame, never a change faster than a viewer can read. | Measure the cap-height band in one full frame; count legible tiles on the sheet (5 or more at 4 fps). | judge1: 50 px tagline, fix 64–72 px. judge2: "about 4% of frame height". feedback vawe-flow-2: "a little too fast", "still too fast", chose the 15% slower cut. doc readable-hold: 1.2 s floor, words/3, words x 0.6 s, "the fix is always a hold". |
| 10 | At every seam: change axis or direction from the previous seam, and land the incoming subject within 0.30 of the frame diagonal of where the eye was on the outgoing frame. Never three transitions that travel the same way, never a crossfade as the only transition, never a jump across the frame followed by a beat shorter than the film's median beat. | Compare the last frame before and the first frame after each cut: direction, and the focal point's distance. | feedback vawe-flow-2: "Monotonous." doc banned-defaults: change axis at every seam, a cut on the beat or a match on a shape. doc EYE-TRACE: `JUMP_FAR = 0.30`, `no-time-to-catch-up`. |
| 11 | Point the eye: one focal point per frame, one accent colour per frame, per-word colour on one or two words per line, and name what each device points at. Never two things fighting for attention, never everything centred at equal weight, never a colour that decorates nothing. | Each coloured word is the word the beat is about; the brightest and largest thing in the frame is the subject. | feedback 2026-09-11: "every device points the eye". ref: "design", "Simple.", "expensive" coloured, the rest white. doc banned-defaults: one focal point off-centre, one accent per frame. doc EYE-TRACE: the eye ranks brighter > larger > in focus > moving. |
| 12 | vawe's own films: ground `#16151a`, white type, the cobalt accent sparingly; any other brand: the kit's face and surface from `node scripts/brand/kit.mjs <url> <name> --init`. Never a full-frame cobalt flood as the ground, never Inter or Space Grotesk without a brand reason, never pure `#000`/`#fff` the brief did not ask for. | No frame where the accent covers the whole frame; the font and ground trace to the kit. | feedback: "vawe is not blue: dark ground #16151a, white, the accent sparingly". vawe-sting 2.3–5.0 s is full cobalt. doc banned-defaults: the kit's face, the kit's surface. |
| 13 | Sound is subtle: true peak at or below -10 dBFS, integrated loudness about -20 LUFS, quiet ticks and one soft swell. Never a riser, pluck, whoosh, impact or chime. | `ffmpeg -af ebur128=peak=true`. | feedback: "I don't like the sounds at all; use subtle sounds." judge1: -1.7 dBFS, -13.8 LUFS, sound 4/10. judge2: -10.3 dBFS, -19.9 LUFS, sound 8/10. |
| 14 | No generated tells: never gradient text, never a cyan/purple gradient the brand does not own, never corner labels or frame borders, never glow on UI text, never particle bursts, shockwave rings, RGB split, camera shake or lens flares. A gradient the brief asks for is clean: 1–2% grain on dark gradients, no banding rings, no straight edge inside a glow. | Full frame at the darkest moment and at the brightest glow; scan every frame for the listed effects. | doc banned-defaults, Look and Motion tables. judge1: banding rings at 0.6 s; vertical glow seam at x=860 at 2.5 s. |
| 15 | Motion explains, never decorates: one entrance per beat and it is a move that says where the thing came from (origin at its trigger, a wipe on the motion, a match on a shape). Never everything fading in, never a bouncy overshoot the brief did not ask for. | Each entrance has a direction or origin the judge can name; no beat where every element is an opacity fade. | doc banned-defaults: "everything fading in", "bouncy overshoot". doc MOTION-STANDARDS: origin-aware motion, "motion is an explanation of what just happened". feedback: "one element carries through". |

### Doc rows not kept, and why

- banned-defaults "a logo slam at the end: the wordmark held still, 1.5 s". Contradicted by rule 2 (the world turns) and by judge1's static 1.1 s tail finding. A wordmark may land and hold, but something still moves in the last 1 s.
- banned-defaults "a cyan/purple gradient" as an outright ban. The Aurel brief asked for rich gradients and judge1 scored colour 8/10, so the doc's own escape valve (`authoring.allow` + `_why`) applies; the card keeps the ban for gradients the brand does not own.
- MOTION-STANDARDS "UI animations stay under 300 ms" and the reduced-motion and interruption rows. The doc itself says they do not transfer to film.
- EYE-TRACE's retired gate, its weights and `RECOVER = 0.30 s`. Only the two eye checks that a judge can make by eye are kept (rule 10).
- speed-bands' JSON recipes and readable-hold's gate codes. The numbers are kept, the syntax is not.

## The 5 anti-patterns, with a frame from our films

Frames live in `engine-doctrine/taste-card/`. Each comes from a private film, so the text names the film and the time.

### A. The empty opening
![A-empty-opening](taste-card/A-empty-opening.jpg) a 5 s sting (private) at 0.1 s. A dark mesh, no subject. The dot
appears at about 0.5 s. Breaks rule 1.
Fix: put the lit dot, or the first colour bloom, in frame 0. Start the sound at 0 as well.

### B. The reveal cuts the letters
![B-reveal-cuts-letters](taste-card/B-reveal-cuts-letters.jpg) a 5 s sting (private) at 2.5 s. "Colour, switched" rises
through a hard horizontal mask; the descenders and the top of "switched" are sliced flat. A straight
glow seam is also visible at x≈860, left of "aurel". Breaks rules 7 and 14.
Fix: pad the mask box 0.3 em past the glyph bounds, or reveal with blur and translate and no clip
edge. Remove the clipped edge on the glow layer.

### C. The stray dot
![C-stray-dot](taste-card/C-stray-dot.jpg) its second version (private) at 4.6 s. A white dot sits below "r",
detached from the arch and the wordmark, while the arch's sweep plays. Breaks rule 4.
Fix: the dot is the carrying element. Let it travel into the "on." accent, or into the arch's sweep,
and delete it the moment it points at nothing.

### D. One colour field for half the film
![D-one-field-held](taste-card/D-one-field-held.jpg) the vawe sting (private) at 3.5 s. The scene cuts stop at
2.3 s; the same cobalt lockup holds until 5.0 s, 2.7 s of a 5 s film, and the whole frame is the
accent colour. Breaks rules 2 and 12.
Fix: ground `#16151a` with white type; cobalt only on the caret. Swap the ground or cut a new element
within 2 s of the expansion, and keep something moving in the last 0.5 s.

### E. The static lockup tail
![E-static-tail](taste-card/E-static-tail.jpg) a 5 s sting (private) at 4.5 s. Arch, wordmark and tagline landed
one after another, then nothing moves from 3.9 s to 5.0 s; the tagline cap height is about 4.6% of
the frame. Breaks rules 2, 3 and 9.
Fix: carry one object through the lockup (the dot lights "on." at about 3.6 s), raise the tagline to
65 px or more, and end on that motion, not on a hold.

## How the author uses this card

1. Read the 15 rules and the 5 frames before you write the concept. Name the carrying element (rule 3), the eye path (rule 11) and each move's speed band (rule 8) in the plan.
2. Draft, then make the dense sheet: `ffmpeg -vf "fps=4,scale=320:-1,tile=5x4"` on the draft render, plus full frames at 0.1 s, mid-reveal and the last 0.5 s.
3. Check each rule against the sheet in order 1 to 15 and write the time stamp of any break. Measure sound with `ebur128=peak=true`.
4. Compare each of your frames with the five anti-pattern frames. If a frame of yours looks like one of them, apply that fix before anything else.
5. Ship only when all 15 rules hold. The judge scores the same 15 rules; a rule you skipped is the first one it will name.
