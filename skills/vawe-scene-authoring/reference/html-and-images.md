---
when: "hand-writing a hook/CTA/card in HTML, sourcing an image or icon, or cutting real footage with edits[]"
answers: "the anti-slop moves for hand-authored HTML, the real-image-before-emoji order, and the edits[] cut-list sugar"
group: skill
---

# Hand-written HTML, images, and cutting real footage

## Beat the AI slop when hand-writing HTML (hooks, CTAs, cards)

Hand-authored HTML is where generic output creeps in. **Load `taste-skill` first** (Design Read + the
three dials + Anti-Default Discipline), then `impeccable` for craft, both vendored in `skills/`.
Non-negotiable moves:
- **Asymmetry over centered.** Default to an off-center anchor (hard-left, or a 2/3 split), not
  `align:center` on everything. Centered-everything is the #1 AI tell.
- **Scale contrast.** One oversized hero (a word, a number) paired with tiny understated text, a rhythm
  of extremes, not one safe size step.
- **A committed non-generic face.** Reflecting a real brand → its captured font. Anything else → never
  Inter or Space Grotesk (the slop faces); reach for Instrument Serif (editorial), a captured face, or one
  you register via `make brandspec` + `make palette`.
- **One bespoke visual device, not card soup.** Avoid the equal rounded-card grid and the rounded-icon-
  tile-above-a-heading. Invent one signature motif per video.
- **Layout by containment: group-first.** Anything with a spatial relationship (a label+value, a logo
  row, a card grid, a checkout card's contents) goes in a `group` (flex/grid box; children flow by `gap`,
  and children can be **nested groups**), never two absolute `x/y` layers you space by eye (that's what
  collides). Absolute `x/y` + `motion` is only for free placement / choreography. This is the
  flex-not-pixels rule; it's why the fix for "the % is too close to the label" is a group, not new coords.
- **Gate it:** `make designspec-check D=<file>` runs the impeccable detector (41 rules, no LLM) on the rendered DOM;
  clear its flags before you render. Full routing: `AGENTS.md`.

## Images & visuals: real first, emoji last

Order of preference (CLAUDE.md): **real licensed image → generated card → emoji**. Never embed
copyrighted media (posters/stills/album art) in a published video.

- **Auto-source:** `make assets D=films/<fmt>/<topic>.json`, fills missing icons: country→flag
  (flagcdn, PD), brand→logo (simple-icons, free), else a generated topic card. Dry-run by default;
  `WRITE=1` to apply.
- **Topic cards (any subject):** `node harness/media/cards.mjs "Quantum Computing" --sub "…"` → a designed
  SVG (deterministic per-title palette, grain, vignette, frame). Use when no clean image exists.
- **`icon(value, fallback)`** turns an image path into `<img class="icon-img">`, else renders the
  fallback (emoji/monogram). Always pass a monogram fallback: `icon(c.icon, name[0].toUpperCase())`.
- Chips/badges/cards come from `chipBox` on any layer (bg/pad/radius/border/elevation in the JSON).
  There is no shared treatment stylesheet (visuals.css was removed with the template formats).

## Editing real footage: `edits[]`, a cut list

Cutting real clips together as `video` layers works today (`in`/`out`/`rate`/`audio`, one layer per
cut, `start` computed by hand). `edits[]` is the sugar: a top-level list, lowered at expand time
(`core/engine/expand.js`) into ordinary `video` layers chained by `"<id>.end"`, so nobody does the
arithmetic.

```json
"edits": [
  { "id": "a", "src": "/assets/clips/interview.mp4", "in": 4.0, "out": 9.5, "audio": true },
  { "id": "b", "src": "/assets/clips/broll.mp4", "in": 12.0, "out": 15.0 }
]
```

`a` starts at 0 with `duration = 5.5`; `b` gets `start: "a.end"` for free. `id` must be unique and
`src` required, both refused by name if missing. `out<=in` is refused by `core/layers/video.js`
itself, not repeated here. **This is not `cuts[]`**: that key is the internal, lowered output of
`transitions[]` and the validator refuses it written directly (see `AGENTS.md`'s built-in rules).
Author a transition at a cut boundary the normal way, `transitions[]` at `"<id>.end"`; it still owns
every boundary between edits.
