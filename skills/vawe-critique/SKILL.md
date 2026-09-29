---
name: vawe-critique
description: "Look at a rendered page film and say what is wrong, as a fresh session that did not write it: the phone, strip and loop views, make critique PAGE=, page-check, the default-reject judge that names shot, frame and fix, the top five, and re-rendering only the affected seconds. Load after any draft render, before any fix."
effort: high
---

# vawe-critique: how to look

The author never grades its own film. Run this in a session that has not seen the authoring
(`VAWE_AGENT=<name>` for a subagent). Default verdict is REJECT; the film passes only when you
cannot find a reason to reject it. Grade what is on screen, not what the film meant.

## The views, in this order

```bash
make critique PAGE=films/<name>/page.html [REF=quality/refs/<ref>/source.mp4]
```

It writes the sheet, the strip, the phone view and the loop pair, and runs the page checks. Then
look, and write one line per finding under each view:

1. **Sheet**: every frame. Is the focal point obvious in under a second? Is anything cramped,
   overlapping or unreadable? Producing a sheet is not looking at one: one line per frame.
2. **Strip**: both sides of every cut. Does the cut land on its beat? Does the eye know where to go
   after it? Does any exit run slower than its entrance?
3. **Phone**: the 9:16 render, or 16:9 at one third size. Can you read every string? Is the accent
   still one colour?
4. **Loop or end**: t=0 beside t=duration. A loop is pixel-identical; an end holds long enough to
   read.
5. **Checks**: `quality/gates/page-check.mjs` findings (readable hold, hook length, em dash, message
   and spectacle meta, aspect layout) and `make check GATE=anim-traps D=<page>`.

With a reference: frame-locked. Pull the same five timestamps from both. For each pair write light,
type scale, and the curve of the one thing that moves: same or not. Anything the draft added without
a KEEP/CHANGE line is a rejection (`vawe-reference`).

## The judge

Score the seven dimensions of `engine-doctrine/JUDGE.md` (readability, hierarchy, composition, brand
fidelity, asset fidelity, produced-not-generated, value), 1 to 10. Threshold 7 on every one. Two
runs, A and B, before a beat closes; one judge is an opinion. `vawe-audit` composes the verdict; a
PASS is never self-recorded.

Name every default you recognise; each is a rejection: a particle burst, a bouncy spring, a glow, a
logo slam, a gradient on chrome, a centred title on a gradient, everything fading in, corner labels,
a crossfade where a cut belongs, fake UI, dead time that no `authoring` waiver declares
(`engine-doctrine/RULES/banned-defaults.md`).

## The report shape

Every finding is shot + frame + fix:

```
REJECT: 7 findings, top five first.
1. [3.2s, frame 96] the stat lands on the same frame as the label; stagger the label 60 ms later.
   fix: films/x/page.html:88, delay 3200 -> 3260
2. [8.0s] exit of the card (420 ms) is slower than its entrance (300 ms). fix: line 131, 420 -> 220
...
```

End with exactly one of:

- `REJECT: <n> findings, the top five first.`
- `PASS: I looked for a reason to reject it and found none. <one sentence on what is best>`

A finding with no file and line is a complaint, not a critique. The critic proposes; the author
decides.

## After the critique (the author)

- Fix the top five. Re-render only the seconds they name:
  `make dev PAGE=films/<name>/page.html FROM=<s> TO=<s>`.
- Then a fresh critique again. Stop when it passes, or when two rounds in a row fix nothing the
  critic scores higher. Hand back with the last critique attached.
- Findings are fixed, not moved: the next critic gets the previous report and checks.

Template with the full prompt text: `prompts/critique-pass.md`. Judge dimensions:
`engine-doctrine/JUDGE.md`.
