---
title: "Motion design system: ten looks, 70 clips, no house style"
description: "A motion design system for HTML video: one CSS foundation, ten token sets and a contrast check. How 70 clips got one system and still look different."
date: 2026-10-01
updated: 2026-10-13
section: taste
tags: "motion design system, design tokens, headless components, contrast, moves library"
keywords: "motion design system, headless components, design tokens for video, wcag contrast video"
hero: /blog/ten-looks/hero.webp
heroAlt: "Large number 10 with the caption looks, 70 clips, one design system, one rule: faint is never text"
---

A motion design system is the shared set of sizes, colours, type and motion rules that every clip in a library draws from, so a viewer can tell what a clip does apart from how it is dressed. Ours is one CSS file and one HTML attribute. Between 30 September and 1 October we re-rendered all 70 clips in the vawe [moves gallery](/moves) with it: one foundation, ten token sets called looks, and a contrast check that every look has to pass.

This page explains how the system is built, why the building blocks carry no look of their own, and which rule was hardest to keep. It is also the starting point for the other posts we wrote about motion craft, listed at the end.

## Why does a motion library need a design system?

By the end of September the moves library (the short, copyable animations an agent picks from when it builds a film: a card assembling, a count-up, a crash zoom) held between 53 and 70 clips. Each demo page had been written on its own, so the gallery had no shared visual language and read as a pile.

That matters because the clip is the evidence for a move. If the colours and type change from clip to clip, a reader cannot tell which differences belong to the move and which are decoration.

We had seen the opposite failure too. For a while every film made with vawe looked like the same UI kit: the cards had the same radius, the buttons the same shadow and the type the same weight. Our old JSON scene format shipped a block catalog, ready-made pieces such as `barChart`, `bento`, `browserFrame`, `callout`, `chatBubble`, `checklist` and `codeBlock`, held in 181 files under `blocks/`. Each block came with defaults for radius, border, shadow and type, so a film built from blocks looked finished at once. An agent that follows defaults gets the defaults, and every film shared them whatever the brief said.

So the system had two jobs. Give the library one language, and keep that language from becoming a house style.

## What are headless components, and why do our blocks have no look?

A headless component carries structure and behaviour and no styling. We applied that idea to our blocks with one rule: a block owns mechanism and structure only. The theme owns radius, borders, depth and type treatment. When a film needs a hero element that no theme can restyle, the element is ejected into the film, and from then on the film owns it.

![Diagram: block owns structure, theme owns tokens, film picks one theme](/blog/headless-blocks/layers.webp)

The block catalog itself went away with the JSON format. Commit [420928c23](https://github.com/Vandit1604/vawe/commit/420928c23) deleted the 181 files under `blocks/` as part of the 1,415-file deletion described in [how to delete dead code safely](/blog/big-deletion). The headless idea survived in a smaller form: the move demos.

## How is the system built?

The demos are HTML pages, so the system had to be CSS, and we did not start from a design tool. Every move demo links one stylesheet, `prompts/moves/demo/demo.css`. Its header states the contract: a look changes colour, faces, which radius and line steps it picks, and its depth. It never changes a size or a class. A demo picks its look with one attribute:

```html
<html data-look="paper">
```

A move written for one look runs in all ten. The foundation holds what every look inherits:

| Layer | What it fixes |
|---|---|
| Type | Six sizes as a share of frame height: hero 18, title 11, head 7.6, lead 6, body 4.8, small 3.8 (one `--u` is 1 percent of the height) |
| Space | Five steps, `--s1` to `--s5`, from 1.2 to 7 units; one 12-column grid |
| Shape | Seven radius steps and three line weights |
| Colour | Roles, not colours: ground, surface, raised, hover, ink, muted, accent and on-accent, plus a paper pair for a cut |

Because type is sized from frame height, a frame at any size keeps its proportions.

Commit [5952587ec](https://github.com/Vandit1604/vawe/commit/5952587ec) put the first eight looks into `demo.css` as `html[data-look="name"]` token sets. It touched one file, with 133 lines added and 6 removed. It added eight font faces and thirteen new tokens, such as `--edge`, `--dim`, `--cursor`, `--paper` and `--up-ink`, so a look could reach every surface a demo draws. Commit `50aaa558c` completed the system with ten looks and assigned a look to every demo.

## What are the ten looks?

The ten are vawe (cool near-black and cobalt), daylight, terminal, swiss, paper, dusk, brutal, signal, field and chrome. They are token sets, not stylesheets, so a look cannot add a layout rule or rename a class. `LOOKS.md` gives each one a character and a job: terminal is for typing and streams, paper for quiet editorial type, brutal for hits on the beat, chrome for physical objects like plates and flaps.

<figure>
<img src="/blog/ten-looks/ten-looks.webp" alt="Ten move stills in two rows: a command palette, a metrics card, a chat stream, a bar chart, an editorial caption, a wordmark lockup, a yellow punch title, a metrics pair, a green shipped title and an invoice card" width="1360" height="306" loading="lazy">
<figcaption>One move from each look, in the order vawe, daylight, terminal, swiss, paper (top row), dusk, brutal, signal, field, chrome (bottom row). Sources: <a href="/moves/command-palette-summon">command-palette-summon</a>, <a href="/moves/calm-lockup">calm-lockup</a>, <a href="/moves/scale-punch">scale-punch</a> and others in the <a href="/moves">gallery</a>.</figcaption>
</figure>

The same markup renders differently under each look. Three stills from the library show it:

<figure>
<img src="/blog/headless-blocks/look-paper.webp" alt="A cream ground with a serif headline rising into place, the paper look." width="640" height="360" loading="lazy">
<img src="/blog/headless-blocks/look-swiss.webp" alt="Black uppercase sans type on an off-white ground, the swiss look." width="640" height="360" loading="lazy">
<img src="/blog/headless-blocks/look-terminal.webp" alt="Monospace type being typed, the terminal look." width="640" height="360" loading="lazy">
<figcaption>Paper (mask-rise), swiss (tracking-collapse) and terminal (caret-typing). Each move is plain HTML and CSS.</figcaption>
</figure>

The default look, `vawe`, is a token set like the others. It uses the studio ground `#16151a`, a surface ladder, one cobalt accent `#0a87ff` and dark ink on the accent, since white on that blue measures 3.6:1. Commit [e90f1663d](https://github.com/Vandit1604/vawe/commit/e90f1663d) made the engine theme match the real dark landing page. Commit [d70663eaa](https://github.com/Vandit1604/vawe/commit/d70663eaa) later removed the old theme colour markers and the scene stage CSS: 3 files, 12 lines added, 148 removed.

## How do you stop every clip picking the same look?

Ten looks do nothing if every clip picks one of them. `LOOKS.md` carries a short assignment rule. Inside a group of moves a look appears at most twice, with an allowance for the biggest group, and adjacent moves in a group list differ. Product-UI moves take product looks, type moves take editorial looks, and transitions take colour-led looks first. A physical move takes chrome and a typed stream takes terminal.

The assignment is one `data-look` per demo file, so a grep shows the spread. Today 120 demos carry a look, from vawe at 22 down to brutal at 9.

## Which rule was hardest to keep?

Every look defines a `--faint` colour for dots, rules and icons. It is low contrast by design, so it must never carry words. We wrote `contrast.mjs` with the foundation (`50aaa558c`). It reads every look in `demo.css` and checks WCAG contrast: ink, muted, on-accent and paper text must pass 4.5 to 1, and accent used as text must pass 3 to 1, for large type only.

The follow-up commit, [`061b3aa23`](https://github.com/Vandit1604/vawe/commit/061b3aa23), wrote the rule into `LOOKS.md`: faint is for dots, rules and icons, never for text. It made the check read short hex colours, and it darkened swiss's "up" ink, the red used for a rising number, from `#d40500` to `#c40400` so it passes 4.5 to 1. Running `node prompts/moves/demo/contrast.mjs` today prints "10 looks, 0 failing pairs".

![Diagram: the demo.css foundation feeds ten looks, which pass through contrast.mjs and become 70 clips rendered once](/blog/ten-looks/system.webp)

The same commit records which public skills shaped the pass and which parts we rejected. We used better-typography for measure, balanced wraps and tabular figures, better-ui for concentric radius and optical alignment, and baseline-ui for a spacing review. We rejected the 16 px body floor (a film sets its own sizes), the no-gradient and no-letter-spacing rules (several looks need both) and every hover and press rule (a film has no input). The written rejections stop a later author from importing those defaults again.

## How do 70 clips get re-rendered cheaply?

A design system is only useful if it is cheap to apply to 70 clips. `bin/vawe moves` renders each clip once at 1280x720 and 60 fps. The size and rate are part of the clip's source hash, stored in `clips.lock.json`, so changing them marks every clip stale and nothing else. `scripts/site/moves.mjs` then derives the gallery copies: a 1280 H.264 file and a 1280 poster for the move page, and a 640 VP9 file and a 640 poster for the grid ([`7945d97b2`](https://github.com/Vandit1604/vawe/commit/7945d97b2)). By default only stale clips re-render, and `--all` forces every clip (`77a8d9147`).

All 70 clips were re-rendered with the ten looks (`7bf0ce2c1`). The pick-by-job table covered 53 moves (`77a8d9147`), and the contrast check passes on all ten looks. A move you copy from the gallery carries neutral tokens, so it takes the look of the page you paste it into.

## What the system does not prove

We have no before-and-after number. We did not score the old block catalog against the new tokens, and we never timed a full re-render against an incremental one, so we quote no figure for the time the source hash saves. What we can show is the outcome: the catalog is gone, and ten looks produce visibly different films from the same class names.

Two choices carry most of the weight. Only the foundation layer may change a size, and no look touches it; that is why ten looks still share one set of classes. And the contrast check landed in the same commit as the tokens, so a colour change has to pass it, as the swiss red did.

## More on motion craft: curves, cuts, lenses and ideas

The looks decide how a clip is dressed. These posts cover the rest of the craft:

- [CSS easing functions cheat sheet](/blog/easing): the nine named curves every move uses, with peak speeds and 44 generated pages.
- [Motion graphics transitions](/blog/transitions): twelve ways to carry the eye across a cut, and ten slideshow tells a check flags.
- [Depth of field in the browser](/blog/real-lens): why CSS blur and `text-shadow` fall short, and the WebGL lens that films the page.
- [Image to particles in three.js](/blog/image-points): a seeded point cloud from a photo, and the 2 MB clip budget.
- [Verbalized sampling prompts for agents](/blog/ideate): a method that asks for four ideas and a typicality score before a pick.
- [UI skills for AI agents](/blog/skill-combos): a blind test of six skill combos on two kinds of film frame.

The source for the system is `prompts/moves/demo/demo.css` (foundation and looks), `prompts/moves/LOOKS.md` (one line per look and the variety rule) and `prompts/moves/demo/contrast.mjs` (the check), in the [vawe repo](https://github.com/Vandit1604/vawe).
