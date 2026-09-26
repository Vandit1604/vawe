---
name: readable-hold
when: a beat holds still on a clip, a card, or a line of text before it moves on
holds: reports (make dev-tool X=direct, read gate; TASTE=1 gives it teeth; `unreadable-hold`, `text-overstays`)
answers: "the minimum time a held frame needs to be readable, and why the fix is always a hold, never a slower move"
group: look
codes: unreadable-hold
---

# A readable hold stays still long enough to be read

A held frame earns nothing if nobody can read it. The floor is about 1.2 seconds: roughly how long a
viewer needs to register any one still thing, clip or card alike. Text carries its own stricter number:
the read-twice rate, `words x 0.6s` (`HOLD_PER_WORD`, `quality/gates/read-check.mjs`). Short or
non-prose text, and anything else held for someone to take in, uses a quicker read at 3 words per
second (`OTHER_WPS`), floored at the same 1.2 seconds.

| element | minimum hold |
|---|---|
| a clip or card, no words | 1.2s floor |
| short or non-prose text | `max(1.2s, words / 3)` |
| prose (4+ words, real size) | `words x 0.6s` |

The fix is always a hold: add seconds to the layer's `duration`, or give the beat a second thing to
look at. It is never to slow the entrance or exit down. Motion stays quick; time to read comes from
holds and dwell. Exits still run faster than entrances, and shorter, for emphasis.

The finding reports the fix and never changes the timing itself: it names the beat, the element, the
measured hold, the minimum needed, and the exact seconds to add.
