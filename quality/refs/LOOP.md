---
when: an agent is about to close one beat of one reference recreation
answers: the exact step order · the stopping rule · the preconditions to check first
group: process
---

# LOOP: the reference-loop prompt

Give this to the agent working one beat. It names every step in order, reuses only existing
commands, and states its own stopping rule so no pass runs longer than it should.

---

**Restate the task in one line**: "close beat `<n>` of `<ref-name>` (`<label>`) to combined >= 0.70
and two judges >= 8/10, or report 3 passes without progress."

**Check preconditions before doing anything else.** Stop and report if any of these are missing:
- `quality/refs/<ref-name>/source.mp4` and `beats.md` exist.
- `beats.md` names a `## Beat <n>:` heading with a `- window: s-s` line for this beat.
- A worktree to do the fix in (never on `main`, per the friction step below).

**1. Study.** `make study REF=quality/refs/<ref-name>/source.mp4 SEE=1` first: read its index.md and
grids (Read tool) before writing or re-checking beats.md, it is far cheaper than watching the clip.
Then `make study REF=quality/refs/<ref-name>/source.mp4 D=<film.json> MATCH=1 LIGHT=1` if a draft
already exists for this beat; otherwise skip to light-fit and author the first draft.

**2. light.json / camera.json.** `node harness/media/light-fit.mjs --ref source.mp4 --start <s>
--end <e> --out study/beat<n>.lightfit.json --grid grid/beat<n>.png` (or `harness/dev/ref-beat.mjs`
below runs this for you). Fit the beat's light before touching anything else: a wrong background
makes every later score wrong for a reason that is not the beat's motion.

**3. Look review, then motion.** `make look LOOKS=1 D=<film.json>` for the still frame first. Only
once the still reads right, direct the motion (camera, transitions, timing).

**4. Verify raw block.** `node harness/dev/verify.mjs D=<film.json> REF=source.mp4`. Paste the block
verbatim, no summary: it is hard numbers, not a judgement call.

**5. Two fresh structured judges.** Once `match.mjs`'s combined score reads >= 0.70, run
`make judge STRUCT=1 RUNS=A,B` on this film. A beat is never marked done off one judge, and never off
the same agent that just wrote the fix.

**6. Friction to the top fix, in a separate worktree.** If something slowed this pass down that is
not this beat's own content (a tool's flag, a missing measurement, a schema gap), name it in one
sentence in this pass's `friction` field, and if it is worth fixing, fix the tool in its own worktree,
never inside the film's worktree. Do not silently work around a broken tool twice.

**7. Ledger line.** `node harness/dev/ref-beat.mjs REF=<ref-name> BEAT=<n> D=<film.json>` appends the
line for you: before/after scores, judge scores you add by hand, minutes, renders, tokens, friction.

**Stop when either is true:**
- `combined >= 0.70` AND both judges scored `>= 8/10`.
- 3 passes on this beat with no improvement in `combined` (`STOP-converged`: hand the beat back with
  the ledger's own 3 rows as the reason, do not keep spending renders on it).

A PASS is never self-recorded: the ledger line is a measurement, and the stopping rule above is what
decides whether the beat is done, not the agent that just wrote the fix.
