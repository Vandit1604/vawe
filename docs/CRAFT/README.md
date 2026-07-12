# CRAFT — decision guides for hand-authoring

**Load the relevant guide BEFORE you hand-write HTML or author a theme.** These answer *how to choose*
(a face, a palette, a layout, an image) — the decisions that separate intentional design from AI slop.
They are opinionated checklists, not textbooks: if a rule here wouldn't change what you build, it's cut.

| Guide | Load it when you are… | Answers |
|---|---|---|
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | picking `type.sans/serif/mono`, sizing headlines, spacing text | which face signals which personality · pairing · the size scale · weight/tracking/leading |
| [COLOR.md](COLOR.md) | authoring a `theme` palette, choosing bg/accent, checking contrast | build a palette from one dominant · 60-30-10 · light/dark dominance · WCAG for big type |
| [LAYOUT.md](LAYOUT.md) | placing layers, composing a beat, an `html` layer | grid · whitespace · hierarchy (one hero) · asymmetry vs centered · spacing scale · safe zones |
| [IMAGERY.md](IMAGERY.md) | deciding image vs gradient vs card, treating a photo, picking icons | when to use what · treatments (edgeFade/ken/clip) · licensing · icon choice |

## How these relate to the rest of the docs (no overlap)
- **CRAFT/** = *how to choose/build* (decisions). ← you are here
- [`../DESIGN-DATABASE.md`](../DESIGN-DATABASE.md) = *what techniques exist* (the catalog).
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md) = *how it moves* (motion rules + gates).
- [`../MISTAKES.md`](../MISTAKES.md) = *what went wrong before* (mistake → fix log).
- `.claude/skills/{taste-skill,impeccable}` = *enforcement* (the anti-slop detector + dials). CRAFT tells
  you what to do; impeccable checks you did it. Reach past what impeccable flags using these guides.

## The engine facts these guides are grounded in (not generic advice)
- **Theme contract** (`core/theme-contract.js`): a theme MUST define `palette.{bg,bg2,surface,surface2,
  line,lineStrong,text,text2,dim,ink,accent,accentDim,accentGlow,up,down}`, `type.{sans,serif,mono,num}`,
  and 3 `gradient` stops. No fallback look — COLOR/TYPOGRAPHY map to exactly these keys.
- **Bundled faces** (`core/tokens.css`): Inter, Inter Display, Space Grotesk, Instrument Serif, Geist,
  Geist Mono, Plus Jakarta Sans, JetBrains Mono, Hanken Grotesk, Caveat (Söhne is local/licensed).
- **Doctrine**: colours ONLY from the brand (eyedrop, `make palette`); dominance decided by LOOKING;
  no em-dashes on screen; patterns are seasoning not wallpaper. See [`../MISTAKES.md`](../MISTAKES.md).
