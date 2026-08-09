---
when: handing the docs-truth pass back, before appending to docs/MISTAKES.md
answers: which stale commands and paths docs/MISTAKES.md still names, and what each should say
group: process
---

# Pending entry for docs/MISTAKES.md (from the docs-truth pass)

This file quotes every stale reference it is asking someone to fix, so it names things that do not
exist on purpose. Each one is waived below rather than in the table, where a comment would break the
row.

<!-- doc-refs-allow: make sfx · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: make schema-drift · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: make roadmap-drift · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: make visuals · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: make flicker-check · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: make brandkit · quoted below as a reference that was corrected -->
<!-- doc-refs-allow: make ab · quoted below as a reference that was corrected -->
<!-- doc-refs-allow: scripts/validate.mjs · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: scripts/site-assets.mjs · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: core/layers/paint.js · quoted below as a reference to be corrected -->
<!-- doc-refs-allow: core/layers/shader.js · quoted below as a reference that was corrected -->
<!-- doc-refs-allow: core/shaders.js · quoted below as a reference that was corrected -->
<!-- doc-refs-allow: scripts/gates/visual-vocabulary.mjs · quoted below as a deliberately deleted file -->
<!-- doc-refs-allow: scripts/dev/predict.mjs · quoted below as a deliberately deleted file -->
<!-- doc-refs-allow: scripts/dev/rules-audit.mjs · quoted below as a deliberately deleted file -->
<!-- doc-refs-allow: formats/scene/tokenjam-launch.json · quoted below as a deliberately deleted scene -->

Append the entry below. Then apply the `docs/MISTAKES.md` patch in the second half of this file:
`make doc-refs` is green everywhere except that one file, and the pre-push hook is waiting on it.

---

## The docs named commands and files the repo did not have, and two gates that would have said so were red and ignored

**What.** `docs/MISTAKES.md` told an author to run `make schema-drift`, `make roadmap-drift`,
`make sfx` and `make flicker-check`. None of the four exist. `docs/PRIMITIVES.md`,
`docs/DESIGN-DATABASE.md` and `docs/LAUNCH-VIDEO-GUIDE.md` all opened the brand workflow with
`make brandkit`, a target removed with the templates, and one of them wrote it inside the fenced
block an author copies first. `docs/ROADMAP.md` said `core/shaders.js` "already has this path" and
that a pattern was "proven twice over by `core/layers/shader.js` and `core/layers/paint.js`"; all
three moved in a rename two refactors ago. `docs/CRAFT/BLUEPRINTS.md` named a deleted scene as its
worked example. 111 usage strings inside `scripts/**` printed `node scripts/<name>.mjs` after the
scripts moved into `scripts/author|brand|gates|media|site/`, so the message a tool prints when you
get its arguments wrong named a path that had not existed for months.

Worse than any single one: `docs/JUDGE.md`, `docs/CRAFT/SUBAGENTS.md` and
`docs/CODEMAPS/DOC-DISCOVERY.md` all stated that the blind A/B judge "was never written". Git says it
shipped on 2026-07-29 in `05a5123` and was cut on 2026-08-05 in `cc2dfc2`, in a commit that removed
six tools on the ground that none had ever made a video better. The three docs were rewritten on
2026-08-09, four days after the removal, by someone who found a dangling link and inferred the wrong
history from it.

**Root cause, one for all of it.** Nothing checked whether a doc pointed at a real thing. The two
checks that come closest each own a slice: `craft-coverage` resolves markdown links inside
`docs/CRAFT/`, `doc-map` resolves markdown links to `.md` files repo-wide. Neither reads a `make`
command, a backticked source path, a link to a non-markdown file, a Makefile recipe, or a usage
string. A doc is read as an instruction, so an instruction that fails teaches the author to distrust
the whole file, which is the expensive part.

The false history has its own cause worth naming: **a dangling reference does not say which of two
things happened.** "Never built" and "built and then cut" leave identical evidence in the tree, and
they are opposite facts about the project. Guessing turned a decision into an oversight, in three
places, permanently, unless someone ran `git log`.

**Fix.** `scripts/gates/doc-refs.mjs` (`make doc-refs`), wired into `make review`. Four rules:
every `make <target>` a doc names exists; every repo path a doc cites exists; every Makefile recipe
runs a script that exists; every `node <script>` printed or documented inside a source file exists.
Scan surface is `git ls-files`, never a hardcoded array. A doc may waive one reference with
`<!-- doc-refs-allow: <ref> · <reason> -->` when it names a thing in order to say the thing is gone.

**Also fixed in the same pass.** `site-counts` was red on six figures and is green.
`dead-branch` scanned four hardcoded directories, which is a map of where the code lived the day it
was written; it now discovers its surface from `git ls-files`, which immediately found two dead
bindings in `formats/scene/scene.js`, a file it had never read.

**What the gate cannot do.** It cannot see an un-backticked command, and it will not judge a bare
filename with no directory in it (`linear-30.json` in CLAUDE.md was wrong for months and only a human
caught it). It proves a name resolves. It cannot prove the sentence around the name is true.

---

## The patch for docs/MISTAKES.md

Nine renamed commands and six moved or deleted files. Apply, then add `doc-refs` to the pre-push
hook line as the comment there says.

| Line | Now | Should be | Why |
|---|---|---|---|
| 864 | `make sfx` | `make sfx-check` | renamed |
| 1581 | `make schema-drift` | `make schema-check` | the script kept its name, the target did not |
| 1583 | `make roadmap-drift` | `make docs-drift` | renamed |
| 1772 | `make roadmap-drift` | `make docs-drift` | renamed |
| 1800 | `make schema-drift` | `make schema-check` | renamed |
| 2504 | `make schema-drift` | `make schema-check` | renamed |
| 83 | `scripts/validate.mjs` | `core/validate.mjs` | moved |
| 233 | `scripts/site-assets.mjs` | `scripts/site/site-assets.mjs` | moved |
| 1550 | `core/layers/paint.js` | `core/surfaces/paint.js` | moved in `2638338` |

Six more are correct prose about a thing that was deliberately removed. They need a waiver comment,
not an edit, so the gate stops arguing with a true sentence:

```
<!-- doc-refs-allow: make visuals · the entry records a gate that was later culled -->
<!-- doc-refs-allow: scripts/gates/visual-vocabulary.mjs · the entry records this gate's own deletion -->
<!-- doc-refs-allow: make flicker-check · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/predict.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/rules-audit.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: formats/scene/tokenjam-launch.json · the entry records this scene's deletion -->
```

Three of those six are worth a sentence in the entries themselves: 4339, 4600 and 4776 describe
`flicker-check`, `predict` and `rules-audit` in the present tense as gates that run. They were cut
in `cc2dfc2`. An entry that says a gate catches something, about a gate that no longer exists, is the
same defect this pass was chartered against.

## Two dead-branch findings left open in `core/`

Out of bounds for this pass, both real, both reproduced by `make dead-branch`:

- `core/pan-resolve.mjs:51` · `const PAN = ['x', 'y']` with the comment "the only properties a pan
  supplies". Never read. Either the merge is meant to filter on it and does not, or it is a leftover.
  Worth reading rather than deleting: the comment claims an invariant the code may not enforce.
- `core/seams.js:374` · `let _cssCache = null` with the comment "inlined once per document (fonts
  fetched + base64'd)". Never read. The cache was declared and never wired, so every seam re-fetches
  and re-base64s the fonts. That is a performance bug the comment says is already fixed.
