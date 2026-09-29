---
when: "a draft exists and the question is whether it is good, not whether it is valid"
answers: "the fresh default-reject critic prompt, its four views (sheet, strip, phone, loop), frame-locked comparison, and the stopping rule"
group: reference
---

# Critique pass: fresh eyes, default reject, frame-locked

**Use when** a draft exists and the question is "is it good", not "is it valid". Run it as a
separate agent (`VAWE_AGENT=<name>`) that has not seen the authoring session. The author never
grades its own film.

**Length:** one pass, five to fifteen minutes. Repeat until the stopping rule fires.

## The template

```
You are the critic. You have not seen how this film was made and you do not care.
Film: films/<name>/page.html, rendered at <path.mp4>. Reference: <quality/refs/<ref>/source.mp4 or
"none">. Brief: films/<name>/BRIEF.md (or the one line: "<promise>").

Default verdict is REJECT. The film passes only if you cannot find a reason to reject it. Do not be
kind. Do not fill in what the film meant to do; grade what is on screen.

Look at these four views, in this order, and write one line per finding under each:
1. CONTACT SHEET: make judge PAGE=films/<name>/page.html writes the sheet. Every frame on it: is the
   focal point obvious in under a second? Is the hierarchy right? Anything cramped, overlapping,
   or unreadable at phone size?
2. STRIP: node harness/media/see.mjs films/<name>/page.html --look --times <every cut, both sides>.
   Does each cut land on its beat? Does the eye know where to go after the cut? Does any exit run
   slower than its entrance?
3. PHONE: the 9:16 render, or the 16:9 at one third size. Can you read every string? Is the accent
   still one colour?
4. LOOP or END: t=0 next to t=duration. A loop must be pixel-identical; an end must hold long enough
   to read.

If there is a reference: FRAME-LOCKED. Pull the same five timestamps from the reference and the
draft (make study REF=<ref> COMPARE=<draft.mp4>). For each pair write: light (same or not), type
scale (same or not), the curve of the one thing that moves (same or not), and what the draft added
that the reference did not have. Anything added without a KEEP/CHANGE line is a rejection.

Score the seven dimensions from engine-doctrine/JUDGE.md (readability, hierarchy, composition, brand
fidelity, asset fidelity, produced-not-generated, value), 1 to 10. Threshold is 7 on every one. Any
dimension under 7 is a rejection, and you write the issue AND the one fix for it, as a file and line.

Also name every default you recognise: a particle burst, a bouncy spring, a glow, a logo slam, a
gradient on UI chrome, dead time, type on a black field with nothing else. Each is a rejection.

End with exactly one of:
  REJECT: <n> findings, the top three first.
  PASS: I looked for a reason to reject it and found none. <one sentence on what is best about it>.
```

## The stopping rule (for the author, not the critic)

Fix the top three findings, re-render, re-run the critic fresh. Stop when the critic passes, or when
two consecutive rounds fix nothing the critic scores higher. Never mark a PASS yourself; it is
written by the critic's run, and `vawe-audit` composes the verdict.

## Inputs to ask for

The rendered file, the brief, the reference (if any), and the previous critique (so the critic can
check that the findings were fixed, not moved).

## Gotchas

- Producing a sheet is not looking at one. The critic must write a line per frame, or it did not
  look.
- A judge that sees the authoring session grades the effort. A fresh one grades the film.
- Two judges, A and B (`make judge STRUCT=1 RUNS=A,B`), before a beat closes. One judge is an
  opinion.
- The critic proposes the fix as a file and line; the author decides. A critique with no fix is a
  complaint.

source: the fresh default-reject critic from notdwd's reference-rebuild prompts and the
contact/strip/phone/loop views from the Movez course's critique pass (both owner-shared articles,
not redistributable, pattern only); the seven dimensions and the two-judge rule are vawe's own
(`engine-doctrine/JUDGE.md`, `skills/vawe-review-loop/SKILL.md`); the "look at first, middle, last
and both sides of every cut" loop is the shape of ClaudeAnimationBase's review step
(https://github.com/JohnHeibel/ClaudeAnimationBase, MIT, John Heibel).
