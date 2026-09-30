---
name: readable-hold
when: a beat holds still on a clip, a card, or a line of text before it moves on
holds: reports (`bin/vawe check page-check`, finding `text-unreadable-hold`)
answers: "the minimum time a held frame needs to be readable, and why the fix is always a hold, never a slower move"
group: look
codes: text-unreadable-hold
---

# A readable hold stays still long enough to be read

A held frame earns nothing if nobody can read it. The floor is 1.2 seconds: about how long a viewer
needs to register any one still thing, clip or card alike. Prose has a stricter number,
`words x 0.6 s`. Short or non-prose text reads at 3 words per second, floored at 1.2 s. The numbers
live in `harness/lib/read-hold.mjs`.

| element | minimum hold |
|---|---|
| a clip or card, no words | 1.2 s |
| short or non-prose text (under 4 words) | `max(1.2 s, words / 3)` |
| prose (4+ words) | `words x 0.6 s` |

The fix is always a hold: add seconds before the exit, or give the beat a second thing to look at.
Never slow the entrance or exit. Motion stays quick; time to read comes from holds. Exits still run
faster than entrances.
