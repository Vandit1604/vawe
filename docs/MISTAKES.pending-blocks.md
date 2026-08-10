---
when: you are folding the block-schema pass back into the numbered log, or you hit one of the defects below
answers: "findings from the block option-schema pass: two dead props, one over-tight range, and what the new gate now catches"
group: engine
---

# Pending: findings from the block option-schema pass

These belong in `docs/MISTAKES.md` and are parked here because that file was another agent's territory
during this pass. Fold them in with numbers when the branches merge. Nothing below was fixed in this
pass: it was a declaration pass, and a behaviour change hidden inside one is exactly how a "no output
changed" claim stops being true.

## 1. `loadingBar` accepts `color` and never reads it

**What.** `blocks/dev.mjs`:

```js
export function loadingBar({ …, color = T.greenBright, settle = T.green, label, done = true } = {})
```

The fill paints with `settle`. `color` appears nowhere in the body except as the property NAME
`color:` on unrelated text layers. A caller that sets `color` gets the default green fill and no
message.

**Root cause.** The comment above the factory records that the fill used to be an entrance and was
rewritten to be driven. The rewrite dropped the reference and kept the parameter. Nothing checks that
a destructured parameter is read, so the signature kept documenting an option that had stopped
existing.

**Class.** Framework bug, and the repo's own worst one: silent substitution. The engine accepts input
and then ignores it.

**Fix, when someone takes it.** Either paint the fill with `color` and let `settle` be the landed
state it is named for, or delete the parameter. Do not leave both.

**What catches it now.** Nothing automatic. `scripts/gates/block-schema.mjs` lists it in `OMIT` with
that reason, so it is visible and named rather than silently absent from the option table. A real
check would be a dead-parameter rule over the factory bodies, which is a natural extension of
`blocks-audit.mjs` and is not in this pass.

## 2. `toast` accepts `body` and never renders it

**What.** `blocks/ui.mjs`. The file's own comment says the alert family (`notification` · `toast` ·
`callout` · `banner`) "now shares ONE vocabulary: `title` and `body`". `notification` renders `body`.
`toast` destructures it and draws `message`, `action` and the icon only.

It is worse in the stacked form: `toast({items})` recurses into the single-card form passing
`body: it.body`, so a caller who fills in bodies for three stacked snackbars sees three snackbars with
no bodies and no warning.

**Root cause.** The shared vocabulary was adopted by adding the name to the signature. Adding a name
is not adopting a vocabulary; rendering it is.

**Class.** Framework bug. Same silent-substitution class as #1, and it is the more surprising of the
two because the surrounding comment promises the opposite.

**Fix, when someone takes it.** Render `body` under the message, as `notification` does, or drop it
from both the signature and the `items` row and correct the comment.

**What catches it now.** As above: `OMIT` in `scripts/gates/block-schema.mjs`, plus an explicit note
in the `UI_SCHEMAS.toast` table saying why there is no dial for it.

## 3. A range that was tighter than the shipped catalog

**What.** The first draft of `CORE_SCHEMAS.splitScreen.h` set `min: 100`, reasoning from the
container's own geometry. The catalog's own `splitScreen` row ships `h: 96`, a two-row split of two
`listRow` panes, which is correct and normal.

**Root cause.** The range was derived from what the block looks like at its default size instead of
from what the block does. In a row split, `h` only feeds the divider and the pip inset, so a short
split is legitimate; only a column split has to clear the gap.

**Class.** Gate gap, caught before it shipped, and worth logging because it is the failure mode
CLAUDE.md warns about directly: a gate that measures the wrong thing manufactures defects, and the
author pays by deforming a good design until the number moves. The check that caught it is the one
that runs every catalog example through its own table, which is the cheapest way to keep a declared
range honest.

**What catches it now.** `scripts/gates/block-schema.mjs`, `catalog-fails-schema`.

## 4. Ranges that could not be derived, and are wide on purpose

Recorded so nobody reads a wide bound as a considered one:

- `statBig.to` / `statBig.from` / `statCard.to` / `statCard.from`: `±1e12`. A count layer renders any
  finite number and compacts above 1e6. There is no engine floor or ceiling to find.
- `installCard.ratings`, `avatarStack.extra`, `reactionBar[].count`: `0 .. 1e9`. Sanity bounds, not
  measured ones.
- `activeFrom` / `activeTo` / `active` on `tabBar` and `stepFlow`, and `searchEngine.clickIndex`:
  `0 .. 20`. The factories clamp these to the real item count themselves, so the declared ceiling is a
  sanity bound over a value the code already makes safe.
- `anim` and `enterDur` on `card`, `codeBlock` and the three sleek surfaces: `anim` is declared `str`
  rather than `enum` because its vocabulary is the ENGINE's animation registry, which lives outside
  `blocks/`. An enum copied by hand here would be a fourth copy of a list that already drifts. If the
  engine ever exports its animation names, this should become an enum reading that export, the way
  `codeBlock.theme` reads `CODE_THEMES` and `callout.tone` reads `TONE_NAMES`.
