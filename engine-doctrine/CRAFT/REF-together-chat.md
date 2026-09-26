---
when: "\"what does a film we admire actually measure\""
answers: "a frame-by-frame study of one product film: shot timings, palette dominance by pixel count, what holds it together"
group: crosscutting
---

# Reference study: Together.ai Chat (`refs/together-chat.mp4`)

## AGENT SUMMARY

- A frame-by-frame study of one film, `refs/together-chat.mp4`: shot timings, palette dominance by
  pixel count, type sizing, and what holds it together (no cuts, one continuous camera space).
- Use it as a reference when authoring: steal the cadence, the palette discipline, the word-level
  reveal, the shape match, the asymmetry (§9); never the content, the typo, or the static background
  as a default (§9 "Do not take").
- `[eye]`: this is a study feeding judgement, not a mechanical check; nothing here is gated or built.

A Together.ai **Chat** product demo. 19.78s, landscape, white-first. It is the strongest argument in
`refs/` for a film built out of **camera travel over real product surfaces** instead of out of cuts.

Source: `https://in.pinterest.com/pin/16818198602994243/`. `yt-dlp` is not installed here, so the pin page
was fetched with `curl` and the `v1.pinimg.com` mp4 pulled out of its metadata. 736x414 is the largest
rendition Pinterest serves; the HLS ladder tops out at the same size.

> **This is the DEEP study of one film. The cross-film page is [`GRAMMAR.md`](GRAMMAR.md)**, generated
> from `grammar/*.json`, where every reference sits on one scale. This film's row there carries the
> conclusions below in machine-readable form, so `make study-tool X=grammar` can compare them; what stays here is the
> half no table holds: the palette by pixel share, the type crops, the continuity register, and the
> command block that rebuilds every strip.
>
> One number differs between the two on purpose. This page counts **15 shots**; the store prints `·`,
> because `study.mjs` finds no frame scoring above the cut threshold and no lower threshold recovers a
> list (0.08 finds two). Both are right. These 15 are camera moves and dissolves, and the film's own
> argument is that it is built out of travel rather than out of cuts.

Everything below is measured off the file, not remembered. Frames live in
`refs/together-chat/frames/`, which is **local only**: `.gitignore:196` keeps third-party
marketing films out of the repo on purpose, and that covers their frames too. Section 11 rebuilds the
video and every strip in one paste.

---

## 1. The container

| | |
|---|---|
| duration | **19.776s** (593 frames) |
| fps | 30 (constant) |
| resolution | 736 x 414 |
| aspect | **16:9 landscape** |
| video bitrate | ~254 kbps h264 |
| audio | AAC stereo, **-15.3 LUFS integrated, LRA 1.8 LU** |

An LRA of 1.8 LU with no gaps is a flat music bed. There is **no voiceover**. Every word in the film is
on screen.

## 2. The cut list, and why it is nearly empty

```
ffmpeg -an -i refs/together-chat.mp4 -vf "select='gte(scene,0)',metadata=print:file=scores.txt" -f null -
```

Highest scene score in the whole film: **0.113 at 15.40s**. Everything else is under 0.05. So the usual
`gt(scene,0.25)` cut detector returns nothing, and a first read of "this film has no structure" would be
wrong in the other direction.

Frame-stepping 460-468 (`refs/together-chat/frames/strip_F.png`) proves it:

- frame **461 → 462** is a **hard cut**. The prompt bar at hero scale jumps to the send button at hero
  scale. Same surface, different part of it.
- **That is the only cut in 19.78s.** It sits at 78% of the runtime.

So the film's rhythm is not cuts. It is **motion phrases separated by dead stills**.

### The motion profile

```
ffmpeg -i ... -vf "fps=30,scale=92:52,format=gray" -f rawvideo g.raw
# then mean abs frame-to-frame difference, binned to 0.2s
```

| | |
|---|---|
| motion phrases (a burst of movement between two stills) | **14** |
| runtime / phrases | **1.41s per phrase** |
| dead stills (frame difference at or near 0.00) | 9, each 0.3s to 1.1s |
| longest still | **1.08s, the final frame (18.70s to 19.78s)** |

Compare `engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md`: the other reference cut every 1.52s. This one
changes state every 1.41s. **The cadence is the same; the mechanism is not.** Our films sit at 2.5-4s a
beat, which is half the rate either reference runs, and neither of them gets there by cutting more.

The energy comes from the pattern **move hard, then stop dead**. The stills are real: the frame difference
hits 0.00 at 8.00s. Nothing at all moves. A frame that stops completely is what makes the next move read
as fast.

## 3. Shot list, measured

A "shot" here is a distinct subject, not a cut. `refs/together-chat/frames/sheet.png` is the
20-frame overview; the dense strips are named per section.

| # | in | out | len | subject | motion |
|---|---|---|---|---|---|
| 1 | 0.00 | 0.20 | 0.20 | title card: *Product Demo* over the **together.ai CHAT** lockup | held, then gone |
| 2 | 0.20 | 1.45 | 1.25 | a bare text caret types **Introducing** | per-character typing, the word scaling up as it types; dead still 0.80-1.20 |
| 3 | 1.45 | 2.35 | 0.90 | **together.ai CHAT** wordmark | *Introducing* whips out left under heavy directional blur, the wordmark whips in; dead still 2.10-2.35 |
| 4 | 2.35 | 3.85 | 1.50 | the wordmark **becomes the app's header logo** | camera pulls back, a tilted app window rises from bottom-right and the wordmark lands inside it as its own logo |
| 5 | 3.85 | 4.55 | 0.70 | the sidebar, in 3D perspective | the fastest travel in the film's first half: camera whips right along the tilted plane to the composer |
| 6 | 4.55 | 5.30 | 0.75 | the composer, flat and front-on | settle; dead still 4.80-5.20 |
| 7 | 5.30 | 6.30 | 1.00 | the whole app window | camera pulls back, sidebar and composer both in frame |
| 8 | 6.30 | 8.30 | 2.00 | **Private, secure access** | the window whips out left, the blue word *Private* arrives; the rest of the line builds word by word; dead still 7.80-8.30 |
| 9 | 8.30 | 9.95 | 1.65 | the model-picker card, tilted | the biggest move in the film (peak 6.79): the card rises from the bottom and the camera travels **up its rows** |
| 10 | 9.95 | 11.30 | 1.35 | **to top / open-source / models** left, card right | camera pulls back, headline builds word by word; dead still 10.70-11.20 |
| 11 | 11.30 | 12.30 | 1.00 | white | the card rotates and exits |
| 12 | 12.30 | 15.40 | 3.10 | the composer, typed at hero scale | a hard dolly in, then *Explaine quantum physics like I'm 10 years old* typing while the camera tracks left to hold the caret in frame |
| 13 | 15.40 | 16.40 | 1.00 | **the send button** | the film's only hard cut, then a continued dolly in |
| 14 | 16.40 | 18.70 | 2.30 | the data-centre badge and the closing claim | the composer exits **up**, the badge arrives from depth at almost zero size and grows toward camera, pale blue halo rings expanding behind it, the 3-line claim building under it |
| 15 | 18.70 | 19.78 | 1.08 | end frame | frozen |

**15 shots. Median shot length 1.08s. Mean 1.32s.** Only one shot runs past 2.3s, and that one is the
hero typing beat, which is moving the whole time.

Strips: `strip_A.png` (0.0-3.2), `strip_B.png` (3.6-6.8), `strip_C.png` (7.2-10.4),
`strip_D.png` (10.8-14.0), `strip_E.png` (14.4-19.6), `strip_F.png` (frames 460-468, the cut),
`strip_G.png` (15.9-17.6, the send-to-datacentre handoff).

## 4. Palette, sampled from pixels

40 frames at 2fps, every pixel counted, quantized to 12-level buckets.

| hex | role | share of all pixels |
|---|---|---|
| `#FDFDFD` | page | **67.0%** |
| `#F9F9FB` | card fill (inside the near-white bucket) | 19.6% with its neighbours |
| `#E2EDFC` | pale blue halo, inner | 2.9% |
| `#EFF5FD` | pale blue halo, outer | 1.1% |
| `#D8E4FC` | halo edge | 0.9% |
| `#BDBDBD` | a word that has arrived but not yet settled | small |
| `#3D3D40` | headline ink (a soft near-black, **not** `#000`) | small |
| `#000000` | the wordmark only | small |
| `#0D6EFD` | the one accent | **0.13%** |

**Pixels under 128 luma: 1.56% of the film.** This is white-first by an enormous margin, and it is not a
light theme with dark furniture: there is almost no dark furniture at all.

The accent is the whole point. `#0D6EFD` holds **about half a percent of the frame** and carries every
emphasis in the film: the word *Private*, the send button, the DeepSeek mark, the shield tick, and the
closing *U.S. & Canada*. Compare `engine-doctrine/CRAFT/COLOR.md`. Restraint here is a measurement, not a mood.

## 5. Type

```
ffmpeg -ss 8.05 -i ... -vf "crop=280:70:380:172,scale=1400:350" z2.png
```

`z2.png` and `z_intro.png` at 4x. The face has a **single-storey g with an open curved tail**, a
**double-storey a**, near-circular `o`, horizontal cut terminals on `c` and `s`, and no spur on `u`. That
is a **neo-grotesque**, Helvetica Neue class. It is the least interesting choice on the page and it is
correct: nothing about the typeface is asking for attention, because the product surfaces are.

Weight is Regular to Medium. Nothing is bold. Nothing is a display face.

Size, as ink-box height over frame height (so directly portable to any canvas):

| line | ink box | % of frame height | on a 1080-tall canvas |
|---|---|---|---|
| `Introducing` | 61px of 414 | **14.7%** | ~159px |
| `together.ai` wordmark | 60px | 14.5% | ~157px |
| `Private, secure access` | 45px | **10.9%** | ~118px |
| `to top / open-source / models` | 241px over 3 lines | 58.2% total, ~19% a line | ~205px a line, tight leading ~1.05 |

**Headlines run 11% to 15% of frame height for a single line.** That is bigger than we usually set.

Alignment is mixed on purpose:

- the hook is centred (`Introducing` centre x = 0.50)
- the wordmark sits slightly left of centre (0.44)
- the three-line headline is **left-aligned at x = 0.06 of the width**, holding the left 55% of the frame,
  with the model card holding the right 45%. **Asymmetric.**

### The word-level reveal

This is the detail worth stealing. Words arrive one at a time, and **an arriving word is grey `#BDBDBD`
until the next one lands, at which point it settles to ink `#3D3D40`**. See `strip_C.png` at 7.6s
(*access* still grey) and 8.0s (the whole line settled), and `strip_D.png` at 10.8s (*models* grey) then
11.2s (settled). It reads as the sentence being thought rather than displayed, and it costs nothing.

## 6. The background

**It does not move. Ever.** It is flat `#FDFDFD` for the entire 19.78s. The frame-difference profile
reaches **0.00** during the holds, which means there is no gradient drift, no grain, no breathe, no
ambient field of any kind.

Measured, not eyeballed: four 40x40 corner patches sampled at **0.9s, 5.0s, 8.0s and 13.4s** give a
**maximum channel delta of 0** against each other, mean RGB `(253,253,253)` at every one. The backdrop is
byte-identical across the film.

This is a direct, deliberate breach of the rule in [STORYBOARD-TEMPLATE.md](STORYBOARD-TEMPLATE.md)
("the background is decoration, it is never information"), and the film is better for it. The rule is
right about the failure it was written for, which is a static field chosen by default. This background was
chosen. The reason it works is structural: **the subject is moving in every one of the 14 phrases**, so
the frame never needs the backdrop to keep it alive. A moving background under this film would fight the
tilted product cards for depth and lose.

The lesson to carry, not the exemption: **either the subject moves or the backdrop does.** If the subject
holds still and the backdrop also holds still, that is the failure the rule names.

## 7. The continuity thread

`engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md` asks for the register, not just the presence. This film runs
**four threads at once**, and three of them are threads our gate can actually see.

### a. One continuous space, travelled by a camera (the primary thread)

Every surface in this film sits on a single white plane, tilted out of the picture plane, and the camera
flies over it in x, y and z. There is never a change of world. Evidence:

- 3.20s the app window enters **tilted**, receding to a vanishing point (`strip_A.png` last cell)
- 3.60s to 4.40s the camera travels **rightward along that same tilted plane**, sidebar to composer, with
  the perspective changing as it goes (`strip_B.png` cells 1-3)
- 5.60s the camera pulls **back** on the same plane and the whole window resolves flat (`strip_B.png` cell 5)
- 8.80s to 9.60s the same treatment on the model card: tilted, camera travelling **up** its rows
  (`strip_C.png` cells 5-7)
- 12.80s to 15.00s a hard dolly **in** on the composer, then a track **left** following the caret

Nothing cuts to a new place. The film moves you there.

### b. A shape match that carries the film's one idea

At 2.00s the frame holds the **together.ai** wordmark at 14.5% of frame height, alone. Between 2.40s and
3.20s the camera pulls back and that exact wordmark becomes **the app's own header logo** in the top-left
of the window (`strip_A.png` cells 6-9, then `strip_B.png` cell 1). The brand mark is not placed beside
the product. It *is* a part of the product, and the pull-back is what reveals that.

The same trick closes the film. At 15.90s the frame is the blue circular send button at hero scale. At
16.55s the composer exits up and a **round blue-badged mark arrives from depth**, growing inside expanding
pale-blue circles (`strip_G.png`). Circle to circle, blue to blue. The send action becomes the thing that
serves it.

### c. One product surface, revisited

The composer is on screen at **4.40s, 5.00s, 6.00s, 12.40s and 15.40s**. It is the film's home base. It
leaves, other surfaces get their turn, and it comes back bigger each time until at 13.2s it fills the
frame. A gate looking for a prop that survives a junction and changes would find this one.

### d. Rhythm

A state change every **1.41s**, and hard stops between them. Consistent from 0.2s to 18.7s.

**Conclusion: this film is far more continuous than a contact sheet suggests, and its one hard cut is a
jump cut inside a single continuous object.** The correction that `CONTINUITY-WITHOUT-AN-OBJECT.md`
records for the last reference applies here too, and harder.

## 8. What the engine cannot currently do

Read before authoring. These are the gaps found by looking for them.

| the reference does | our vocabulary | verdict |
|---|---|---|
| a camera **flying** over a tilted plane, perspective shifting as it travels | `tilt` is a fixed lean about a layer's own centre through one shared camera at a fixed `dist` and `origin`; the global `camera: [{t,s,x,y}]` is **2D scale and pan only** | **the real gap.** A tilted card cannot be dollied past. Approximating it needs `tilt` plus a global `s/x/y` ramp plus per-layer `motion`, and the vanishing point stays put while the camera appears to move, which is the tell. |
| a word arriving grey and settling to ink when the next lands | `<b>` emphasis and `emColor` are static per layer; `type.js` word splits do not stage colour | needs one text layer per word with staggered windows, or a bespoke `composition` |
| directional motion blur on a fast word swap (1.6s) | `whip` (motion-blurred throw) and the `whipPan` sting exist | **covered** |
| per-character typing with a caret | `typing` on a `text` layer | **covered** |
| a camera tracking left to keep a growing caret in frame | `panFollow` tracks downward-growing content only | close, not exact; a `motion` track on the layer does it |
| concentric halo rings expanding from a mark | `ripple` (impact rings), `glow` layer | **covered** |
| a background that never moves | `bg` is required and `beat-check` fails `dead-air` | allowed, but the frames that hold still need a waiver with a reason |
| a 1.08s frozen end frame | `ends-on-nothing` in `beat-check` | fine as long as content is on screen; the freeze itself is legal |

The camera one is worth saying plainly: **the single most characteristic thing this film does is the one
thing our engine has no primitive for.** `engine-doctrine/MISTAKES.md` #59 records why per-layer `perspective()` was
rejected, and the shared-parent camera that replaced it is correct for static composition. Animating that
camera's position is the missing piece.

## 9. What we take, and what we do not

Take:

- **the cadence.** A state change every ~1.4s, and hard stops between changes.
- **cuts as a last resort.** One cut in the whole film, placed at 78%, and it is a jump cut inside one
  object.
- **palette discipline.** White-first at 86% near-white, dark pixels under 2%, exactly one accent under 1%.
- **the word-level grey-to-ink reveal.**
- **big type**, 11-15% of frame height for a single line, in a face that is not trying to be noticed.
- **asymmetry** when a surface shares the frame: type left at 55%, product right at 45%.
- **the shape match** (wordmark to header logo, send circle to service circle) as the film's spine.

Do not take:

- **the content.** This is Together.ai's product and their claim. We write our own.
- **the typo.** The reference genuinely types *Explaine* at hero scale.
- **the static background as a default.** It is earned here by a subject that never stops moving. It is
  an exemption to argue for per film, not a new house style.

## 10. What the recreation needs

The storyboard is `films/scene/playhead.storyboard.md`. It passes `storyboard-check` with no warnings.
Preference order is `CLAUDE.md`'s: captured real UI, then openly-licensed images, then drawn icons, then
generated cards, then emoji.

| # | asset | source | tier | note |
|---|---|---|---|---|
| 1 | the studio **timeline**: seconds ruler, one bar per layer, cut and seam marks, the shaded enter/exit ramps, the hazard band | **capture the real thing.** `make studio D=<a scene with a known hole>` then `make media X=capture` on the timeline element | 1, captured real UI | the film's central surface. It must be the product, not a drawing of it. **Blocked right now**: `films/scene/scene.js` is being rewritten, so the studio cannot be run this pass. |
| 2 | the studio **frame preview** at four or five scrub positions | frames pulled from a scene we already ship, via `make dev-tool X=frame D=<file> N=<n>` | 1, our own render output | these are the pictures riding above the timeline in beats 3 and 5 |
| 3 | the **render progress bar** of beat 5 | capture the real one if the studio exposes it; otherwise a `rect` with a keyed width | 1, then 3 | a `rect` here is honest, it is a progress bar |
| 4 | the **playhead bar** itself | a `rect`, 8px wide, theme `ink` | 3, drawn | the spine object. No asset to fetch. |
| 5 | the **dimension line** measuring 1.2s across the hazard band | `svg` layer, drawn on | 3, drawn | this is the beat-4 picture that stops it being type |
| 6 | the **vawe wordmark** for the opening caret beat | already in the repo | 1 | check `assets/brands/` before drawing anything |
| 7 | typeface | **Anybody** (sans) and **JetBrains Mono** (numbers and the ruler), both already in `assets/fonts/` | n/a | the theme's locked roles. We take the reference's *restraint*, not its Helvetica. |
| 8 | palette | `themes/vawe.json`: bg `#ffffff`, surface2 `#f6f8fb`, ink `#0f1620`, accent `#2563eb`, down `#a3282d` for the hazard band | n/a | already white-first with one accent, which is the reference's whole discipline |
| 9 | music bed | `assets/music/`, mixed to about -15 LUFS | n/a | the reference is -15.3 LUFS, LRA 1.8, and carries no voiceover |
| 10 | voiceover | **none** | n/a | deliberate. Every word is on screen, as in the reference. |

**Nothing copyrighted is planned or needed.** No stills, posters, covers, news photos or paid stock. Every
picture in this film is either our own rendered output, our own UI, or a shape we draw. Together.ai's
logo, product screens and copy appear nowhere in it.

## 11. Rebuild the video and every strip

`refs/` is gitignored (`.gitignore:196`), so neither the film nor its frames are in the repo. Both come
back from this. `yt-dlp` is not installed here; the pin page carries the direct mp4 in its metadata.

```bash
cd "$(git rev-parse --show-toplevel)"
V=refs/together-chat.mp4
D=refs/frames/pin-16818198602994243
mkdir -p refs "$D"

# 1. the film (736x414 is the largest rendition Pinterest serves)
curl -sL -A "Mozilla/5.0" https://in.pinterest.com/pin/16818198602994243/ -o /tmp/pin.html
URL=$(grep -oE 'https://v1\.pinimg\.com/videos/[^"\\]*\.mp4' /tmp/pin.html | head -1)
curl -sL -A "Mozilla/5.0" "$URL" -o "$V"

# 2. the strips
strip () { n=$1; shift; i=0
  for t in "$@"; do i=$((i+1))
    ffmpeg -v error -ss "$t" -i "$V" -frames:v 1 "$D/.$n$(printf %02d $i).png" -y
  done
  ffmpeg -v error -pattern_type glob -i "$D/.$n*.png" \
    -filter_complex "scale=440:248,tile=3x3:margin=8:padding=8:color=0x303030" \
    -frames:v 1 "$D/strip_$n.png" -y
  rm -f "$D"/.$n*.png; }

strip A 0.0 0.4 0.8 1.2 1.6 2.0 2.4 2.8 3.2          # hook, wordmark, the pull-back into the app
strip B 3.6 4.0 4.4 4.8 5.2 5.6 6.0 6.4 6.8          # travel across the tilted plane
strip C 7.2 7.6 8.0 8.4 8.8 9.2 9.6 10.0 10.4        # word-level grey-to-ink, the model card
strip D 10.8 11.2 11.6 12.0 12.4 12.8 13.2 13.6 14.0 # asymmetric headline, the dolly in
strip E 14.4 14.8 15.2 15.6 16.0 16.6 17.4 18.4 19.6 # hero typing, the cut, the close
strip G 15.9 16.05 16.2 16.3 16.45 16.6 16.8 17.2 17.6 # send button to service badge

# 3. the only hard cut, frame accurate (461 -> 462)
for f in 460 461 462 463 464 465 466 467 468; do
  ffmpeg -v error -i "$V" -vf "select=eq(n\,$f)" -frames:v 1 "$D/.F$f.png" -y; done
ffmpeg -v error -pattern_type glob -i "$D/.F*.png" \
  -filter_complex "scale=440:248,tile=3x3:margin=8:padding=8:color=0x303030" \
  -frames:v 1 "$D/strip_F.png" -y && rm -f "$D"/.F*.png

# 4. the 20-frame overview
i=0; for t in 0.2 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19.5; do i=$((i+1))
  ffmpeg -v error -ss "$t" -i "$V" -frames:v 1 "$D/.s$(printf %02d $i).png" -y; done
ffmpeg -v error -pattern_type glob -i "$D/.s*.png" \
  -filter_complex "scale=440:248,tile=4x5:margin=10:padding=10:color=0x303030" \
  -frames:v 1 "$D/sheet.png" -y && rm -f "$D"/.s*.png

# 5. the type, at 4x
ffmpeg -v error -ss 8.05 -i "$V" -frames:v 1 -vf "crop=280:70:380:172,scale=1400:350:flags=lanczos" "$D/z2.png" -y
ffmpeg -v error -ss 1.2  -i "$V" -frames:v 1 -vf "crop=320:80:205:170,scale=1280:320:flags=lanczos" "$D/z_intro.png" -y
```
