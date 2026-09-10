---
message: the JSON is the whole interface, so whatever you describe is what you get
audience: people evaluating a render engine who have been shown a lot of generated pixels and trust none of them
framework: demonstration
arc: an empty file states one thing and it happens, then states a bigger thing and that happens, until the last thing it states moves everything before it
threads: a held frame (the file left, its result right, never moving) · escalation (each demonstration larger in scope than the last) · a bookend (opens on an empty file, closes on the film that file is)
sentence: You describe it once, and that description is the video.
duration: 17.0s
format: 1920x1080
destination: web
---

<!--
  STRUCTURE, derived rather than assumed. docs/CRAFT/FILM-STRUCTURE.md Part 4, answered honestly:

    Q1 a voice or continuous reading line?   No. So the thread must be visible or rhythmic.
    Q2 how many subjects?                    SEVERAL, AS PEERS. text, a count, an image, the camera.
                                             "Do not force one prop across them. Let each subject be itself."
    Q3 place, process, or claim?             A CLAIM. "No object exists to carry. Use a bookend, an
                                             escalation, or a motif, and show the evidence."
    Q4 runtime / beat length?                17s at ~2.8s. Over 3s a through-line must be doing work.
    Q6 how many threads?                     THREE. One is fragile; the reference we studied ran three.

  WHY NOT ONE TRANSFORMING OBJECT, which is what the first two drafts of this file were. The claim is a
  GENERAL RULE: whatever you describe, you get. A film that shows one thing being described proves one
  case. A film that shows four different things each obeying the same law proves the law. The structure
  has to match the shape of the claim, and a single morphing prop does not.

  That draft was also the cheapest thing the repealed `no-continuous-object` gate would accept, which is
  the tell CLAUDE.md 2a001 warns about: "a box whose w and h are keyed is the cheapest way to satisfy
  the gate and usually the least interesting."

  THE THREE THREADS, and none of them is a travelling prop:

  1. A HELD FRAME. The composition never moves: the file on the left, its result on the right, the same
     division for the whole film. Every beat changes what is in the two halves and nothing else. A
     repeated frame is a motif, and it is what lets four unrelated subjects sit in one film.
  2. ESCALATION. Each demonstration is larger in scope than the one before: a word, then a number, then
     a picture, then a camera move that displaces everything already on screen. The last one moves the
     first three, which is the only way the film ends bigger than it started.
     THE SCOPE CLIMBS AND SO DOES THE SIZE. The first cut set the word at 190px, near hero scale, so the
     smallest demonstration was already as loud as the largest and the escalation had nowhere to go. The
     word is now 96px, the number 190px, the picture 840px wide. The right half is deliberately quiet on
     beat 2, and the quiet is the first step of the climb rather than a hole in the frame.
  3. A BOOKEND. It opens on an empty file and closes on the film that file is. The last frame answers
     the first.

  THE ONE RISK: four demonstrations in a held frame can read as a feature list. The defence is the
  escalation, if beat 5 does not visibly displace beats 2 to 4, the film is a list and we stop and
  rethink it. That is the thing to check on the style frames, before any motion exists.

  SOUND. Not decided here, deliberately. `docs/CRAFT/SOUND.md` landed today and a J-cut is being built
  in the engine now. A bed running under all four demonstrations and changing at each junction would be
  a fourth thread, and the one the picture never has to carry. Revisit once that work lands.
-->

## Beat 1: An empty file (0s-1.0s)
- type: hook
- object: none. The frame divides and the left half fills with a file that says nothing yet
- shot: wide
- camera: hold
- picture: a near-white field splits, both halves label themselves, and a NUMBERED GUTTER draws down the left: six line numbers, all of them empty. One `{` types on line 1
- mechanism: the divider wiping down, both header rules wiping right, the gutter fading in one number at a time, then per-character typing with a visible caret
- becomes: an undivided field becomes the two halves the whole film lives in
- onscreen: scene.json · 1920 x 1080 · 30fps · {
- why: the first cut of this beat held a blank white frame for two seconds, which is where a viewer decides to leave. The gutter states the whole shape of the file before a word of it exists, so the beat carries something and the next one arrives at 1.0s instead of 2.3s
- duration: 1.0s
- transition_in: none

## Beat 2: It says a word (1.0s-3.5s)
- type: build
- object: none. The first demonstration, and the smallest
- shot: wide
- camera: hold
- picture: `"text": "Ship it"` types on the left, and on the last character the words land SMALL, at 96px, on the right, with a mono caption naming the face and weight directly beneath them
- mechanism: typing, then the words arriving on the engine's rise preset at its real duration · the caption typing under them, so the result and its evidence read as one small specimen rather than a headline stranded in a large empty half
- becomes: an empty right half becomes the first thing the file asked for
- onscreen: "text": "Ship it"  ·  Ship it  ·  sans · weight 700
- why: the smallest possible demonstration, and the one that teaches the law the other three obey. It has to LOOK smallest: the number that follows is twice its size and the picture eight times its area, and an escalation only reads if the first step is low
- duration: 2.5s
- transition_in: none

## Beat 3: It says a number (3.5s-6.2s)
- type: build
- object: none. A different subject, obeying the same law
- shot: wide
- camera: hold
- picture: the next line types and the right half swaps to a number rolling to 2.5B at twice the word's size, the words gone
- mechanism: a count layer at its real speed · the previous result leaves rather than stacking, so the right half stays a single answer · its own caption sits under it, the same pairing beat 2 established
- becomes: one answer becomes a different kind of answer
- onscreen: "count": 2500000000  ·  2.5B
- why: the second subject has to be genuinely unlike the first, or the film is one demonstration repeated
- duration: 2.7s
- transition_in: none

## Beat 4: It says a picture (6.2s-9.4s)
- type: build
- object: none. Larger again
- shot: wide
- camera: hold
- picture: the next line types and a real captured image fills the right half, then a mono line under it prints the image's true pixel dimensions
- mechanism: the image arriving on a masked reveal rather than a fade, so it is uncovered rather than blended · then the dimensions typing beneath, which is the second change and the evidence the picture is real rather than a placeholder
- becomes: a rendered answer becomes a photographed one
- onscreen: "image": "/card.png"
- why: type and numbers are things a slide can do. A real image is the first thing that is not
- duration: 3.2s
- transition_in: none

## Beat 5: It says how to look at it (9.4s-15.5s)
- type: turn
- object: none. The demonstration that moves the other three
- shot: wide
- camera: dolly and tilt, the film's only camera move
- picture: the last line types and the CAMERA moves: the held frame tilts and pushes, and the file and its result are seen IN A SPACE from an angle for the first time. The file stands nearest, the photograph sits on the picture plane, the spent results lie deepest, and they cross the frame at different speeds. As the camera travels, the file's four lines light one after another
- mechanism: a real camera move through a space with three depths in it (`plane`: the file at z +220, the photograph at 0, the shelf at -120), so the frame parallaxes instead of turning as one rigid sheet · the four lines lighting in sequence during the travel, which is the second change and the first time the whole file is seen at once · the tilt REACHES its mark at 12.5s and then holds and drifts, so the move is on screen for six seconds and not two
- measured: across the 1.9s travel the file's second line moves 97px, the photograph 60px and the shelved word 48px. Coplanar, the same three move 53, 60 and 86px, which is a sheet sliding. The depths were chosen against the frame, not for the largest number: the photograph can only stand forward of the plane before it crosses the divider and only behind it before it leaves the right edge, so it holds the plane and the other two part around it
- becomes: two flat halves become a space with the film lying in it
- onscreen: "camera": {"move": "diveIn"}
- why: the escalation only pays if the last demonstration displaces the earlier ones, and this is the one that does
- duration: 6.1s
- transition_in: none

## Beat 6: And that was the film (15.5s-17.0s)
- type: close
- object: none. The bookend closes
- shot: medium
- camera: relax to about half the tilt, never back to square
- picture: the divider fades, the tilt eases back to about half its peak, and one line arrives across the WHOLE frame beneath both halves, at 80px, larger than anything else left on screen
- mechanism: the tilt easing DOWN rather than out, so the film ends in the space it opened up · the divider dissolving, so two columns become one statement · the line arriving word by word, each settling before the next
- becomes: an empty file becomes the film it was describing all along
- onscreen: One file. One video.
- why: the first frame was an empty file and the last is the film it made, which is the bookend closing. The first cut snapped the plane flat at 15.8s and spent its last three seconds square, which threw away the only thing beat 5 had built
- duration: 1.5s
- transition_in: none
