# The blind A/B judge — is the new cut actually better

`make judge` grades **one** film against a house style. It cannot tell you whether an edit helped,
because it never sees what the film looked like before, and the agent running it knows perfectly well
which version it just authored. A judge that knows which cut is "the new one" is not measuring the cut.

`make ab` is the controlled version: two cuts, paired beat by beat, with every trace of which is which
removed, scored by three judges who have not been told what the film was trying to do.

```bash
cp out/<name>.mp4 out/<name>.before.mp4      # keep the control BEFORE you edit
# ... edit the scene ...
make author-check D=formats/scene/<name>.json
make ab A=out/<name>.before.mp4 B=formats/scene/<name>.json \
        NAME=vv-<name> CLAIM="1.2M calls / week"
# spawn 3 judges in ONE message, each handed ONLY /tmp/ab/vv-<name>/brief.md and its own number
make ab-record NAME=vv-<name>
```

## Why blind

The only controlled experiment this repo has run on a process change **lost to its control**
([`../MISTAKES.md`](../MISTAKES.md) #161), and it only produced that answer because the judge could not
see which arm anyone had worked on. Blinding is not ceremony; it is the difference between a result and
a reassurance.

`key.json` is written mode `0400` with the mapping, and `ab-record` refuses to run on an empty
`verdicts/`. That is a fence, not a wall: the main thread *can* open it. It exists because the realistic
failure is not deceit, it is a filename leaking into a prompt by accident.

## Why three, and why never four

**N reduces variance, not bias.** Three judges drawn from one model share their blind spots, so a 3-0 is
weaker evidence than the arithmetic suggests.

| vote | confidence | what to do |
|---|---|---|
| 3-0 | `DECISIVE` | ship |
| 2-1 | `LEAN` | ship; the dissent is stored verbatim |
| split, or a tie-majority | `SPLIT` | **the change is not perceptible. Revert it, or make it bigger.** |

**On a split, do not add a fourth judge.** That is vote-shopping: it converts a real signal ("these are
indistinguishable") into a manufactured majority. The control for bias is the **position swap** — re-run
with `SEED` incremented, which reshuffles LEFT and RIGHT, and a fresh trio. If the winner follows the
**arm**, it is real. If it follows the **position**, the result is void.

Per-dimension 1-5 scores are never averaged across judges. They are a judge's *reason*, uncalibrated
between judges; averaging them invents a precision none of them claimed.

## `--claim` is mandatory, and it is the point

`visual-vocabulary.mjs` can prove a picture is on screen and is large. Its own closing lines say it
cannot prove the picture **explains** anything, and a big decorative photograph passes it while
deserving to fail a human.

This loop makes that measurement. The author commits to a claim first, quoted from the film's own
on-screen text. The judge, told nothing about it, answers `graphicEarnsIt.whatItEncodes`: *in your own
words, what does the picture mean?* `ab-record` prints the two side by side.

If a blind judge cannot say what the picture means, the picture explains nothing. `"nothing — it is
decoration"` is a legitimate verdict and the most useful one the loop produces.

An author who cannot quote the on-screen line their graphic encodes is decorating. `ab.mjs` refuses to
run without the claim for exactly that reason.

## The verdict shape

Enforced mechanically by `ab-record.mjs`, not remembered. A verdict that drifts from this shape is not a
soft finding to interpret, it is unusable data, and the script records nothing until every file parses.

```json
{
  "judge": "1",
  "perBeat": [{"beat": 1, "winner": "LEFT|RIGHT|TIE", "dimension": "…", "why": "one sentence"}],
  "graphicEarnsIt": {"side": "LEFT|RIGHT|NEITHER", "whatItEncodes": "…"},
  "overall": {"winner": "LEFT|RIGHT|TIE", "margin": "clear|narrow", "why": "…"},
  "worstFrame": {"side": "LEFT", "beat": 3, "flaw": "…"},
  "wouldShip": {"LEFT": "yes|no", "RIGHT": "yes|no"}
}
```

`wouldShip` sits **outside** the rubric on purpose. A rubric measures what it was told to measure; this
one field can say "one of these won and neither is good enough", which no ranking can.

## What the sheet is and is not for

- `sheet.png` — every paired beat, LEFT beside RIGHT, in order. Read it for **structure and pace**.
- `beat-NN.png` — the same pair at full render resolution. **A readability call made from the contact
  sheet alone is a guess.** The brief tells every judge to open at least one.

Rows are paired **by index and never resampled onto a common grid**: a differing beat count is itself a
signal about pace, and a row reading `(no beat)` on one side is information, not a gap to patch.

Both arms are always sampled by the **same** model. Where one arm is a bare mp4 (the usual before/after
case), both fall back to even spacing, because beat clustering on one arm and even spacing on the other
would show up to a judge as a difference in pace: an artefact of the instrument, scored as a quality.

## What gets kept

`verify/judged/<name>.json`, git-tracked, one file per experiment. It carries both arms' inputs, scene
hashes, `authoring.allow` waivers, every verdict in full, and the **git tree hash of `scripts/gates/`**.

That last field is the `MISTAKES.md` #161 fix. That experiment's control was contaminated by a gate
nobody had recorded as live, so it measured skill-plus-gate against gate-alone. Which gates were running
is now a checkable fact, which matters most during a campaign that is editing the gates.

Not the ledger (`dna/`): that is gitignored and has never accumulated anywhere but one laptop, it dedupes
by file, and a verdict is keyed by experiment rather than by design.

## Judge budget

Do not judge every scene. Judge the first three in each bucket (you are calibrating the loop as much as
the film), every scene you are unsure about, and a deterministic one-in-three audit sample of the rest.
