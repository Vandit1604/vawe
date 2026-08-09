---
when: you need the product thesis rather than the mechanics
answers: who this is for, what it replaces, and what it deliberately does not do
group: project
---

# Product

## Register

brand

## Users

Three audiences that look different on paper and behave identically in practice: **developers** evaluating a render engine (technical, skeptical, have seen another engine, deciding whether this is worth a weekend), **agent-authors** wiring an LLM into a video pipeline (want proof the JSON contract is actually machine-writable), and **marketing teams** who need video at volume (want the outcome, not the engine).

What unifies them: **they all work through AI.** None of them will hand-author a timeline. They arrive expecting to describe a video and get a video, and the question they're really asking is "can I trust the thing on the other end of that description?" The site's job is to answer that in the first five seconds, without a signup.

The job to be done: **decide whether vawe is real.** Not "learn the API" — decide. Everything else is downstream of that verdict.

## Product Purpose

Vawe turns one self-describing JSON into one video, deterministic to the frame. It exists because the two available options are both bad: click a timeline by hand (doesn't scale, can't be automated), or let a model generate pixels (non-reproducible, off-brand, uncontrollable). Vawe is the third thing — a real engine with a real contract, authored by an agent, verified by gates.

Success is a visitor who understands three things without reading a paragraph: it renders real video, the JSON is the whole interface, and the same input always produces the same output.

## Brand Personality

**Bold · playful · expressive.**

Vawe is a motion engine. A site that whispers about a motion engine is a site that doesn't believe its own pitch. The output is loud, the range is the argument, and the site should feel like something that enjoys being looked at.

Voice: direct, lowercase-comfortable, technically literal. Claims are specific and checkable ("39 easings", "byte-identical") because vague enthusiasm is exactly what this audience discounts. Never salesy, never breathless. Confident enough to state a fact and stop.

## Anti-references

- **Generic AI-SaaS landing.** Purple/blue gradient hero, three equal feature cards, a tiny uppercase tracked eyebrow above every section, big-number hero metrics. This is the default this site must never regress to.
- **Dark "creative tool" cliché.** Black canvas, neon accents, glassmorphism, the After Effects / Framer look. Vawe is white-first and stays white-first.
- **Dry open-source README-as-website.** All prose and code fences, no craft. Actively self-defeating: a taste engine whose own site has no taste refutes itself.

**Deliberately NOT an anti-reference:** expressive, motion-forward design. Ambition is allowed here. What's banned is *hollow* ambition — motion that decorates instead of demonstrating. Scroll-hijacking and cursor followers are still out, because they'd contradict the restraint claim while proving nothing.

## Design Principles

**1. The chrome is restrained so the content can shout.**
The resolution of bold-personality-plus-Linear-reference. Hairlines, tight type, one accent, no decorative gradients — that's the *frame*. Inside the frame: wall-to-wall rendered motion at full expressive range. The site is quiet exactly where the product is loud. Never invert this.

**2. Show the engine running; never describe it.**
The `/editor` route runs the real `renderFrame(n)` in the browser. The showcase is real encodes from real scene JSON. Every claim on this site should be a thing the visitor can watch happen. A feature described in prose that could have been demonstrated is a failure, not a shortcut.

**3. Practice what the engine preaches.**
Vawe ships gates (contrast, overlap, safe-zone, anti-slop) and refuses to render video that fails them. The site is held to the same bar. Shipping a site that its own audit would reject is the single most expensive credibility loss available to this project.

**4. Specific and checkable over impressive and vague.**
This audience has been marketed at by every AI company. Real numbers, real names, real output. If a claim can't be verified on the page, cut it or demonstrate it. An unbacked number is worse than no number: it invites the visitor to notice the absence.

**5. The JSON is the interface, and that's the pitch, not a caveat.**
Don't apologize for having no timeline UI. No-timeline is *why* an agent can drive it. Lead with the contract.

## Accessibility & Inclusion

**WCAG 2.2 AA**, held site-wide.

- Contrast: body text ≥4.5:1, large text ≥3:1. The committed tokens already pass (`--ink` #0f1620 ≈ 17:1, `--ink-2` #454f5e ≈ 8:1, `--muted` #697182 ≈ 5:1, `--accent` #2563eb ≈ 5.17:1 on white). Any new colour must be checked before it lands, not after.
- Full keyboard reach on every interactive surface, `/editor` included. Visible focus states, never `outline:none` without a replacement.
- **Reduced motion is not optional.** Every animation needs a `prefers-reduced-motion: reduce` alternative — typically a crossfade or an instant state. This includes autoplaying showcase video, which should respect the preference rather than claim an exemption. A motion engine that ignores a user's stated motion preference is making an argument against itself.
