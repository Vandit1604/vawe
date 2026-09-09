# site/ : read DESIGN.md before you change a pixel

**[`DESIGN.md`](DESIGN.md) is the contract for this directory.** It was extracted from the shipped
CSS, not written as an aspiration, so it describes what the site IS. Read it first, every time, and
if you change the system, change it there too.

The root `CLAUDE.md` governs the video engine. It has nothing to say about this Next app, and the
film-craft doc map (`docs/INDEX.md`) deliberately does not index `DESIGN.md`, because a token table
for a marketing site answers none of that map's questions. This file is how you find it instead.

## The five rules a contributor breaks first

1. **z-index is a closed set.** `--z-under · --z-base · --z-raise · --z-badge · --z-sticky · --z-nav
   · --z-skip`. Never write a number. If `--z-raise` is not enough you need your own stacking
   context, not a bigger number.
2. **Colour is one voice.** Cobalt plus a verb means *you can act on it*. Inert data gets no box, no
   accent, no verb. Never fade the accent for a secondary state: cobalt on its own tint at 75%
   measures 3.08:1 against a required 4.5. Use `--ink-2` or `--muted`.
3. **A rule reaches `globals.css` only when two routes need it.** One consumer keeps it in its own
   stylesheet. That rule is why a consolidation pass could delete 221 dead lines instead of 400.
4. **Pick a breakpoint from {640, 760, 900}** unless you have a measured reason. The set has already
   drifted once: 900 and 860 both ship and are the same breakpoint written twice.
5. **Record what shaped a surface, in DESIGN.md's provenance table, while you still know.** One line,
   naming the source precisely enough to re-fetch and saying what you REJECTED from it. Three surfaces
   already read UNRECORDED because nobody wrote it down and the session ended. Tokens survive in the
   CSS; the reasoning only survives if you type it.

## Where the craft bar is

`app/arsenal/arsenal.css` and `app/arsenal/Arsenal.tsx`. Hairlines for structure, ONE elevation step
and only on hover, mono for anything literal and sans for prose. Its comments explain each choice.
Match that register or beat it.

## The numbers on this site are never typed

`quality/gates/site-counts.mjs` fails a hardcoded count and has caught one twice. Every figure in
copy or in a comment is read from a registry through `site/lib/*.json`, which is generated. Do not
hand-edit those files; run the generator.

## Known gaps, so you do not rediscover them

- **No spacing, type or radius scale.** Seven font sizes ship inside a 3px band. The evidence tables
  are in `DESIGN.md`; defining the scales means changing about 200 declarations, so it wants its own
  pass rather than a drive-by.
- **No system dark mode.** `.pgdark` is a single opt-in class; there is no `prefers-color-scheme` and
  no `data-theme`, so a dark-OS visitor gets the light site. The mechanism is right (it swaps tokens,
  never components); seven tokens are uncovered and `DESIGN.md` lists them.
