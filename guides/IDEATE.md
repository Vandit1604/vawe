---
when: you make any creative decision: the film concept, a beat, a cut, the hero motion moment, a sound
answers: "how to think like a creative director: write the meaning, write four ideas from four devices, estimate how typical each is, pick one that is not the most typical, and keep the ledger"
group: crosscutting
---

# IDEATE: the one method for a creative decision

A model with no guidance writes the most typical idea first. That idea is the film that a hundred other
attempts would make. This guide is the one owner of the method that stops it. `guides/PITCH.md` (the
film concept) and `skills/vawe-transitions/SKILL.md` (each cut) use it. They keep no copy of it.

Example. A food app needs a beat for "the AI is thinking". The typical idea is a spinner. The better
idea comes from the subject's own world: the send button grows into a wok, and it tosses the
ingredients. That is a metaphor and a transformation, and both come from the kitchen.

## The method

Run it once for each decision. Do the five steps in order.

1. **Meaning.** Write what the beat or the cut must say in one plain sentence. No style words.
2. **Four ideas, four devices.** Write four ideas. Each uses a different device from the table below.
   Take every idea from the subject's own world: its objects, its materials, its verbs.
3. **Typicality.** Give each idea a number from 0 to 1: how likely a model with no guidance writes
   it first. This is verbalized sampling against mode collapse (Zhang et al. 2025, "Verbalized
   Sampling", arXiv 2510.01171). It is your own estimate, not a measured fact.
4. **Pick.** Choose one idea that is not the most typical. Write one reason. If the plain `literal`
   idea is right, say why the story needs it.
5. **Keep it.** Write the row in the `## Ideas` table of the brief. Then build the idea you picked.
   The frame must show it. A plan that the frames do not show is a finding.

## The devices

| Device | What it does | Example |
|---|---|---|
| metaphor | the thing is shown as another thing that has the same job | a backup tool is a lighthouse that keeps one lamp lit |
| transformation | one element becomes the next idea | a send button grows into a wok that tosses ingredients |
| show the invisible | a hidden process becomes visible | encryption shown as a letter folding into a locked origami crane |
| scale shift | go very close or very far | a single transistor fills the frame, then the chip, then the city grid |
| personification | the object acts like a person | a loading bar that checks its watch and then runs |
| literalise | a phrase becomes a picture | "cut costs" shown as scissors trimming a receipt |
| part for whole | one detail stands for the whole | a seat belt buckle clicks for a whole car safety film |
| reversal | do the opposite of what the viewer expects | a sale film where the price tag falls off the shelf and nobody takes it |
| collision | two worlds in one frame | a chess board whose pieces are subway passengers |
| literal | show the thing itself | the real dashboard with the real number |

`literal` is allowed. It is the default, so it needs a reason. Use it for at most one of the
four ideas in a row.

## Where the method runs

| Decision | Where it is written |
|---|---|
| the film concept | PITCH writes five concepts, one for each path; the row with `at` = `film` holds four of them, each with its device |
| a beat | one row per world id |
| a cut | one row per cut, `at` = `s1 to s2`; the cut table's handoff column holds the pick |
| the hero motion moment | one row, `at` = the spectacle world id |
| a sound | one row, `at` = `sound <s>` |

## The ledger

`## Ideas` in `brief.md`, one row for each beat and each cut:

`| at | meaning | idea 1 | idea 2 | idea 3 | idea 4 | chosen | why |`

An idea cell reads `device: the idea, typicality`, for example `transformation: the send button grows
into a wok, 0.15`. The `chosen` cell holds the idea number (1 to 4). The `why` cell holds a reason with
the word `because`.

## What the checks see (advice only)

`bin/vawe check ideas <page>` and the draft advice name: a world with no row (`ideas-missing`), every
chosen device `literal` (`ideas-literal`), one device chosen for more than half the rows
(`ideas-variety`), a pick that is the most typical idea with no reason (`ideas-typical`), a row with
fewer than four ideas, a repeated device or a missing number (`ideas-thin`; a cut row may also name the twelve handoff families of `taste/craft/transitions.md`), and four ideas that are
one idea reworded, or one picked idea copied to another row (`ideas-reworded`). Waive a code in the
page with a reason that names a world or a second.

The checks read the ledger. They do not see the film. The fresh judge and the critic ask for each beat:
which idea is on screen? An idea in the ledger that the frames do not show is a finding.

## Gotchas

- Four ideas with four device labels but one thought is the known trick. The check compares the idea
  texts. The judge looks for it too.
- Do not write the typicality after the pick. Write all four numbers first.
- An idea from outside the subject's world (a generic spark, a generic wave) is a typical idea.
- Spend the boldest idea on the spectacle. Other rows may pick calm ideas, with a reason.
