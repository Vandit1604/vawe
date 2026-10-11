# moth-photogram: brief

A 12 s, 16:9 mood loop: four glowing moths orbit a light in a cyanotype photogram look, filmed through `core/surfaces/lens.js`. No text.

## Inputs

- request: a 12 s 16:9 mood loop of glowing moths in a cyanotype photogram look, no text
- aspect: 16:9
- length: 12 s
- grid: free; the picture sets the rhythm, there are no cuts
- sound: none (no bed, no synth)

## Task

- what: four 3D moths orbit a light; one focus pull moves from the near moth to the far row
- for: people who see it once, muted, in a feed
- message: moths glow in the dark; one pull of focus dissolves the near one into light
- spectacle: 7.2 s, the rack focus from the near moth to the far one (quiet from 4.6 s: wing beats slow)

## Look

White translucent bodies on near-black, one cold blue-grey scale, heavy grain, soft bloom, a cold halation. Palette and devices: `DESIGN.md`.

## Directions

Three directions from three families. The film is one lens look, so they differ in what carries it.

### A

- family: type-led (the film is carried by type)
- sentence: a single huge lowercase word is lit like a photogram while moths cross it
- key frame: the word at 40% of frame height, cream on oxblood, a moth over its middle letter
- palette: oxblood #3a0f14 ground, cream #f3e9dc word
- typeface: Hanken Grotesk
- move: slice (the word is cut by the passing wings)
- thread: the word

### B

- family: object-led (a real thing or the product UI)
- sentence: four 3D moths orbit a light, back-lit on black, filmed through a lens
- key frame: 7.2 s, the near moth soft and bright, the far row sharp
- palette: near-black #010306 ground, cold blue-grey scale up to #ccd8e4
- typeface: none
- move: rack focus
- thread: the moths

### C

- family: graphic-led (shape, colour field, rhythm)
- sentence: cutout moth silhouettes pulse in a repeating grid, flipping colour on each beat
- key frame: a 6 by 4 grid of white silhouettes on forest green, one in lime
- palette: forest green #0c3a1f, white #f4f4f0, lime #b8e04a
- typeface: Anybody
- move: flip (a tile turns over)
- thread: the beat

- picked: B, because the ask is a mood loop with no text, and the lens gives depth and the one big moment (the rack focus) that A and C lack.

## Motion study

The wing stroke and the body path follow public sources, not a hand-keyed guess.

Sources:
- "Hummingbird Moth feeding at 25% speed", PaulJohnson, CC BY 4.0, Wikimedia Commons (1080p, 15 fps file of a 60 fps capture).
- "Taubenschwaenzchen Zeitlupe - Hummingbird Hawk-Moth Slow Motion", Flexmaen, CC BY-SA 3.0, Wikimedia Commons.
- Fabian et al. 2024, Nat Commun, doi 10.1038/s41467-024-44785-3.
- Wood, Putney and Sponberg 2024, J Exp Biol, doi 10.1242/jeb.246840.

| what | measured | source |
|---|---|---|
| wingbeat, Macroglossum | apparent 7.5 frames per beat at 60 fps (8 Hz); it is aliasing, so the true rate is 60 + 8 = about 68 Hz | feeding clip, 4.70 to 5.83 s |
| wingbeat, Manduca hawkmoth | 15 to 27 Hz; 18.6 Hz pitched up, 22.9 Hz pitched down | Wood, Putney and Sponberg 2024 (tethered moths) |
| stroke amplitude | about 110 deg, top near vertical, bottom about 45 deg below the body | feeding clip, 5.03 s (top), 5.30 s (bottom) |
| downstroke share | 3 of 7.5 frames = 43%: the downstroke is faster than the upstroke | feeding clip, 5.57 to 5.77 s |
| fore and hind wing | move as one (the hindwing never separates from the forewing); the wing is narrow at the top of the stroke (pronation) | feeding clip, every frame |
| body in a hover | nearly still; short darts and sideways hops between hovers; heading changes come with each dart | Flexmaen clip, 15.5 to 23.5 s |
| behaviour at a light | moths orbit the light, they do not fly into it; the back tilts toward the light (dorsal light response); orbit direction can swap | Fabian et al. 2024 |
| bank at a light | Noctua moth: median 48 deg (IQR 30.7) near a point light, 13.9 deg without | Fabian et al. 2024 |
| flight speed | tracks under 0.3 m/s were treated as not flying | Fabian et al. 2024 |

Time scale: the shot runs at 1/16 speed (a 480 fps camera played at 30 fps); every part obeys it. Wingbeats per 12 s loop = Hz x 12 / 16: near 16 Hz = 12 beats, mid 20 Hz = 15, far 24 Hz = 18, speck 26.7 Hz = 20. Orbit speed near 0.9 world units/s on screen is about 0.35 m/s real at a 5 cm span. Bank uses g in film units (g x units per metre / 16 squared), capped at 40 deg so the wings stay readable (paper median 48 deg).

| move taken | cut s |
|---|---|
| rack focus (lens dof) | 7.2 |

## Board

One continuous take. The three worlds are beats of one loop, not cuts.

| beat | in s | hold s | cut out |
|---|---|---|---|
| drift | 0 | 4.6 | none |
| quiet | 4.6 | 2.4 | none |
| rack | 7.0 | 5 | loops to 0 |

Spectacle: the rack focus at 7.2 s (also `<meta name="spectacle">`). Quiet before it, 4.6 to 7 s: every moth slows its orbit to 30% of its mean speed and hovers pitched up. Release after: the orbits speed up again and the near moth stays soft.

| cut | move | what carries the eye | camera | depth | handoff |
|---|---|---|---|---|---|
| drift to quiet | wing beats slow | the near moth | none | 4 moths | deliberate cut: no cut, the same moths continue |
| quiet to rack | focus pull | the focus plane | none | 4 depths | iris: focus moves plane to plane |

### Sound

Silent on purpose: no bed, no synth, no effect.

| at s | voice | gain dB | for |
|---|---|---|---|
| none | silent | | no bed, no synth |

## Motion pass

| cut | anticipation (hero) | follow-through, overlap | spacing eased | arcs | secondary action | hold alive | camera still |
|---|---|---|---|---|---|---|---|
| drift to quiet | ok, moths slow into a pitched-up hover | ok, distal forewing lags 0.06 cycle, hindwing 0.02 (coupled) | ok, orbit speed from 1.6x to 0.45x of mean | ok, orbits round the lamp axis with darts | ok, body bob and nod on each downstroke | ok, wings beat 12 to 20 times per loop | ok, static |
| quiet to rack | ok | ok | ok | ok | ok | ok | ok |

What read flat on earlier drafts, and the fix that stays in the page: wings beat at 0.25 to 0.5 Hz on bodies at full speed (one 1/16 time scale for every part); one ellipse per loop (orbit plus darts); heading off the path (heading on velocity, bank from turn, pitch from speed); the near moth sat mid frame during the rack (its orbit phase moved so it hovers low while the focus goes to the far row).
