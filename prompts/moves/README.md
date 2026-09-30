---
when: "you are about to write a text or panel entrance, a transition, an exit, a typing effect or an emphasis, and want the proven version instead of your first idea"
answers: "the built moves as CSS and WAAPI snippets an agent copies, grouped by job, each with its curve from curveToLinear and a 1 s clip"
group: reference
---

# prompts/moves/: proven moves to copy

[RECIPES.md](RECIPES.md) joins these moves into four short films (a brand sting, a product sting, a
15 s launch, a kinetic type line), with the beat table, the sound cues and the traps at each seam.
Each move file has a `Sound:` line under its snippet: the voice and the second to cue it, or none.

Each move is one markdown file with a 10 to 40 line snippet and a 1 s clip next to it. Choose from
the clip, not the name. Copy the snippet into the page; the numbers are the ones that read well.
Every curve comes from `curveToLinear` in `core/motion/springs.js`, never from a hand-fitted
`cubic-bezier()`. The demo page each clip was rendered from is in `demo/`. Every demo links `demo/demo.css`
(tokens, type scale as a share of frame height, the UI card look); the snippets name its classes, so copy the ones you use.

[LIBRARY.md](LIBRARY.md) lists every approved move in six groups, including the ones still to build.
This index lists the built ones, in the same groups.

## Pick by job

One row per job, best move first. Every built move is in this table; the group tables below carry the clips.

| job | moves |
|---|---|
| open on a detail, answer with the whole | [pull-back-reveal](pull-back-reveal.md) |
| open on the brand in under 2 s | [logo-sting](logo-sting.md) |
| arrive by flying into a scene | [parallax-dive](parallax-dive.md) |
| land a title or wordmark, soft | [tracking-collapse](tracking-collapse.md), [mask-rise](mask-rise.md), [blur-word-cascade](blur-word-cascade.md) |
| type a command, prompt or name | [caret-typing](caret-typing.md), [caret-follow](caret-follow.md) |
| land one hero word on the beat | [scale-punch](scale-punch.md), [letter-stagger](letter-stagger.md), [outline-fill](outline-fill.md) |
| put a picture inside the name | [text-as-mask](text-as-mask.md) |
| decide a name or number on screen | [flap-resolve](flap-resolve.md), [word-swap-slot](word-swap-slot.md), [strikethrough-replace](strikethrough-replace.md) |
| point at one word in a held line | [word-sweep](word-sweep.md), [marker-highlight](marker-highlight.md), [underline-draw](underline-draw.md) |
| change what a word means | [weight-morph](weight-morph.md) |
| point at one part of a UI | [spotlight-dim](spotlight-dim.md), [bracket-callout](bracket-callout.md), [ui-focus-zoom](ui-focus-zoom.md) |
| change between shots, hard and fast | [flash-cut](flash-cut.md), [cut-on-motion](cut-on-motion.md), [slice-shift](slice-shift.md), [speed-ramp-freeze](speed-ramp-freeze.md) |
| change between shots, soft | [stack-cover](stack-cover.md), [split-reveal](split-reveal.md), [iris-wipe](iris-wipe.md), [luma-matte-dissolve](luma-matte-dissolve.md) |
| change between shots, graphic | [color-block-wipe](color-block-wipe.md), [type-fill-transition](type-fill-transition.md), [match-cut](match-cut.md), [liquid-wipe](liquid-wipe.md) |
| change between shots, spatial | [whip-pan](whip-pan.md), [zoom-through](zoom-through.md), [push-blur](push-blur.md), [grid-tile-flip](grid-tile-flip.md) |
| run every beat in and out | [exit-fast](exit-fast.md), [chain-beats](chain-beats.md) |
| lean the camera toward a subject | [push-in](push-in.md), [rack-focus](rack-focus.md) |
| keep a quiet frame alive | [drift-hold](drift-hold.md) |
| show a click doing its job | [cursor-click](cursor-click.md), [notification-pop](notification-pop.md), [success-check](success-check.md) |
| show a real UI arriving | [card-assemble](card-assemble.md), [skeleton-reveal](skeleton-reveal.md), [clip-expand](clip-expand.md) |
| change between shots, hard and fast | [flash-cut](flash-cut.md), [cut-on-motion](cut-on-motion.md), [slice-shift](slice-shift.md), [smear-stretch](smear-stretch.md) |
| change between shots, soft | [stack-cover](stack-cover.md), [split-reveal](split-reveal.md), [iris-wipe](iris-wipe.md) |
| change between shots, graphic | [color-block-wipe](color-block-wipe.md), [type-fill-transition](type-fill-transition.md), [match-cut](match-cut.md), [shape-morph-wipe](shape-morph-wipe.md) |
| change between shots, spatial | [whip-pan](whip-pan.md), [zoom-through](zoom-through.md), [push-blur](push-blur.md), [spin-transition](spin-transition.md) |
| show a click doing its job | [cursor-click](cursor-click.md), [notification-pop](notification-pop.md), [command-palette-summon](command-palette-summon.md) |
| show a real UI arriving | [card-assemble](card-assemble.md), [skeleton-reveal](skeleton-reveal.md), [clip-expand](clip-expand.md), [device-tilt-stage](device-tilt-stage.md) |
| show an AI product answering | [ai-stream-response](ai-stream-response.md) |
| prove a number | [count-up](count-up.md), [chart-build](chart-build.md) |
| prove a change with a picture | [before-after-wipe](before-after-wipe.md) |
| end on the brand | [wordmark-cascade](wordmark-cascade.md), [logo-sting](logo-sting.md), [mark-trace](mark-trace.md) |
| end quietly | [calm-lockup](calm-lockup.md), [thanks-sweep](thanks-sweep.md) |
| end on an action | [cta-pop](cta-pop.md) |
| hand the product to the brand | [ui-strip-away](ui-strip-away.md) |
| prove it with customers | [logo-wall](logo-wall.md) |
| show the problem, then the fix | [overwhelm-collapse](overwhelm-collapse.md) |
| show the product works with other tools | [integration-hub](integration-hub.md) |
| make many things read as one gesture | [grid-stagger-wave](grid-stagger-wave.md) |
| tour several features in one space | [pan-stations](pan-stations.md) |
| hit one detail on a beat | [crash-zoom](crash-zoom.md) |

## Reveal a title

| move | use when | snippet | clip |
|---|---|---|---|
| mask rise | a line of type enters from under an invisible edge; the mask box is tall enough for descenders | [mask-rise.md](mask-rise.md) | [mask-rise.mp4](mask-rise.mp4) |
| tracking collapse | a title or wordmark arrives: letters converge from wide tracking while the word sharpens | [tracking-collapse.md](tracking-collapse.md) | [tracking-collapse.mp4](tracking-collapse.mp4) |
| caret typing | a command, a prompt, a name typed in; the caret moves with each character then becomes the next element | [caret-typing.md](caret-typing.md) | [caret-typing.mp4](caret-typing.mp4) |
| letter stagger | a word lands letter by letter, 45 ms apart, on one exact curve | [letter-stagger.md](letter-stagger.md) | [letter-stagger.mp4](letter-stagger.mp4) |
| scale punch | the hero word hits from 1.4x and recoils on the overshoot curve; a full stop pops after it | [scale-punch.md](scale-punch.md) | [scale-punch.mp4](scale-punch.mp4) |
| split-flap resolve | a name or number is decided: each letter is a tile that flips through seeded glyphs on a hinge and locks left to right | [flap-resolve.md](flap-resolve.md) | [flap-resolve.mp4](flap-resolve.mp4) |
| word swap slot | one word in a held sentence rolls through 3 or 4 values and lands; the sentence reflows its width | [word-swap-slot.md](word-swap-slot.md) | [word-swap-slot.mp4](word-swap-slot.mp4) |
| blur word cascade | copy resolves word by word from blur with a slight rise; no mask, so nothing cuts a descender | [blur-word-cascade.md](blur-word-cascade.md) | [blur-word-cascade.mp4](blur-word-cascade.mp4) |
| text as mask | the type is a window onto a rich picture: the frame opens tight on image, pulls back to the title, and the layers keep moving inside the fixed letters | [text-as-mask.md](text-as-mask.md) | [text-as-mask.mp4](text-as-mask.mp4) |
| outline fill | one hero word arrives as an outline, letter by letter, then an accent floods each letter from its baseline on the beat | [outline-fill.md](outline-fill.md) | [outline-fill.mp4](outline-fill.mp4) |
| strikethrough replace | an old word or price is struck through by a tilted line drawn left to right, it dims and shrinks, and the new value rises in beside it character by character | [strikethrough-replace.md](strikethrough-replace.md) | [strikethrough-replace.mp4](strikethrough-replace.mp4) |
| grid stagger wave | a title arrives with many things around it: a grid of tiles enters in a wave by distance from the title, 70 ms per tile, each tile pushed out from the source on a spring | [grid-stagger-wave.md](grid-stagger-wave.md) | [grid-stagger-wave.mp4](grid-stagger-wave.mp4) |

## Change between shots

| move | use when | snippet | clip |
|---|---|---|---|
| cut on motion | a moving shape carries the eye across a hard cut into a new scene | [cut-on-motion.md](cut-on-motion.md) | [cut-on-motion.mp4](cut-on-motion.mp4) |
| push with blur | a panel pushes in with a directional blur that follows its speed, set per frame | [push-blur.md](push-blur.md) | [push-blur.mp4](push-blur.mp4) |
| exit fast | the pair every beat needs: arrive fast and land soft, leave faster and shorter | [exit-fast.md](exit-fast.md) | [exit-fast.mp4](exit-fast.mp4) |
| chain beats | beats overlap: the next starts at 65% of the last and one element hands off (dot, bar, rule); use once per film | [chain-beats.md](chain-beats.md) | [chain-beats.mp4](chain-beats.mp4) |
| whip pan | the next shot is to the side: a fast sideways pan with a blur that follows its speed hides the seam | [whip-pan.md](whip-pan.md) | [whip-pan.mp4](whip-pan.mp4) |
| match cut | one shape crosses a scene change at the same place, size and angle and changes meaning (spinner ring, finished ring) | [match-cut.md](match-cut.md) | [match-cut.mp4](match-cut.mp4) |
| iris wipe | a circle closes on the click or mark the eye is on and uncovers the next scene | [iris-wipe.md](iris-wipe.md) | [iris-wipe.mp4](iris-wipe.mp4) |
| flash cut | a hard cut on a beat: a three-frame white peak hides the cut and the new shot settles from overexposed | [flash-cut.md](flash-cut.md) | [flash-cut.mp4](flash-cut.mp4) |
| stack cover | the next panel slides over the last one: the old shot moves a quarter as far and dims, a shadow grows with the overlap | [stack-cover.md](stack-cover.md) | [stack-cover.mp4](stack-cover.mp4) |
| split reveal | the frame opens like doors onto the next shot: two halves part, the gap starts dark and lights as they clear | [split-reveal.md](split-reveal.md) | [split-reveal.mp4](split-reveal.mp4) |
| slice shift | horizontal bands slide off in alternation, staggered with seeded jitter and speed blur, and uncover the next shot | [slice-shift.md](slice-shift.md) | [slice-shift.mp4](slice-shift.mp4) |
| type fill transition | a word scales into one letter until its stem is the whole frame; that colour is the next shot's ground | [type-fill-transition.md](type-fill-transition.md) | [type-fill-transition.mp4](type-fill-transition.mp4) |
| colour block wipe | a solid brand-colour block sweeps across the cut with a slanted, blurred leading edge; a darker block trails it and the next shot sits behind | [color-block-wipe.md](color-block-wipe.md) | [color-block-wipe.mp4](color-block-wipe.mp4) |
| zoom through | the camera dives into a UI part until it fills the frame and the next shot comes out of it, with real zoom blur from stacked exposures | [zoom-through.md](zoom-through.md) | [zoom-through.mp4](zoom-through.mp4) |
| speed ramp freeze | a beat needs weight before a change: story time is an integral of a speed curve, so the ball, its squash and the camera slow to a sharp near-hold on the hit frame, then snap on at 3.5x with blur | [speed-ramp-freeze.md](speed-ramp-freeze.md) | [speed-ramp-freeze.mp4](speed-ramp-freeze.mp4) |
| liquid wipe | a gooey organic edge floods the frame onto the next shot: bars with round heads fuse through a goo filter into a wet edge, and an accent band leads the next shot | [liquid-wipe.md](liquid-wipe.md) | [liquid-wipe.mp4](liquid-wipe.mp4) |
| grid tile flip | a wall of tiles flips in a wave to the next shot: one perspective for the grid, each tile lifts toward the camera and darkens edge-on, shot A on the front and shot B on the back | [grid-tile-flip.md](grid-tile-flip.md) | [grid-tile-flip.mp4](grid-tile-flip.mp4) |
| luma matte dissolve | the next shot arrives through its own brightness: an SVG luminance matte with a falling threshold shows its bright areas first, then midtones, and its dark ground last | [luma-matte-dissolve.md](luma-matte-dissolve.md) | [luma-matte-dissolve.mp4](luma-matte-dissolve.mp4) |
| smear stretch | an elastic cut: shot A's content stretches into streaks on an ease-in, the cut lands at the peak, and shot B snaps back from the streak on an under-damped spring, thinning and bulging like rubber | [smear-stretch.md](smear-stretch.md) | [smear-stretch.mp4](smear-stretch.mp4) |
| shape morph wipe | the next shot grows out of a shape on screen: the mask is born as a dot, grows as a circle, then widens and squares off into a rounded card and past the frame | [shape-morph-wipe.md](shape-morph-wipe.md) | [shape-morph-wipe.mp4](shape-morph-wipe.mp4) |
| spin transition | a 90 degree camera roll carries the cut: A rolls to 45 degrees speeding up, B rolls in from -45 and lands soft, scaled to always cover the frame, with rotational blur from 16 stacked exposures | [spin-transition.md](spin-transition.md) | [spin-transition.mp4](spin-transition.mp4) |

## Point the eye

| move | use when | snippet | clip |
|---|---|---|---|
| word colour sweep | the accent runs word by word in reading order and stays on the target word | [word-sweep.md](word-sweep.md) | [word-sweep.mp4](word-sweep.mp4) |
| weight morph | one word gets heavier on a real variable-font axis; the glyphs reshape, nothing is scaled | [weight-morph.md](weight-morph.md) | [weight-morph.mp4](weight-morph.mp4) |
| marker highlight | a highlighter bar wipes behind one phrase and the text flips dark for contrast | [marker-highlight.md](marker-highlight.md) | [marker-highlight.mp4](marker-highlight.mp4) |
| underline draw | a line draws under the key word, left to right, fast in and slow out | [underline-draw.md](underline-draw.md) | [underline-draw.mp4](underline-draw.mp4) |
| bracket callout | corner brackets fly in and snap onto a word or a UI part with a small overshoot | [bracket-callout.md](bracket-callout.md) | [bracket-callout.mp4](bracket-callout.mp4) |
| spotlight dim | the frame dims around one target: a hole closes from the full frame onto it and its shadow is the dim | [spotlight-dim.md](spotlight-dim.md) | [spotlight-dim.mp4](spotlight-dim.mp4) |

## Move the camera

| move | use when | snippet | clip |
|---|---|---|---|
| push in | a slow scale toward the subject over a beat; the ground scales less so the layers separate | [push-in.md](push-in.md) | [push-in.mp4](push-in.mp4) |
| UI focus zoom | zoom onto one part of a captured UI: the cursor lands, then one translate and one scale put the part in the middle | [ui-focus-zoom.md](ui-focus-zoom.md) | [ui-focus-zoom.mp4](ui-focus-zoom.mp4) |
| caret follow | the camera trails the typing caret on a soft spring, so a long line stays readable at close range | [caret-follow.md](caret-follow.md) | [caret-follow.mp4](caret-follow.mp4) |
| pull back reveal | open tight on a detail and pull back to the whole; scale runs on a log path so the speed reads even | [pull-back-reveal.md](pull-back-reveal.md) | [pull-back-reveal.mp4](pull-back-reveal.mp4) |
| parallax dive | the camera flies forward through layers at real depths: near layers rush past, the far ground barely moves | [parallax-dive.md](parallax-dive.md) | [parallax-dive.mp4](parallax-dive.mp4) |
| rack focus | focus moves from one depth layer to another: near melts, far resolves, pinpoint lights swell into discs; use once per film | [rack-focus.md](rack-focus.md) | [rack-focus.mp4](rack-focus.mp4) |
| drift hold | a very slow seeded drift per layer so a quiet frame never sits dead | [drift-hold.md](drift-hold.md) | [drift-hold.mp4](drift-hold.mp4) |
| pan stations | several steps or features as one continuous place: the camera pans between stations on one wide canvas and holds at each, a rail and a parallax dot grid carrying the space between them | [pan-stations.md](pan-stations.md) | [pan-stations.mp4](pan-stations.mp4) |
| crash zoom | one detail hits on a beat: a 0.13 s ease-in slam to 2.6x with real zoom blur from 16 stacked exposures, a 5 percent overshoot and a short recoil | [crash-zoom.md](crash-zoom.md) | [crash-zoom.mp4](crash-zoom.mp4) |

## End a film

| move | use when | snippet | clip |
|---|---|---|---|
| logo sting | a short logo hit: the mark lands, one light band crosses it, the word opens from behind it, a slow push runs to the last frame; use once per film | [logo-sting.md](logo-sting.md) | [logo-sting.mp4](logo-sting.mp4) |
| wordmark cascade | the name is the last beat: letters fall onto a rail with shrinking gaps, the full stop lands last, an accent bar runs the rail; use once per film | [wordmark-cascade.md](wordmark-cascade.md) | [wordmark-cascade.mp4](wordmark-cascade.mp4) |
| mark trace | a line mark draws itself with a riding tip, thickens to its final weight, then an accent bar runs the finished mark; use once per film | [mark-trace.md](mark-trace.md) | [mark-trace.mp4](mark-trace.mp4) |
| calm lockup | the quiet ending: logo and line settle slowly while two lights drift behind and the lockup floats; use once per film | [calm-lockup.md](calm-lockup.md) | [calm-lockup.mp4](calm-lockup.mp4) |
| cta pop | the call to action pops in under its line on the overshoot curve, the one accent, and the arrow leans to invite the click | [cta-pop.md](cta-pop.md) | [cta-pop.mp4](cta-pop.mp4) |
| thanks sweep | a closing line sweeps in on a soft mask edge with an accent bar riding the edge, then drifts; use once per film | [thanks-sweep.md](thanks-sweep.md) | [thanks-sweep.mp4](thanks-sweep.mp4) |
| UI strip away | the last beat hands the product to the brand: the UI leaves layer by layer, top layer first, while the sidebar mark travels to the middle and becomes the lockup | [ui-strip-away.md](ui-strip-away.md) | [ui-strip-away.mp4](ui-strip-away.mp4) |
| logo wall | the proof beat before the call to action: three lanes of hairline cells with invented logos slide in from alternate sides on a stagger, blurred to their speed, and keep drifting after they land | [logo-wall.md](logo-wall.md) | [logo-wall.mp4](logo-wall.mp4) |

## Product moments

| move | use when | snippet | clip |
|---|---|---|---|
| clip expand | a panel or capture grows out of one point the eye is already on | [clip-expand.md](clip-expand.md) | [clip-expand.mp4](clip-expand.mp4) |
| cursor click | a cursor travels a bowed path to a control, the control lights and dips on the press, the label rolls to its result, the cursor leaves | [cursor-click.md](cursor-click.md) | [cursor-click.mp4](cursor-click.mp4) |
| count up | a number is the proof: each digit is a wheel that rolls to its value with speed blur, then a delta chip and a sparkline | [count-up.md](count-up.md) | [count-up.mp4](count-up.mp4) |
| card assemble | a UI card builds: the shell lands, then each part arrives from the side of its slot, the accent action last | [card-assemble.md](card-assemble.md) | [card-assemble.mp4](card-assemble.mp4) |
| notification pop | a banner drops in on the overshoot curve, icon then text, holds a second and leaves faster than it came | [notification-pop.md](notification-pop.md) | [notification-pop.mp4](notification-pop.mp4) |
| chart build | gridlines draw, bars rise in sequence, the newest bar turns accent and its value tag pops on it | [chart-build.md](chart-build.md) | [chart-build.mp4](chart-build.mp4) |
| before after wipe | the claim is a change: one card in two states, and a scan line carries the after state (accent, real numbers) over the grey before on the iris curve | [before-after-wipe.md](before-after-wipe.md) | [before-after-wipe.mp4](before-after-wipe.mp4) |
| skeleton reveal | grey blocks in the shape of the content shimmer under one moving light, then each region resolves into real content, 200 ms apart; use once per film | [skeleton-reveal.md](skeleton-reveal.md) | [skeleton-reveal.mp4](skeleton-reveal.mp4) |
| AI stream response | a typed prompt is sent up into the thread, three dots work, then the answer streams in 1 to 3 word chunks with a caret on the newest chunk | [ai-stream-response.md](ai-stream-response.md) | [ai-stream-response.mp4](ai-stream-response.mp4) |
| overwhelm collapse | the problem turns to the fix: 26 cards, chips and notifications flood the frame on a shrinking gap, then a fast cubic-in collapse pulls them into one point and one clean element opens | [overwhelm-collapse.md](overwhelm-collapse.md) | [overwhelm-collapse.mp4](overwhelm-collapse.mp4) |
| success check | a button resolves into a drawn check: the press dips, the width closes to a circle, the check draws on one dash, the circle lands on a small spring and one ring leaves it | [success-check.md](success-check.md) | [success-check.mp4](success-check.mp4) |
| integration hub | the "works with your tools" beat: invented tool logos fly in on curved paths and land on a ring around the product mark, then every wire draws in the same frames and pulses ride into the hub | [integration-hub.md](integration-hub.md) | [integration-hub.mp4](integration-hub.mp4) |
| device tilt stage | the product as an object: the UI on a CSS 3D laptop that rises from a steep top-down angle, turns and settles on a spring, the glass reflection sliding with the lid's angle | [device-tilt-stage.md](device-tilt-stage.md) | [device-tilt-stage.mp4](device-tilt-stage.mp4) |
| command palette summon | the keyboard-first beat: the app dims, a Cmd+K palette drops in on a spring, a query types, non-matching rows collapse to zero height, Enter presses the chosen row and the palette leaves fast | [command-palette-summon.md](command-palette-summon.md) | [command-palette-summon.mp4](command-palette-summon.mp4) |

`bin/vawe moves` renders only the clips whose demo, `demo/demo.css` or imported `core/` files changed (hashes in `clips.lock.json`). `--only <move>` forces one clip, `--all` forces every clip.

Two rules the snippets already obey, so keep them when you adapt one: an exit keyframe has no
`from` (a `from` fills backwards over the entrance and hides it), and `var()` never goes inside the
`animation` shorthand (write the longhands; Chromium drops the whole declaration otherwise).

The demo look was polished with two ui-skills: `jakubkrehel/better-ui` (concentric radius, layered shadow over border for depth, optical alignment, tabular numbers, icon stroke matched to text weight) and `emilkowalski/animate` (only to check the approved motion, nothing rewritten).
Rejected from them: their default UI sizes and 300 ms duration caps (film type needs a 6 percent cap height and holds), the 0.96 press scale and blur-in icon values as global rules (each move keeps its own tuned numbers), and reduced-motion and hit-area advice (a film has no input).

## Looks

A demo sets its look on the html tag (`<html data-aspect="16:9" data-look="paper">`). The look is a full token set in `demo/demo.css` (ground, surface, ink, muted, accent, line, fonts, radius, shadow); no class or timing changes. The snippets stay neutral. No look is a house style: pick the one that shows your move best, and let the film keep one look per scene.

| look | what it is | fonts | accent | clips that use it |
|---|---|---|---|---|
| vawe (default) | the dark brand: #16151a ground, layered shadow, white type | Archivo, JetBrains Mono | cobalt | flap resolve, weight morph, iris wipe, pull back reveal, logo sting, count up, ui strip away, speed ramp freeze |
| paper | warm editorial: cream ground, a serif display, soft shadow | Instrument Serif, Courier Prime | vermilion | mask rise, exit fast, marker highlight, drift hold, thanks sweep, card assemble, strikethrough replace |
| field | one saturated green ground, white type, no dark surfaces | Bricolage Grotesque | lemon | letter stagger, whip pan, word sweep, parallax dive, cta pop, notification pop, outline fill, liquid wipe |
| swiss | off-white, black hairlines instead of shadow, tight radius | Geist, Geist Mono | red | tracking collapse, match cut, underline draw, push in, mark trace, chart build, skeleton reveal, logo wall |
| soft | pastel product UI: lavender ground, white cards, wide diffuse shadow | Plus Jakarta Sans | violet | word swap slot, push blur, bracket callout, ui focus zoom, cursor click, before after wipe, success check |
| night | deep indigo to plum gradient with 6 percent grain | Manrope, Unbounded | amber | blur word cascade, flash cut, spotlight dim, rack focus, calm lockup, clip expand, ai stream response, luma matte dissolve |
| brutal | acid yellow, thick black borders, hard offset shadow, wide heavy grotesk | Anybody, Geist Mono | blue | scale punch, cut on motion, wordmark cascade, text as mask, overwhelm collapse |
| terminal | near-black green, one mono face for all text | JetBrains Mono | phosphor green | caret typing, chain beats, caret follow, grid tile flip |
| vawe (default) | the dark brand: #16151a ground, layered shadow, white type | Archivo, JetBrains Mono | cobalt | flap resolve, weight morph, iris wipe, pull back reveal, logo sting, count up, ui strip away, integration hub, spin transition |
| paper | warm editorial: cream ground, a serif display, soft shadow | Instrument Serif, Courier Prime | vermilion | mask rise, exit fast, marker highlight, drift hold, thanks sweep, card assemble, pan stations |
| field | one saturated green ground, white type, no dark surfaces | Bricolage Grotesque | lemon | letter stagger, whip pan, word sweep, parallax dive, cta pop, notification pop, outline fill, smear stretch |
| swiss | off-white, black hairlines instead of shadow, tight radius | Geist, Geist Mono | red | tracking collapse, match cut, underline draw, push in, mark trace, chart build, skeleton reveal, crash zoom |
| soft | pastel product UI: lavender ground, white cards, wide diffuse shadow | Plus Jakarta Sans | violet | word swap slot, push blur, bracket callout, ui focus zoom, cursor click, before after wipe, command palette summon |
| night | deep indigo to plum gradient with 6 percent grain | Manrope, Unbounded | amber | blur word cascade, flash cut, spotlight dim, rack focus, calm lockup, clip expand, ai stream response, device tilt stage |
| brutal | acid yellow, thick black borders, hard offset shadow, wide heavy grotesk | Anybody, Geist Mono | blue | scale punch, cut on motion, wordmark cascade, text as mask, grid stagger wave |
| terminal | near-black green, one mono face for all text | JetBrains Mono | phosphor green | caret typing, chain beats, caret follow, shape morph wipe |

Rules for a new look: ink, muted and on-accent text pass 4.5:1 on their surface, accent used as text passes 3:1 (large type only); no glow on text; a gradient ground carries grain. The `paper` token pair (`--paper`, `--paper-ink`, `--paper-muted`) is the second ground a look uses for a cut or a wipe into a contrasting scene.

The looks were shaped with `leonxlnx/soft-skill` (premium type, nested depth, soft diffuse shadow, grain on gradients). Rejected from it: its banned-font list (Inter and Helvetica are not why a film looks cheap), the nav, scroll and hover rules (a film has no input), the 2rem squircle radius as a default (each look sets its own), and `backdrop-blur` (a film draws no glass).
