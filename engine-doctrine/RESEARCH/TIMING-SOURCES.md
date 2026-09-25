---
when: "about to justify a timing number in a gate, or asked where a threshold came from"
answers: "which external sources publish real timing numbers (Cinemetrics, Material Design 3, Ofcom, EBU) · which of our 86 sourceless constants they can justify · which questions no source answers"
group: reference
---

# Timing sources: what external work can and cannot justify our 86 sourceless constants

Task from the owner's principle: rules decide films, films never decide rules. `THRESHOLD-PROVENANCE-AUDIT.md`
found 93 verdict-deciding constants across 33 files. 7 cite an external source. 86 do not, and several of
those are derived from one of our own renders, which is the defect this file exists to remove.

This document does two things. It builds a source table of real, checkable work on motion timing and
film editing rhythm. Then it maps that work onto as many of the 86 constants as the evidence honestly
supports, and says plainly where nothing supports one. It changes no constant: that is a separate job.

## 1. The source table

| source | what it publishes | the actual numbers | url / isbn | free to check |
|---|---|---|---|---|
| Netflix Timed Text Style Guide | subtitle timing rules already used by `read-check.mjs` | CPS wall 20, min event 20 frames@24fps, gap 2 frames@24fps, cut-snap 0.5s, line cap 42 chars | [partnerhelp.netflixstudios.com](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines) | yes |
| BBC subtitling guidance (via samtext.com) | subtitle hold ceiling, already used by `read-check.mjs` | 2-5s band, we take 5s | [samtext.com](https://www.samtext.com/services/translation-agency/audiovisual-text/subtitling-guidelines/) | yes |
| Ofcom, Code on Television Access Services | UK broadcast subtitling rules: reading speed and max on-screen duration | 160-180 wpm pre-recorded, up to 200 wpm live; presentation "kept to the minimum, no more than 3 seconds" per event where the dialogue allows it | [ofcom.org.uk PDF](https://www.ofcom.org.uk/__data/assets/pdf_file/0020/97040/Access-service-code-Jan-2017.pdf) | yes |
| ssw.com.au, "read it twice" | the rule already cited by `HOLD_PER_WORD` | 200 wpm, hold = words x 0.6s | [ssw.com.au](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos) | yes |
| Material Design 3, Easing and duration | UI motion duration tokens by category (short/medium/long) and named easing curves | short1 50ms .. long4 600ms in 50ms-ish steps; `standard` and `emphasized` cubic-beziers, e.g. emphasized `cubic-bezier(0.2, 0, 0, 1)` | [m3.material.io](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) | yes |
| Apple Human Interface Guidelines, Motion | principle-level guidance on interface transition length | a working range of 0.2-0.5s for most interface transitions; no published token table like M3's | [developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/motion) | yes |
| Cinemetrics (cinemetrics.uchicago.edu / cinemetrics.lv) | a crowd-measured database of shot lengths, contributed film by film since 2005, reporting average shot length (ASL), median shot length (MSL) and standard deviation, filterable by title, year, director | reports commonly quoted in the literature: ~6-8s ASL for 1960s American/British studio films tightening toward faster cutting since, per Bordwell (cited in Redfern below); tens of thousands of films logged | [cinemetrics.lv](http://www.cinemetrics.lv) | the site and its charts are free to browse; whether a bulk CSV/API export exists was not confirmed from the page content this research could reach, see the honest note below |
| Nick Redfern, "Analysing Motion Picture Cutting Rates", Wide Screen 9.1 (2022) | a methodology paper that DISPROVES the common use of ASL as a "cutting rate": ASL is a mean waiting time, not a rate, and the Poisson model behind it fails general and film-specific tests | full statistical argument, worked example (Slumber Party Massacre, ASL 5.7s, shown to be a poor Poisson fit); no single number to adopt, its finding is methodological | [widescreenjournal.org PDF](https://widescreenjournal.org/wp-content/uploads/2022/08/formatted-cutting-rates.pdf) | yes, open journal |
| Barry Salt, statistical style analysis (1974 article; *Moving Into Pictures* / *Film Style and Technology*, book editions) | the founding ASL methodology Redfern above critiques; per-film and per-era ASL tables | ASL by decade and studio, widely quoted secondhand (e.g. by Bordwell) but the primary book editions are not free | book, no free full text found; the 1974 article is cited inside Redfern's paper above | the article: partially, through citation; the books: no, purchase required |
| Rayner, eye movements in reading and scene perception (summarised widely, e.g. Rayner 1998, *Psychological Bulletin*) | average fixation duration during reading and scene viewing | reading fixations average about 200-250ms; scene-viewing fixations run longer, roughly 300-400ms | paywalled journal article; summarised in open lecture notes and textbooks, no single free canonical link found | the exact paper: no; the number is widely repeated in open secondary sources |
| Potter and Levy (1969) and later RSVP "gist" work (e.g. Potter, Wyble, Hagmann, McCourt 2014, "Detecting meaning in RSVP at 13 ms per picture") | how fast a viewer extracts the GIST of an image, as distinct from reading it | a single image shown alone for 100ms is easily remembered; meaning can be detected at exposures as short as 13ms per picture in an RSVP stream, though durable memory needs longer | [link.springer.com](https://link.springer.com/article/10.3758/s13414-013-0605-z) (abstract free, full text paywalled) | abstract and secondary coverage: yes; full PDF: paywalled |
| Rensink, O'Regan, Clark (1997) and later change-blindness literature | how long it takes a viewer to notice a large change between two alternating scenes when nothing marks it | under the flicker paradigm, viewers commonly need 10-20 seconds (20-40 alternations) to notice a large change with no attentional cue | [rensink UBC PDF](https://www2.psych.ubc.ca/~rensink/publications/download/PsychSci97-RR.pdf) | yes, open |
| Flicker fusion threshold, general vision science (Wikipedia summary of the primary literature) | the frequency above which a flickering light reads as steady | roughly 35-40Hz as a typical baseline for a plain light source, ranging up to 50-90Hz depending on stimulus, with reports of artifact perception past 500Hz for high-frequency spatial content on displays | [en.wikipedia.org/wiki/Flicker_fusion_threshold](https://en.wikipedia.org/wiki/Flicker_fusion_threshold), primary sources linked from there | yes |
| EBU R128 / ITU-R BS.1770 | broadcast loudness normalisation standard | -23 LUFS integrated target (EBU), true-peak ceiling -1dBTP; measured as integrated LUFS, not instantaneous RMS dBFS | [tech.ebu.ch](https://tech.ebu.ch/publications/r128), ITU-R BS.1770 (paywalled by ITU, widely summarised free) | the summary: yes; the full ITU-R text: paywalled |
| ITU-R BT.601 / BT.709 "legal range" | broadcast-safe luminance range for 8-bit video | studio/legal range 16-235 for luma in 8-bit signals (0-255 full range is "extended"/PC range) | ITU-R recommendation, paywalled primary text; widely restated in open broadcast engineering references | the primary spec: paywalled; the number: freely restated everywhere |

### The honest note on Cinemetrics access

The site's public pages describe the measurement tool, the visualisation charts (ASL, MSL, standard
deviation, grouped by title/year/director), and the scale of the project (tens of thousands of films
logged since 2005, per third-party coverage of the project). This research could not confirm, from the
pages it could reach, whether the underlying per-film shot-length data is exportable in bulk (a CSV or
API) rather than viewable film by film through the charting tool. Treat "downloadable in bulk" as
unconfirmed until someone opens the live site and checks the export options directly.

## 2. Books: numbers versus principles

The owner asked for this distinction by name, so it is kept separate from the source table above; none
of these produced a citable number for the mapping table in part 3.

| book | what it gives us | numbers or principles |
|---|---|---|
| Walter Murch, *In the Blink of an Eye* (2nd ed., Silman-James Press, 1995/2001) | the Rule of Six: six reasons to cut, ranked by weight (emotion first, three-dimensional continuity last), commonly quoted with rough percentages (emotion ~51%, story ~23%, rhythm ~10%, the rest smaller) | PRINCIPLES. The percentages describe which of six qualities a good cut should serve, not how long anything should hold. No usable threshold. |
| Karen Pearlman, *Cutting Rhythms* (2nd ed., *Intuitive Film Editing*, Focal Press, 2016; a 3rd ed. exists as *Cutting Rhythms: Creative Film Editing*) | a theory of editing rhythm grounded in kinesthetic empathy (Pearlman's own background as a choreographer); distinguishes an editor's control of TIMING (the cut point) from PACING (the rate of cuts) | PRINCIPLES. No published duration or rate table; the book's own distinction (timing vs pacing) is useful vocabulary, is quoted directly inside the Redfern paper above, but carries no number we could cite. |
| Bruce Block, *The Visual Story* (3rd ed., Routledge/Focal Press, 2021) | a seven-component model of visual structure (space, line, shape, tone, colour, movement, rhythm) and how they combine to control pace and intensity | PRINCIPLES. This research found no published numeric duration or rate table in the material it could reach without buying the book. If a number exists, it is inside chapters this research did not open; flag for a purchase-and-check rather than cite blind. |
| Edward Dmytryk, *On Film Editing* (Focal Press, 1984) | seven rules of cutting (e.g. "never make a cut without a positive reason", "cut for proper values rather than proper matches") | PRINCIPLES. Explicitly non-numeric: Dmytryk argues against fixed rules like a maximum shot length, saying the only reason to cut is to improve the scene. This book is evidence AGAINST importing a hard threshold from craft literature, not a source for one. |

No motion-graphics-specific title with real published numbers was found beyond the Material Design 3 and
Apple HIG specs already in the source table; those are the design-system equivalent of a "motion graphics
book with numbers" and are treated as such.

## 3. Mapping table: candidate sources for the sourceless constants

Every row below is a constant from `THRESHOLD-PROVENANCE-AUDIT.md`'s 86, a candidate source from part 1,
and what that source implies, set against our own number. No constant is changed by this document.

| constant | file:line | our value | candidate source | what the source implies | agreement |
|---|---|---|---|---|---|
| `MIN_TYPE_HOLD` | `quality/gates/critique.mjs:165` | 0.4s | Netflix subtitle timing, `MIN_LIFE` (already cited in `read-check.mjs:119`) | Netflix's own floor for one readable event is 20 frames@24fps = 0.833s, converted to 25 frames@30fps in our own repo | DISAGREE. Our post-typing hold is roughly half of the nearest published floor for "long enough to register as an event". Worth an explicit argument (a typed line's hold is not asking to be READ again, only to register as finished) rather than silence. |
| `DEAD_AIR` | `quality/gates/beat-check.mjs:92` | 0.4s | Netflix `GAP_MIN` (already cited in `read-check.mjs:122`, same source) | Netflix's flicker-vs-pause line is 15 frames@30fps = 0.5s: shorter reads as a flicker defect, longer reads as a deliberate breath | CLOSE BUT UNCITED. `beat-check.mjs` is answering the same question `read-check.mjs` already answered with a named source, and lands on a different number (0.4s vs 0.5s) with no citation of its own. This is the cross-gate drift AGENTS.md warns about: two gates naming one flaw with two answers. |
| `TAIL` | `quality/gates/beat-check.mjs:93` | 0.2s | same Netflix gap-timing page | Netflix's minimum joinable gap (`GAP_JOIN`, already cited) is 2 frames@24fps = 3 frames@30fps = 0.1s | LOOSE. `TAIL` asks that a closing plate hold SOMETHING for 0.2s, a different question (content presence, not gap length) from what `GAP_JOIN` answers, so this is a weak analogy, not a real match. Listed as a near-miss so it is not silently skipped. |
| `PROSE_WORDS` / `PROSE_SIZE` | `read-check.mjs:124-125` | 4 words / size 28 | Potter and Levy's RSVP gist work | a viewer grasps the GIST of a single image or short string in well under 100ms, far faster than the words x 0.6s "read it twice" clock this gate applies to longer prose | SUPPORTS THE EXCLUSION, not the exact cutoff. The research backs the qualitative claim ("1-3 words are apprehended at a glance, not read") but nobody publishes a word-count or point-size line, so 4 and 28 stay arguments, not citations. |
| `SEARCH` | `quality/gates/eye-trace.mjs:267` | 1.5s | Rayner-style fixation/saccade duration research | a fixation runs roughly 200-400ms in scene viewing; 1.5s covers 4-8 fixations, more than one orienting glance | LOOSE. The eye finds SOMETHING inside one or two fixations (under 1s), so a 1.5s search window is generous rather than tight, but no source publishes "how long before a viewer gives up looking for the new focal point after a cut", so this stays an analogy. |
| `SILENCE_DB` / `LOUD_DB` | `quality/gates/motion-sound-check.mjs:122,144` | -40dB / -28dB | EBU R128 / ITU-R BS.1770 | -23 LUFS integrated target, measured as time-weighted perceptual loudness, not instantaneous RMS dBFS | WRONG UNIT, NOT A DIRECT SOURCE. EBU R128 answers a mix-level question (how loud is the whole track), our gate answers a moment question (is this instant louder or quieter than the frame's motion). Noted because a future rewrite of this gate in LUFS would have a real standard to cite; the current RMS-dB form does not. |
| `NOISE_FLOOR_DB` (`audio-render-check.mjs:123`) and `AUDIBLE` (`sfx-audit.mjs:41`) | both -45dBFS | no external source found | the two files independently land on the exact same -45dBFS "inaudible under a mix" line | this is an internal-consistency finding, not an external one: the number is unsourced in both places but at least not drifting between them. Recorded here so a future citation effort only has to justify -45dBFS once. |
| `JUMP_FAR`, `CONTINUITY_MAX_DUR`, `SPINE_MAX_S` | `eye-trace.mjs:86`, `direction-floor.mjs:455`, `storyboard-check.mjs:156` | 0.30 (fraction of diagonal), 15s, 15s | Cinemetrics / Salt / Bordwell ASL data | published ASL figures describe how long an AVERAGE SHOT runs across a whole film or genre, not how far a cut may jump the eye or how long one continuous object may hold the frame before a film is allowed to chapter | DOES NOT MAP. These three ask questions ASL cannot answer: ASL is a whole-film average of shot duration, not a per-cut eye-travel distance or a single-object continuity ceiling. Real corpus data exists here (see part 4) but it answers a different question than the one these three constants ask. |

**86 sourceless constants; 4 found a source that at least answers the same kind of question (`MIN_TYPE_HOLD`,
`DEAD_AIR`, `PROSE_WORDS`/`PROSE_SIZE` as one pair, `TAIL` as a weak near-miss), 3 more found a source that
answers an ADJACENT question in the wrong unit or the wrong domain (`SEARCH`, `SILENCE_DB`/`LOUD_DB`,
`JUMP_FAR`/`CONTINUITY_MAX_DUR`/`SPINE_MAX_S` as a three-way non-match), and one pair (`NOISE_FLOOR_DB`,
`AUDIBLE`) turned up no source but did turn up an internal consistency worth recording.** That is roughly
8-10 of 86 touched by this research with anything worth writing down. The remaining ~76-78 are addressed
directly in part 4: no external source answers them, and that is the finding.

## 4. The honest gaps: questions no external source answers

Stated plainly, per the owner's standing acceptance that a gate with no source should report rather than
block:

- **Camera dramaturgy has no published numeric literature.** `CAMERA_PUSH_S`, `CAMERA_MOVE_PX`,
  `CAMERA_COVERAGE_FLOOR`, `CAMERA_COVERAGE_MIN_DURATION`, `CAMERA_TRAILING_FREEZE`, `FAST_RATIO`,
  `SPEED_EPS` (`critique.mjs`, `choreo.mjs`) ask "how fast is a push", "how much of a film should the
  camera cover", "how long may a camera freeze trail a subject". Cinematography craft books discuss
  camera movement extensively (dolly vs zoom, when to move at all) but do not publish thresholds in
  seconds or pixels-per-frame; this is genuinely uncharted outside our own footage.
- **Colour and contrast are out of scope for a TIMING research pass.** `designspec-check.mjs`'s `TOL`
  and `NEUTRAL_SAT`, and arguably `ground-arc.mjs`'s `LIGHT`/`DARK` luminance split, are colour-science
  questions. WCAG contrast ratios and ITU-R BT.601/709's 16-235 legal luminance range are real published
  numbers in the neighbourhood, but this research did not verify whether `ground-arc.mjs`'s post-render
  0-255 pixel samples are even in the same colour space those standards assume (broadcast legal range
  vs a raster's full-range RGB), so no claim is made here beyond naming the candidate for someone who
  opens that file next.
- **Render-fidelity tolerances are an engineering question, not a perceptual one.** `plan-vs-render.mjs`'s
  `NEAR`, `STILL`, `DRIFT`, `OVERRUN`, `BEAT_TOL` ask whether the rendered frame matches what the JSON
  planned, which is a QA tolerance question. No perceptual or craft source applies; this is the same
  shape as the `FORMULA` exclusions the provenance audit already carved out, just not mechanically
  detected as one.
- **Dissolve muddiness, scale drift, and similarity thresholds have no craft literature.**
  `seams.mjs`'s `VISIBLE`/`MUDDY`, `frame-check.mjs`'s `SCALE_DRIFT_MAX`,
  `mistakes-dupes.mjs`'s `THRESHOLD`, `waiver-drift.mjs`'s `DRIFT` are all measuring OUR OWN pipeline's
  behaviour (does a dissolve look muddy on our renderer, does our own text drift between waiver checks).
  These are inherently self-referential; an external source cannot answer a question about our own
  encoder or our own diffing tool.
- **`docker-context.mjs`'s `BUDGET_MB`** is an infrastructure limit (a build context size cap), not a
  motion or timing constant at all. It appears in the audit's mechanical sweep but sits outside this
  research's domain entirely; noted so it is not silently forgotten as "unaddressed".
- **Reading-speed research (Brysbaert 2019) is not currently cited anywhere in this repo.** The task
  brief describes it as already used, but a search of `quality/gates/*.mjs` and `harness/lib/*.mjs`
  for "Brysbaert" or "wpm" found no match outside `read-check.mjs`'s ssw.com.au citation. If Brysbaert's
  actual reading-speed meta-analysis (which reports a mean silent-reading rate for adults, commonly
  quoted around 238 wpm) is meant to replace or corroborate the 200 wpm "read it twice" figure, that
  substitution has not happened yet and is worth a follow-up, not assumed done here.

## 5. What to measure ourselves, instead of our own films

- **Cinemetrics, used as a reference corpus rather than a threshold source, is a real option for exactly
  one class of question: whole-film or whole-genre pacing.** `direction-floor.mjs`'s
  `library-top5-only` device and its cadence spread already compare a film against ITSELF or against
  "the top five of our own library", which the provenance audit correctly notes is a RELATIVE question
  and out of scope for this audit. But if that device ever needs an EXTERNAL anchor (is this film's
  cadence spread wide or narrow compared to real cinema, not just compared to our own eighteen films),
  Cinemetrics is the right instrument: it holds ASL and MSL for tens of thousands of films, filterable
  by genre and year, and Redfern's paper (part 1) is the correct methodological warning to read before
  using it (ASL is a mean, not a rate, and comparing means across genres is safer than treating any
  single film's ASL as a threshold).
- **It cannot replace the corpus-derived constants already named in the "ten worst offenders" list**
  (`CAMERA_COVERAGE_FLOOR`, `GHOST_FLOOR`/`GHOST_RATIO`/`RES_FLOOR`, `LOCAL_SHARE`, `SPECTACLE_MIN_*`).
  Those measure things Cinemetrics does not track at all: camera coverage percentage, dissolve ghosting
  artifacts, per-pixel motion share, and boundary-density spectacle detection are properties of OUR
  renderer and OUR compositing choices, not of edited theatrical film. A 15,000-to-20,000-film shot-length
  database has nothing to say about whether our dissolve looks muddy.
- **Verdict: Cinemetrics is a genuine, citable, free-to-browse external reference corpus for shot-length
  and cutting-rate questions, and it should replace "compared to our own 18 films" wherever a constant is
  actually asking a shot-length or cutting-rate question.** None of the 86 sourceless constants in this
  audit asks that question directly today; `CONTINUITY_MAX_DUR` and `SPINE_MAX_S` come closest and were
  shown in part 3 to be asking something else (continuity-object survival and narrative-spine duration,
  not average shot length). If a future constant is added to measure literal cutting rate or shot length,
  Cinemetrics is the source to reach for, not our own library.

## Sources checked but excluded from the table

- Barry Salt's book editions (*Moving Into Pictures*, *Film Style and Technology*) were not opened
  directly; their numbers are known only through Redfern's paper quoting them, so nothing from them is
  claimed here beyond what Redfern's paper itself states.
- No pirated or unauthorized copy of any book above was sought or opened. Where a number might exist
  only inside a purchased book (Bruce Block above), that is stated plainly rather than guessed at.

## 6. Extension (`.claude/plans/numbers-out-principles-in.plan.md` Task 2): the Group A constants part 3 did not reach

Part 3 above mapped candidate sources for a subset of the 86. `THRESHOLD-PROVENANCE-AUDIT.md`'s Task 1
now names all 86 in three groups; this section finishes the search for the 34 Group A constants, one row
per constant not already resolved above. Same rule: a URL or an ISBN, free-to-check marked, PRINCIPLE
vs NUMBER recorded, and no invented replacement.

| constant | file:line | candidate source | verdict |
|---|---|---|---|
| `FAST_RATIO` | `choreo.mjs:69` | Multiple UI-motion design systems publish the SAME qualitative rule as this file's own comment: an exit should run faster than its entrance. NN/g ("Executing UX Animations", nngroup.com) and 72Technologies' "Motion Budget" (72technologies.com/blog/motion-budget-ui-animation-ratios) both state exits should be quicker, with concrete ratios in the 50-75% range (halve the exit duration; exit at ~75% of entrance). | **SOURCE, PRINCIPLE + RANGE.** The qualitative rule ("exit faster than entrance") is real and published in more than one place; the exact fraction is NOT standardised (50% vs 75% disagree by half). `FAST_RATIO = 0.6` (40% faster) sits inside the published range. Cited in place; not changed, because no single source outranks the others and 0.6 already sits between them. |
| `OTHER_WPS` | `read-check.mjs:131` | Ofcom's Code on Television Access Services (already cited in this file's family via `HOLD_PER_WORD`'s neighbour `CPS_WALL`/Netflix): 160-180 wpm pre-recorded, up to 200 wpm live. | **SOURCE.** `OTHER_WPS = 3` words/second = 180 wpm, inside Ofcom's pre-recorded band and under its live ceiling. This is the SAME source family already cited two lines above it in the same file; the gate's own comment already distinguishes it from `HOLD_PER_WORD`'s read-twice rate, so this is naming a citation that was implicit, not adding a new one. |
| `TRAIL_WINDOW` | `motion-audit.mjs:623` | Disney's animation principles (as documented by Frank Thomas and Ollie Johnston, animators, in *The Illusion of Life: Disney Animation*, Hyperion, 1981; widely restated, e.g. cgspectrum.com/blog/12-principles-of-animation, rebusfarm.net's guide to Follow Through and Overlapping Action): loosely-attached parts continue moving after the main mass stops, and different parts settle at different rates. | **PRINCIPLE, no number.** The qualitative principle (follow-through, overlapping action) is real, named, and sourced. No source publishes a frame or second count for how long a trailing part may lag; this gate's own comment already treats its output as a candidate to NAME, not a verdict ("naming the candidate is the whole point... leaves the call to the author"), so the shape already matches what a principle-only finding should be. |
| `HANDOFF_WINDOW` | `scene-timing.mjs:483` | `motion-floor.mjs:45` `WINDOW_S = 0.5`, already CITED in this repo (`THRESHOLD-PROVENANCE-AUDIT.md`'s 7-cited list). | **DERIVED FROM AN ALREADY-CITED CONSTANT.** The file's own comment already says this: "widened to half a motion-floor window (0.25s)". `HANDOFF_WINDOW` is not an independent invented number; it is `WINDOW_S / 2`. Worth stating as a derivation in place rather than leaving it to read as a second unsourced number next to the first. |
| `FULL_FRAME_OBJECT_AREA` | `contract.mjs:613` | This repo's own medium: five canvas sizes (`AGENTS.md`, `core/layout/safe.js`), smallest 1080×1080 = 1,166,400px². | **MEDIUM (category 2), already argued, not phrased as a citation.** The file's own comment already does the derivation ("clears every one of them... while still excluding a merely large card or panel"); it was counted `NONE` only because the mechanical scanner looks for a URL/keyword, not an argument. This is the "nearly legitimate" case Task 1 of the prior audit already flagged. |
| `FULL_FRAME_SHARE` | `scene-timing.mjs:457` | Same medium as above (the canvas itself), but expressed as a SHARE (0.8) rather than a derived area. | **ARGUED, NOT DERIVABLE THE SAME WAY.** Unlike `FULL_FRAME_OBJECT_AREA` (a fixed px² that provably clears every canvas), `FULL_FRAME_SHARE` is a fraction with no equivalent derivation: 80% is asserted, not computed from the five aspect ratios. NONE. |
| `CONTINUITY_MAX_DUR`, `SPINE_MAX_S`, `TURNOVER_MIN` | `direction-floor.mjs:455,640`, `storyboard-check.mjs:156` | Cinemetrics / Salt / Bordwell ASL data (part 1); Redfern's methodology paper (part 1). | **DOES NOT MAP**, confirmed again for `TURNOVER_MIN`: no published work asks "how many layers must turn over at once to count as a scene change" (this is an engine-internal detection question, about OUR layer model, not film editing in general). All three: NONE. |
| `MIN_DURATION_FOR_CHECK` (`sweep-static.mjs:27`) | reclassified | (n/a) | Moved from a Task-1 first pass into Group B: it is one part of a three-constant frozen-render bug detector (with `CHANGE_THRESHOLD`, `SAMPLE_COUNT`), an engineering QA question ("did the renderer actually produce motion"), not a craft opinion. Not researched further; out of scope. |
| `DEAD_AIR` (`beat-check.mjs:92`) | Netflix Timed Text Style Guide, `GAP_JOIN`/`GAP_MIN`, already cited in `read-check.mjs:121-122` in this same repo | **CLOSE, TESTED, NOT ADOPTED.** `read-check.mjs`'s `GAP_MIN` (0.5s, Netflix's flicker-vs-pause line) is the nearest published number, but it answers a different question (a gap between two text EVENTS, not a hole with no content layer at all). Task 3 measured the effect of aligning the two anyway: every one of the library's 17 real `dead-air` findings sits between 0.4s and 0.5s, so raising `DEAD_AIR` to `GAP_MIN` would silence the check entirely (17 to 0). Kept at 0.4s, still uncited, rather than adopt a nearby number that guts a working detector; `dead-air` is also one of AGENTS.md's own named examples of a code authors deliberately waive ("I chose this"), evidence this check is doing real, wanted work. NONE, with the near-miss recorded and tested rather than acted on blind. |
| `TAIL` (`beat-check.mjs:93`) | same Netflix page, `GAP_JOIN` | **LOOSE, confirmed again.** `TAIL` asks whether the closing plate holds SOMETHING, not how long a gap may run; `GAP_JOIN` answers a different question. NONE, as part 3 already found. |
| `MIN_TYPE_HOLD` (`critique.mjs:165`) | Netflix `MIN_LIFE`, already cited | **DISAGREE, confirmed again.** Our 0.4s sits at roughly half Netflix's 0.833s floor for one readable event. Cited in place with the argued distinction part 3 already wrote: a typed line's post-type hold is asking the eye to register the line is DONE, not asking it to read the line again from nothing, so the two floors are not answering the same question even though both are about a "long enough" line. |
| `CAMERA_PUSH_S`, `CAMERA_MOVE_PX`, `CAMERA_COVERAGE_FLOOR`, `CAMERA_COVERAGE_MIN_DURATION`, `CAMERA_TRAILING_FREEZE` | `critique.mjs`, `choreo.mjs` | camera dramaturgy, confirmed again: no cinematography source publishes a push speed, a pan-pixel floor, a coverage percentage, or a trailing-freeze ceiling in these units. NONE, as part 4 already found. |
| `VISIBLE`, `MUDDY` (`seams.mjs:50-51`) | self-referential (our own compositor) | NONE, confirmed again: no craft literature on dissolve legibility thresholds; these grade OUR renderer's crossfade output, not a general editing question. |
| `SCALE_DRIFT_MAX` (`frame-check.mjs:57`) | self-referential (our own fragment authoring) | NONE, confirmed again: "how many distinct sizes before a film stops reading as one film" is a house-style consistency question, not sourced anywhere external. |
| `JUMP_FAR`, `SEARCH` (`eye-trace.mjs`) | Cinemetrics (does not map), Rayner fixation research (loose analogy) | NONE / LOOSE, confirmed again from parts 1 and 3. |
| `DEAD`, `LOCAL_SHARE` (`motion-floor.mjs:48,51`) | corpus-derived, explicitly self-admitted in the file's own comments | NONE, confirmed again. |
| `STILL_FLOOR` (`motion-sound-check.mjs:144`) | no craft or engineering literature found for "how little pixel change counts as stillness" as a standalone perceptual claim | NONE. Same shape as `motion-floor.mjs`'s `DEAD`, a sibling question answered nowhere external. |
| `HOLDW` (`motion-audit.mjs:69`) | Material Design 3 / Apple HIG settle/duration tokens (part 1) answer a DIFFERENT question (how long a UI element's OWN transition should run), not how long a payoff must sit steady before it may exit | NONE, does not map; the M3/HIG numbers are for interface motion duration, not for "has this settled long enough to leave". |
| `FLOOR`, `HOLD` (`pace-check.mjs:37-38`) | Cinemetrics-style ASL/cutting-rate data, Redfern's paper | NONE, same shape as `JUMP_FAR`: the file's own comment already says "THE CONSTANT, AND IT IS OURS" in spirit (calibrated on this library's own percentiles); no published events-per-second or hold-ceiling literature exists for motion-graphics pacing specifically. |
| `SPECTACLE_MIN_BOUNDARIES`, `SPECTACLE_MIN_DUR` (`plan-vs-render.mjs:124`) | corpus-derived, argued at length in the file's own comment (measured against 110 scenes) | NONE, confirmed again: "does this film need a nominated spectacle peak" has no external literature; it is this engine's own structural convention. |
| `PROSE_WORDS`, `PROSE_SIZE` (`read-check.mjs:124-125`) | Potter/Levy RSVP gist research (part 3) | Supports the EXCLUSION qualitatively (a short/large string is apprehended at a glance, not read), no published word-count or point-size line. NONE for the exact cutoff, confirmed again. |
| `SHORT_FILM_FLOOR_SEC` (`safeguards.mjs:72`) | no craft or engineering literature on a minimum runtime for "expects a feature count" | NONE. Already the least risky of the Group A constants: `safeguards.mjs`'s own `adapt()` pattern already returns `skip`, never a hard fail, when a film is under this floor, so the constant already behaves as a report, not a bar. |

### Task 2 summary: source counts across the 34

**5 of 34 found a real external source and kept it** (`FAST_RATIO`, `OTHER_WPS`, `TRAIL_WINDOW`
partial/principle-only, `HANDOFF_WINDOW` and `FULL_FRAME_OBJECT_AREA` via internal derivation from a
cited/medium constant, `MIN_TYPE_HOLD` via a disagreeing-but-argued citation). One more (`DEAD_AIR`)
found a close source and TESTED adopting it, then rejected the adoption because it silenced a working
detector (see the row above); it is counted with the 28 that found nothing, since its number did not
change. **29 of 34 found nothing (or found something and correctly did not act on it blind)**: confirms
the plan's own expectation ("expect mostly principles",
"finding no number is the likely result"). None of the 28 converted to a PRINCIPLE in the sense of a
relationship between two values (`FAST_RATIO`'s asymmetry rule is the one constant already shaped that
way, and it is the one that also found a citable source); the rest are genuinely ungrounded magnitudes
this engine invented for its own detectors, and Task 3 reports rather than blocks on every one of them
that currently blocks a build.
