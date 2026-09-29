---
when: "you have no brief and want a taste probe, or want to learn an agent's defaults and then ban them"
answers: "the 15 second showreel one-liner and five anti-contagion variants that each remove one default"
group: reference
---

# Showreel one-liner (and the anti-contagion variants)

**Use when** you want to see what the agent does with no direction: a 15 second reel, a first
draft to react to, a taste probe for a new model or a new house rule. Also the cheapest way to
learn what an agent's defaults are, so you can ban them.

**Length:** one line. Everything else is the agent's.

## The template

```
Make a dynamic 15 second motion graphics film that shows what an incredible motion designer you
are, as if it were your showreel for a job application. Go all out.
One page: films/<name>/page.html, <meta name="duration" content="15">, 16:9.
```

The original one-liner (Stephan Livera, 22 words, quoted for reference) reads: "make a dynamic
15-second motion graphics video that shows what an incredible motion designer you are, like it's
your showreel for a résumé. go all out." Four creators in the awesome-ai-motion list ran the same
words and got near-identical reels: a dark canvas, a particle burst, a kinetic-type slam, a bouncy
spring, a logo. That sameness is the reason for the variants below.

## Anti-contagion variants

The dataset in awesome-opus-5-5-videos measured one long prompt reused a day later with 87 percent
of its 5-gram phrases shared (`data/prompt-overlap.json`). A short prompt has the same problem in
the output instead of the input: the agent reaches for the same first idea every time. Each variant
below removes one default.

1. **No prior.** Add: "Do not use any installed skill, template or block. Do not reuse a film you
   have seen or made. Invent the structure."  (Pattern from Vincent Wei's Anthropic-history prompt,
   which said exactly this in Chinese.)
2. **Named bans.** Add: "Banned: particle bursts, glows, RGB split, camera shake, grid floors, a
   bouncy overshoot, a logo at the end, dead time."  (The twoclipping ban list; every item on it is
   a first-draft default.)
3. **One constraint that forces a form.** Pick one: "white background only", "one typeface, one
   weight", "no cut for 15 seconds", "everything is one shape", "the camera never stops moving".
4. **A subject.** "about vawe, the framework for agent-native motion graphics" turns the reel into
   a product film and forces real content. (The Pocketsflow variant of the same one-liner did this.)
5. **A seed of taste.** Name one reference from `quality/refs/` and say "match its light and
   pacing, not its content".

Run the plain line first, then one variant, and keep the pair. The diff between them is the
agent's default, written down.

## Questions

The plain line needs none. Ask these only to choose the second run; a skipped question takes its default.

1. **Subject**: a subject, or none? Default: none; the plain line. Why: a subject is variant 4 and turns the reel into a product film.
2. **Variant**: which anti-contagion variant runs second? Default: 2, the named bans. Why: the pair is the point; the diff between the two runs is the agent's default, written down.
3. **Constraint**: one form-forcing constraint for variant 3, or none? Default: none. Why: a single constraint forces a form the agent would not pick.
4. **Length and canvas**: seconds and aspect? Default: 15 s, 16:9. Why: the original line was 15 s; a longer reel needs holds and a waiver.

## Gotchas

- Read the first frame before anything else. The validator rejects an em dash on screen and a hook
  over 12 words.
- A 15 second reel with no held frame is a wall of motion. Declare the holds
  (`"authoring": {"allow": ["dead-air"], "_why": {...}}`) or shorten the film.
- Exits run faster than entrances (house rule). A reel that ignores this reads as a template.
- Check the speed bands (`engine-doctrine/RULES/speed-bands.md`): the slowest beat is at least 3x the
  fastest.

## After the first draft

`bin/vawe dev films/<name>/page.html`, look at the sheet, then run
`prompts/critique-pass.md` with no reference.

source: https://github.com/guanmo-ai/awesome-ai-motion (cases 2103315922098470926 by @stephanlivera,
2103449416325890146 by @ajith_io, 2103918792845963545 by @achxvi, 2103381720410333314 by
@VincentWei93). Curator: Guanmo, MIT for the repo code; the creators' prompt texts are third-party
and not under that licence, so this file quotes one 22-word line with attribution and writes its own
template for the rest.
