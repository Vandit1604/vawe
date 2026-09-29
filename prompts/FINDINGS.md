---
when: "deciding what vawe copies from the motion-from-code ecosystem (awesome lists, PDoom, claude-animation-skill, HyperFrames, Remotion) and which six golden films to build first"
answers: "a prioritised list of patterns with their source, why each matters for agent-native motion, and where each lands in vawe; the film-type taxonomy; the six golden-film prompts, filled in"
group: engine
---

# FINDINGS: what vawe should copy, in order

Studied 2026-09-30: awesome-ai-motion (355 cases, 62 prompts), awesome-opus-5-5-videos (168
reviewed cases, 1,401 files), PDoomVideo, ClaudeAnimationBase, claude-animation-skill,
Battle-of-Austerlitz-Film, HyperFrames (21 skills) and Remotion's 12 skills.

## The list

1. **The six-section brief is the winning prompt shape.** `<inputs> <direction> <structure> <build>
   <gotchas> <start>`, a named ban list, a stop before code. Seen: twoclipping's two briefs (19,303
   and 1,422 bookmarks, awesome-ai-motion `prompts/2103273003555402193.txt`,
   `prompts/2102554209166000267.txt`). Why: it moves every first-try mistake (defaults, timing,
   assets) into the prompt; the ban list is a list of defaults. Lands: `prompts/` (done); `make
   ideate` should emit this shape for `.prompt.md`.

2. **A frame is a pure function of t: no timers, no carried state, no unseeded random.** Seen: PDoom
   `ANIMATION_GUIDE.md:21`, claude-animation-skill `SKILL.md:8-10` (`frame(ctx,t,i,S)` plus a
   `verify` mode that renders out of order and diffs), HyperFrames `determinism-rules.md`. Why: the
   one contract that lets the renderer seek, blur and parallelise. Lands: house rule in `AGENTS.md`;
   a `make check GATE=seek-purity` that renders two frames out of order and diffs them
   (`canvas-purity.mjs` does this for JSON; the page needs the same).

3. **Guardrails written against the agent's own defaults.** Seen: HyperFrames
   `hyperframes-creative/references/motion-principles.md` ("you default to power2.out", "don't
   start at t=0", "exits faster than entrances"), `rules/spring-pop-entrance.md` ("bouncy back.out
   is the number one turn-off"). Why: a rule that names the default it replaces fires; a rule that
   states a virtue does not. Lands: the banned list in `AGENTS.md`, phrased "you will reach for X;
   do Y".

4. **The chapter contract for subagents.** One file per chapter, one registration call with start
   and end, "edit only your own file, report bugs in shared files", one guide read first. Seen:
   PDoom `ANIMATION_GUIDE.md:5-22`, `src/ch/*.js`. Why: parallel authoring without collisions is
   how a long film fits agent sessions. Lands: `prompts/directors-brief-long-form.md` (done); a
   page library `vawe.mount(page, at)` so `page.html` needs no bundler.

5. **Sound cues come from the picture, synthesised, placed 30 ms early.** Seen:
   claude-animation-skill `scripts/sound.mjs` (sine sweeps, band-limited noise, additive chords),
   `references/sound.md:3-4`; Austerlitz `web/events.js` derives cues from distance. Why: an agent
   cannot hear; a cue column in the shot table is checkable. Lands: `core/audio/kit.mjs` has the
   voices; `prompts/beat-sheet.md` has the column.

6. **The hardest 2 to 4 seconds first, a named reviewer per gate.** Seen: athemeroy
   `docs/visual-effects-fit.md`, `docs/production-brief.md`. Why: the film fails where it is
   hardest; that window is the cheapest test. Lands: `make dev PAGE= FROM= TO=` as the documented
   first render; `prompts/production-brief-acceptance.md`.

7. **A per-element seed so a still element does not boil.** Seen: ClaudeAnimationBase
   `ANIMATION_GUIDE.md:231-234` (`boilSeed(key)`), claude-animation-skill `Pen.begin(name)`. Why:
   boil is wanted on moving lines and wrong on still ones. Lands: `rngFor(name)` beside `rng(seed)`
   in `core/motion/springs.js`.

8. **Ones, twos and holds as an exposure function.** Seen: claude-animation-skill `exposure(t,
   track, fps)`. Why: a drawn look reads at 12 fps while the render is 60; pixel art needs the same
   quantised t. Lands: `exposure(t, fps)` in the page library, one line.

9. **The critic is fresh and rejects by default.** Seen: notdwd (owner-shared); ClaudeAnimationBase
   "look at first, middle, last and both sides of every cut". Why: a judge that saw the session
   grades effort. Lands: `prompts/critique-pass.md` (done), `VAWE_AGENT=<name>` judges (exist).

10. **Search the arsenal before hand-building a named look.** Seen: HyperFrames `hyperframes catalog
    --query`, 400 items ranked with nothing installed. Lands: `make arsenal Q=` exists; the
    templates name it.

11. **Two render tricks we lack.** (a) Text measured before the first seek, not inside it
    (HyperFrames `fitTextFontSize`, `pretext`): await `document.fonts.ready` in `render-page.mjs`,
    add `fitText(el, box)`. (b) Motion blur from fractional frames (Remotion `shutterAngle` 180,
    8 samples; twoclipping's 3 to 4 subframes and `tmix`): the PLAN's subframe blur matches;
    expose the shutter angle as a `<meta>`.

12. **Contagion is measurable, so measure it.** athemeroy `data/prompt-overlap.json`: a 1,750-word
    prompt reused a day later shared 87 percent of its 5-grams. Lands: the anti-contagion variants
    in `prompts/showreel-one-liner.md` (done); a `make check GATE=look-drift` comparing a new film's
    palette and ease histogram to the last five.

## Judgements the task asked for

- **PDoom's guide + chapter subagents:** copy the ownership rule and the guide-first pattern. Skip
  p5.brush, the 24 fps JPEG pipeline and the Windows Chrome path. The karaoke-band rule ("keep faces
  above y 960") is the right shape for our caption band.
- **claude-animation-skill's rigs, pens, sound:** the sound synth, `verify`, the `Pen` seeded-name
  design and `exposure()` are worth page library functions. The rigs (critter, ant, chibi) are a
  house look, not a primitive: skip.
- **HyperFrames' and Remotion's skills:** copy one entry skill plus lean domain skills, the
  determinism contract stated once, silent-failure pitfalls at the top with a code, and the brief
  file as the one routing artefact. Refuse the `data-*` sprawl (`data-start`, `data-track-index`,
  `data-fx-carve`, `class="clip"`, `window.__timelines`, `hyperframes.json`, `*.motion.json`), the
  21-skill 400-file install mechanics, and Remotion's React vocabulary (`useCurrentFrame`,
  `interpolate`, `Sequence`, `AbsoluteFill`). Remotion's skills are under the Remotion licence:
  study only.
- **Fonts:** HyperFrames pre-bundles 18 families as data URIs. Ship Anybody and JetBrains Mono the
  same way so a page never waits on a network font.
- **Film-type taxonomy:** awesome-ai-motion routes by seven categories (product and marketing,
  education and explainers, motion design, pixel art and characters, 3D and interactive, narrative
  films, music and lyrics); athemeroy by seven production paths (code-drawn 2D, explainer, 3D or
  real-time, existing-source transformation, external video model, app or game capture, mixed).
  vawe's `ROUTING.md` has five deliverables and lacks "music and lyrics" and "app or game capture".
  Add both as routes; the library already has their templates.

## The six golden films

1. **canvas seek, 1:1, UI morph** (`ui-morph-loop.md`): "States: button, loader, check, island,
   player, scrub, slider, toggle, tabs, chart, command palette, toast. White field, cobalt `#2563eb`,
   Anybody. 120 BPM, 7 bars, synth only. `films/golden-morph/page.html`. Last frame equals first."
2. **WAAPI/CSS, 16:9, showreel** (`showreel-one-liner.md` variants 2 and 4): "Make a dynamic 15
   second motion graphics film about vawe, the framework for agent-native motion graphics, as if it
   were your showreel. Go all out. Banned: particle bursts, glows, RGB split, camera shake, grid
   floors, bouncy overshoot, dead time. CSS @keyframes and element.animate() only; no seek function.
   `films/golden-reel/page.html`."
3. **canvas seek + captures, 16:9, launch** (`brand-launch-from-url.md`): "URL: `site/app/`.
   Promise: 'Write a scene. Get a film.' Moments: the editor diff, five canvases from one page,
   frame 412 rendered twice, `make ship`. Kit: `themes/vawe.json`. Synth cues, no music. 24 s.
   `films/golden-launch/page.html`."
4. **reference rebuild, 16:9** (`reference-rebuild.md`): "Reference:
   `quality/refs/kinetic-promo/source.mp4`. SPEC.md, then KEEP/CHANGE (CHANGE every string to
   vawe's, every colour to the kit), then rebuild to `films/golden-rebuild/page.html` and loop
   `make next PAGE= REF=` to 0.70."
5. **beat-synced, vertical 9:16** (`music-video-beat-synced.md`): "Song: a royalty-free 120 BPM
   track in `assets/audio/` with its licence. 20 s, 10 bars. Subject: vawe, real captures. Drop at
   bar 3 opens the charcoal code slab with ice-blue `#8fc0ff` type. `films/golden-beat/page.html`,
   `<meta name="spectacle">` at the drop."
6. **story explainer, 4:5, SVG + WAAPI** (`story-explainer.md`): "Source: `site/app/determinism/`.
   Audience: an engineer who has used one video tool. Takeaways: a frame is a function of its
   number; frame 412 is the same in any order; every canvas from one page. 40 s, captions only.
   `films/golden-explainer/page.html`."

## Licence record

MIT: awesome-ai-motion (repo only; prompts third-party), ClaudeAnimationBase, claude-animation-skill.
Apache 2.0: HyperFrames. CC BY 4.0: awesome-opus-5-5-videos. ISC in package.json only: PDoomVideo.
No licence: Battle-of-Austerlitz-Film. Remotion licence (not OSI): Remotion skills. Owner-shared
articles (twoclipping, notdwd, Movez): not redistributable. Nothing verbatim from the last four.
