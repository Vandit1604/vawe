---
when: "deciding whether a Makefile target belongs, is a real build rule, or should fold into another (before adding another one)"
answers: "how many of the targets are real build rules (zero, all .PHONY) vs pure aliases vs logic that belongs in a script · which targets already folded on the `make arsenal` precedent · the CLI-vs-Makefile call and its cost"
group: process
---

# Makefile audit: what the targets actually are

This answers one question: is the Makefile a build system, or a command catalogue wearing one?
Method: a small parser (`scripts/dev/` scratch, not committed) read every `name:` line in the
Makefile, split prerequisites from the recipe, and classified each target by what its recipe
contains. Counts below are from that parse, cross-checked by hand against the file.

## The four counts

**215 targets are defined** (`grep -c '^[a-zA-Z][a-zA-Z0-9_.-]*:'`, matching `make lib-test`'s own
count). The owner's "216" was close; the gap is `.PHONY` declaration lines, which name targets but
do not define recipes, so the parser (correctly) does not double-count them. The audit below was
measured at 214 and one target (`motion-trace`) landed while it ran, which is the ordinary rate this
file grows at and is the reason the counts here are stated with the command that reproduces them.

**1. Real build rules: zero.** Line 6 of the Makefile declares `build` itself `.PHONY`, alongside
`video`, `render`, `all`, `dev`, `ship` and every other target that would, in a normal Makefile, be
a file target make can skip when nothing changed. Nothing in this file has a real file
prerequisite that lets `make` compare mtimes and skip stale work: `build: fonts` always reruns `go
build`, `video: build` always reruns `build`. This is not a bug anyone introduced; it is a
description of what the file is. Every one of those targets is a command with a memorable name.
The build-system half of what a Makefile is for is not present here at all.

**2. Pure aliases: 204 of 214 at the time of the audit** (after the changes below; 200 before). A pure alias is a recipe of
one or two lines that passes variables through to one script (`node quality/gates/X.mjs $(D)
$(if $(STRICT),--strict)`), with no shell logic of its own. This is the catalogue half, and it is
the honest majority of the file. `make list` exists because a 200-plus-line catalogue needs an
index; it reads the Makefile itself so the index cannot drift from the real target list.

Of the aliases, **7 explicitly moved and print where they moved**, matching the precedent AGENTS.md
already names (`make arsenal` folding six targets into one): `mistakes`, `schema`, `blueprints`,
`previews`, `preset-sheets`, `theme-sheet`, `track`. Each old name still works, each prints its new
`make arsenal <FLAG>=...` form on stdout before running the old script underneath. AGENTS.md says
this holds "for one release"; it still does, and nothing here changed that promise.

**3. Targets carrying real shell logic: was 10, now 6.** Ten targets had recipes with a loop, a
conditional, or more than three command lines: `build-all` (a `for` loop cross-compiling five
binaries), `probe` (an `if`/`for` choosing one format or sweeping all of them), `catalog` (a `for`
loop with a file-freshness `if`), and `approve` (a one-line `node -e` inline script). These four
are true logic: untestable by `make lib-test`, unlintable by `make lint-test`, and unreadable in a
`diff` because Makefile tab-sensitivity makes multi-line shell painful to edit safely. **Moved**,
see "Changes made" below.

The other six (`video`, `dev`, `ship`, `arsenal`, `track`, `site-check`) are multi-line but carry no
loop or conditional: they are ordered command sequences, each line one step of a documented ladder
(`make ship` "DECLARES its own ladder before it runs", per AGENTS.md). A sequential list of commands
is exactly what a Makefile recipe is for; moving it to a shell script would not make it more
testable, only harder to read next to the target that owns it. Left alone.

**4. Dead or duplicated: no deletions, 65 leads.** `docs/MISTAKES.md #373` is explicit that an
unused count is a lead, not a delete list, and this repo has already been burned deleting on one.
So this audit corroborated rather than deleted: 65 targets are named nowhere as `make <name>`
across every `.md` file, every `.mjs` file under `docs/`/`skills/`, `AGENTS.md`, `CLAUDE.md`, the
five `.github/workflows/*.yml` files, `.githooks/pre-push`, and `package.json`. None of the three
CI-facing surfaces (workflows, hooks, package.json) named any of the 65, which rules out "it runs
in CI but no doc says so" as the explanation. That is corroboration, not proof: an author can still
type `make og` or `make clean` from memory with no doc pointing at it, so this list is a place to
look, not a list to run `git rm` against. The 65: `invent-look craft-check gallery examples
build-all route llms-txt study-verify recreate ref motion-split audit-test mistakes-check
silent-check cutout waivers treatment sheet script quiz-round2 copy-check asset-check export-edl
sfx-catalog forensics sweep-static capture-motion schema-write engine-sync worktrees clean blurbs
mcp-smoke effect-posters globe-dots paints-nothing arsenal-check discovery output-contract
generated-check effects-check vocab-check blocks-docs blocks-json scenes-json films-json site-check
code-quality-top no-emdash og blocks-sync registry inspect dissolve scrub batch site-assets glyphs
glyphs-verify glyphs-audit docker-context ransom-sprites gradients deck lightfield-model`.

Reading that list, most are self-evidently not dead: `clean`, `og`, `registry`, `generated-check`
and `no-emdash` are all invoked directly in this very audit's own verify list, just never through a
Markdown sentence that says "make X". The count is real but its interpretation is not "delete
these"; it is "the doc-reference check undercounts real usage by ignoring anyone who already knows
the target name," which is most of the value `make list` exists to replace.

## Changes made

Four targets had real shell logic moved into a script, keeping the Makefile line a one-line call
with the recipe's own comment intact:

- `build-all` -> `scripts/dev/build-all.sh` (the five-platform cross-compile loop)
- `probe` -> `scripts/dev/probe-all.sh` for the no-`M=` sweep branch; the `M=<fmt>` branch stays a
  direct one-line call to `probe-purity.mjs`, now expressed as `$(if $(M),...,...)` instead of a
  shell `if`
- `catalog` -> `scripts/site/catalog-render.sh` (the write-on-change render loop, with its own
  comment explaining why re-rendering an unchanged page churns git)
- `approve` -> `scripts/author/approve.mjs` (the inline `node -e` became a two-line module)

Each is now reachable by `node`/`sh` directly, outside `make`, which is what "untestable by
lib-test" meant in practice. No target was renamed, no `.PHONY` list changed, no phase tag moved.
Verified green after the change: `make list` (byte-identical output), `make doc-refs`, `make
generated-check`, `make lint-test`, `make lib-test` (no target lost, still 1986 asserts passing),
`node scripts/dev/no-emdash.mjs`, and a live run of `make probe M=scene` and `make approve
STAGE=beats D=formats/scene/sample.json` to prove the moved code still executes correctly, not just
parses. `make docs-drift` fails both before and after this change on an unrelated pre-existing
finding (`waiver-drift.mjs` unreachable from its current check path); that failure is untouched by
anything here and is out of scope for this audit.

## Proposals not made, and why

**Fold the remaining six-target-with-logic group further.** `video`/`dev`/`ship` already share the
`author-check -> render -> audit` shape and could become one script called three ways, the way
`arsenal` folded six discovery targets into one. Not done here: AGENTS.md documents `dev`/`ship` as
distinct, differently-gated stops in the authoring loop ("`make dev` ... No gates, no audit" vs.
"`make ship` ... the ladder with its teeth in"), and collapsing them into one entry point with a
mode flag would change what an author has to remember mid-render, which is a product decision for
the repo owner, not a refactor I should make unasked.

**Delete any of the 65 leads.** Corroborated but not proven; see above. The right next step, if the
owner wants it, is the same one `make unused` already uses for registered effects: read each
target's own last-touched commit and ask whether it answers a question nobody currently asks, not
whether it is currently asked.

**Extract the `site-check`/`blocks-sync` phony dependency chains into scripts.** These have no
shell logic at all, only `target: target target target` dependency lists; that is exactly what
Make is for, chain-of-phony-targets is idiomatic even in a catalogue Makefile, and there is nothing
here `lib-test` could not already see.

## The CLI question, settled honestly

**Should this stop being a Makefile and become one CLI (`./bin/vawe` extended, or a new script
under `scripts/`) with a subcommand per target?**

What it would cost: every doc in this repo (`AGENTS.md`, all of `docs/CRAFT/`, every skill under
`skills/`) currently says `make X`. `doc-refs` alone found 214 make-target references and 199
markdown files; rewriting the invocation syntax touches most of them, not as a mechanical
find-replace (some targets take `D=`, some take positional args, some take both) but as a real
edit pass with a real chance of silently breaking a doc's own worked example. `make list`'s
phase-grouped front page and its `lib-test --check` guarantee ("every target carries a `[phase]`
tag or the check fails") would need to be reinvented for whatever replaces it, and reinventing a
working guarantee is exactly the kind of untested surface this audit is supposed to be reducing,
not adding.

What it would buy: real command completion (`make` has none; a CLI can), a single place to add
cross-cutting behavior (structured `--json` everywhere is already half-true via
`scripts/lib/findings.mjs`, but a CLI could make it total in one file instead of 200 recipes each
doing `$(if $(JSON),--json,)`), and the honest naming this audit's finding #1 argues for: nothing
here is a build rule, so nothing here loses anything by not being one.

**Recommendation: do not migrate.** The `make X` vocabulary is load-bearing across ~200 markdown
files and every skill doc, `make list`'s self-describing front page already solves the
discoverability problem a flat catalogue this size would otherwise have, and the concrete
`$(if $(VAR),--flag)` cost this audit found real instances of (`video`/`dev`/`ship`/`arsenal`) is
already the ceiling of what needed fixing, not evidence the whole shape is wrong. The cheaper fix
for "this isn't really `make`" is not a migration, it is a one-line note at the top of the file
(a candidate: "every target here is `.PHONY`; nothing here is a build rule, and that is
deliberate") so the next person who asks this same question does not have to re-derive finding #1
from scratch. Whether to migrate is the repo owner's call, not mine; this is that call's evidence.
