---
when: "you are writing or editing AGENTS.md, a skills/*/SKILL.md, or a brief harness/author/*.mjs composes for an agent, and want the rule to survive being read under truncation"
answers: "the six patterns that keep a rule readable by an agent: order, length, refusal shape, capability-first, inline examples, instruction-before-material · what this doc does NOT cover (voice, tone, word choice)"
group: crosscutting
---

# Writing rules an agent can actually read

## AGENT SUMMARY

- Six patterns, checked against real files in this repo. Apply them when you write or edit AGENTS.md,
  a skill, or a runtime brief.
- Order: rule, then reason, then mechanism. Length: one rule is one to three sentences. Refusal: state
  the block once, do not re-argue it. Capability before edge cases. Examples live inside the limit they
  describe. The instruction goes before the material it governs, not after.
- This doc owns structure, not voice. For word choice, tone and the em-dash ban, see below.

## Why this exists

`AGENTS.md:122` used to run five lines of reasoning before the reader learned what to do. A film's plan
judge carried a rule to open the frames before trusting a verdict, and that rule sat after the
storyboard it governed. Every terminal filter that truncates output cuts what comes last, so the one
line that made the judge's new question answerable reached nobody. Moving it above the storyboard fixed
it, and that fix is the worked example behind pattern 6 below.

These six patterns are read off a published system prompt for their SHAPE only. No text is copied: a
copied rule is doctrine nobody here can trace to a reason, which is the defect this repo spent the week
removing.

## The six patterns

**1. Rule, then reason, then mechanism.** Say what to do first, why second, and which file or command
does it third. A reader who stops after the first sentence still knows the rule.

**2. One rule is one to three sentences, then stop.** A fact needing a fourth sentence needs a second
rule, not a longer one.

**3. A refusal states the block once and moves to the alternative.** It names what is blocked, names
the way out, and does not re-argue the constraint a second time in different words.

**4. Capability first, error states and edge cases last.** Say what the mechanism does before you say
how it fails or what it does not cover.

**5. Every scope limit carries its examples inline.** "Never `git add -A`" is a vibe. "Never `git add
-A`, `git add .`, `git stash`" is a boundary an agent can check itself against.

**6. An instruction comes before the material it governs.** A filter that truncates long output drops
the end first. A line placed after the thing it explains is the first line to go missing.

## What this is NOT

Not a style guide for prose quality. Orwell's six rules, the em-dash ban, and the `humanizer` skill
already own voice, tone and word choice. This doc is about whether a rule survives being read by an
agent under truncation, which is a different property from whether it reads well.

## Before and after, from this repo

**AGENTS.md, the waiver rule.** Before, one 962-character paragraph mixed the rule, six waiver codes, a
library measurement, and a citation to `quality/gates/audio-check.mjs` into a single block with the
rule buried in the middle:

> `authoring.allow` + `_why` is the one mechanism, and it covers two different cases with the one
> sentence, never two mechanisms... The `_why` is what turns a reflex into a recorded decision either
> way, the same split `quality/gates/audio-check.mjs` already draws for sound...

After, the rule leads, the reason follows in two short sentences, and the measurement and citation move
into their own paragraph the rule does not depend on to be understood. No fact was cut: the six codes,
the library measurement, and the `audio-check.mjs` citation all still appear, in `AGENTS.md`'s "Stage 7,
render: waivers" section.

**AGENTS.md, the engine-composition rule.** Before, one 847-character paragraph ran the rule, a test,
a measured cost, and two file citations together with no break. After, the rule and its one-line test
stay in the lead paragraph; the `typing` cost and its two citations (`KEYED-MOTION.md`, `type.js`,
`units.js`) move to a second paragraph, unchanged.

## Where the convention reaches you

Claude Code: the `harness/live/craft-live.mjs` hook fires a nudge, at save, when an agent-facing `.md`
file (`AGENTS.md`, `skills/*/SKILL.md`, `engine-doctrine/CRAFT/*.md`) is written with a rule over the
length this doc sets. Anyone without that hook: run `node quality/gates/rule-length.mjs --list` before
committing prose an agent will read.
