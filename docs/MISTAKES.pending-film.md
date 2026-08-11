---
when: "\"authoring process.json turned up engine and gate faults I was not allowed to fix in that worktree\""
answers: four findings from one 15s film — the intent gate cannot read the engine's own emphasis tags, the asset planner treats sound cues as pictures, a motion track is layer-relative with nothing watching, and a fresh worktree renders in the wrong typeface in silence
group: story
---

# Pending findings — from authoring `formats/scene/process.json`

Written from a worktree whose brief forbade touching `core/**`, `scripts/**` and `docs/MISTAKES.md`.
Each entry is stated the way `MISTAKES.md` states one, so it can be moved across whole. Nothing here
has been fixed.

---

## A. `inspect` cannot see through `<b>`, so it fails every film that uses emphasis

**What.** `TASTE=1 make author-check` blocked with `0 pass · 5 fail` and, for every beat,
`missing artifact: "Nothing came near the edge."`. The line was on screen, at full opacity, for three
seconds.

**Root cause.** `scripts/gates/inspect.mjs:40`:

```js
const textOf = (l) => (l.type === 'text' ? l.text || '' : '') + (l.block ? ` [block:${l.block}]` : '');
```

It returns the RAW authored string. The layer holds `"Nothing came near the <b>edge.</b>"`, the needle
is `"Nothing came near the edge."`, and `includes()` says no. `<b>` / `<em>` are not an exotic input:
`docs/PRIMITIVES.md` documents them, `CLAUDE.md` names them under Hard rules, and every shipped film in
`formats/scene/` uses them to carry the accent word.

**Why it is worse than one bad match.** `make intent SB=… D=…` builds the sidecar from the
storyboard's `onscreen:` line, which is plain prose by construction. So the tool generates the needle
and the gate rejects it: the two halves of the same feature disagree, and the author is pushed toward
deleting the emphasis to make a gate green. That is the shape CLAUDE.md calls out — satisfying a gate
by making the film worse.

**Fix.** Strip markup before matching:

```js
const plain = (s) => String(s || '').replace(/<[^>]+>/g, '');
const textOf = (l) => (l.type === 'text' ? plain(l.text) : '') + (l.block ? ` [block:${l.block}]` : '');
```

**Grep every consumer before closing it.** `l.text` is read for matching in more than one gate. Check
at minimum `scripts/gates/copy.mjs`, `scripts/gates/critique.mjs` and anything counting words or
characters of on-screen copy: a headline with emphasis is currently five characters longer than it
reads, so any length or word-count rule is off by the tag on exactly the films that took the trouble to
emphasise something. Fix or explicitly clear each.

**Workaround used in the meantime.** `process.intent.json` carries needles that are the longest
tag-free substring of each line (`"Nothing came near the"`), with a `_note` saying why. That is a
workaround, so by CLAUDE.md's rule it is a bug report, and this is it.

---

## B. `make assets` plans image cards for audio cue names

**What.** `make assets D=formats/scene/process.json` on a film with a scored `audio.cues` array printed:

```
  card   whisper  →  assets/cards/whisper.svg
  card   error    →  assets/cards/error.svg
  card   press    →  assets/cards/press.svg
  card   droplet  →  assets/cards/droplet.svg
  card   tick · success · ready …
  (7 card, 9 dedup)
```

**Root cause.** `scripts/media/assets.mjs` walks the scene for subjects that need an image and does not
exclude the `audio` block, so a cue NAME is read as a topic. `error` and `success` are the two most
generic strings in the file, which is why they deduped against each other seven times.

**Why it matters.** It fires precisely on the films that took CLAUDE.md 2a2 seriously and gave
themselves sound: the better the film, the louder the false plan. `asset preflight` inside
`author-check` is separately clean, so nothing else contradicts it.

**Fix.** Skip `audio` (and `captions`) when collecting subjects. A cue name resolves against
`assets/sfx/`, never `assets/cards/`.

---

## B2. The same script's DRY RUN writes files to disk

**What.** `scripts/media/assets.mjs` prints `PLAN (dry run — pass --write to apply)` and then writes
every generated card anyway. Measured, in a clean tree:

```
$ rm -rf formats/scene/assets
$ node scripts/media/assets.mjs formats/scene/process.json     # no --write
$ ls formats/scene/assets/cards
droplet.svg  error.svg  press.svg  ready.svg  success.svg  tick.svg  whisper.svg
```

Seven files, from a command that said it was applying nothing. `author-check`'s `assets` step runs the
same script, so every `make video` re-creates them, and the directory lands next to the scene
(`formats/scene/assets/`) rather than in the repo's `assets/`. It is untracked and not gitignored, so
it shows up in `git status` and the next person commits it by accident.

**What `--write` actually gates** is only the edit-the-JSON half. The generate half is unconditional.

**Fix.** Gate the card generator on the same flag as the JSON edit. A dry run must not touch the
filesystem — that is the whole contract of the word, and the banner is currently a false statement the
tool prints about itself. Then decide the output path deliberately: `assets/cards/` at the repo root,
not a sibling of whatever scene happened to be passed in.

**Blast radius.** Every scene with a subject the planner wants to card, which is most of them. Check
whether any shipped scene already references a path under `formats/*/assets/` that only exists because
of this.

---

## C. A motion track is layer-relative and nothing shows it in film time

**What.** The film's payoff is one snap: a red measured rectangle collapsing onto the ink. It landed
half a second after the line that announces it. Twelve gates were green, including `plan-vs-render`,
which only asks whether *something* happens at the junction.

**Root cause: mine, not the engine's.** `docs/PRIMITIVES.md` states it plainly — motion times are
"seconds from the layer's start". I keyed the track in film time on a layer that starts at `0.5`, so
every key on it fired 0.5s late. Correct behaviour, correctly documented.

**Why it is still worth an entry.** Nothing in the toolchain shows a motion key in film time. `make
beats`, `make reveal`, `make studio`'s timeline and `plan-vs-render` all speak absolute seconds; the
motion track is the one place that does not, and it is the place a payoff is timed. I found it by eye,
in the judge sheet, at the last step of the ladder — which is the step working as designed, but it is
an expensive place to find a half-second.

**Suggested fix (cheap, no new gate).** Print motion keys in BOTH clocks wherever a track is displayed:
the studio timeline already draws a bar per layer, so a tick per motion key at `start + t` would make
this class visible while authoring. A stronger option: warn when a layer with `start > 0` carries a
motion track whose key times sit inside `[start, start+duration]` in ABSOLUTE terms as well — that
pattern is almost always an author writing film time. Heuristic, so a warn, never a block.

---

## D. A missing typeface substitutes silently in a fresh worktree

**What.** Every frame of the first four render passes was set in a high-contrast serif. The theme
(`themes/vawe-dark.json`) declares `sans: "Anybody"` and its own note explains why. I judged
composition, hierarchy and line breaks against the wrong face for four iterations.

**Root cause.** `assets/fonts/*.woff2` is gitignored (`.gitignore:5`), so a new worktree has none;
`core/tokens.css:59` declares the `@font-face` against a file that is not there and the browser falls
back. `make fonts` fixes it in about twenty seconds. Same story for `assets/sfx/` and `assets/music/`,
which `make audio` bakes.

**Why it is an entry and not just setup.** This is the exact class `MISTAKES.md` #10 and #22 are about,
and both of those were closed by making a font failure LOUD. The load list is now derived rather than
hand-maintained, which fixed *which* faces get requested; it did not add a check that the requested
file exists. Silence is still the failure mode, and it costs whole iterations because a fallback serif
renders perfectly happily.

**Fix.** At boot, resolve every `@font-face` src the active theme's roles depend on and fail (or at
minimum warn once, loudly, in the render log) when one 404s. A worktree bootstrap note in
`CLAUDE.md` — run `make fonts` and `make audio` before the first render in a new worktree — is the
five-minute half of it, but the loud check is the part that survives the next person not reading it.
