---
when: "a client, a launch or a checkable claim needs sign-off by someone other than the author"
answers: "the one-page brief with inputs and rights, shots and states, three acceptance gates, and the hardest-window-first rule"
group: reference
---

# Production brief with acceptance gates

Brief shape: `bin/vawe new` writes Task, Look, Spec and Acceptance sections with numbers into brief.md; fill them as `prompts/ANATOMY.md` says.

**Use when** the film is for a client, a launch, or a claim that must be right, and someone other
than the author signs it off. It is the paperwork that a prompt alone skips: inputs and rights,
what must stay exact, and three gates with a named reviewer. Fill it before the storyboard.

**Length:** one page. It travels with the film as `films/<name>/production-brief.md`.

## The template

```markdown
# <working title>: production brief

## Goal and delivery
- Audience, and the one thing they should understand or feel:
- Where it plays; duration; aspect; render fps (60 final); language:
- Acceptance owner and deadline:
- Deliverables: page.html and its assets folder, the mp4 per aspect, the render command
- Must stay exact (product claims, names, wordmark, strings, numbers, identity):

## Inputs and rights
| asset, data or reference | file or URL | owner, licence, permitted use | how it enters the film |
|---|---|---|---|
| | | | |
- Missing assets, rights or facts that need a human decision:

## Who does what
- The agent: planning / storyboard / page / review (record what it really did)
- Frame source: the vawe page renderer (HTML, SVG, canvas, three.js); any capture named per shot
- Audio and captions: <audio data-at> music (source, licence), data-synth cues, TTS (voice, version)
- Human work and approvals: brief, assets, shot selection, revisions, final review

## Shots and visible states
| shot, time | start state | visible change | end state | exact string, fact or asset |
|---|---|---|---|---|
| 01, 0.00 to 0.00 | | | | |
- Continuity rules (product, camera, light, timing, the loop seam):

## Acceptance gates (record the result and the reviewer at each)
1. Storyboard and key frames: the required frames and states, strings and assets checked. Result:
2. The hardest 2 to 4 seconds: render that window first (bin/vawe dev <page> --from s --to s). Check adjacent
   frames, occlusion and contact, speed, seek-order repeatability (render two frames out of order and
   diff), audio and caption sync. Result:
3. The whole film: watch and listen to all of it. Duration, fps, aspect, exact strings, levels,
   sync, rights, a reproducible render. Result:

## Factual or physical claims (N/A for a purely illustrative effect)
- Claim and the public wording:
- Checkable reference (source data or formula, version, units, boundary conditions, licence):
- Test and tolerance; independent reviewer and result:
- If unchecked, label it an illustration, not a validated simulation.

## What was really done
- Attempts and failed renders; remaining defects; unverified claims:
- Public credit: what the agent did, what rendered the pixels, what was supplied, what a person did.
```

## Questions

Ask in this order; the first changes the film most. A skipped question takes its default; never wait.
The rest of the brief is filled as the film is made.

1. **Audience**: who watches, and the one thing they should understand or feel? Default: the product's buyer; "this works, and I can trust it". Why: the goal line decides every shot's job.
2. **Delivery**: where it plays, the duration, the aspect, the language? Default: the product's own site, 30 s, 16:9, English. Why: fps, duration and aspect are fixed in the brief, not discovered in the render.
3. **Exact**: what must stay exact (claims, names, wordmark, strings, numbers)? Default: every string and number on screen is copied from the source; none is invented. Why: gate 1 checks strings and gate 3 checks them again.
4. **Rights**: the assets, data and references, each with its owner and licence? Default: only assets that sit in the repo with a licence file beside them. Why: the rights table is the film's provenance.
5. **Owner**: who signs off, and by when? Default: the person who asked for the film, after the first draft and one critique round. Why: gate 3 needs a named reviewer and a result.

## Gotchas

- Gate 2 is the one people skip. The hardest window is where the film fails; render it before the
  easy 80 percent.
- "Made with an agent" does not mean the music, the fonts or the captures cost nothing. The rights
  table is the film's provenance.
- A number on screen that nobody sourced is a defect, not a design choice.

source: adapted, with changes for the vawe page contract, from the CC BY 4.0 "Copyable video
production brief" by athemeroy,
https://github.com/athemeroy/awesome-opus-5-5-videos/blob/main/docs/production-brief.md, and its
three acceptance stages in
https://github.com/athemeroy/awesome-opus-5-5-videos/blob/main/docs/visual-effects-fit.md.
