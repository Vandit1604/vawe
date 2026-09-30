---
when: "about to justify a timing or loudness number, or asked where a threshold came from"
answers: "which external sources publish real timing numbers (Netflix, BBC, Ofcom, Material 3, Cinemetrics, EBU) and what each one says"
group: reference
---

# Timing sources

External sources for the timing numbers this repo uses. Where a source publishes a principle and no
number, the row says so.

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


