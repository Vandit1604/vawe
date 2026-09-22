---
message: "This engine can hold still: a cut can carry meaning with no camera move under it."
audience: "Us. This is a benchmark, not a film for anyone else."
arc: "hook (typed, retyped) -> product (the real editor) -> product (the real preview) -> CTA -> mark burst -> held close"
framework: "Recreation. The structure is not chosen, it is measured off refs/pin-858709853990669388.mp4."
reference: "latch-recreation"
threads: "two devices carry it: (1) the same cobalt field returns at beat 1 and beat 5, so a viewer reads them as the same place revisited, not two unrelated cards; (2) a single sentence about vawe is built and rebuilt across every beat by the same typed-cursor device, so the type itself is the continuous object even though nothing on screen keeps moving between cuts"
object: "none. The reference's near-total stillness is the point: no layer travels across a cut. What survives is the cursor device and the cobalt/black ground rhythm, not a dragged object"
object_t0: "an empty cobalt field, nothing typed yet"
object_states: "n/a, no continuous object; see threads"
object_last: "the vawe mark, held on black, motionless, to the last frame"
format: 1920x1080
theme: "themes/vawe.json"
duration: 19.5s
pace: "held, 2.5-3s per idea: the reference's median shot is 2.1-3s and almost nothing moves inside a shot, so pace is set by hold time, not by cut rate"
spectacle: "beat 6 · the mark layer · a two-cut, 0.1s-total burst (three frames at 30fps) that assembles the vawe mark out of its own fragments before the hold · it is the reference's own loudest moment and the one this benchmark exists to test"
not: "no continuous camera travel anywhere in this film (vawe-flow-2's whole design), no dragged/carried object across a cut, no dolly, no drift while a beat holds, no fade-heavy transitions where the reference uses a hard cut"
---

### Reference devices

| id | the device | this film |
|---|---|---|
| D1 | a word types under a cursor, on a flat saturated field, near-frozen once landed | **beat 1**, "Describe the film." typed on cobalt, then held |
| D2 | mid-word retype: the cursor returns, deletes, writes a different word over the same span | **beat 1**, "Describe" is struck and replaced with "Direct" mid-shot, no cut |
| D3 | a third short line replaces the first two, same field, still no cut | **beat 1**, "One command." lands before the hard cut out |
| D4 | dark panel, a real captured product UI, almost nothing moving | **beat 2**, the real vawe.dev editor capture, held |
| D5 | a labelled action control appears inside the held UI | **beat 3**, the editor's `render` affordance highlights, held |
| D6 | a second UI state, content typing into a field inside the frozen shot | **beat 4**, the live preview pane's caption builds, held |
| D7 | return to the flat saturated field for a short CTA line | **beat 5**, cobalt again, "Render it now." |
| D8 | rapid multi-frame burst, three near-instant cuts, an object assembling from fragments | **beat 6**, the vawe mark in three pieces, 0.1s total |
| D9 | ends on black, one mark, held to the final frame, delta 0.00 | **beat 7**, the vawe wordmark, motionless, no beat after it |

## Beat 1: Hook (0s-5.73s)
- type: hook
- archetype: centred
- weight: quiet
- shot: medium (one short line, centred, nothing else in frame)
- camera: hold
- picture: a line types itself under a cursor on a flat cobalt field, is struck and retyped as a different line mid-shot, then a third line replaces it, all without a cut
- onscreen: "Describe the film." -> "Direct the film." -> "One command."
- motion: [data-part="line"]@fade:energy
- eye: the empty cobalt field -> the typed cursor, which the retype keeps pulling back to -> the third, shortest line, centred
- mechanism: the cursor types, deletes back across the first verb, types the second, then the whole line is replaced by a third, held
- becomes: an empty field becomes an instruction, and the instruction becomes a shorter one
- trigger: nothing yet. This beat opens the film.
- layout: centred, about 35% of frame width, everything else deliberately empty
- style: flat cobalt (#2563eb, themes/vawe.json accent), white type, no grain, no gradient
- rest: the field holds still under and between the three typed lines; only the type itself moves
- why: withholding the product for 5.7s and giving that time to three short retypes, not one long build, is the reference's own opening move
- borrows: D1, D2, D3 -> the typed-then-retyped line
- duration: 5.73s
- transition_in: fx:none

## Beat 2: Editor (5.73s-8.77s)
- type: product_intro
- archetype: split
- weight: strong
- shot: wide (the real vawe.dev editor, JSON left, live preview right)
- camera: hold
- picture: the captured vawe.dev editor pane (assets/brands/vawe-site/crops/editor.png / sections/01-one-json-one-video.png), held still, no push, no drift
- onscreen: "vawe.dev / editor" (captured, real)
- motion: hold:none
- eye: the beat-1 cobalt field -> the hard cut -> the editor's split seam, JSON left to preview right
- mechanism: a single held frame of real product UI, the first hard cut of the film
- becomes: an instruction becomes the tool that carries it out
- trigger: the third typed line lands, so the tool it names can arrive
- layout: full-bleed split panel, captured as-is
- style: the site's own white/cobalt, no re-skin
- rest: total. This is the reference's own "near-frozen" shot
- why: show the real product once the copy has earned it, per SHOW-DONT-TELL
- borrows: D4 -> the real editor capture
- capture: assets/brands/vawe-site/crops/editor.png (real, vawe.dev/editor, already captured)
- duration: 3.04s
- transition_in: fx:none
- transition_why: continuity · quiet · invisible

## Beat 3: Render control (8.77s-10.67s)
- type: feature_showcase
- archetype: hero-object
- weight: quiet
- shot: wide (the same editor, a control now highlighted)
- camera: hold
- picture: the same captured editor frame, now with the render/output affordance called out (a highlight ring or label overlaid on the capture, not a redraw of it)
- onscreen: "render" (labelled)
- motion: [data-part="highlight"]@popIn:professional
- eye: the whole editor frame -> the highlight ring, the one thing that moves -> the render control it circles
- mechanism: one overlay layer switches on inside an otherwise identical held frame
- becomes: the tool becomes the one control that matters
- trigger: the viewer has seen the whole editor; now the film picks out of it the one thing it will push on
- layout: same as beat 2, highlight placed over the real control's real position
- style: cobalt highlight ring, everything else unchanged
- rest: total but for the highlight's own arrival
- why: the reference does exactly this, calling out one control inside an otherwise still UI shot
- borrows: D5 -> the render control highlight
- capture: assets/brands/vawe-site/crops/editor.png, same frame as beat 2, highlight overlaid
- duration: 1.90s
- transition_in: fx:none
- transition_why: continuity · quiet · invisible

## Beat 4: Output (10.67s-13.63s)
- type: feature_showcase
- archetype: split
- weight: strong
- shot: wide (the same layout, the preview pane now typing a caption)
- camera: hold
- picture: the live-preview pane's own caption builds under a cursor, the rest of the frame unchanged from beats 2-3
- onscreen: "renderFrame(n), byte-identical every run."
- motion: .ty-in@fade:energy
- eye: the highlighted control -> the caption typing beside it -> the finished sentence
- mechanism: a caption types itself inside a held product frame, the shot's only motion
- becomes: a highlighted control becomes proof of what it does
- trigger: the control was named; now the film shows its result
- layout: same frame, caption in the preview pane's own caption slot
- style: unchanged from beats 2-3, one continued held product shot
- rest: the frame around the caption never moves
- why: proves the claim with the product's own surface rather than stating it on black
- borrows: D6 -> the typed caption
- capture: assets/brands/vawe-site/crops/editor.png, same frame, preview pane caption typed in
- duration: 2.96s
- transition_in: fx:none
- transition_why: continuity · quiet · invisible

## Beat 5: CTA (13.63s-15.53s)
- type: cta
- archetype: centred
- weight: strong
- shot: medium (one short line, centred, the beat-1 field returned to)
- camera: hold
- picture: the same flat cobalt field from beat 1, one line, held
- onscreen: "Render it now."
- motion: [data-part="line"]@growUp:energy
- eye: the held product frame -> the hard cut -> the returned cobalt field -> the CTA line
- mechanism: a single line arrives and holds, no retype this time
- becomes: proof becomes an instruction to act
- trigger: the output was shown; now the film asks for the act that produced it
- layout: centred, about 30% of frame width
- style: flat cobalt again, closing the loop opened in beat 1
- rest: total once the line lands
- why: returning to beat 1's exact field is the film's own thread, not a new colour
- borrows: D7 -> the returned cobalt field
- duration: 1.90s
- transition_in: fx:none
- transition_why: rhyme · warm · expressive

## Beat 6: Mark burst (15.53s-15.63s)
- type: sting
- archetype: hero-object
- weight: peak
- shot: close (the vawe mark, in fragments)
- camera: hold
- picture: the vawe wave-mark in three pieces across three back-to-back frames at 30fps, each frame a hard cut, no motion blur, no tween between them
- onscreen: (mark only, no words)
- motion: hold:none
- eye: the cobalt CTA field -> three hard cuts in 0.1s -> the assembled mark
- mechanism: three frames, three hard cuts, ~0.033s each, assembling the mark by juxtaposition rather than by animating it
- becomes: a returned field becomes the mark that has been implied since beat 1's cobalt
- trigger: the CTA lands; the film cuts to what it is a CTA for
- layout: centred, the mark filling about 25% of frame width in each fragment
- style: cobalt/black only, no gradient, no glow
- rest: none. This is the one beat that is entirely cuts
- why: this is the exact device this benchmark exists to test, a rapid multi-cut burst with zero motion under it
- borrows: D8 -> the fragmented mark
- duration: 0.10s
- transition_in: fx:none
- transition_why: contrast · charged · expressive

## Beat 7: Close (15.63s-19.5s)
- type: cta
- archetype: lockup
- weight: quiet
- shot: medium (the vawe wordmark, centred, on black)
- camera: hold
- picture: the vawe wordmark on solid black, motionless, no fade in, no fade out, no beat after it
- onscreen: "vawe"
- motion: hold:none
- eye: the assembled mark -> the cut to black -> the wordmark, where it stays
- mechanism: a single held frame, delta 0.00 for its final ~2.5s, matching the reference exactly
- becomes: the mark becomes the name, and the name is the last thing on screen
- trigger: the burst lands; the film has nothing left to add
- layout: centred, the wordmark about 22% of frame width
- style: `{"preset":"black"}`, solid, no grain, no tint
- rest: total, to the last frame
- why: the reference ends on a held frame with nothing after it, and that stillness is the film's actual closing argument
- borrows: D9 -> the held wordmark
- duration: 3.87s
- transition_in: fx:none
- transition_why: contrast · quiet · invisible
