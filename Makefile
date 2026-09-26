# Vawe: render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in films/<name>/.
#
# Every target here is .PHONY (see below): nothing in this file is a build rule make can skip when
# nothing changed. This is a command catalogue with memorable names, not a dependency graph, and
# that is deliberate: see engine-doctrine/MAKEFILE-AUDIT.md for why it stays a Makefile despite that.

.DEFAULT_GOAL := help

# Every target whose name matches a real path MUST be listed here, or make sees the directory,
# calls the target up to date and never runs it. `blueprints/` shadowed `make blueprints` this way.
.PHONY: stage next quiz ideate kit storyboard-check preview dev dev-range look probe-frame tune studio \
  assemble check ship judge arsenal regen doctor test e2e study bench-fast install-hooks \
  build build-all render all gen site study-tool dev-tool media video sections ref list help

# make doctor: is the checkout ready to render? Today: is gsap vendored (assets/vendor/gsap.min.js,
# gitignored, written by the root "postinstall" script). Prints the fix command rather than failing
# silent-substitution style; add more self-heal checks here as they show up.
doctor: ## [engine] is the checkout ready to render (gsap vendored, and anything else self-heals need); prints the fix
	node scripts/vendor-gsap.mjs --check

# The sound library is SYNTHESIZED, not downloaded: `make gen X=audio` bakes every cue from the
# Cuelume voicings in core/audio/kit.mjs (noise + biquad + envelope, seeded, deterministic, no licence).
# harness/media/sfx.mjs (the old Mixkit fetcher) is kept for reference but is NOT wired to a target:
# a downloaded file named `click` turned out to be 19.6 seconds long and nothing noticed (MISTAKES #51).
# A sample is an OVERRIDE of that synth, never a replacement: an unmapped role still bakes from
# parameters. engine-doctrine/ASSET-SOURCES.md covers every other source and which are safe to commit.
#
# invent-look, audio-bed, vo-captions, beatmap, beatsync, spectrum: `make media X=<name>` (`make
# dev-tool X=invent-look` for invent-look).

build: ## [ship] compile bin/vawe from the Go source
	@node harness/lib/gen-tool.mjs fonts
	go build -C renderer -o ../bin/vawe ./cmd/render

# make build-all: one binary per platform we ship, named for the machine that runs it.
#
# WHY: `bin/` is inside package.json `files[]`, so the npm tarball carries whatever the PUBLISHING
# machine built. Published from an Apple Silicon Mac it shipped a Mach-O arm64 binary to every Intel
# Mac and every Linux box, which is why the engine "did not work on other people's laptops".
# cli/vawe.mjs now looks for `vawe-<platform>-<arch>` first and reads the magic bytes back before it
# spawns anything, so a wrong build is named rather than handed to the OS loader.
#
# Go cross-compiles with no toolchain per target, so this costs one command and no dependencies.
.PHONY: build-all
build-all: ## [ship] cross-compile a render binary for every shipped platform
	@node harness/lib/gen-tool.mjs fonts
	@sh harness/dev/build-all.sh

# make video D=path/to/video.json: one self-describing JSON → out/<name>.mp4
# Runs the mandatory authoring-quality ladder first (set NOCHECK=1 to skip during rapid iteration), then
# renders, then the layout/contrast/size audit (set NOAUDIT=1 to skip). The ladder is what stops an
# effect-soup video shipping silently; NOCHECK=1 is the explicit, logged waiver.
video: build ## [ship] one self-describing JSON → out/<name>.mp4 Runs the mandatory authoring-quality ladder first (set
	@$(if $(NOCHECK),echo "  · author-check skipped (NOCHECK=1)",echo "▶ author-check (every step, every time; TASTE=1 gives the style findings teeth) …" && node quality/gates/author-check.mjs $(D) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS)))
	. harness/dev/chrome-pin.sh video && harness/dev/render-lock.sh "$(D)" ./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT))
	@node quality/gates/render-verify.mjs $(D)
	@$(if $(NOAUDIT),echo "  · audit skipped (NOAUDIT=1)",echo "" && echo "▶ audit (contrast · size · safe-zone · overlap) …" && node quality/audit.mjs $(D))
	@echo "" && echo "▶ REQUIRED before shipping: make judge D=$(D)$(if $(VS), VS=$(VS)), then read /tmp/judge/sheet.png vs the rubric (engine-doctrine/JUDGE.md)."

# make dev D=<file>: THE ITERATION LOOP. Build, draft-render, open. No gates, no audit, no ladder.
# This exists because the fast path was already reachable (NOCHECK=1 NOAUDIT=1) and nobody would ever
# find it. Measured on a 15s film: the whole static ladder is ~1s against an 8.4s draft render, so the
# gates were never the cost: being interrupted mid-thought was. Iterate here; prove it with `make ship`.
# Then it writes both contact sheets (`make sheets`), because the two images an author MUST read were
# separate commands nobody remembered. Set NOSHEETS=1 to skip them: they cost roughly one more render.
#
# BEAT=<n or name> / JOIN=<n> / FROM=<s> TO=<s>: render only that slice (--from/--to,
# cmd/render/main.go), not the whole film. A film pass re-renders every second to check one change;
# this is the same loop for the one beat, or the one join, that actually moved. Dispatches to
# dev-range below instead, which skips the sheets and content-check: those read the WHOLE film and
# would either crash on a partial mp4 or report a false gap against a clip that was never meant to
# hold the other acts.
# DRAFT=1 (or NEW=<name>, which implies D=films/scene/<name>.json): a film with no scene.json yet
# gets one written from its brief (or a one-line title from its own name) before the render below runs.
# No storyboard required. This is the one-command path to a first preview (AGENTS.md "no sign-off
# step"); a real plan still goes through the seven stages when there is one to go through.
dev: build ## [dev] THE ITERATION LOOP. DRAFT=1|NEW=<name>: bootstrap a first scene, no plan needed. BEAT=/JOIN=/FROM=&TO=/GROUP=: only that slice.
	$(eval D := $(if $(strip $(NEW)),films/scene/$(NEW).json,$(D)))
ifneq ($(strip $(GROUP)),)
	@g=$$(node harness/dev/group-only.mjs "$(D)" "$(GROUP)") && $(MAKE) --no-print-directory dev D=$$g WORKERS=$(WORKERS) NOSHEETS=1
else
ifneq ($(strip $(BEAT)$(JOIN)$(FROM)$(TO)),)
	@$(MAKE) --no-print-directory dev-range D=$(D) BEAT=$(BEAT) JOIN=$(JOIN) FROM=$(FROM) TO=$(TO) WORKERS=$(WORKERS)
else
	@test -z "$(strip $(DRAFT)$(NEW))" || node harness/author/draft-init.mjs $(D)
	@echo "▶ [dev] the iteration loop, no gates, no audit"
	@t0=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	bash -c 'set -o pipefail; . harness/dev/chrome-pin.sh dev && harness/dev/render-lock.sh "$(D)" ./bin/vawe $(D) --draft $(if $(WORKERS),--workers $(WORKERS),--workers 4) 2>&1 | tee /tmp/.vawe-render-$(notdir $(basename $(D))).log'; \
	t1=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	node harness/lib/record-render.mjs dev $(D) /tmp/.vawe-render-$(notdir $(basename $(D))).log $$((t1-t0)) 2>/dev/null || true
	@o=out/$$(basename $(D) .json).mp4; echo "  → $$o"; if [ -t 1 ] && [ -z "$$CI$$VAWE_NO_OPEN" ]; then open $$o 2>/dev/null || true; fi
	@ref=$$(node -e "import('./quality/gates/stage.mjs').then(m=>{const l=m.lookBlock('$(D)'); console.log((l&&l.reference)||'');})") ; \
	if [ -n "$$ref" ]; then \
	  cc=$$(node quality/gates/content-check.mjs $(D) --ref $$ref 2>&1); rc=$$? ; \
	  echo "  content-check vs $$ref:" ; \
	  if [ $$rc -eq 0 ]; then echo "$$cc" | grep -E "^  act |verdict:" ; else echo "$$cc" | tail -1 ; fi ; \
	fi
	@echo "" && echo "  next: make check D=$(D)  (every gate, zero consequence)  ·  make ship D=$(D)  (when it's ready)"
	@node harness/author/arsenal.mjs --for $(D) 2>/dev/null || true
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node harness/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))
endif
endif

# make dev-range D=<file> BEAT=<n|name>|JOIN=<n>|FROM=<s> TO=<s>: the guts of `make dev`'s range path,
# a target of its own so it can be called directly. BEAT resolves to that beat's storyboard span, JOIN
# to the seam between beat n and n+1 (the most common check: transitions), both padded and converted
# from authored to post-tempo film time by harness/lib/resolve-range.mjs. FROM=/TO= skip resolution
# and go straight to the renderer as final film seconds. Silent (see internal/render/render.go), and
# named out/<name>.range-<from>-<to>.mp4 so it never touches the full film's own output.
dev-range: build ## [dev] the range path `make dev BEAT=/JOIN=/FROM=&TO=` dispatches to.
	@if [ -n "$(BEAT)" ]; then \
	  out=$$(node harness/lib/resolve-range.mjs $(D) beat "$(BEAT)") || exit 1; \
	elif [ -n "$(JOIN)" ]; then \
	  out=$$(node harness/lib/resolve-range.mjs $(D) join "$(JOIN)") || exit 1; \
	else \
	  out="$(FROM) $(TO)"; \
	fi; \
	set -- $$out; f="$$1"; t="$$2"; \
	if [ -z "$$f" ] || [ -z "$$t" ]; then echo "✗ pass BEAT=, JOIN=, or FROM= and TO="; exit 1; fi; \
	echo "▶ [dev-range] $$f s .. $$t s"; \
	t0=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	bash -c "set -o pipefail; . harness/dev/chrome-pin.sh dev && harness/dev/render-lock.sh '$(D)' ./bin/vawe $(D) --draft --from $$f --to $$t $(if $(WORKERS),--workers $(WORKERS),--workers 4) 2>&1 | tee /tmp/.vawe-render-$(notdir $(basename $(D))).log"; \
	t1=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	node harness/lib/record-render.mjs dev-range $(D) /tmp/.vawe-render-$(notdir $(basename $(D))).log $$((t1-t0)) 2>/dev/null || true
	@o=$$(ls -t out/$$(basename $(D) .json).range-*.mp4 2>/dev/null | head -1); echo "  → $$o"; if [ -t 1 ] && [ -z "$$CI$$VAWE_NO_OPEN" ]; then open "$$o" 2>/dev/null || true; fi

# make demo Q="what this shows" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]: scaffold a SPECIMEN scene
# and run the dev loop on it. A demo written from a blank file comes out a contact sheet every time (27
# of the 35 `_*.json` scratch scenes are one), so the archetype arrives with the file: a PICTURE full
# bleed carrying the effect, a line of type captioning it, two grounds, one cut, one camera move, a
# hand-keyed track. An effect acts on a subject, so the subject is pictorial: SUBJECT swaps in your own
# capture or image. Nine variants of one effect is `make catalog`. The scaffold prints the path it
# wrote on stdout and its notes on stderr.
# make demo: `make dev-tool X=demo Q="what this shows" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]`.

# make ideate REF=<ref>: the film in plain words, act by act, from a studied reference
# (grammar/<ref>.json → grammar/<ref>.prompt.md; refuses with the exact `make study` command if the
# study is missing). make ideate NAME=<film> IDEA="...": the same shape from an idea, acts left
# `<fill:>` (films/scene/<film>.prompt.md); add REF= alongside NAME= to copy a reference's act/joint
# structure with the content left to fill. engine-doctrine/CRAFT/IDEATE.md.
ideate: ## [preflight] THE FILM, IN PLAIN WORDS, before any JSON: one prompt an owner reads and edits (REF=, or NAME= IDEA= [REF=]; ASK=1 asks the detail brief, ANSWERS=<file.json> applies it)
	node harness/author/ideate.mjs $(if $(REF),--ref $(REF)) $(if $(NAME),--name $(NAME)) $(if $(IDEA),--idea "$(IDEA)") $(if $(ASK),--ask) $(if $(ANSWERS),--answers $(ANSWERS))

# THE LOCK-STEP-BEFORE-FAN-OUT CHAIN, for per-scene HTML agents (engine-doctrine/CRAFT/PER-SCENE-FANOUT.md):
#   make stagekit D=<film>   the shared CSS block every fragment carries verbatim (fragments are @scope-isolated, cannot share a stylesheet)
#   make contract D=<film>   validate the storyboard's continuous-object handoff chains before any fan-out spends a token
#   make scenes   D=<film>   PRINT one agent brief per scene (kit + contract + copy + anti-slop + verify cmd); launches nothing
#   make assemble D=<film>   write the scene JSON from the storyboard + the fragments once they exist
# stagekit, design-spec, contract, scenes: `make dev-tool X=<name> D=<film>` (same lock-step-before-fan-out chain).
assemble: ## [preflight] write the scene JSON from the storyboard's contract + the scene fragments already on disk (D=<film>)
	node harness/author/assemble.mjs $(D)

# make pitch: `make dev-tool X=pitch NAME=<name> [CHOSE= LEFT=]`. DIVERGE before the storyboard.

# make check D=<file>: every gate, every finding, ZERO consequence. Same information `make ship`
# blocks on, printed while you are still exploring. Use it to see where a film stands without stopping.
# W11: preflight used to be a step an author had to remember to run FIRST; it is now the hidden
# prerequisite this runs for you when the receipt is missing or stale (harness/lib/ensure-preflight.mjs),
# the same move `make dev` already made for contact sheets.
# FIX 2/8: author-check -> the page audit (no render needed) -> generated-check (read-only) -> ONE
# summary block, via harness/lib/check-report.mjs. `make ship` still runs its own author-check/audit;
# this only runs the same commands earlier, before a render is paid for.
#
# make check GATE=<name>: the OTHER thing this word meant. 35 quality gates each had their own
# one-line Makefile target (arsenal-check, schema-check, coverage, ...), a straight passthrough to one
# quality/gates/*.mjs script; harness/lib/check-gate.mjs is now the one table that answers "what is
# GATE=", so a new gate joins one file instead of the Makefile too. D= still means the film check
# above; GATE= is the single-gate door, and the two never collide because a bare `make check` with
# neither runs the film check with D= empty (the census/no-film path each gate already handles).
check: ## [check] every gate, every finding, ZERO consequence (D=<film>, or GATE=<name> for one gate)
	@if [ -n "$(GATE)" ]; then \
	  node harness/lib/check-gate.mjs "$(GATE)"; \
	else \
	  $(if $(D),node harness/lib/ensure-preflight.mjs $(D);,) \
	  node harness/lib/check-report.mjs $(D) $(if $(filter 1,$(TASTE)),--taste); \
	  node harness/author/arsenal.mjs --for $(D) 2>/dev/null || true; \
	fi

# make regen: write every generated file in one command (FIX 8). `make check` above only REPORTS drift
# (generated-check with no --write); this is the write half, so the fix for reported drift is one
# command: schema-write, generated-check --write, rules-build, and (D=<film> only) a byte-identical
# kit re-paste into that film's fragments, verified with kitCheck.
regen: ## [maintenance] write every generated file: schema-write + generated-check --write + rules-build + kit re-paste (D=<film> for the last)
	@node harness/lib/regen.mjs $(D)

# make dev-tool X=<name> [D=/N=/SB=/URL=/...]: one-off dev/maintenance tools that used to each carry
# their own Makefile target with no `make <name>` caller anywhere in the repo (checked: Makefile,
# .githooks, .github, docs, skills, harness, tests, site, package.json). harness/lib/dev-tool.mjs is
# the one lookup table; X= with no match lists the known names and exits 2, same contract as GATE=.
dev-tool: ## [maintenance] one-off dev/maintenance tools with no direct caller, routed by name (X=<name>; bare X lists them)
	@node harness/lib/dev-tool.mjs "$(X)"

gen: ## [engine] the engine's asset/doc bakers, routed by name (X=<name>; bare X lists them)
	@node harness/lib/gen-tool.mjs "$(X)"

site: ## [site] what vawe.dev publishes, routed by name (X=<name>; bare X lists them)
	@node harness/lib/site-tool.mjs "$(X)"

study-tool: ## [study] reference-material tools read less than make study/sections/ref, routed by name (X=<name>; bare X lists them)
	@node harness/lib/study-tool.mjs "$(X)"

media: ## [dev] capture, generation and audio/video processing tools, routed by name (X=<name>; bare X lists them)
	@node harness/lib/media-tool.mjs "$(X)"

# make ship D=<file>. The ladder with its teeth in: full author-check, render, audit, seams.
# `make video` is the same render with the ladder in front of it; `ship` adds the post-render gates that
# need real pixels, so it is the one command that says a film is actually done.
# LAST STEP: `ledger.mjs judged $(D)` (single-film mode), after the render and the sheets exist, so the eye
# has a fresh mp4 and a fresh sheet to look at. It refuses a ship with no fresh judge receipt for THIS
# render (`quality/baselines/approved/judge/<name>.json`, receipt.mjs's renderHash) and prints the exact
# `make judge D=<file>` line plus which condition failed. There is no flag to skip it: the way out is
# the missing artefact, never a flag (AGENTS.md). A FIX verdict still ships; this only asks whether the
# eye ran (121 rendered films had no receipt against 1 that did, so opt-in lost 121 times out of 122).
# `make dev` and `make check` stay completely ungated, this check lives ONLY here.
# It finishes with both contact sheets (`make sheets`); NOSHEETS=1 skips them. Producing them is not the
# same as reading them: the receipt is marked `auto` and beat-check still asks you to open the sheet.
# THE MOTION SPLIT RUNS HERE, right after the render, because the render is what prints the
# number it corrects. `./bin/vawe` reports one motion figure and that figure is a property of
# the FRAME, so a moving backdrop flatters it exactly as much as moving content does: one film
# measured 2% still on `aurora` and 75% still on a static ground with NOT ONE LAYER CHANGED.
# The tool that separates the two has existed for a while and nothing ran it, which is the same
# shape as the catalogue check that sat red for hours because it only fired when a human typed
# the command. A check nobody runs reports at a time of the author's choosing.
# It costs a second capture pass, so NOSPLIT=1 skips it the way NOSHEETS=1 skips the sheets.
# W11: preflight runs first if its receipt is missing or stale (see `check` above). The AUDIT now
# checks EVERY canvas by default (`quality/audit.mjs --aspect all` samples all five without a separate
# render per canvas; the RENDER still ships at the scene's own aspect unless ASPECT= names one, since
# `./bin/vawe --aspect` renders one mp4 PER listed ratio and does not understand "all" itself). The
# seam check is the same `quality/gates/seams.mjs` `make seam-check` calls, no longer a step to
# remember: flash, empty stage, ghost, resurrection and split seam, all in one pass.
ship: build ## [ship] preflight (if needed) -> author-check -> render -> audit ASPECT=all -> seams -> forensics
	@$(if $(D),node harness/lib/ensure-preflight.mjs $(D),)
	RUNLOG_CMD=ship node harness/lib/run-author-check.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(filter 1,$(TASTE)),--taste) $(if $(filter 1,$(STRICT)),--strict)
	t0=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	bash -c 'set -o pipefail; . harness/dev/chrome-pin.sh ship && harness/dev/render-lock.sh "$(D)" ./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT)) 2>&1 | tee /tmp/.vawe-render-$(notdir $(basename $(D))).log'; \
	t1=$$(node -e 'process.stdout.write(String(Date.now()))'); \
	node harness/lib/record-render.mjs ship $(D) /tmp/.vawe-render-$(notdir $(basename $(D))).log $$((t1-t0)) 2>/dev/null || true
	@node quality/gates/render-verify.mjs $(D)
	@$(if $(NOSPLIT),echo "  · motion split skipped (NOSPLIT=1)",node quality/gates/motion-split.mjs $(D))
	# AUDIT WHAT WE RENDERED, not every canvas that exists. This said `all`, so a film declaring
	# `aspect: "16:9"` shipped ONE mp4 and was then graded on four canvases, failing on crops it never
	# promised and never produced. quality/audit.mjs's own header calls that out: "Auditing one aspect
	# while the CLI ships four is a gate that agrees with itself and not with the output. Default stays
	# the scene's own aspect, so a single-aspect scene costs nothing." The same sentence forbids the
	# reverse, which is what this line was doing. Pass ASPECT= to render AND audit several; the two
	# now always agree, because both read the same variable.
	node quality/audit.mjs $(D) $(if $(ASPECT),--aspect $(ASPECT),)
	@node quality/gates/seams.mjs $(D) $(if $(JSON),--json,)
	@node quality/gates/audio-render-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node harness/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))
	@node quality/gates/ledger.mjs judged $(D)

# make list / make help: every target, grouped by the ten-phase spine, with its one-line help. Reads
# the Makefile itself (harness/lib/make-help.mjs), so it cannot drift from the real target list the
# way a hand-kept catalog would. `make test` fails if any target carries no phase.
.PHONY: list help
list: ## [maintenance] every target, grouped by phase, with its one-line help (the front page)
	@node harness/lib/make-help.mjs
help: ## [maintenance] the fast path only: ~12 commands from brief to rendered film (make list: everything)
	@node harness/lib/make-help.mjs --fast

# make render M=scene: render a format's bundled sample.json
render: build ## [ship] render a format's bundled sample.json
	$(eval M := $(if $(M),$(M),scene))
	. harness/dev/chrome-pin.sh render && harness/dev/render-lock.sh "render-$(M)" ./bin/vawe --module $(M) --data films/$(M)/sample.json --out out/$(M).mp4

# make all: every format via the render queue
all: build ## [ship] every format via the render queue
	. harness/dev/chrome-pin.sh all && harness/dev/render-lock.sh all ./bin/vawe --all

# make look D=<file.json>: storyboard (key frames) for visual review, of the film at D.
# make frame D=<file.json> N=560: one exact frame of the film at D.
# make frame D=<file.json> N=b3: JUMP TO BEAT 3, no frame arithmetic. N=b<k> resolves to the start of
# the kth beat via shotWindows (core/timeline/junctions.js), the same cut/seam joints the engine itself
# cuts the film on. This is Manim's `-n <k>`, named by an outside survey as the single best iteration
# ergonomic across every HTML/animation-to-video tool it looked at.
# There is one module, scene, so these no longer take M=<module> the way `make render` does: that read
# as "name your film here" by analogy with every D=-taking target, and `make look M=<film>` failed with
# preview.mjs's raw usage blob, naming neither the mistake nor the fix. D omitted previews the module's
# sample.json (a deliberate default, not an error); D pointing at a file that does not exist is loud;
# M set here (the old, wrong habit) is now loud too instead of being silently ignored.
look: ## [dev] storyboard (key frames) for visual review, of the film at D. T=<s>|BEAT=<n>: one still, no full sheet. LOOKS=1: one styleframe per beat at its hold, for the look review before any motion work.
	@test -z "$(M)" || { echo "make look takes D=<file.json>, not M= (M was the module, always \"scene\"). Use: make look D=$(M)"; exit 1; }
	@test -n "$(D)" || echo "  · no D=<file.json> given, previewing films/scene/sample.json"
ifneq ($(strip $(T)),)
	node harness/author/preview.mjs scene $$(node -e "console.log(Math.round($(T)*30))") $(if $(D),--data $(D))
else ifneq ($(strip $(BEAT)),)
	node harness/author/preview.mjs scene b$(BEAT) $(if $(D),--data $(D))
else ifneq ($(strip $(LOOKS)),)
	node harness/author/preview.mjs scene looks $(if $(D),--data $(D))
else
	node harness/author/preview.mjs scene "" $(if $(D),--data $(D))
endif

# make frame: one exact frame of the film, `make dev-tool X=frame D=<file.json> N=<n or b<beat>>`.

# make ref URL=<pin or video url> [NAME=x]: fetch a reference film and study it in one step. The file
# lands in refs/ (gitignored); the committed artefact is grammar/<name>.json.
ref: ## [study] fetch a reference film and study it in one step.
	node harness/media/ref.mjs $(URL) $(if $(NAME),--name $(NAME))

# make assets, audit-test, gate-test, watermark, transition-preview: `make media X=assets D=…` /
# `make dev-tool X=audit-test` / `make dev-tool X=gate-test` / `make media X=watermark` /
# `make media X=transition-preview`.

# make test: the whole test suite. Every *.test.mjs under tests/, organised by domain (engine,
# timeline, motion, layers, type, registry, theme, validate, hooks, authoring, gates, lints, ...),
# run through node's own test runner, plus the Go renderer's own package tests.
test: ## [maintenance] the whole test suite: tests/**/*.test.mjs (node --test) + renderer's go test
	node --test "tests/**/*.test.mjs"
	cd renderer && go test ./...

sections: ## [study] capture a website's real sections into assets/brands/<brand>
	node scripts/brand/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make kit URL=https://site.com NAME=brand: ONE command for `sections` + `palette` + a fetched favicon,
# written to assets/brands/<brand>/kit.json. Runs the same steps you'd otherwise chain by hand; author
# themes/<brand>.json from the manifest, then confirm with `make beats VS=<brand>`.
# INIT=1 additionally runs `make doctor` first and writes films/scene/<brand>.brief.md, so a fresh film
# goes from nothing to "answer the quiz next" in one command (AGENTS.md stage 1: brief).
kit: ## [study] sections + palette + favicon in one command → assets/brands/<brand>/kit.json (INIT=1: also doctor + brief skeleton)
	node scripts/brand/kit.mjs $(URL) $(NAME) $(if $(INIT),--init)

# make study VIDEO=refs/ref.mp4 [NAME=… THRESH=0.3]: the film-side twin of `make sections`. Reads a
# REFERENCE video: shot boundaries (ffmpeg scene score), a contact sheet (in/mid/out per shot) and a
# study.md whose four judgement columns you fill by eye. Writes refs/<name>/ (gitignored: study the
# grammar, never ship the frames). engine-doctrine/CRAFT/REFERENCE-STUDY.md
#
# make study REF=<reference.mp4> D=<film.json> MATCH=1: instead measures a RECREATION against the
# reference it was built to match, beat by beat (storyboard beats, or scene cuts detected in the
# reference). Writes out/match/<film>/: a dense strip per beat (reference row over render row), a
# difference overlay, a mean SSIM, and a match.md ranking beats worst-to-best. STEP=<seconds> sets the
# sample rate (default 0.1). engine-doctrine/CRAFT/RECREATION.md
study: ## [study] the film-side twin of `make sections`. MATCH=1 REF=<video> D=<film.json> instead scores a recreation against its reference, beat by beat.
	@if [ -n "$(MATCH)" ]; then \
	  node harness/media/match.mjs $(REF) $(D) $(if $(STEP),--step $(STEP)); \
	else \
	  node harness/media/study.mjs $(VIDEO) $(NAME) $(if $(THRESH),--threshold $(THRESH)) $(if $(STRIPS),--strips $(STRIPS)) $(if $(STRIPFPS),--strip-fps $(STRIPFPS)); \
	fi

# make preview HTML=path/frag.html [THEME=linear] [BG=#hex] [W=1400] [SERVE=1], render a single
# hand-written fragment (or a captured component JSON) STANDALONE on the theme bg → /tmp/preview.png.
# SERVE=1 keeps it LIVE in your browser instead (real fonts/assets). "is this HTML doing what I want?".
preview: ## [dev] render a single hand-written fragment (or a captured component JSON) STANDALONE on the theme bg →
	node harness/author/preview-fragment.mjs $(HTML) $(if $(THEME),--theme $(THEME)) $(if $(BG),--bg $(BG)) $(if $(W),--w $(W)) $(if $(SERVE),--serve) $(if $(D),--film $(D))

# screen, cutout, waivers, preflight, draft, treatment, concept, concept-pick, beats, sheet, tts,
# script, animatic, panels, styleframes, quiz-apply, quiz-look, storyboard-decide-ratchet,
# storyboard-draft, intent: `make dev-tool X=<name>` (media ones: cutout, sheet, tts through
# `make media X=<name>`).

stage: ## [preflight] WHERE IS THIS FILM: the stage it is in and the ONE next command (D=<film>, or no D= for the roster, or Q="…" before a film exists)
	@node quality/gates/stage.mjs $(D) $(if $(Q),--q "$(Q)") $(if $(JSON),--json,)

next: ## [preflight] RUN the one command the stage names, then stop (D=<film>)
	@node quality/gates/next.mjs $(D)

# `make legacy` (the ratchet census/adopt/stamp) is RETIRED. quality/gates/legacy-manifest.json and the
# author-check.mjs ratchet engine that read it are gone: quality/gates/legacy-fold.mjs folded every row
# into an explicit per-scene `authoring.allow` + `_why`, so `authoring.allow` is the one excuse mechanism
# left. See engine-doctrine/TASTE.md "Waivers, not legacy" and AGENTS.md "Waivers, legacy, and the difference".

# make quiz [NAME=<brand>] [URL=<url>]: THE BRIEF, before anything is authored. Prints an
# AskUserQuestion payload built from the brand's own sections + the DIRECTIONS/PROFILES registries, so the
# options are the site's real words and the engine's real vocabulary. Refuses to ask genericly when a URL
# is known and no site study exists (a generic question wastes the answer). Never names an effect.
quiz: ## [preflight] THE BRIEF, before anything is authored.
	node harness/author/quiz.mjs --ask $(if $(NAME),--name $(NAME)) $(if $(URL),--url $(URL)) $(if $(SLUG),--slug $(SLUG))

# make storyboard-check SB=path/to/STORYBOARD.md. The storyboard-as-PROPOSAL gate: a one-sentence
# message + audience/arc/format/duration, and per beat a type + on-screen cues + a WHY. Enforces that the
# decisions that make a video good were made and written down BEFORE the JSON. Template: engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md
storyboard-check: ## [preflight] The storyboard-as-PROPOSAL gate: a one-sentence message + audience/arc/format/duration, and per
	@node quality/gates/storyboard-check.mjs $(SB) $(if $(JSON),--json,)

# make studio D=films/scene/<file>.json [PORT=8799]: LIVE scrubbable preview (no mp4 render). Serves
# the scene in a browser with a frame slider + play; scrub/step to iterate, edit the JSON + reload. Under
# it, a TIMELINE: a bar per layer against a seconds/frames ruler, cuts/seams/stings marked, enter/exit
# ramps shaded off the settled middle, and every dead-air hole (beat-check) painted as a hazard band.
# Drag the timeline to seek. Dev tooling only (drives the engine's own renderFrame(n)); Ctrl-C to stop.
# EDITING, not just viewing: turn on `key` mode, click a layer's bar, scrub to a frame, drag it on the
# stage. That writes a motion keyframe into the scene at that frame, surgically, the file's hand
# formatting survives and a save that changes nothing is a zero-byte diff (harness/author/patch-motion.mjs).
# `undo` walks back through the session. engine-doctrine/CRAFT/KEYED-MOTION.md is what you are authoring toward.
studio: ## [dev] LIVE scrubbable preview (no mp4 render). Its `plan` state shows the storyboard with every beat's real fragment live in it.
	node studio/server.mjs $(D)

# make tune D=films/scene/<file>.json ID=<layer id>[,<id>...] [PORT=8801]: LIVE per-layer motion tuning.
# Opens the frame range around that layer with a control per motion-key property (and per `vars`
# channel), each one re-seeking the frame instantly, no reload. "copy JSON patch" copies the tuned
# layer's JSON; "write to file" shows a real diff and only writes on a second, confirmed click.
tune: ## [dev] LIVE per-layer motion tuning: sliders generated from one layer's own motion/vars (D=<file> ID=<layer id>[,<id>])
	node harness/author/tune-server.mjs $(D) $(ID)

# captions, ledger, ledger-add, photos, capture-scene, gen-image, gen-clip, gen-video, capture:
# `make media X=<name>`. worktrees, worktree-status: `make dev-tool X=<name>`.

# make engine-sync [CHECK=1]: publish the engine into site/public, which is what the site's
# in-browser engine actually boots. Runs automatically on the site's prebuild; this target is for
# running it (or checking it) without a site build. CHECK=1 only reports.

# make docker-check: will the image carry what the Dockerfile copies? Reads the COPY lines and
# applies .dockerignore. A mismatch here is invisible locally and fails the deploy.

.PHONY: bench-fast
# make bench-fast, TWO DETERMINISTIC RATCHETS on the speed of authoring a video, modelled on claude.dev's
# "how we made claude.ai 3x faster": a proxy that cannot be noisy stands in for the real, noisy number,
# and CI fails the moment it gets worse. read-load is how many words (CLAUDE.md + AGENTS.md + the
# skills `make stage` routes for stages 1-5) an agent must load before it can write its first layer.
# fast-path is how many commands stand between a brief and the first draft render, plus the Makefile's
# own target count. Both are pure file reads, so nothing here is noisy: STAMP=1 lowers the ceiling
# when either number shrinks; see quality/gates/coverage.mjs for the house pattern this reuses.
bench-fast: ## [maintenance] ratchet: read-load word/token count + fast-path command/Makefile-target count, gated
	@node harness/dev/bench.mjs fast $(if $(filter 1,$(STAMP)),--stamp) $(if $(filter 1,$(JSON)),--json)

# critics, plan-judge (AGENTS.md stage 2, engine-doctrine/CRAFT/SUBAGENTS.md): `make dev-tool
# X=critics D=<file> [VS= DECIDERS=1 RECORD=]` / `make dev-tool X=plan-judge D=<file> [RECORD= SHOW=1]`.

# make probe-frame D=films/scene/x.json T=12.9 ID=card-a,card-b: where is layer X at time T, and what
# covers it. T is film time as the VIEWER sees it (post-tempo); see harness/dev/probe-frame.mjs for the
# page-time conversion.
probe-frame: ## [dev] where is layer ID at time T (post-tempo seconds), and what covers it
	@node harness/dev/probe-frame.mjs $(D) --t $(T) --id $(ID) $(if $(JSON),--json,)

# make install-hooks: activate the version-controlled git hooks (pre-push runs the framework gates)
install-hooks: ## [maintenance] activate the version-controlled git hooks (pre-push runs the framework gates)
	git config core.hooksPath .githooks
	git config merge.vawe-generated.driver 'harness/dev/merge-generated.sh %O %A %B %P'
	@echo "✓ git hooks active (.githooks):"
	@echo "    commit-msg  refuses an assistant attribution trailer as it is written"
	@echo "    pre-push    push-guard (attribution + force-added ignored files) then the framework gates"
	@echo "    post-merge  regenerates a generated file .gitattributes marked merge=vawe-generated"
	@echo "✓ merge.vawe-generated.driver registered (.gitattributes marks the owned paths)"

# clean, author-check: `make dev-tool X=clean` / `make dev-tool X=author-check D=<file>`.

# make arsenal Q="a page scrolling under a tilt", THE ONE DISCOVERY FRONT DOOR (W11): ranked search
# across every vocabulary the engine names, plus every question a separate `make <x>` used to answer
# ("what may I write here", "emit a track", "what did we already get wrong"). It owns no list itself;
# `defineRegistry` already carries each name's kind, slot and blurb, and every folded flag below
# dispatches straight to the script that used to be its own target - a thin front door, not a fourth
# copy of the answer: AT= (`make schema`), SHAPE= (`make track`), PRESETS=1 (`make preset-sheets`),
# MISTAKES=1 (`make mistakes`), THEME= (`make theme-sheet`).
arsenal: ## [site] the ONE discovery command: Q= search, AT= what's legal, SHAPE= a track, MISTAKES=1/PRESETS=1/THEME= the rest, CENSUS=1/NEW=1
	node harness/author/arsenal.mjs "$(Q)" $(if $(KIND),--kind "$(KIND)") $(if $(N),--n $(N)) \
	  $(if $(filter 1,$(CENSUS)),--census) $(if $(filter 1,$(NEW)),--new) \
	  $(if $(AT),--at '$(AT)') $(if $(THEME),--theme=$(THEME)) $(if $(ONLY),--only=$(ONLY)) \
	  $(if $(filter 1,$(PRESETS)),--presets) $(if $(filter 1,$(MISTAKES)),--mistakes) \
	  $(if $(SHAPE),--shape $(SHAPE)) $(if $(TO),--to $(TO)) $(if $(DUR),--dur $(DUR)) \
	  $(if $(FROM),--from $(FROM)) $(if $(AMP),--amp $(AMP)) $(if $(AXIS),--axis $(AXIS)) \
	  $(if $(OFFSET),--offset $(OFFSET)) $(if $(D),--scene $(D)) $(if $(LAYER),--layer $(LAYER))

# make e2e: THE E2E SUITE (AGENTS.md, "Testing: end to end first"). Runs probe, snap-all, snap-blocks,
# mcp-smoke, the site's real-browser test and author-check, in that order, continuing past a failure so
# one run reports on all six. Leaves quality/runs/e2e/<timestamp>/report.json + report.md, and
# quality/runs/e2e/latest.json. Known-broken tracked scenes are excused by name (quality/baselines/
# e2e-known-broken.json), never by widening what counts as a pass; see harness/dev/e2e.mjs.
e2e: ## [check] THE E2E SUITE: probe + snap-all + snap-blocks + mcp-smoke + site test + author-check, one report
	node harness/dev/e2e.mjs

# effects-json: `make site X=effects-json [CHECK=1]`. The site's copy of the same arsenal:
# site/lib/effects.json plus one playable scene per previewable effect. Same family list as
# engine-doctrine/EFFECTS.md, imported not restated.

# make effect-posters [ONLY=family-or-name]  · one mid-motion still per previewable effect, shot from
# the real scenes effects-json just wrote. Run it after `make site X=effects-json` changes which
# effects are previewable, or to re-shoot one family (ONLY=backgrounds) after tuning its poster frame.

# no-judge, compare, expand, house-style, direct, scrub: `make dev-tool X=<name>`.

judge: ## [judge] vision gate: prep key frames + rubric for the agent to score (D=<file> [VS=<brand>] [STRUCT=1] [RUNS=A,B] [VERDICT_JSON=<f> RUN=<id>] [COMPARE="a.json b.json"])
	@$(if $(COMPARE),node quality/gates/judge.mjs --compare $(COMPARE),node quality/gates/judge.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(JSON),--json,) $(if $(filter 1,$(STRUCT)),--struct) $(if $(RUNS),--runs $(RUNS)) $(if $(VERDICT_JSON),--verdict-json $(VERDICT_JSON) --run $(RUN)))

# ── Tier B: stateful simulation, baked offline ────────────────────────────────────────────────────
# renderFrame(n) is a pure function of n, so a simulation cannot run inside it: frame 412 exists only
# because 411 ran first. So it runs HERE instead, offline, in its own process, in frame order, as
# stateful as it likes, and emits a PNG sequence the scene plays back through the existing `clip`
# layer. Non-determinism is confined to bake time. Same shape as canvas-fx (baked once at boot) and
# `make media X=spectrum` (FFT baked to a per-frame table). Contract: generators/sim/sims/README.md.

# Bake a pack of REAL cut-out letter images into the sprite set the `ransom` layer composes from.
# Unzip your pack into assets/ransom-src/ (a folder per character is ideal), then run this once.

# Bake a gradient-background pack into a render-ready library (4K -> 1920, indexed).
# Royalty-free to use, NOT to redistribute: assets/gradients is gitignored. SRC=<zip|folder>

# filmstrip, reveal, cinematic: `make media X=filmstrip VIDEO=<file>` / `make dev-tool X=reveal
# D=<file>` / `make dev-tool X=cinematic D=<file>`.

