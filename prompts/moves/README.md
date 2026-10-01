---
when: "you are about to write a text or panel entrance, a transition, an exit, a typing effect or an emphasis, and want the proven version instead of your first idea"
answers: "the built moves as CSS and WAAPI snippets an agent copies, grouped by job, each with its curve from curveToLinear and a 1 s clip"
group: reference
---

# prompts/moves/: proven moves to copy

[RECIPES.md](RECIPES.md) joins these moves into fourteen films (three brand stings and three product
stings, one per direction family, a 15 s launch, a kinetic type line, and six complete videos of 20 to 30 s: problem to fix, AI demo, feature tour, proof, manifesto, brand reveal), with the beat table, the sound cues and the traps at each seam.
Each move file has a `Sound:` line under its snippet: the voice and the second to cue it, or none.

Each move is one markdown file with a 10 to 40 line snippet and a 1 s clip next to it. Choose from
the clip, not the name. Copy the snippet into the page; the numbers are the ones that read well.
Every curve comes from `curveToLinear` in `core/motion/springs.js`, never from a hand-fitted
`cubic-bezier()`. The demo page each clip was rendered from is in `demo/`. Every demo links `demo/demo.css`
(tokens, type scale as a share of frame height, the UI card look); the snippets name its classes, so copy the ones you use.

[LIBRARY.md](LIBRARY.md) lists every approved move in six groups, including the ones still to build.
This index lists the built ones, in the same groups.

## Pick by job

One row per job, best move first. Every built move is in this table.

| job | moves |
|---|---|
| open on a detail, answer with the whole | [pull-back-reveal](pull-back-reveal.md) |
| open on the brand in under 2 s | [logo-sting](logo-sting.md) |
| arrive by flying into a scene | [parallax-dive](parallax-dive.md) |
| land a title or wordmark, soft | [tracking-collapse](tracking-collapse.md), [mask-rise](mask-rise.md), [blur-word-cascade](blur-word-cascade.md), [liquid-displace](liquid-displace.md) |
| type a command, prompt or name | [caret-typing](caret-typing.md), [caret-follow](caret-follow.md) |
| land one hero word on the beat | [scale-punch](scale-punch.md), [letter-stagger](letter-stagger.md), [outline-fill](outline-fill.md), [variable-weight-wave](variable-weight-wave.md) |
| put a picture inside the name | [text-as-mask](text-as-mask.md) |
| decide a name or number on screen | [flap-resolve](flap-resolve.md), [text-scramble-decode](text-scramble-decode.md), [word-swap-slot](word-swap-slot.md), [strikethrough-replace](strikethrough-replace.md) |
| point at one word in a held line | [word-sweep](word-sweep.md), [marker-highlight](marker-highlight.md), [underline-draw](underline-draw.md), [hand-drawn-notes](hand-drawn-notes.md) |
| change what a word means | [weight-morph](weight-morph.md) |
| point at one part of a UI | [spotlight-dim](spotlight-dim.md), [bracket-callout](bracket-callout.md), [ui-focus-zoom](ui-focus-zoom.md) |
| change between shots, hard and fast | [flash-cut](flash-cut.md), [cut-on-motion](cut-on-motion.md), [slice-shift](slice-shift.md), [speed-ramp-freeze](speed-ramp-freeze.md), [smear-stretch](smear-stretch.md) |
| change between shots, soft | [stack-cover](stack-cover.md), [split-reveal](split-reveal.md), [iris-wipe](iris-wipe.md), [luma-matte-dissolve](luma-matte-dissolve.md), [light-leak-transition](light-leak-transition.md) |
| change between shots, graphic | [color-block-wipe](color-block-wipe.md), [type-fill-transition](type-fill-transition.md), [match-cut](match-cut.md), [liquid-wipe](liquid-wipe.md), [shape-morph-wipe](shape-morph-wipe.md), [type-match-cut](type-match-cut.md) |
| change between shots, spatial | [whip-pan](whip-pan.md), [zoom-through](zoom-through.md), [push-blur](push-blur.md), [grid-tile-flip](grid-tile-flip.md), [spin-transition](spin-transition.md) |
| run every beat in and out | [exit-fast](exit-fast.md), [chain-beats](chain-beats.md) |
| lean the camera toward a subject | [push-in](push-in.md), [rack-focus](rack-focus.md) |
| hold a line still to read, the ground alive | [drift-hold](drift-hold.md), [gradient-mesh-field](gradient-mesh-field.md) |
| show a click doing its job | [cursor-click](cursor-click.md), [notification-pop](notification-pop.md), [success-check](success-check.md), [command-palette-summon](command-palette-summon.md) |
| show a real UI arriving | [card-assemble](card-assemble.md), [skeleton-reveal](skeleton-reveal.md), [clip-expand](clip-expand.md), [device-tilt-stage](device-tilt-stage.md) |
| show an AI product answering | [ai-stream-response](ai-stream-response.md) |
| show an AI agent doing several steps | [agent-progress](agent-progress.md) |
| show an edit and its result in one frame | [panel-live-sync](panel-live-sync.md) |
| prove a number | [count-up](count-up.md), [chart-build](chart-build.md) |
| prove a change with a picture | [before-after-wipe](before-after-wipe.md) |
| end on the brand | [wordmark-cascade](wordmark-cascade.md), [logo-sting](logo-sting.md), [mark-trace](mark-trace.md), [shape-trace-morph](shape-trace-morph.md) |
| end quietly | [calm-lockup](calm-lockup.md), [thanks-sweep](thanks-sweep.md) |
| end on an action | [cta-pop](cta-pop.md), [cta-morph-press](cta-morph-press.md) |
| hand the product to the brand | [ui-strip-away](ui-strip-away.md) |
| prove it with customers | [logo-wall](logo-wall.md) |
| show the problem, then the fix | [overwhelm-collapse](overwhelm-collapse.md) |
| show the product works with other tools | [integration-hub](integration-hub.md) |
| make many things read as one gesture | [grid-stagger-wave](grid-stagger-wave.md) |
| tour several features in one space | [pan-stations](pan-stations.md) |
| hit one detail on a beat | [crash-zoom](crash-zoom.md), [echo-trail](echo-trail.md) |
| replace a line with the answer, by impact | [ticker-takeover](ticker-takeover.md) |
| say it works for everyone while the brand stays still | [anchor-cycle](anchor-cycle.md) |
| name the person on screen | [lower-third](lower-third.md) |
| carry a line along a curve | [text-on-path](text-on-path.md) |
| run a spoken line as captions | [caption-karaoke](caption-karaoke.md), [caption-editorial](caption-editorial.md) |

## Groups

One table per group, with a use-when line and a clip for each move, in [GROUPS.md](GROUPS.md). Open the table only when the job row does not settle it.

- [Reveal a title](GROUPS.md#reveal-a-title): land a line of type, soft or hard.
- [Change between shots](GROUPS.md#change-between-shots): cuts, wipes and camera seams.
- [Point the eye](GROUPS.md#point-the-eye): highlight, dim or call out one part.
- [Move the camera](GROUPS.md#move-the-camera): push, pan, dive, rack focus.
- [End a film](GROUPS.md#end-a-film): the last second, quiet or with an action.
- [Product moments](GROUPS.md#product-moments): a click, a card, a number, a real UI arriving.
- [Looks](GROUPS.md#looks): the ten demo looks and their tokens.
