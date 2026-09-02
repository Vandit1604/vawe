---
when: "somebody proposes moving, cutting or rewriting a section of CLAUDE.md, or asks what the prompt is measurably worth"
answers: "the one recorded ablation of a CLAUDE.md section, the procedure that produced it, what it found, and what it is not allowed to prove"
group: reference
---

# PROMPT EVAL: one recorded ablation of one CLAUDE.md section

This repo runs about 70 gates over the engine and none over the 44KB file that drives every authoring
decision. [`AI-AGENT-BOOK.md`](AI-AGENT-BOOK.md) finding 2 named the gap and named the fix in its own
words: **"Not an ablation harness. One recorded experiment, once."** This is that experiment, plus the
script that ran it, so a second person can run it against a different section.

**n=1. One section, one arm each way, one archetype.** Everything below is an anecdote with a method
attached, and the method is the deliverable. Nothing here authorises removing a section of `CLAUDE.md`,
and the "what next" list at the bottom says what would.

## The procedure

```bash
scripts/dev/worktree.sh add prompt-eval          # it edits CLAUDE.md in place, so do it in a worktree
cd .claude/worktrees/prompt-eval
scripts/dev/prompt-eval.sh "## THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE" out/prompt-eval
```

The script does three things and nothing else. It removes the named `## ` section from `CLAUDE.md` for
one arm and restores the file afterwards. It runs the SAME task through `claude -p` in both arms. It
measures the two scene JSONs with `node scripts/dev/library-stats.mjs --files a.json b.json`, which
reuses the population script's own definition of a picture rather than inventing a second one.

The task is fixed in the script and starts both arms from identical bytes:

> Run `node scripts/dev/demo.mjs --print-path --q "how a thermal blur reads heat off a product shot"
> --name heatread --fx thermalBlur`, then extend that JSON to about 14 seconds across three moments.
> Do not render. Do not edit any other file. Then clear `scripts/gates/author-check.mjs`.

The scaffold is the constant. [`../CRAFT/SPECIMEN.md`](../CRAFT/SPECIMEN.md) fixes what it writes, so
everything the agent ADDS on top of it is the measurement.

## Why this section

`THE BACKGROUND MUST MOVE` is the only section in the file whose instruction lands as a countable
property of the JSON. It asks for more than one `bg` window and it asks for those windows to carry no
`from`/`to`, so the cuts own the timing (`core/junctions.js`). Both are one `jq` away. The population
baseline already exists and has an owner: `node scripts/dev/library-stats.mjs` reports how many
gate-visible scenes paint a single window, so the arms can be read against the library rather than
against an impression. No other section is that cheap to falsify.

## The result

| | scaffold (constant) | with the section | without it |
|---|---|---|---|
| `bg` windows | 2 | **3** | **3** |
| windows left UNBOUND (no `at`/`until`) | 2 of 2 | **3 of 3** | **0 of 3** |
| seconds | 9 | 14 | 14 |
| cuts | 1 | 2 | 2 |
| layers | 4 | 8 | 9 |
| layers with a `motion` track | 4 | 8 | 9 |
| pictorial layers | 1 | 3 | 3 |
| layer mix | 1 image, 3 text | 3 image, 5 text | 3 image, 6 text |

**On the headline count, the section changed nothing.** Both arms went from two windows to three, both
cut twice, both put the same three pictures on screen. The rule the section exists to enforce was obeyed
without it.

**One difference survived, and it is not the one the section is usually quoted for.** The arm WITH the
section left every window unbound and let the joints bind them. The arm WITHOUT it hand-timed all three
against the cut times it had just written:

```json
[{ "preset": "aurora", "until": 4.6 }, { "preset": "mesh", "at": 4.6, "until": 9.4 }, { "preset": "aurora", "at": 9.4 }]
```

That is the same film, authored with the cut times written down twice. Move a cut and the backdrop
stays where it was. The ablated arm also went back to `aurora` for its third window, so the film returns
to a ground it has already shown, where the other arm turned the world three times.

So the honest reading is narrow: on this artifact the section did not change WHETHER the backdrop
turned, and did change HOW the turn was attached to the film. Nobody could say either sentence this
morning.

Artifacts: [`prompt-eval/scaffold.json`](prompt-eval/scaffold.json),
[`prompt-eval/with.json`](prompt-eval/with.json), [`prompt-eval/without.json`](prompt-eval/without.json).

## What this is not allowed to prove

[`../TASTE.md`](../TASTE.md) records why `visual-vocabulary` was deleted: a wrong measurement is worse
than none, because it manufactures confidence. So the limits are stated before anybody quotes a row.

- **n=1.** One section, one archetype, one run each way. A second run of the same arm would differ:
  nothing here separates the section's effect from ordinary run-to-run variation, because nothing here
  measured that variation.
- **The same model authored both, in one session, and knew it was being measured.** That confound
  cannot be removed by this design.
- **The two arms shared everything except the section.** They shared the user's global `CLAUDE.md`, the
  same repo, and the same `docs/`. `docs/CRAFT/SPECIMEN.md` states the unbound-window rule too, and the
  scaffold prints a pointer to it on stderr, so the ablated arm still had a route to the rule and simply
  did not take it. A section removed from `CLAUDE.md` is not a rule removed from the repo.
- **The archetype pre-supplies the behaviour.** `make demo` writes two unbound windows before the agent
  reads anything, so this measures what an agent ADDS to a good floor, never what it does from a blank
  file. That is the cheapest deterministic authoring path here and it is also the kindest one.
- **DO NOT PROPOSE REMOVING A SECTION ON THIS EVIDENCE.** One artifact cannot carry that. Evidence from
  one round authorises only the next action its scope supports, which is another round.

## What the next person should run

1. **The same section again, three times each way.** The first question is how big run-to-run variation
   is. If two runs WITH the section disagree by as much as the two arms did, this experiment measured
   noise and the write-up above is wrong.
2. **A section whose rule the archetype does NOT supply.** `SHOW, DO NOT ONLY TELL` and
   `AUTHOR THE MOTION. DO NOT NAME IT.` are both countable (pictorial share, `motion` track count) and
   both are pre-satisfied by `make demo`, which is why they were not picked. A task that starts from a
   blank scene would test them, at the cost of the doctrine that forbids authoring a film without a
   locked plan. Resolve that before writing the task, not after.
3. **A section with no countable target.** `IS THE EMPTY PART OF THE FRAME DOING A JOB?` cannot be read
   off the JSON at all. Either it needs a different instrument or its cost is unmeasurable, and saying
   which is worth more than another countable result.
4. **The mechanism metric is not the target metric.** Bytes removed from the prompt is a mechanism
   metric. Whether the film still obeys the rule is the target. Do not report the first as the second.
