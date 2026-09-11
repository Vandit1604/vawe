---
when: "judging your own render (a full pass, a recreation, anything you'll ship)"
answers: "why a self-grading agent grades kindly · the six standing critics (beat · bg-motion · reveal · fidelity · copy · seam) with the exact input and verdict shape for each · run them in parallel, in one message · what to record so per-critic survival rate becomes computable · the decider roster and its order, and the six brief lines a fan-out pays for by omitting"
group: crosscutting
---

# SUBAGENTS: one critic, one job, one verdict

## AGENT SUMMARY

- Run the six dedicated critics (beat, bg-motion, reveal, fidelity, copy, seam) in one parallel
  message, each with a fixed verdict shape. Never grade your own render: the thread that wrote the
  scene grades it kindly.
- Give each critic ONE artifact the author has not already seen (a render, a frame strip, a seam
  crop), not the scene JSON restated in prose.
- Enforced by `[eye]`: no gate runs the panel for you; it is judgment, backstopped only by the
  admission test (does this critic see something the author did not) and the recorded dispositions.
- Checkable action: what artifact does this critic see that the author did not?

Authoring a video well takes several **different** kinds of judgement: does this beat read, does the
background move at the right speed, does the copy earn the hook, does a seam flash. One agent doing
all of them in one context does all of them worse. So: **run dedicated critics, one job each, in
parallel, each returning a verdict in a fixed shape.** This is a rule, not a suggestion.

## Why dedicated beats generalist

**You will look at your own render and decide it is fine. You picked every part of it.** Do not grade your
own film. Run the panel.

**A self-grading agent grades kindly.** The thread that wrote the scene has already anchored on its own
choices. It picked that easing, that crop, that headline, and every look at the render is a look at a
decision it already defended. Ask it "is beat 4 good?" and it answers "yes, because I chose it." A fresh
agent handed nothing but "read `/tmp/beats/<name>.png` and score each beat" has no stake in the answer. That
absence of stake is the whole product.

**Context is the other half.** A critic burns thousands of tokens looking at a sheet of frames and
returns twenty lines. Those thousands stay in its context, not yours. The main thread keeps room to do
the thing only it can do: hold the scene JSON and fix it. Delegating the looking is how you afford to
look at everything.

**Narrow input, sharper eye.** Give one agent the whole picture and it hedges across all of it. Give it
one sheet and one question and it commits. Every standing critic below is defined by the file it is
handed.

**`make critics D=<file>`** emits this roster as ready-to-launch prompts, concrete for that film (the
real `/tmp/beats/<name>.png`, `/tmp/reveal/<name>.png`, `/tmp/seams/<name>.png` paths, and the on-screen
strings for `copy`). Copy the six prompts into six parallel `Agent` calls. Once they report,
`make critics D=<file> RECORD=<panels.json>` writes the panel's findings to
`quality/baselines/approved/panels/<name>.json`, hashed to this version of the scene, so the doc below and the tool
point at each other: `harness/author/critics.mjs` is the source of the prompts, this table is the source
of the roster.

## The roster

| Critic | Job | Input it is handed | Verdict shape |
|---|---|---|---|
| **beat** | does each beat read at a glance | `/tmp/beats/<name>.png` from `make beats D=<file> [VS=<brand>]` | per beat: `{beat, reads: yes/no, flaw, fix}` |
| **bg-motion** | speed · scale · direction of anything that moves continuously | a 4+ frame strip, reference and render at matched timestamps | per axis: `{axis: speed/scale/direction, ours, reference, delta, fix}` |
| **reveal** | how each beat enters and exits, never the settled frame | `/tmp/reveal/<name>.png` from `make reveal D=<file>` | per beat: `{beat, enter, exit, paired: yes/no, flaw, fix}` |
| **fidelity** | recreations only: how close each beat is to its source | render frames + the source frames, side by side | per beat: `{beat, score 0-10, gaps: [...]}` |
| **copy** | on-screen writing only | the strings from the scene JSON, in beat order | per line: `{beat, line, tell, rewrite}` |
| **seam** | flash or collision at transitions | `/tmp/seams/<name>.png` from `make seam-check D=<file>` | per seam: `{seam, flash: yes/no, evidence, fix}` |
| **ab** | which of two cuts is better, and does the graphic explain anything | *not built.* `make ab`, `ab-record` and `AB-JUDGE.md` were removed (`cc2dfc2`, 2026-08-05). Use [`compare`](../../Makefile) to tile two candidates and judge them yourself. | n/a |
<!-- doc-refs-allow: make ab · the row above exists to record that this critic was planned and never built -->

**A critic's value is INDEPENDENT EVIDENCE, never a fresh pair of eyes.** Six instances of one model,
handed similar context, do not vote independently: the measured version of that is 18 of 30 agents
choosing the same branch name without conferring. So the admission test for any new critic is one
question, and it is about the INPUT column above, not the job column: **what artifact does this critic
see that the author did not?**

By that test `copy` fails, and it is listed anyway so the failure is visible rather than quietly
inherited. It is handed the strings from the scene JSON, which is the thing the author wrote and is
still looking at. Every other critic is handed a RENDER: a contact sheet, a frame strip, the seam
frames, the source side by side. That is the difference between a second opinion and a second reading
of your own file. Run `copy` when you want the writing re-read by something that is not you, and know
that is what you are buying.

## DECIDERS: a second kind of agent, and the rule that makes it safe

Everything above is a CRITIC. A critic reports and the main thread fixes, because a critic is evidence
and never a ruling. A DECIDER is a different animal: it writes into the film. That is a larger
permission and it needs a bound, or two of them will quietly fight over the same field.

**The bound is one rule: a role owns ONE exclusive write scope, and may touch nothing else.** The
transitions decider writes `transitions[]`. The subject decider writes the subject slot of a beat. The
sound decider writes the audio block. Two deciders then cannot collide, and a decision that turns out
wrong is revertable in one field instead of being tangled through the film. This is the same discipline
the HTML migration used with disjoint file lists per agent, one level finer.

**A role earns its place only if the engine cannot already decide it.** This test matters more than it
sounds, because the engine now supplies a great deal by default, and an agent that re-decides a good
default is pure cost.

| Role | Writes | Has a job because |
|---|---|---|
| **storyboard** | the storyboard file | it is the only artefact that decides the film as a whole: the beats, the through-line, the motion plan and the cut plan. Everything below transcribes it |
| **subject** | a beat's subject slot | 36% of films carry no pictorial layer at all, and choosing what a beat SHOWS is the one thing the engine must never do alone (`../MISTAKES.md` #159) |
| **scene** (one per scene) | one fragment file | HTML renders instantly, so the agent can look at its own work and iterate with no render. This is the loop, not a critique |
| **motion** | `motion[]` tracks and `idle` | the engine now moves nothing nobody asked to move, so a keyed track is always a decision. 74 of 186 films carry one and it is almost always the same one: the continuous object travelling through |
| **transition** | `transitions[]` | the engine infers cuts from TIMING and narrows them by structure, but the rhetorical relationship between two beats is not in the data |
| **sound** | the audio block | cue punctuation is automatic now; choosing a bed is a register decision, and the engine stays silent when it has no input |
| type · colour · layout · backdrop | nothing | these resolve from the theme. A decider here would re-decide what the brand already decided |

**The order is a dependency, not a preference.** The storyboard first, because it is the lock artefact
and every role below reads it. Then subject, because a cut cannot be chosen without knowing what sits on
either side of it. Then the scene fragments, written by an author who already knows what has to move and
puts handles where motion needs to grab. Then motion. Then transitions, reading the RENDERED joins
rather than the JSON, which is the same admission test the critics above are held to. Then sound, which
punctuates decisions already made.

**Motion moves BEFORE transitions, and that ordering is the one thing here that is not obvious.** The
content-aware cut reads the velocity at a joint as its strongest signal, so a cut chosen before the
motion exists is choosing against a still frame. Put another way: the transition decider's input is the
thing the motion decider produces.

**The motion decider is the one role that must MEASURE rather than describe.** It cannot watch the
film, and a description of motion written from the JSON is a restatement of what it just wrote. Hand it
a per-layer velocity trace and hold it to the same admission test as a critic: what did it read that it
did not author. It also carries a budget, because the register split ([`../MOTION-CRAFT.md`](../MOTION-CRAFT.md)) licenses
sustained motion for kinetic and launch work and that licence is exactly how effect soup gets in. A
named peak, and every other moving thing able to say what it is for.

**When this is overkill, and it usually is.** `docs/CRAFT/SUBAGENT-BUDGET.md` measured a real fan-out
here at 87 agents and 5.66M tokens, and its conclusion was that one well-briefed agent beats a fan-out
for anything sequential. Choosing three cuts for a three-cut film is not worth an agent. The roster
earns its cost on a film with real scenes and stays off for a demo.

## THE ROSTER IS UNMEASURED, AND HERE IS WHAT WOULD MEASURE IT

**Everything above this line is an argument. No number in this repo supports it.** The observable that
would is **per-critic survival rate**: of the findings a critic returns, what share does the main
thread's own look confirm and act on. The prediction to test is that `copy` is lowest, because it is
the one critic handed no artifact the author had not already seen.

**That number cannot be computed today and nothing on disk gets close.** A critic returns its findings
in an agent message. The main thread reads them, edits the scene, and the link between the finding and
the edit is never written anywhere. `quality/runs/judged/` records A/B judge verdicts, which is a different
mechanism; `quality/runs/beats-seen/` records that somebody looked, not what they found; `../MISTAKES.md`
records fixes without saying which critic asked for them. Searched, all three: not one entry
attributes a fix to a named critic. So the honest statement is a method, not a figure, and a figure
from one panel run would be worse than none.

**Record these fields, one row per finding, and the number becomes computable later.** Nothing here
needs a tool: a JSON file beside the render will do, and `../../harness/lib/receipt.mjs` already writes
stage-keyed, hash-stamped records under `quality/baselines/approved/<stage>/` if you want one that goes stale when
the scene moves on.

| field | why this one |
|---|---|
| `scene` + its content hash | a finding against a scene that has since changed is not evidence about anything |
| `critic` | the roster row, by name |
| `input` | the artifact path it was handed. This is the admission test's answer, recorded rather than assumed |
| `finding` | one line, naming the beat or seam it is about |
| `disposition` | one of `fixed` · `confirmed-no-change` · `rejected` · `not-looked` |
| `also_returned_by` | the other critics in the SAME run that returned this finding |

**`disposition` has four values and not two, because the two obvious ones hide the interesting cases.**
`fixed` means the scene changed because of it. `confirmed-no-change` means your eye agreed and no edit
was warranted, which is a survival, not a miss. `rejected` means you looked and the flaw was not there.
`not-looked` means nobody checked, and it measures the main thread rather than the critic, so it is
reported separately and kept out of the denominator. Survival rate is
`(fixed + confirmed-no-change) / (fixed + confirmed-no-change + rejected)`.

**`also_returned_by` is the field a naive record would leave out, and it is the one that tests the
claim.** Six instances of one model converge; if `copy` and `beat` return the same finding, that is
common-cause convergence, not two pieces of evidence, and a survival rate blind to it will score a
duplicated finding twice and read as agreement. It is also the cheapest way to catch a critic whose
whole output is already covered by another.

**Do not quote the number early.** One panel run is six samples and proves nothing about independence.
Roughly fifty findings for a critic, across at least ten different films, before the rate is worth
putting in a sentence. Until then this section is the method and the roster stands on its argument.

Notes that matter per critic:

- **bg-motion exists because of a real failure.** A lime-on-black liquid field was "matched" against one
  still, and in motion it ran about 2.5x too fast with folds half the size, reading as directional
  ribbons where the reference had rounded lobes ([`../MISTAKES.md`](../MISTAKES.md) #155). **A still
  frame carries composition and colour and nothing about time.** For a continuous effect it is the least
  informative test there is: it is exactly the frame where a wrong speed looks right. Hand this critic a
  strip or do not ask it.
- **fidelity must report gaps, not verdicts.** "Matches" is not an output. Force a score per beat plus a
  list of what is missing, or you get agreement instead of information. See
  [`RECREATION.md`](RECREATION.md) for the honest 1:1 ceiling.
- **copy sees words, not frames.** Hook strength, marketing jargon, a headline restated as a subhead, a
  big number sitting as flat text. Frames distract it into liking the layout.
- **reveal is not beat.** `make beats` samples the middle of a beat and hides the entrance. Judging the
  settled frame is how a dolly direction, a colour wave, and a paired exit all got missed.

## How to run them

**One message, several `Agent` calls, so they run at once.** Launching them one at a time turns a
30-second panel into five minutes and tempts you to skip four of them.

1. **You will describe the sheet to the agent instead of handing it the path. Don't.** The moment you
   write "the sheet shows a clean grid" you have replaced its eye with yours and bought nothing. Say:
   read this path, answer this question.
2. **Demand the verdict shape in the prompt.** Fixed keys make six replies comparable and stop a critic
   drifting into an essay. Reject a reply that arrives as prose.
3. **Critics report, the main thread fixes.** No critic edits the scene JSON. Six agents writing to one
   file is how you get a scene nobody chose. Also, a critic that can fix will fix instead of finding.
4. **A critic is evidence, not a ruling.** If it flags something you can look at yourself and the flaw
   is not there, it is wrong. Look before you act. The reverse is heavier: if a critic flags something
   and your eye confirms it, that is a FIX, never a rationalization
   ([`../MISTAKES.md`](../MISTAKES.md) #15).
5. **Feed the fixes back through the gates, not through the panel.** Re-run `make author-check` and the
   sheet-producing commands after the edits, then re-panel only the critics whose input changed.

Order of operations: run the static ladder first (`make author-check`), produce the sheets, then panel.
A critic reading a sheet from a scene that fails validation is spending your tokens on a frame that will
change.

## When it is overkill

A one-line copy tweak, a colour swap, a nudge to one layer's `y`. Look at it yourself and move on.
Convening six agents for a two-token change is theatre.

**Run the panel for:** a full authoring pass, any recreation, and any render you intend to ship. Those
three, always. Between them, use judgement, and remember that the cost of the panel is one message and
the cost of skipping it is a shipped video with a background running twice too fast.

## THE BRIEF: six lines that each cost a real session to learn

A brief that omits these does not fail loudly. The agent works for an hour and returns less than it
should have, which is why each of these is written down rather than remembered.

- **Fast-forward onto main before starting, and again before the last commit.** A worktree cut from a
  stale tip produces a merge nobody asked for.
- **Stage explicit paths.** A hook already refuses `git add -A` and `git stash`; the brief should say so,
  because an agent that discovers this by being refused spends turns recovering.
- **Name the files the agent owns, and the files it must not touch.** Two agents editing one file is the
  only fan-out failure that cannot be fixed by merging harder.
- **Do not block on a background render, and do not delegate.** Both were observed: agents that launched
  a render and then waited, and agents that spawned their own sub-agents and stalled on them. A render in
  the foreground with `--workers 1` finishes; a sub-agent's brief is written by something that already
  has the context, so delegating it loses more than it saves.
- **A worktree does not carry the gitignored film library.** Only the tracked `post-*` films are there,
  so a check that globs `formats/scene/*.json` comes back nearly empty and the agent will report it as a
  defect. Say it in the brief. For the same reason a finished film cannot travel home through a merge:
  copy it across by hand, or track it.
- **Never run the mutation gate inside an agent.** An interrupted run leaves planted mutations in the
  tree, and the next agent inherits them as real findings.

## Worktree agent contract

Every worktree brief must carry this block, in this order. Each line cost a real session before it was
written down (`make critics D=<file> DECIDERS=1` prints it with the film's real base sha filled in, so
there is one owner of the text, not a copy in every brief).

<!-- worktree-contract:start -->
- Prove the base: run plain `git merge main`, then quote `git merge-base --is-ancestor <sha> HEAD` because a stale tip merges silently and nobody notices until review.
- Copy the gitignored inputs the task needs: `node_modules`, `assets/fonts`, `refs`, and any scene JSON the task names, from the lead's checkout, because a fresh worktree carries none of them.
- Run git only as plain `git <cmd>` from your own worktree, never `git -C`, `command git`, or `/usr/bin/git`, because those are exactly the paths the worktree guard exists to refuse.
- If a hook denies a command, stop and quote the denial rather than working around it, because going around a guard is how a killed server or a silenced gate happened before.
- Never edit `quality/baselines/*`, because a ratchet must only fall, never be pushed back up to hide a finding.
- Never write an `approved:` line, and never drop one that is already there, because only the user's own signature counts as approval.
- Start any server on your own port, and stop it by PID, because stopping by name kills whatever else is listening on that name, including another session's.
- Work inside a render budget stated in the brief, and when it runs out, stop and report rather than rendering again, because renders are the most expensive step and a budget only holds if it is obeyed.
- Scene JSON is gitignored, so any film work that edits it runs in the lead's checkout, never a worktree, because a worktree cannot carry the edit home through a merge.
<!-- worktree-contract:end -->

## Provenance

**Do not re-add:** the claim that an `ab` critic runs today. It shipped (`05a5123`) and was removed
(`cc2dfc2`, 2026-08-05) with five other tools. Use `make compare` and judge by eye instead.
