# Scene quick reference

Everything needed to write a good scene, in one read. Call `vawe_guide` with `detail: "full"` only
when you need a prop this page does not list.

## Shape

```json
{
  "module": "scene",              // required, always exactly this
  "theme": "vawe",                // see THEMES below
  "aspect": "16:9",               // 16:9 | 9:16 | 1:1 | 4:5
  "duration": 12.0,               // seconds
  "audio": { "silent": true },    // silence unless you deliberately want a bed
  "layers": [ ... ]
}
```

Canvas is **1920x1080** for 16:9 and **1080x1920** for 9:16. Coordinates are absolute pixels.

## Layers

Every layer takes `start` and `duration` (seconds), plus `x` `y` `w` `h`.

```json
{ "type": "text", "text": "Ship it", "x": 200, "y": 440, "w": 1520, "align": "center",
  "size": 120, "font": "sans", "weight": 700, "color": "#ffffff",
  "anim": "rise", "enterDur": 0.6, "start": 0.2, "duration": 3 }

{ "type": "rect", "x": 0, "y": 0, "w": 1920, "h": 1080, "bg": "#0d0f13", "start": 0, "duration": 12 }

{ "type": "image", "src": "/assets/...", "x": 250, "y": 90, "w": 600, "h": 900,
  "radius": 20, "ken": { "from": 1.0, "to": 1.08 }, "filter": "thermal",
  "anim": "fade", "start": 0, "duration": 4 }
```

Types: `text` `count` `image` `group` `rect` `glow` `cursor` `clip` `html` `component` `board` `doc`
`shader` `lottie` `paint` `raymarch` `three`

`font` takes a ROLE, not a family: `sans` · `serif` · `mono`.

## Your own images and fonts

Call `vawe_upload` with the file base64 encoded. It returns a `src` to drop straight into a layer.

```json
{ "type": "image", "src": "/.vawe-data/uploads/…/<hash>.png",
  "x": 760, "y": 380, "w": 400, "h": 400, "anim": "fade", "start": 0.3, "duration": 3 }
```

png · jpg · webp · gif · svg · woff2 · ttf · otf, up to 12MB. The type is read from the file itself,
so the filename does not matter. Re-uploading the same file is free and returns the same path.

A logo reads at about **7% of frame height** and never below 5%. On a 1080-tall frame that is 75 to
150px. Sized like a bullet next to a headline it reads as punctuation, not as a brand.

Treat an uploaded photo or it looks pasted in: `radius` to clip it, `ken` for a slow push, or a
`filter` to grade it into the palette. An untreated full-bleed still is the most common way a video
looks generic.

## Ransom cutout type

A word made of real scanned torn-paper cutout letters:
```json
{ "type": "text", "text": "RANSOM", "x": 140, "y": 380, "w": 1640, "align": "left",
  "size": 190, "ransom": { "sprites": true }, "start": 0.1, "duration": 2.4 }
```
`ransom: { "sprites": true }` uses the real scanned cutouts (best look). `ransom: { "palette": "color" }`
uses drawn letters on colour tiles instead. Ransom implies a per-character split; do not add `split`.

## The traps

Every one of these renders without an error and looks wrong.

- **No em-dashes in on-screen text.** Hard fail. Use `,` `.` or `·`.
- **`dy` / `dx` do nothing without `anchor`.** Lines stack on top of each other.
- **A text layer with `w` needs `align`,** or it left-aligns inside its box and reads off-centre.
- **`pin` centres a BOX.** A text layer still needs `w` + `align` to look centred.
- **A layer's `duration` must exceed its `enterDur`,** or the entrance never completes.
- **Hard cut = `"anim": "none"`** with layers exactly adjacent in time.
- Never claim a number on screen the video does not show.

## Enter anims

`fade` `up` `rise` `pop` `scale` `lift` `defocus` `slide-left` `slide-right` `slide-up` `slide-down`
`wipe` `wipe-right` `wipe-up` `wipe-down` `iris` `clock` `none`

Pair an entrance with its exit **directionally**: `anim:"slide-right"` leaves with `out:"slide-left"`.
Never enter-and-retreat. Use `out:"defocus"` for faces, cards and dense grids, where sliding fifty
elements reads as chaos.

## Composite looks (`filter` on a layer)

Strength is a positional arg: `"filter": "thermal:1"`, 0..1, default around 0.7.

**glow** `neon` `dreamyHaze` `halationFilm` `angelic` `hologram` `glitchGlow`
**analog** `vhs` `super8` `crt` `filmNoir` `fadedPolaroid` `nostalgia`
**sci-fi** `cyberpunk` `nightVision` `thermal`
**lens** `lomo` `droneCinematic` `vintageAnamorphic` `impact` `timeFreeze`
**distort** `glassWarp` `heatWarp` `melt` `watercolor` `dreamSequence` `rippleGlass`
**relief** `emboss` `letterpress` `chrome` `edgeGlow` `fatten`

Which ones actually READ at small size: `thermal` `nightVision` `filmNoir` `cyberpunk` `super8`
`fadedPolaroid` `timeFreeze` `emboss` `chrome` `edgeGlow`.

Which ones are nearly invisible unless the source suits them: the distort family on smooth material,
and the whole glow family on dark content (they threshold brightness, so a dark frame emits nothing).

## Kinetic presets (`preset` on a split text layer)

Every preset takes `presetOpts: { … }` dials. Call `vawe_capabilities` for the full per-preset list;
common ones: `up/down/fall/riseClip` → `dist`; `scale` → `from`; `blur/focus` → `px`; `wave` → `amp phase`;
`bounce/elastic/swing` → `bounce settle`; `slide` → `dir dist`; `flip` → `axis deg`; `type` → `at`.
A dial set on a preset that does not read it does nothing — the draft gates report it.


`up` `down` `type` `scale` `blur` `bounce` `slide` `wave` `flip` `fall` `elastic` `skew` `focus`
`decode` `tilt` `stretch` `gradient` `highlight` `underline` `shadow` `riseClip` `draw` `chroma`
`swing` `unfold`

## Cuts (between beats)

`none` `fade` `slide` `whip` `punch` `wipe` `iris` `clock` `flip` `rise` `blur` `zoom` `cube` `barn`
`softwipe` `softiris` `squeeze` `roll` `letterbox` `drop` `blinds` `skewWhip` `spin` `collapse`
`riseBlur` `jitter`

One cut family per film. Do not mix whip and iris in the same piece.

## Themes

`vawe` `default` `linear` `stripe` `creed` `argus` `plinth` `threadcite` `tpot` `mercury` `northwind`
`satara` `ditherkit` `vawe-inter` `vawe-site` `vawe-creed` `creed-launch` `plinth-auto`

## Pacing

| Beat | Entrance |
|---|---|
| ambient drift | 0.8 to 1.2s |
| a thesis line | ~0.5s, luxurious |
| a payoff | 0.25 to 0.35s, snappy |

Uniform 0.45s everywhere reads as monotone. Stagger related elements 60 to 120ms apart, and let the
most important element on a beat move **last**, so motion order matches reading order.

Hold anything the viewer must READ for at least 1.5s. If one thing changes per beat and everything
else holds still, the change is legible; if everything changes, nothing is.

## Composition

Asymmetry over centred. One huge hero plus one small caption beats five equal things. Anchor
off-centre content to something, or centre it; floating reads as a mistake.

Content stays inside a safe margin of about 60px, and further in for `"destination": "tiktok" |
"reels" | "shorts"`, which paint their own chrome over the frame.

## The loop

1. `vawe_draft` with your scene.
2. Read the gates. **validate** blocks the render; **audit**, **slop** and **ledger** are advisory and
   usually right.
3. Fix, and draft again with the same `video_id`. Free.
4. `vawe_export` when it is genuinely good, not when it first works.

Three or four passes is normal.
