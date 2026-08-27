---
when: "judging your own render (a full pass, a recreation, anything you'll ship)"
answers: "why a self-grading agent grades kindly · the six standing critics (beat · bg-motion · reveal · fidelity · copy · seam) with the exact input and verdict shape for each · run them in parallel, in one message"
group: crosscutting
---

# SUBAGENTS: one critic, one job, one verdict

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

## The roster

| Critic | Job | Input it is handed | Verdict shape |
|---|---|---|---|
| **beat** | does each beat read at a glance | `/tmp/beats/<name>.png` from `make beats D=<file> [VS=<brand>]` | per beat: `{beat, reads: yes/no, flaw, fix}` |
| **bg-motion** | speed · scale · direction of anything that moves continuously | a 4+ frame strip, reference and render at matched timestamps | per axis: `{axis: speed/scale/direction, ours, reference, delta, fix}` |
| **reveal** | how each beat enters and exits, never the settled frame | `/tmp/reveal/<name>.png` from `make reveal D=<file>` | per beat: `{beat, enter, exit, paired: yes/no, flaw, fix}` |
| **fidelity** | recreations only: how close each beat is to its source | render frames + the source frames, side by side | per beat: `{beat, score 0-10, gaps: [...]}` |
| **copy** | on-screen writing only | the strings from the scene JSON, in beat order | per line: `{beat, line, tell, rewrite}` |
| **seam** | flash or collision at transitions | `/tmp/seams/<name>.png` from `make seam-check D=<file>` | per seam: `{seam, flash: yes/no, evidence, fix}` |
| **ab** | which of two cuts is better, and does the graphic explain anything | *built, then cut.* `make ab` + `ab-record` + `AB-JUDGE.md` shipped in `05a5123` and were removed in `cc2dfc2` (2026-08-05) along with five other tools that only inspected the engine. Nothing runs today. Use [`compare`](../../Makefile) to tile two candidates and judge them yourself. | n/a |
<!-- doc-refs-allow: make ab · the row above exists to record that this critic was planned and never built -->

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
