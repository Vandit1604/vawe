---
when: "you are about to ask an agent for a film and want the prompt shape that already worked in the motion-from-code ecosystem, retargeted to one page.html"
answers: "the index of prompt templates (name, use when, length, source and licence), the page contract every template targets, and the six golden films built from them"
group: reference
---

# prompts/: the library

Twelve templates. Each is one markdown file with: when to use it, the template (XML-sectioned
where the original was), the inputs to ask for, the gotchas, and a `source:` line with URL, author
and licence. Every template targets the vawe page contract:

- one `films/<name>/page.html` with `<meta name="duration" content="<s>">`, relative assets;
- time is the seek: CSS `@keyframes` and `element.animate()` (the renderer seeks them), or
  `window.seek(t)` in seconds as a pure function of `t`;
- `<audio src data-at data-gain data-fade-out>` for files, `<audio data-synth="<voice>" data-at>`
  for the synth voices in `core/audio/kit.mjs` (pluck, chime, sparkle, droplet, bloom, success,
  ready, whoosh, riser, drop, impact, swell, braam); never played live, mixed offline at -14 LUFS;
- `bin/vawe dev <page>` (draft), `bin/vawe ship <page>` (final), `bin/vawe critique <page> --ref <mp4>` (match a reference),
  `bin/vawe judge` (threshold 7, two fresh runs);
- helpers in `core/motion/springs.js`: `spring`, `track`, `approach`, `kf`, `springLinear`, `rng`.

## Index

| name | use when | length | source (licence) |
|---|---|---|---|
| [showreel-one-liner](showreel-one-liner.md) | no brief; a taste probe; learn the agent's defaults, then ban them | 15 s | awesome-ai-motion cases by @stephanlivera, @ajith_io, @VincentWei93 (third-party text; own template) |
| [brand-launch-from-url](brand-launch-from-url.md) | a real product from a URL, its own kit, real captures only | 15 to 40 s | twoclipping ad brief (third-party; own template), athemeroy playbook s.3 (CC BY 4.0), Movez (pattern) |
| [ui-morph-loop](ui-morph-loop.md) | one element becomes 8 to 12 UI states and loops, on a beat grid | 12 to 16 s | twoclipping morph brief (third-party; own template) |
| [reference-rebuild](reference-rebuild.md) | a reference mp4 must be matched: SPEC.md, KEEP/CHANGE, rebuild, `bin/vawe critique --ref` | the reference's | notdwd (pattern), `skills/vawe-reference/SKILL.md` (ours) |
| [directors-brief-long-form](directors-brief-long-form.md) | over 60 s, or more than one session or agent: BRIEF, STORYBOARD, GUIDE, chapters | 1 to 6 min | PDoomVideo (ISC in package.json, pattern), ClaudeAnimationBase (MIT), Austerlitz (no licence, pattern), Movez (pattern) |
| [critique-pass](critique-pass.md) | a draft exists; fresh critic, default reject, four views, frame-locked if a reference exists | one pass | notdwd and Movez (pattern), `engine-doctrine/JUDGE.md` (ours), ClaudeAnimationBase (MIT) |
| [story-explainer](story-explainer.md) | explain a topic with invented visuals: facts list first, narration timeline | 30 s to 3 min | athemeroy playbook s.2 (CC BY 4.0), Ror Fly and dotey requests (pattern) |
| [music-video-beat-synced](music-video-beat-synced.md) | a song exists; every cut on a downbeat, one spectacle at the drop | the song's | twoclipping (own template), claude-animation-skill sound (MIT), PDoom storyboard (pattern) |
| [pixel-art-sprite](pixel-art-sprite.md) | a 16-bit sprite loop: logical resolution, palette, state machine, quantised pose | 2 to 8 s | Majid Manzarpour's wizard (third-party; own template) |
| [interactive-lab-capture](interactive-lab-capture.md) | a mechanism as an explorable model, then a scripted tour of it | 20 to 60 s | Ryan Sael's lens lab, Konstantin Saifo's Raptor (one-line briefs; own template) |
| [production-brief-acceptance](production-brief-acceptance.md) | a client or a claim; inputs and rights, three gates, the hardest 2 to 4 s first | one page | athemeroy production brief (CC BY 4.0, adapted) |
| [beat-sheet](beat-sheet.md) | any film over one beat: the shot table before code | one table | claude-animation-skill (MIT), ClaudeAnimationBase (MIT), HyperFrames anatomy (Apache 2.0, pattern) |

## Licence rule

Text is copied only where the source licence allows redistribution (MIT, Apache 2.0, CC BY 4.0
with attribution). The creators' prompt texts in `awesome-ai-motion` are third-party and outside
that list's MIT licence (`THIRD_PARTY.md`), so those templates are rewritten from the pattern and
cite the post. The three owner-shared articles (twoclipping, notdwd, Movez) are not redistributable
and appear as patterns only. Remotion's skills carry the Remotion licence (not OSI) and are studied,
not copied. Every file's `source:` line records this per template.

## How to use one

1. Pick the row. If two fit, the shorter film wins; under 15 s most types are one continuous action
  .
2. Copy the template block into the session. Fill the `<inputs>` by asking; never guess an asset.
3. Every template stops before code at least once. Honour the stop: the beat grid, the facts list or
   the SPEC is what the owner reads.
4. Draft with `bin/vawe dev <page>`, then run `critique-pass.md` as a fresh agent.

The findings that chose these twelve, and the six golden films to build from them:
[FINDINGS.md](FINDINGS.md).
