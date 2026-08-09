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
  3. A BOOKEND. It opens on an empty file and closes on the film that file is. The last frame answers
     the first.

  THE ONE RISK: four demonstrations in a held frame can read as a feature list. The defence is the
  escalation — if beat 5 does not visibly displace beats 2 to 4, the film is a list and we stop and
  rethink it. That is the thing to check on the style frames, before any motion exists.

  SOUND. Not decided here, deliberately. `docs/CRAFT/SOUND.md` landed today and a J-cut is being built
  in the engine now. A bed running under all four demonstrations and changing at each junction would be
  a fourth thread, and the one the picture never has to carry. Revisit once that work lands.
-->

## Beat 1: An empty file (0s-2.2s)
- type: hook
- object: none. The frame divides and the left half fills with a file that says nothing yet
- shot: wide
- camera: hold
- picture: a near-white field splits: a mono caret blinking on the left, the right half empty. One `{` types in
- mechanism: per-character typing with a visible caret, then a held beat with nothing happening
- becomes: an undivided field becomes the two halves the whole film lives in
- onscreen: {
- why: establish the frame before anything happens in it, so every later beat is read as a change rather than as a new shot
- emotion: quiet
- duration: 2.2s
- transition_in: none

## Beat 2: It says a word (2.2s-4.6s)
- type: build
- object: none. The first demonstration, and the smallest
- shot: wide
- camera: hold
- picture: `"text": "Ship it"` types on the left, and on the last character the words land at 120px on the right
- mechanism: typing, then the words arriving on the engine's rise preset at its real duration
- becomes: an empty right half becomes the first thing the file asked for
- onscreen: "text": "Ship it"  ·  Ship it
- why: the smallest possible demonstration, and the one that teaches the law the other three obey
- emotion: recognition
- duration: 2.4s
- transition_in: none

## Beat 3: It says a number (4.6s-7.4s)
- type: build
- object: none. A different subject, obeying the same law
- shot: wide
- camera: hold
- picture: the next line types and the right half swaps to a number rolling to 2.5B, the words gone
- mechanism: a count layer at its real speed · the previous result leaves rather than stacking, so the right half stays a single answer
- becomes: one answer becomes a different kind of answer
- onscreen: "count": 2500000000  ·  2.5B
- why: the second subject has to be genuinely unlike the first, or the film is one demonstration repeated
- emotion: widening
- duration: 2.8s
- transition_in: none

## Beat 4: It says a picture (7.4s-10.8s)
- type: build
- object: none. Larger again
- shot: wide
- camera: hold
- picture: the next line types and a real captured image fills the right half, then a mono line under it prints the image's true pixel dimensions
- mechanism: the image arriving on a masked reveal rather than a fade, so it is uncovered rather than blended · then the dimensions typing beneath, which is the second change and the evidence the picture is real rather than a placeholder
- becomes: a rendered answer becomes a photographed one
- onscreen: "image": "/card.png"
- why: type and numbers are things a slide can do. A real image is the first thing that is not
- emotion: escalation
- duration: 3.4s
- transition_in: none

## Beat 5: It says how to look at it (10.8s-14.4s)
- type: turn
- object: none. The demonstration that moves the other three
- shot: wide
- camera: dolly and tilt, the film's only camera move
- picture: the last line types and the CAMERA moves: the held frame tilts and pushes, and the file and its result are seen on a plane from an angle for the first time. As the camera travels, the file's four lines light one after another
- mechanism: a real camera move over a tilted plane, so the perspective changes across it · the four lines lighting in sequence during the travel, which is the second change and the first time the whole file is seen at once
- becomes: two flat halves become a space with the film lying in it
- onscreen: "camera": {"move": "diveIn"}
- why: the escalation only pays if the last demonstration displaces the earlier ones, and this is the one that does
- emotion: the click
- duration: 3.6s
- transition_in: none

## Beat 6: And that was the film (14.4s-17.0s)
- type: close
- object: none. The bookend closes
- shot: medium
- camera: settle back to square
- picture: the camera settles, the plane flattens, and the left half is a complete file while the right half is the finished frame it describes. One line arrives beneath
- mechanism: the tilt resolving to zero rather than cutting away · the line arriving word by word, each settling before the next
- becomes: an empty file becomes the film it was describing all along
- onscreen: One file. One video.
- why: the first frame was an empty file and the last is the film it made, which is the bookend closing
- emotion: settled
- duration: 2.6s
- transition_in: none
