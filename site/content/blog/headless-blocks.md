---
title: "Headless components and themes: no shared house look"
description: "A shared default style made every film look like one UI kit. We moved to headless components plus ten themes that change tokens and never a class name."
date: 2026-10-07
section: architecture
tags: "headless components, design tokens, themes, css custom properties, motion graphics"
keywords: "headless components, design tokens, css themes, data attribute theming"
hero: /blog/headless-blocks/layers.svg
heroAlt: "Three boxes in a row: a block that owns structure, a theme that owns colour, type and depth, and a film page that picks one theme."
---

For a while, every film made with vawe looked like the same UI kit. The cards had the same radius, the buttons the same shadow and the type the same weight. The films were different. The surface was not. We fixed it by treating our building blocks the way the web calls headless components: they carry structure and behaviour, and no look at all.

This post explains the rule, the file where it lives, and what we gave up.

## The problem: shared defaults become a house style

Our old scene format shipped a block catalog. A block was a ready-made piece such as `barChart`, `bento`, `browserFrame`, `callout`, `chatBubble`, `checklist` or `codeBlock`. The 181 files under `blocks/` held the JSON for each variant. Each block came with defaults for radius, border, shadow and type, so a film built from blocks looked finished at once.

That is also the failure. An agent that follows defaults gets the defaults. When the blocks decide radius, border and depth, every film that uses them shares those choices, whatever the brief says. We wanted the brief and the chosen look to decide them.

## The rule we chose

A block owns mechanism and structure only. The theme owns radius, borders, depth and type treatment. When a film needs a hero element that no theme can restyle, the element is ejected into the film, and from then on the film owns it.

![Diagram: block owns structure, theme owns tokens, film picks one theme](/blog/headless-blocks/layers.svg)

## What we built: tokens in one CSS file

The block catalog went away with the JSON format. Commit [ef1da265d](https://github.com/Vandit1604/vawe/commit/ef1da265d) deleted 181 files under `blocks/` as part of the 1,415-file deletion we describe in [the biggest commit is a deletion](/blog/big-deletion). The idea survived in a smaller form: the move demos.

Every move demo links one stylesheet, `prompts/moves/demo/demo.css`. Its header states the contract: a look changes colour, faces, which radius and line steps it picks, and its depth. It never changes a size or a class.

Commit [bfd68f0a8](https://github.com/Vandit1604/vawe/commit/bfd68f0a8) put the first eight looks into that file as `html[data-look="name"]` token sets. The commit touched one file: 133 lines added, 6 removed. It added eight font faces and thirteen new tokens, such as `--edge`, `--dim`, `--cursor`, `--paper` and `--up-ink`, so that a look could reach every surface a demo draws. A demo picks a look on its `<html>` tag and every class follows.

The same markup can render with a different look:

```html
<html data-look="paper">
```

The set has grown to ten looks: vawe, brutal, chrome, daylight, dusk, field, paper, signal, swiss and terminal. They are token sets, not stylesheets, so a look cannot add a layout rule or rename a class.

<figure>
<img src="/blog/headless-blocks/look-paper.webp" alt="A cream ground with a serif headline rising into place, the paper look." width="640" height="360" loading="lazy">
<img src="/blog/headless-blocks/look-swiss.webp" alt="Black uppercase sans type on an off-white ground, the swiss look." width="640" height="360" loading="lazy">
<img src="/blog/headless-blocks/look-terminal.webp" alt="Monospace type being typed, the terminal look." width="640" height="360" loading="lazy">
<figcaption>Three stills from the moves library: paper (mask-rise), swiss (tracking-collapse) and terminal (caret-typing). Each move is plain HTML and CSS.</figcaption>
</figure>

## The real vawe look is a theme too

The default look, `vawe`, is also a token set. It uses the studio ground `#16151a`, a surface ladder, one cobalt accent `#0a87ff` and dark ink on the accent, since white on that blue measures 3.6:1. Commit [74157217f](https://github.com/Vandit1604/vawe/commit/74157217f) made the engine theme match the real dark landing page. Commit [708e79447](https://github.com/Vandit1604/vawe/commit/708e79447) later removed the old theme colour markers and the scene stage CSS: 3 files, 12 lines added, 148 removed.

The contrast of every look is checked by a script next to the stylesheet, `prompts/moves/demo/contrast.mjs`. We wrote more about that check in [one design system, ten looks, 70 clips](/blog/ten-looks).

## The result

We do not have a before and after number for this change. We did not score the old catalog against the new tokens, and we will not make one up. What we can show is the outcome. The block catalog is gone. The ten looks produce visibly different films from the same class names, as the stills above show. And a move you copy from the [moves gallery](/moves) carries neutral tokens, so it takes the look of the page you paste it into.

## What we would tell someone building the same thing

Give the block the structure and nothing else. If a block has a default radius, the radius is a decision the block made for you.

Make the theme a set of variables, not a stylesheet. When a look can only change values, you review a new look by reading one block of custom properties.

Keep an eject path. A theme will not cover every hero element. Let the film take ownership of that one piece.

Check each look with a number. Contrast is the cheapest one.

Last, decide who is allowed to change a size. Ours is the foundation layer, and no look touches it. That one rule is why ten looks still share one set of classes.

If you want to see how a deterministic page becomes a film, read [why we deleted the JSON format](/blog/html-over-json). The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the alternatives page has a [comparison with other HTML-to-video tools](/hyperframes-alternatives).

## In the code

- `prompts/moves/demo/demo.css`: the foundation and the ten `data-look` token sets.
- `prompts/moves/demo/contrast.mjs`: the contrast check across all looks.
- [bfd68f0a8](https://github.com/Vandit1604/vawe/commit/bfd68f0a8): eight looks as token sets.
- [74157217f](https://github.com/Vandit1604/vawe/commit/74157217f): the vawe theme matches the real landing page.
- [708e79447](https://github.com/Vandit1604/vawe/commit/708e79447): the old theme markers and scene stage CSS removed.
- [ef1da265d](https://github.com/Vandit1604/vawe/commit/ef1da265d): the block catalog deleted with the JSON format.
