---
message: a citation you can check beats a guess you have to trust
audience: people who have been burned by a chatbot summary that turned out to be wrong
framework: PAS
arc: name the failure mode of every other tool, then show the one thing Corva does instead
spectacle: "7.3s, the verified-badge layer, device flash: the checkmark confirming inside the real document that the citation is real. Every other beat stays paper-quiet so this one accent pop reads as the payoff."
not: "no presenter plate, no invented face, no centred hero, no gradient card, no more than one accent colour, no CSS animation/transition on any fragment"
object: the mono label + accent bar across the top (acrossBeats), never a face
object_t0: "CORVA · CITED, NOT GUESSED" label with a thin accent bar beneath it, present from 0.3s
object_states: the bar shifts a few px at every cut, tracking the film's turns without ever resetting
object_last: label and bar hold into the end card, where the wordmark finally replaces them
thread: continuous object (label + bar), not a transforming box
duration: 24.0s
format: 1080x1920
destination: reels
theme: preface
craft:
  captions: "hand-timed word-by-word at 2-4 words/sec, chunked 2-6 words, pop layout + highlight style so the read word lights up (engine-doctrine/CRAFT/CAPTIONS.md)"
  color: "eyedropped from the preface theme pack (paper-white + one terracotta accent), reused because the subject is literally documents and citations"
  density: "each beat carries a hero (doc card / contrast rows / count) + a support caption + the mono label/accent-bar metadata strip"
  direction: "the whole film stays quiet paper-white; the one accent-colour flash is the verified-badge resolving at 7.3s, nothing else pops that hard"
  html-fragments: "every fragment (doc, verified, guess-row, cite-row) moves only via `parts` selectors or the layer's own anim/out on the engine's seeked timeline; no CSS animation/transition/opacity/filter anywhere"
  layout: "off-center hero column at x=90 with the right rail left empty (it is also the reels chrome rail); nothing centered-grid except the one-time wordmark on the end card"
  motion-craft: "the accent bar is hand-keyed (6 keys, easeInOutSine) tied to the real cut points, not a fired-once preset"
  show-dont-tell: "the payoff (a citation you can check) is SHOWN as a real document card with a highlighted line, a resolving citation chip and a separate verified badge, never just stated in a caption"
  sound: "audio.music: auto, resolved with `make audio-bed WRITE=1`; not silent"
  transitions: "the four boundaries are soft dissolves: the argument builds by addition (problem -> proof -> contrast -> stat -> close), not by hard contrast, so a cut that stops the eye would fight the case being made"
  typography: "Geist (theme preface); one size scale throughout, hook and end card the loudest, everything else in the support register"
---

<!--
  THE PRESENTER PROBLEM, SOLVED BY REMOVAL. The talking-head eval fills the face-safe upper half with a
  static ring + dot for most of its runtime because it has no real presenter footage. This film does not
  try to fake a face: it has none, and says so in `note`. It is a narrated B-roll piece: every beat is a
  real artifact (a document, a comparison, a counted stat) doing the explaining, which is also the more
  native shape for a feed post about a research tool. The mono label + accent bar is the one thing that
  survives every cut, so the film is still held together across four dissolves without inventing a
  placeholder plate.

  SEVEN BEATS, NOT FIVE. The first cut of this plan had five sections and left two of them (the document
  reveal, the stat) holding a single unchanged state for 5-7 seconds, which storyboard-check's own
  held-state-too-long warning caught. Splitting the document beat into "it opens" / "the citation
  resolves" and giving the stat its own kicker turns two long holds into shorter ones, which is also
  exactly what the brief's 2-second cadence asks for: it is the SAME fix seen from two doors.
-->

## Beat 1: the problem, named (0.0s-2.5s)
- type: hook
- object: label/bar arrive at 0.3s, quiet
- trigger: the film opens; nothing precedes it
- shot: type only, no picture yet
- camera: slowPush begins
- picture: one kinetic headline, word-up reveal
- mechanism: word-up reveal in a fixed box
- becomes: an empty paper field becomes a named complaint
- onscreen: Most AI tools guess.
- narration (stand-in caption, no VO exists): Most AI tools guess.
- why: name the failure everyone has already felt before naming the fix
- duration: 2.5s
- transition_in: cut (film open)

## Beat 2: the turn (2.5s-4.2s)
- type: hook / turn
- object: label/bar hold
- trigger: the complaint just named demands an answer
- shot: same fixed box as beat 1
- camera: slowPush continues
- picture: the same box now holds "Corva doesn't.", underlined in one accent stroke
- mechanism: a weight-preset swap in the identical box (a changing word in a fixed box, not a reflow), plus a one-shot accent underline
- becomes: the complaint becomes a named exception
- onscreen: Corva doesn't.
- narration: Corva doesn't.
- why: the exception has to land inside the same box as the complaint, or it reads as a new claim instead of an answer to this one
- duration: 1.7s
- transition_in: fx:none

## Beat 3: the document opens (4.2s-7.3s)
- type: build
- object: label/bar shift +40px on the cut
- trigger: "Corva doesn't [guess]" needs to be shown, not just claimed
- shot: hero, one real artifact fills the safe column
- camera: slowPush continues
- picture: a real document card, six lines revealing one after another, then the exact line highlighting
- mechanism: three staggered `parts` waves (label, lines, highlight) roughly 0.2-0.9s apart
- becomes: an empty page becomes a highlighted, sourced line
- onscreen: none (the artifact IS the beat; captions carry the words)
- narration: Ask it anything. It opens the real document. The exact sentence it read.
- why: show the mechanism before naming it a citation
- duration: 3.1s
- transition_in: fx:dissolve dur=0.5

## Beat 4: the citation resolves (7.3s-11.2s)
- type: payoff
- object: label/bar continue their beat-3 position
- trigger: the highlighted line from beat 3 needs to become a checkable source
- shot: same document card, plus a new verified badge below it
- camera: slowPush continues
- picture: the citation chip has already popped inside the card; a separate verified badge pops in below it, then holds
- mechanism: `[data-citation]` popIn inside the card, then an independent html layer (verified-badge) pops in 0.1s later, its own arrival and exit
- becomes: a highlighted line becomes a resolved, checkable citation
- onscreen: none
- narration: Not a summary. The source itself.
- why: this is the SPECTACLE beat (7.3s, verified-badge, device flash), the one accent-colour pop the whole film earns
- duration: 3.9s
- transition_in: fx:none

## Beat 5: the contrast, stated plainly (11.2s-16.2s)
- type: agitation / turn
- object: label/bar shift -30px on the cut
- trigger: the resolved citation now needs to be measured against the alternative
- shot: two stacked rows, off-center, arriving as two separate layers
- camera: slowPush continues
- picture: a dimmed "guess" row with an X arrives first, then an accent-bordered "citation" row with a check pops in beneath it
- mechanism: two independent html layers (guess-row, cite-row), fade then popIn, staggered by 1.6s
- becomes: the abstract claim from beat 2 becomes a literal side-by-side
- onscreen: A guess you have to trust / A citation you can check
- narration: A guess you have to trust. Or a citation you can check.
- why: say the thesis once, in the plainest possible form, right after showing it
- duration: 5.0s
- transition_in: fx:dissolve dur=0.5

## Beat 6: the stat, counted (16.2s-20.6s)
- type: proof
- object: label/bar shift +50px on the cut
- trigger: the contrast just stated needs a number behind it, not just a feeling
- shot: single large numeral, centered in the safe column
- camera: slowPush continues
- picture: a real `count` layer ticking 0 to 100%, an accent underline flashing beneath it, then a support line
- mechanism: the digits animate continuously; the underline is a second, independent event about 2.4s in
- becomes: a claim becomes a counted, specific figure
- onscreen: 100% / traced to the source
- narration: Every answer, traced to its source. Nothing to take on faith.
- why: a specific number beats a dry claim; the film earns its "show, don't tell" mandate with a real animated count, not a static stat
- duration: 4.4s
- transition_in: fx:dissolve dur=0.5

## Beat 7: the close (20.6s-24.0s)
- type: payoff / end card
- object: label/bar shift -20px on the cut, then hold; the wordmark becomes the new anchor
- trigger: the argument is made; the film needs a name to leave behind
- shot: centered wordmark, the one moment this film centers anything
- camera: slowPush settles
- picture: "Corva" in weight-preset kinetic type, then the tagline underneath, holding to the last frame
- mechanism: word-weight reveal, then a fade-in support line that runs to the scene's own end (no empty tail)
- becomes: six beats of argument become one name to remember
- onscreen: Corva / the passage, not the summary
- narration: Corva. The passage, not the summary.
- why: the payoff was never spoiled; it lands last, as the name
- duration: 3.4s
- transition_in: fx:dissolve dur=0.5
