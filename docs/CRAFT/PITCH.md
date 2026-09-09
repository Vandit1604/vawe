---
when: the brief is unformed, "make a video about X" with no locked angle yet
answers: "diverge before you converge: five concepts sampled wide, an anti-median probability gate, a silhouette check, the three-line pitch format, how the chosen angle becomes the storyboard's spine"
group: crosscutting
---

# PITCH: diverge before the storyboard converges

## AGENT SUMMARY

- Before any storyboard question, run the pitch round: sample five concepts wide, one per path
  (the subject's world, the emotion as a frame, the audience, the anti-pattern inverted, an unusual
  format). Estimate each concept's probability of being the median response; at least two must sit
  below 0.10, or the set is not diverse and must be resampled.
- Present all five as three lines each (concept, visual world, opening hook), THEN recommend one with
  a reason. The chosen concept becomes the storyboard's `angle:` and answers every downstream question
  it settles.
- Enforced today by `[ref: node scripts/author/pitch.mjs]`, a receipt under `quality/baselines/approved/pitch/`,
  and your own judgement; no gate blocks on it yet.

## Why this exists

The brief/quiz flow this repo already runs CONVERGES: one question per field, message then audience
then payoff. That works once there is something to converge on. It does not work on the request that
actually arrives most often: "make a video about the launch." There is no field to ask about yet,
because the film has no shape. Asking for `message` at that point hands the user back the blank they
came here to have filled.

So the pitch round runs BEFORE the storyboard, not instead of it. It diverges once, on purpose, then
hands the winner to the same converging flow the rest of this repo already uses.

**The concrete failure this step would have caught.** An early Hinge cut here was a serif headline
statement, two couple photos, and a closing tagline. It rendered clean, it passed every gate,
`author-check` had nothing to say about it, and it was still the median: it is the video anyone asked
for "a Hinge ad" would produce first, because it is the shape a dating-app ad already has. A gate
cannot catch that. A gate checks the film in front of it against rules; it has no second film to
compare against, and "this is what everyone would make" is not a rule, it is a fact about the
DISTRIBUTION of answers a brief could produce. The pitch round is the mechanism that puts a second
question in front of the median before it gets built: not "is this frame wrong" but "is this the frame
a hundred other attempts at this brief would also land on."

## The four questions, asked about THIS brief

Answer these in your head before naming a single concept. They are never shown to the user; they are
the sampling constraint that keeps the five concepts from collapsing into five phrasings of one idea.

1. **What does the subject look like, in its own visual world?** Not a generic treatment borrowed from
   the category. A running shoe's world is impact and stride, not a gradient hero. A tax product's
   world is paper, stamps, dates. Name the actual objects.
2. **What does the target emotion look like as a FRAME, not a mood board word?** Longing looks like
   empty space, a chair with nobody in it. Urgency looks like compression, a countdown clock filling
   the whole frame. Awe looks like one element rendered too large for its container. Translate the
   feeling into a composition before you translate it into a beat.
3. **What does the playback surface demand?** A feed autoplays muted and fights for the first second
   before a thumb keeps scrolling; a lobby screen or a conference stage is ambient, it has minutes, not
   a second. The same brief authored for both surfaces should not look the same.
4. **What does every other video on this subject already look like?** This is the anti-pattern. If the
   category answer is "serif statement, two photos, tagline," that answer is now off the table for path
   4 below, because path 4 exists to invert it, not repeat it.

## The five concepts, one per path

Sample exactly one concept from each path. This is what keeps the five from being five word-swaps of
the same idea:

1. **The subject's own world**: built from question 1, using the vocabulary vawe already has (a
   captured product surface via `component`, a `count` layer that ticks up a real number, a `board`
   or `doc` layer standing in for the real UI).
2. **The emotion, staged as a frame**: built from question 2. What layout, what camera move, what
   `bg` window turn makes the feeling visible without a caption saying it.
3. **The audience, met or deliberately broken**: either the exact register this audience already
   expects (a feed's fast open), or a calculated break from it (a lobby screen playing something quiet
   when every other lobby screen is loud).
4. **The anti-pattern, inverted**: take question 4's answer and do the structural opposite. If every
   competitor closes on a tagline card, this concept's payoff is a number, a real screen, a person.
5. **An unusual format**: the brief poured into a shape it was never asked for. A letter. A countdown.
   A recipe. A front page. A map. This path exists because format alone can defeat the median; the same
   facts read as news instead of an ad when they run as a front page.

## The anti-median gate

For each of the five, estimate the probability that a model handed this exact brief, with no further
guidance, would produce this concept as its first attempt. This number is a sampling constraint on
YOUR OWN generation, never a score shown to the user and never a claim of measured fact.

**At least two of the five must sit below 0.10.** If all five clear 0.10, every pitch is a version of
the median, and the round has not actually diverged. Do not present that set. Regenerate, pushing
harder on paths 4 and 5, which are the two hardest to land on by accident.

## The silhouette check

Before presenting, sketch each concept's major elements as rough bounding boxes: where the hero mass
sits, where the type sits, how full the frame is. Two concepts with the same silhouette are one concept
wearing two names, not two pitches. Cut one and it does not count toward the anti-median minimum;
replace it with a genuinely different shape before presenting.

## Presenting: three lines, five concepts, then one recommendation

Each pitch is exactly three lines:

1. **The concept**, one sentence.
2. **The visual world**, naming the one or two vawe capabilities it rides in plain words: "the launch
   number counts up on a hand-keyed track," not a feature id, not a layer type by name alone.
3. **The opening hook**, the literal first thing on screen.

All five appear before any recommendation. A recommendation shown first anchors every concept that
follows it against itself, which defeats the divergence the whole round exists to produce. After all
five, recommend ONE with a one-sentence reason. Mixing two concepts is a first-class answer, not a
consolation prize; say so if it is true. Silence from the user accepts the recommendation. This is ONE
round: it does not iterate the way a draft review does.

## What the chosen concept becomes

The chosen concept IS the brief's creative core, not a note beside it. It becomes the storyboard's
`angle:` frontmatter field and its `## Intent` section, and every downstream storyboard question that
the pitch already answered (the visual world, often the format, sometimes the audience register) is
skipped, with the pitch itself standing as the receipt for why.

## Two variant modes

**Autonomous ("just build it").** Walk the same four questions and the same five-path sample, apply
the same anti-median gate, and pick the winner yourself. Then name, in one line, the most typical
direction you deliberately left behind. That line is not decoration: it is the proof the divergence
happened even though nobody watched it happen.

**"I don't know video" mode.** Some requesters cannot evaluate five creative concepts because they do
not have a visual vocabulary for video yet. Do not force pitches on them. Instead give a 2-3 line
surface DECISION MAP: where it plays, how long it runs, what register it feels like, each with a marked
default. That is a different artifact from a pitch and should not be dressed up as one.

## The harness

`node scripts/author/pitch.mjs <name>` prints this protocol filled in for one subject: the four
questions as prompts, the five path labels, the 0.10 rule restated, the three-line format. It cannot
compute the probabilities itself, that is your judgement to make, not a thing a script can grade.

`node scripts/author/pitch.mjs <name> --chose "<angle>" [--left "<median left behind>"]` records the
decision as a receipt under `quality/baselines/approved/pitch/<name>.json`, hashed against the subject the same
way `make preflight` and `make beats` record theirs (`scripts/lib/receipt.mjs`). Edit the subject and
the receipt goes stale, the same property that makes every other receipt in this repo worth trusting.
It also prints the `angle:` line ready to paste into the storyboard frontmatter.
