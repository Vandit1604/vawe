---
when: "\"let's make a video\", before opening any file: which film type is this, and which prompt template and skill does it take?"
answers: "the film-type table (nine types, first matching row wins), the prompts/ template and skill each one takes, and how to resolve the common ambiguities"
group: crosscutting
---

# ROUTING: which film type is this

A request maps to one film type. Match the table top down; the first row that fits wins. Match the
FILM the request wants, not a word it happens to use. Then copy that row's template from `prompts/`
into the session and load its skill. Every template stops before code at least once; honour the stop.

## The film-type table

| # | film type | the request | template (`prompts/`) | skill |
|---|---|---|---|---|
| 1 | reference rebuild | a reference mp4 must be matched: its light, pacing, type, curves | `reference-rebuild.md` | `vawe-reference` |
| 2 | brand launch | market or show a real product, company or site from a URL, its own kit, real captures | `brand-launch-from-url.md` | `vawe-page` |
| 3 | UI morph | one element becomes 8 to 12 UI states on a beat grid and loops | `ui-morph-loop.md` | `vawe-page` |
| 4 | story or explainer | explain a topic, an article or data with invented visuals, nothing sold | `story-explainer.md` | `vawe-page` |
| 5 | music video | a song exists; every cut on a downbeat, one spectacle at the drop | `music-video-beat-synced.md` | `vawe-page` |
| 6 | long form | over 60 s, or more than one session or agent: brief, storyboard, guide, chapters | `directors-brief-long-form.md` | `vawe-page` |
| 7 | app or game capture | a mechanism as an explorable model, then a scripted tour of it | `interactive-lab-capture.md` | `vawe-page` |
| 8 | showreel | no brief: a taste probe, or learn the agent's defaults and then ban them | `showreel-one-liner.md` | `vawe-page` |
| 9 | sting | a short unnarrated motion unit under 10 s: a logo reveal, a stat hit, a moving title | `beat-sheet.md` (one row per beat) | `vawe-page` |

Every type then goes through the same loop: stills, draft, a fresh critique (`vawe-critique`,
`critique-pass.md`), fix the named seconds, final. Under 15 s most types are one continuous action.
A client brief with rights and claims to check takes
`production-brief-acceptance.md` before any row. A sprite loop takes `pixel-art-sprite.md`. A still
that "looks AI" or a product UI surface takes `impeccable` (`skills/impeccable/SKILL.md`).

## Resolve the common ambiguities

- A request that names a site but sells nothing (no product, no CTA) is a reference rebuild, not a
  brand launch: the reference is the subject there, a product is the subject here.
- A short sting cut from a captured site (a 6 s logo reveal for a real brand) is still a sting when
  both hold: under 10 s and motion is the message. "Make a video from this site" with no length is a
  brand launch.
- Data with a real product behind it is a brand launch when the ask is to market it; an explainer
  only when nothing is sold.
- A song plus a product is a music video: the song owns the cuts, the product fills the frames.
- Two rows fit: the shorter film wins.
- Nothing fits: `beat-sheet.md`, then `vawe-page`, and say in the brief which row it almost was.
