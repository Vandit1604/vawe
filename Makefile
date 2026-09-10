# Vawe: render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.
#
# Every target here is .PHONY (see below): nothing in this file is a build rule make can skip when
# nothing changed. This is a command catalogue with memorable names, not a dependency graph, and
# that is deliberate: see docs/MAKEFILE-AUDIT.md for why it stays a Makefile despite that.

# Every target whose name matches a real path MUST be listed here, or make sees the directory,
# calls the target up to date and never runs it. `blueprints/` shadowed `make blueprints` this way.
.PHONY: motion-floor motion-lab frame-check stage worktrees dev check ship script animatic panels beats sheets preview storyboard-check styleframes beatsync gradients ransom-sprites docker-context build video render all look frame verify audit blueprints audit-test probe snap snap-all motion lib-test validate palette brandspec lookbook sections study photos similar ledger ledger-add feature-audit captions review install-hooks assets list formats clean gen-image gen-clip gen-video sim sim-audit music music-pack gallery examples docs doc-index grammar mistakes mistakes-check claims study-verify recreate ref motion-split prop-probe studio core-node-boundary

# make fonts: download the free, openly-licensed faces into the gitignored assets/fonts/
# (no font binary is committed; a fresh clone self-heals). Sohne is paid → drop it in fonts/local/.
fonts: ## [engine] download the free, openly-licensed faces into the gitignored assets/fonts/ (no font binary is
	node generators/media/fonts.mjs

# make fonts-discover SEED=7 [COUNT=12] [CATEGORY=serif|sans-serif|display|monospace|handwriting] [JSON=1]:
# sample the live Google Fonts catalogue by popularity band and by recency, minus every family already
# named in themes/*.json and the training-data defaults (Inter, Poppins, Space Grotesk and the rest).
# Seeded and deterministic: the same seed returns the same faces, so a look stays reproducible.
# (Distinct from `make fonts`, which DOWNLOADS a fixed vendored set, and from `make font-audit`, which
# verifies those vendored faces painted. Neither can name a face you have not already used.)
fonts-discover: ## [engine] sample the live Google Fonts catalogue by popularity band and by recency, minus every family
	node harness/author/fonts-discover.mjs --seed $(SEED) $(if $(COUNT),--count $(COUNT)) $(if $(CATEGORY),--category $(CATEGORY)) $(if $(filter 1,$(JSON)),--json)

# make invent-look SB=<storyboard.md> [SEED=7] [COUNT=5] [PICK=n NAME=<theme>] [JSON=1]:
# AUTHOR a look instead of picking one. Reads the storyboard's brief, proposes 4 to 6 complete
# candidate looks that each tell a DIFFERENT story about that subject (palette named after the subject's
# world + a type pairing from `make fonts-discover` + a texture stance + one sentence), photographs each
# one through the engine's own applyTheme → /tmp/invent-look/<name>-sheet.png. READ the sheet, then
# PICK=<n> writes themes/<NAME>.json and vendors its faces.
# Every other look tool here reflects a real brand or selects an existing theme; this is the third move.
invent-look: ## [preflight] AUTHOR a look instead of picking one.
	node harness/author/invent-look.mjs $(SB) $(if $(SEED),--seed $(SEED)) $(if $(COUNT),--count $(COUNT)) $(if $(PICK),--pick $(PICK)) $(if $(NAME),--name $(NAME)) $(if $(FORCE),--force) $(if $(filter 1,$(JSON)),--json)

# make audio: bake every cue + music bed from PARAMETERS (core/audio/kit.mjs). No network, no
# licence, deterministic: same params -> same bytes. Replaces downloading a sample library.
audio: ## [engine] bake every cue + music bed from PARAMETERS (core/audio/kit.mjs).
	node generators/media/audio-bake.mjs

# make audio-bed D=<file> [WRITE=1]: resolve `audio.music:"auto"` to a concrete bed from the scene's
# profile (docs/CRAFT/SOUND.md via core/audio/select.js). Prints by default; WRITE bakes it in place,
# because the render binary has no JS pre-pass and would read "auto" as a filename → silence.
audio-bed: ## [dev] resolve `audio.music:"auto"` to a concrete bed from the scene's profile (docs/CRAFT/SOUND.md via
	node core/audio/select.js $(D) $(if $(filter 1,$(WRITE)),--write)

# make audio-check D=<file> [STRICT=1]. THE SOUND GATE: is this film's silence a decision or an
# omission? Blocks (STRICT=1) on a scene with no `audio` block, on `silent:true` with no `_why`, on an
# audio block that names nothing, and on a bed that resolves to no file. Warns on an unresolved "auto"
# and on a bed whose licence nobody has verified. `make audio-check` with no D prints the library census.
audio-check: ## [check] THE SOUND GATE: is this film's silence a decision or an omission?
	node quality/gates/audio-check.mjs $(if $(D),$(D),--all) $(if $(filter 1,$(STRICT)),--strict)

# make craft-check D=<file>. Did this film VISIT the CRAFT doctrine relevant to it? Computes a fixed
# feature set from the scene (short/long, hasImages, hasHtml, hasBoundaries, ...), finds every CRAFT doc
# whose `applies-when:` feature is true, and checks the storyboard sidecar's `craft:` map for a one-line
# answer to that doc's `confirm:` question. No plan-> `no-plan-for-craft`. A relevant doc with no answer
# -> `craft-unvisited`. Not wired into author-check yet.
craft-check: ## [check] Did this film VISIT the CRAFT doctrine relevant to it?
	node quality/gates/craft-checklist.mjs $(D)

# make vo-captions D=<file> [STYLE=weightShift] [WRITE=1]: turn a VO word-timing sidecar (audio.voWords)
# into timed karaoke captions. No TTS; reads the transcript only. Prints by default; WRITE → <file>.captioned.json.
# (Distinct from `make captions`, which times captions from a plain SCRIPT string, harness/author/captions.mjs.)
vo-captions: ## [dev] turn a VO word-timing sidecar (audio.voWords) into timed karaoke captions.
	node harness/media/vo-captions.mjs $(D) $(if $(STYLE),--style $(STYLE)) $(if $(filter 1,$(WRITE)),--write)

# make music GENRE=ambient N=0 NAME=launch: fetch a real soundtrack (Mixkit free stock music) into
#   NOTE: SFX are synthesized (`make audio`); this MUSIC fetcher is the only remaining download.
# the gitignored assets/music/ and record its provenance in credits.json. The MUSIC licence differs
# from the sfx one and is not machine-readable: confirm before commercial release.
music: ## [engine] fetch a real soundtrack (Mixkit free stock music) into NOTE: SFX are synthesized (`make audio`);
	node harness/media/music.mjs $(if $(ID),--id $(ID)) $(GENRE) $(N) $(NAME)

# make music-pack: fetch the curated real-loop pack (lofi/chill/beat) the engine ships as its
# default sound, replacing the synthesized drone beds. core/audio/select.js maps profiles onto these.
music-pack: ## [engine] fetch the curated real-loop pack (lofi/chill/beat) the engine ships as its default sound, replacing
	node harness/media/music.mjs --pack

# make gallery: build the hover-to-play example showcase (out/gallery/index.html) from the flagship
# registry (formats/scene/examples.json). Render the examples first (make video / beatsync).
gallery: ## [site] build the hover-to-play example showcase (out/gallery/index.html) from the flagship registry
	node scripts/site/examples-gallery.mjs

# make examples: rebuild the whole flagship showcase from committed sources (beatsync + render each,
# then the gallery). Reproducible fixtures. Run `make music-pack` first for the beat-synced ones.
examples: build ## [site] rebuild the whole flagship showcase from committed sources (beatsync + render each, then the gallery).
	node scripts/site/examples-build.mjs

# make beatmap MUSIC=assets/music/launch.wav: detect tempo + beat grid -> <name>.beats.json, so an
# edit can be built ON the music. Reports confidence; an ambient pad has no beat and it says so.
beatmap: ## [dev] detect tempo + beat grid -> <name>.beats.json, so an edit can be built ON the music.
	node harness/media/beatmap.mjs $(MUSIC)

# make beatsync D=formats/x/video.json MUSIC=assets/music/warm.wav [GRID=beat|downbeat] [SNAP=0.12]
# [LAYERS=1] [WRITE=1]: snap the scene's cuts and seams onto the track's beat grid so the edit lands
# ON the beat. The policy is core/beats/index.js's, not a second copy of it: same tolerance, same joints,
# stings never. Reports drift; WRITE writes <scene>.beatsync.json. Deterministic + idempotent.
# A film that wants this on EVERY render declares `"audio":{"beatSync":true}` and needs no derivative.
beatsync: ## [dev] snap the scene's cuts and seams onto the track's beat grid so the edit lands ON the beat.
	node harness/media/beatsync.mjs $(D) --music $(MUSIC) $(if $(GRID),--grid $(GRID)) $(if $(SNAP),--snap $(SNAP)) $(if $(filter 1,$(LAYERS)),--layers) $(if $(filter 1,$(WRITE)),--write)

# The sound library is SYNTHESIZED, not downloaded: `make audio` bakes every cue from the Cuelume
# voicings in core/audio/kit.mjs (noise + biquad + envelope, seeded, deterministic, no licence).
# harness/media/sfx.mjs (the old Mixkit fetcher) is kept for reference but is NOT wired to a target:
# a downloaded file named `click` turned out to be 19.6 seconds long and nothing noticed (MISTAKES #51).

# make sfx-check: is each sound effect the SHAPE its role claims? A 19.6s file named `click` is how
# a typed line came out sounding like a passing train (docs/MISTAKES.md #51).
# make spectrum MUSIC=assets/music/x.wav [FPS=30]: bake per-frame band energy beside a track, so
# layers can react to the music while renderFrame(n) stays a pure table lookup.
spectrum: ## [dev] bake per-frame band energy beside a track (MUSIC=<file> [FPS=30])
	node harness/media/spectrum.mjs $(MUSIC) $(if $(FPS),--fps $(FPS))

# make blocks-audit: do the block FACTORIES obey the copy rules the videos are held to? A block
# ships to every caller, so an invented number or a brand default in one reaches every video.
blocks-audit: ## [maintenance] do the block FACTORIES obey the copy rules the videos are held to?
	@node quality/gates/blocks-audit.mjs $(if $(JSON),--json,)

# make layer-props [D=<file>]: does the engine READ the props a layer sets? `make expand` does this
# for blocks; the primitive path had nothing, so {"type":"glow","r":620} was accepted and dropped.
# make dead-branch: a ternary whose arms are identical, i.e. a decision that decides nothing.
# deploySuccess shipped one next to an always-true condition and its cascade was unreachable; no
# RENDER gate can see that, because the output is valid, deterministic and wrong by omission.
dead-branch: ## [maintenance] a ternary whose arms are identical: a decision that decides nothing
	@node quality/gates/dead-branch.mjs $(if $(JSON),--json,)

# make doc-refs · every `make <target>` and every repo path the docs NAME must exist, and every
# Makefile recipe must run a script that exists. Docs are read as instructions: a wrong one is worse
# than a missing one, because an author types it and then distrusts the whole file. `craft-coverage`
# already resolves markdown links to .md files; nothing checked a command, a backticked source path,
# or a target whose script had been deleted under it.
doc-refs: ## [maintenance] every `make <target>` and every repo path the docs NAME must exist, and every Makefile recipe must
	@node quality/gates/doc-refs.mjs $(if $(JSON),--json,)

# make rung: which rules in CLAUDE.md and docs/CRAFT are enforced by something, and which are only prose?
# Every non-[eye] tag has to NAME its mechanism, and the named gate, hook, command or file:line has to
# exist. LIST=1 prints the [eye] worklist instead; STAMP=1 records today's [eye] count as the ceiling.
rung: ## [maintenance] which rules in CLAUDE.md and docs/CRAFT are enforced by something, and which are only prose?
	@node quality/gates/rung.mjs $(if $(filter 1,$(LIST)),--list) $(if $(filter 1,$(STAMP)),--stamp) $(if $(JSON),--json,)

# make docs-drift: ROADMAP/PRIMITIVES list shipped effects as missing, or quote a stale count. It decayed this way twice and
# routed two planning passes at work that already existed; its own closing warning says nothing
# checked it. Now something does.
docs-drift: ## [maintenance] ROADMAP/PRIMITIVES list shipped effects as missing, or quote a stale count.
	@node quality/gates/docs-drift.mjs $(if $(JSON),--json,)

# make theme-look-spread: does computedLook (core/registry/theme-contract.js) actually vary by theme,
# or has the derivation gone back to a constant? Counts distinct values per derived look key across all
# 44 themes and fails the key by name when it collapses toward one value (docs/CRAFT/THEME-LOOK.md).
theme-look-spread: ## [maintenance] does the computed theme look (scale/cuts/field) actually vary across themes, or has it gone constant?
	@node quality/gates/theme-look-spread.mjs $(if $(JSON),--json,)

layer-props: ## [check] does the engine READ the props a layer sets on a layer? (D=<file>)
	@node quality/gates/layer-props.mjs $(D) $(if $(JSON),--json,)

sfx-check: ## [check] is each sound effect the SHAPE its role claims? (docs/MISTAKES.md #51)
	@node quality/gates/sfx-audit.mjs $(if $(JSON),--json,)

# make canvas-purity [M=scene] [D=<file>]: do the shader/paint PIXELS depend only on n? `make probe`
# compares a DOM signature and structurally cannot see inside a canvas (docs/MISTAKES.md #64).
canvas-purity: ## [check] do the shader/paint PIXELS depend only on n?
	@node quality/gates/canvas-purity.mjs $(if $(M),$(M),scene) $(D) $(if $(JSON),--json,)

build: fonts ## [ship] compile bin/vawe from the Go source
	go build -o bin/vawe ./cmd/render

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
build-all: fonts ## [ship] cross-compile a render binary for every shipped platform
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
	@echo "" && echo "▶ REQUIRED before shipping: make judge D=$(D)$(if $(VS), VS=$(VS)), then read /tmp/judge/sheet.png vs the rubric (docs/JUDGE.md)."

# make dev D=<file>: THE ITERATION LOOP. Build, draft-render, open. No gates, no audit, no ladder.
# This exists because the fast path was already reachable (NOCHECK=1 NOAUDIT=1) and nobody would ever
# find it. Measured on a 15s film: the whole static ladder is ~1s against an 8.4s draft render, so the
# gates were never the cost: being interrupted mid-thought was. Iterate here; prove it with `make ship`.
# Then it writes both contact sheets (`make sheets`), because the two images an author MUST read were
# separate commands nobody remembered. Set NOSHEETS=1 to skip them: they cost roughly one more render.
dev: build ## [dev] THE ITERATION LOOP.
	@echo "▶ [dev] the iteration loop, no gates, no audit"
	. harness/dev/chrome-pin.sh dev && harness/dev/render-lock.sh "$(D)" ./bin/vawe $(D) --draft $(if $(WORKERS),--workers $(WORKERS),--workers 4)
	@o=out/$$(basename $(D) .json).mp4; echo "  → $$o"; open $$o 2>/dev/null || true
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node harness/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))
	@echo "" && echo "  next: make check D=$(D)  (every gate, zero consequence)  ·  make ship D=$(D)  (when it's ready)"
	@node harness/author/arsenal.mjs --for $(D) 2>/dev/null || true

# make demo Q="what this shows" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]: scaffold a SPECIMEN scene
# and run the dev loop on it. A demo written from a blank file comes out a contact sheet every time (27
# of the 35 `_*.json` scratch scenes are one), so the archetype arrives with the file: a PICTURE full
# bleed carrying the effect, a line of type captioning it, two grounds, one cut, one camera move, a
# hand-keyed track. An effect acts on a subject, so the subject is pictorial: SUBJECT swaps in your own
# capture or image. Nine variants of one effect is `make catalog`. The scaffold prints the path it
# wrote on stdout and its notes on stderr.
demo: ## [dev] scaffold a SPECIMEN demo scene (one subject, one shot) and iterate on it
	@f=$$(node harness/dev/demo.mjs --print-path --q "$(Q)" $(if $(NAME),--name "$(NAME)") $(if $(FX),--fx "$(FX)") $(if $(SUBJECT),--subject "$(SUBJECT)")) \
	  && $(MAKE) --no-print-directory dev D=$$f

# make scaffold OUT=formats/scene/<name>.json [DUR=13] [THEME=default] [BEATS=5]: THE DEFAULT START for
# a real film, not a demo. Writes a scene composed entirely from {type:"beat"} blueprints (directed by
# construction: it clears sparse-beats, plain-slideshow and no-transition/no-bg-motion on write) plus its
# `.storyboard.md` sidecar (structurally clean against storyboard-check and craft-checklist). The
# author's only job afterwards is to replace the `REPLACE:`/`<fill: ...>` markers. docs/CRAFT/BLUEPRINTS.md.
scaffold: ## [preflight] write a directed, gate-passing scene + storyboard skeleton to start a film from (OUT=, DUR=, THEME=, BEATS=, TYPE=launch|explainer|talking-head|sting|demo|recreation)
	node harness/author/scaffold.mjs $(if $(OUT),--out $(OUT)) $(if $(DUR),--dur $(DUR)) $(if $(THEME),--theme $(THEME)) $(if $(BEATS),--beats $(BEATS)) $(if $(TYPE),--type $(TYPE))

# THE LOCK-STEP-BEFORE-FAN-OUT CHAIN, for per-scene HTML agents (docs/CRAFT/PER-SCENE-FANOUT.md):
#   make stagekit D=<film>   the shared CSS block every fragment carries verbatim (fragments are @scope-isolated, cannot share a stylesheet)
#   make contract D=<film>   validate the storyboard's continuous-object handoff chains before any fan-out spends a token
#   make scenes   D=<film>   PRINT one agent brief per scene (kit + contract + copy + anti-slop + verify cmd); launches nothing
#   make assemble D=<film>   write the scene JSON from the storyboard + the fragments once they exist
stagekit: ## [preflight] the shared CSS block every per-scene HTML fragment carries verbatim, from the film's theme (D=<film>, --check verifies fragments)
	node harness/author/stagekit.mjs $(D) $(if $(CHECK),--check)

contract: ## [preflight] validate the storyboard's per-beat continuous-object contract chains edge to edge (D=<film>)
	node harness/author/contract.mjs $(D)

scenes: ## [preflight] PRINT one per-scene agent brief (kit, contract, copy, anti-slop, verify cmd); launches nothing (D=<film>)
	node harness/author/scenes.mjs $(D)

assemble: ## [preflight] write the scene JSON from the storyboard's contract + the scene fragments already on disk (D=<film>)
	node harness/author/assemble.mjs $(D)

# make pitch NAME=<name>: DIVERGE before the storyboard. Prints the pitch protocol (4 questions, 5 concepts
# on 5 forced axes, the anti-median 0.10 gate, the silhouette check) so the chosen angle is not the median a
# model would default to. Record the outcome: make pitch NAME=<name> CHOSE="<angle>" LEFT="<median left behind>"
# writes a receipt (quality/baselines/approved/pitch/<name>.json) and prints the storyboard `angle:` line. docs/CRAFT/PITCH.md.
pitch: ## [preflight] diverge to 5 concepts under the anti-median gate before authoring (NAME=, CHOSE=, LEFT=)
	node harness/author/pitch.mjs $(NAME) $(if $(CHOSE),--chose "$(CHOSE)") $(if $(LEFT),--left "$(LEFT)")

# make route Q="<what the user asked>": map a request to ONE vawe deliverable (launch-video / explainer /
# motion-graphic / recreation / demo) and print that route's intake questions + which blueprints and CRAFT
# docs to load. Read one small route file, not all of AGENTS.md. docs/CRAFT/ROUTING.md.
route: ## [preflight] map a request to a vawe deliverable + its intake (Q="...")
	node harness/author/route.mjs "$(Q)"

# make llms-txt: regenerate formats/llms.txt, the portable, drift-proof vocabulary primer (one rule + a
# when-to-use per layer type + the effect families + the hard rules + the loop), generated from the live
# registries so an agent can author a compliant scene from the full palette without loading the whole repo.
llms-txt: ## [engine] regenerate formats/llms.txt, the portable vocabulary primer
	node harness/author/llms-txt.mjs

# make check D=<file>: every gate, every finding, ZERO consequence. Same information `make ship`
# blocks on, printed while you are still exploring. Use it to see where a film stands without stopping.
# W11: preflight used to be a step an author had to remember to run FIRST; it is now the hidden
# prerequisite this runs for you when the receipt is missing or stale (harness/lib/ensure-preflight.mjs),
# the same move `make dev` already made for contact sheets.
check: ## [check] every gate, every finding, ZERO consequence (runs preflight first if it hasn't)
	@$(if $(D),node harness/lib/ensure-preflight.mjs $(D),)
	@MODE=iterate node quality/gates/author-check.mjs $(D) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS))
	@node harness/author/arsenal.mjs --for $(D) 2>/dev/null || true

# make ship D=<file>. The ladder with its teeth in: full author-check, render, audit, seams.
# `make video` is the same render with the ladder in front of it; `ship` adds the post-render gates that
# need real pixels, so it is the one command that says a film is actually done.
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
# seam check is the same `seam-snap.mjs` `make seam-check` calls, no longer a step to remember. The
# forensics pass runs right after: seam-check flags a luminance flash, forensics catches the three
# defects flat luminance can't see (a redraw, a lingering fade, a field that steps).
# make render-verify D=<file>: does out/<name>[.-*].mp4's REAL duration match the scene's declared
# duration? Catches a clobbered/truncated render (two renders racing one output path) that ffmpeg's
# own exit code does not see (`./bin/vawe` reports success either way). ship/video already run it.
render-verify: ## [check] does the rendered mp4's duration match what the scene declares? (D=<file>, render first)
	node quality/gates/render-verify.mjs $(D)

ship: build ## [ship] preflight (if needed) -> author-check -> render -> audit ASPECT=all -> seams -> forensics
	@$(if $(D),node harness/lib/ensure-preflight.mjs $(D),)
	node quality/gates/author-check.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(filter 1,$(TASTE)),--taste) $(if $(filter 1,$(STRICT)),--strict)
	. harness/dev/chrome-pin.sh ship && harness/dev/render-lock.sh "$(D)" ./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT))
	@node quality/gates/render-verify.mjs $(D)
	@$(if $(NOSPLIT),echo "  · motion split skipped (NOSPLIT=1)",node quality/gates/motion-split.mjs $(D))
	node quality/audit.mjs $(D) --aspect $(if $(ASPECT),$(ASPECT),all)
	@node quality/gates/seam-snap.mjs $(D) $(if $(JSON),--json,)
	@node quality/gates/seam-forensics.mjs $(D)
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node harness/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))
	@echo "" && echo "▶ LAST STEP, and no gate can do it: make judge D=$(D)$(if $(VS), VS=$(VS)), then READ the sheet."

# make formats: show the scene module + where its schema/sample live (for authoring the JSON).
# Was `make list`; W11 gave that name to the target listing below, the one question with seven
# separate commands used to answer, so it moved here rather than staying misnamed.
formats: build ## [maintenance] MOVED from `make list` (W11): the scene module + its schema/sample
	./bin/vawe --list

# make list / make help: every target, grouped by the ten-phase spine, with its one-line help. Reads
# the Makefile itself (harness/lib/make-help.mjs), so it cannot drift from the real target list the
# way a hand-kept catalog would. `make lib-test` fails if any target carries no phase.
.PHONY: list help
list: ## [maintenance] every target, grouped by phase, with its one-line help (the front page)
	@node harness/lib/make-help.mjs
help: list ## [maintenance] alias for `make list`

# make render M=scene: render a format's bundled sample.json
render: build ## [ship] render a format's bundled sample.json
	. harness/dev/chrome-pin.sh render && harness/dev/render-lock.sh "render-$(M)" ./bin/vawe --module $(M) --data formats/$(M)/sample.json --out out/$(M).mp4

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
look: ## [dev] storyboard (key frames) for visual review, of the film at D.
	@test -z "$(M)" || { echo "make look takes D=<file.json>, not M= (M was the module, always \"scene\"). Use: make look D=$(M)"; exit 1; }
	@test -n "$(D)" || echo "  · no D=<file.json> given, previewing formats/scene/sample.json"
	node harness/author/preview.mjs scene "" $(if $(D),--data $(D))

frame: ## [dev] one exact frame of the film at D (D=<file.json> N=<n> or N=b<beat>)
	@test -z "$(M)" || { echo "make frame takes D=<file.json>, not M= (M was the module, always \"scene\"). Use: make frame D=$(M) N=$(N)"; exit 1; }
	@test -n "$(D)" || echo "  · no D=<file.json> given, previewing formats/scene/sample.json"
	node harness/author/preview.mjs scene $(N) $(if $(D),--data $(D))

# make grammar [N=<name>]: what we have learned about how good films are BUILT, from the committed
# grammar/ store that `make study` writes. No argument prints every reference as one comparison table
# and names the ones nobody has read.
# DOC=1 regenerates docs/CRAFT/GRAMMAR.md, the cross-film page, from the same store.
grammar: ## [study] what we have learned about how good films are BUILT, from the committed grammar/ store that `make
	node harness/author/grammar.mjs $(if $(DOC),--doc,$(N))

# make mistakes [Q="…"] [N=496] [FULL=1]: ASK the mistake log. docs/MISTAKES.md is now a three-line
# index (title, lesson, what holds it) per entry; FULL=1 with N=<n> prints that entry's original
# write-up from the git commit taken just before the index migration.
mistakes: ## [study] MOVED into `make arsenal MISTAKES=1 Q=...` (W11); still works, one release
	@echo "  · make mistakes moved: use make arsenal MISTAKES=1 $(if $(Q),Q=\"$(Q)\")"
	node harness/author/mistakes.mjs $(if $(N),--n $(N),$(if $(Q),$(Q))) $(if $(FULL),--full,)

# make claims: check this repo's own doctrine against the films it claims to describe. Every
# quantitative claim in CRAFT/CLAUDE.md is a test over grammar/*.json; the verdict strengthens or
# reverses as references are studied.
claims: ## [study] check this repo's own doctrine against the films it claims to describe.
	node harness/author/claims.mjs

# make study-verify D=formats/scene/<scene>.json: prove `make study` measures correctly, by running it
# on a film whose answers the scene file already declares (duration, boundary times, backdrop runs).
study-verify: ## [check] prove `make study` measures correctly, by running it on a film whose answers the scene file already
	@node quality/gates/study-verify.mjs $(D) $(if $(NORENDER),--no-render) $(if $(JSON),--json,)

# make recreate NAME=<grammar> [THEME=vawe] [OUT=path]: a scene SKELETON from a studied reference.
# Emits only what was MEASURED (duration, boundary times, backdrop lightness, a motion target per beat).
# Every composition decision is left as a hole, on purpose: see the header for why.
recreate: ## [study] a scene SKELETON from a studied reference.
	node harness/author/recreate.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(OUT),--out $(OUT))

# make ref URL=<pin or video url> [NAME=x]: fetch a reference film and study it in one step. The file
# lands in refs/ (gitignored); the committed artefact is grammar/<name>.json.
ref: ## [study] fetch a reference film and study it in one step.
	node harness/media/ref.mjs $(URL) $(if $(NAME),--name $(NAME))

# make motion-split D=formats/scene/<scene>.json: how much of a film's measured motion is its GROUND
# and how much is its LAYERS. Two sampled renders in one browser, seconds not minutes.
motion-split: ## [check] how much of a film's measured motion is its GROUND and how much is its LAYERS.
	@node quality/gates/motion-split.mjs $(D) $(if $(JSON),--json,)

# make census: every named population in formats/scene, with the question each one answers.
# Quote a NAME in prose and print this to get the number (harness/lib/census.mjs owns the definitions).
census: ## [study] every named population in formats/scene, with the question each one answers.
	node harness/lib/census.mjs

# make assets D=formats/x/topic.json [WRITE=1], fill missing icons: country→flag, brand→logo,
# else a generated topic card. Dry-run without WRITE.
assets: ## [dev] fill missing icons: country→flag, brand→logo, else a generated topic card.
	node harness/media/assets.mjs $(D) $(if $(WRITE),--write)

# make verify: integrity + safe-zone + contact sheets (all formats)
verify: ## [check] integrity + safe-zone + contact sheets (all formats)
	node verify/run.js

# make audit [M=scene] [ASPECT=16:9,9:16|all], layout audit: overlap / overflow / safe-zone /
# tight-spacing on [data-layer=critical] across sampled frames. Annotated overlays →
# /tmp/audit/<format>[.<aspect>].png. ASPECT mirrors `bin/vawe --aspect`: audit every canvas you ship,
# because a scene can pass at its own ratio and overflow every other one.
audit: ## [check] layout audit: overlap / overflow / safe-zone / tight-spacing on [data-layer=critical] across sampled frames.
	node quality/audit.mjs $(if $(D),$(D),$(M)) $(if $(ASPECT),--aspect $(ASPECT))

# make audit-all [SCENE=<name-substring>] [ASPECT=16:9,9:16], the same layout audit, over the WHOLE
# library. `make audit` grades the one scene you have open, which is a check against NEW defects only:
# two scenes shipped dark-on-dark and stayed that way because nothing ever asked them again
# (docs/MISTAKES.md #387). Slow on purpose; an on-demand sweep, never part of the per-edit ladder.
audit-all: ## [check] the same layout audit, over the WHOLE library.
	@node quality/gates/audit-scenes.mjs $(SCENE) $(if $(ASPECT),--aspect $(ASPECT)) $(if $(JSON),--json,)

# make audit-test: regression on both edges of `make audit`. contrast-regression proves it still
# CATCHES invisible emphasis (blue-on-blue). measure-regression proves it measures the DRAWN ink and
# not the box the author declared, which is the error this repo logged four times (#214/#216/#217/#242).
audit-test: ## [maintenance] regression on both edges of `make audit`.
	node verify/contrast-regression.mjs
	node verify/measure-regression.mjs

# make snap M=<format> [SAVE=1], check a scene WITHOUT rendering video: capture/diff the per-frame
# DOM signature (bbox/transform/opacity/font/text). Baseline a refactor, then prove frames unchanged.
snap: ## [check] check a scene WITHOUT rendering video: capture/diff the per-frame DOM signature
	@node quality/gates/scene-snap.mjs $(M) $(if $(SAVE),--save) $(if $(JSON),--json,)

# make snap-all [SAVE=1] [SCENE=<name>]. The WHOLE-LIBRARY net: sweep every shipped scene, quarantine
# any that render order-dependently (non-deterministic), and baseline/diff the rest. Run before/after any
# engine-wide change (a refactor, a version bump) to prove all scenes are byte-identical or see what moved.
snap-all: ## [check] The WHOLE-LIBRARY net: sweep every shipped scene, quarantine any that render order-dependently
	@node quality/gates/snap-scenes.mjs $(SCENE) $(if $(SAVE),--save) $(if $(JSON),--json,)

# make snap-blocks [SAVE=1] [BLOCK=<name>]: the BLOCK library's regression net, and it is the half
# snap-all cannot reach: `block` sugar is baked into a film by `make expand`, so every shipped scene
# holds layers frozen as the factory was at authoring time and editing a factory moves snap-all zero
# bytes. This diffs the layer JSON each of the 179 catalog entries returns. No render, ~0.35s.
# NOT part of `make author-check`: author-check grades ONE scene, and a block belongs to no scene.
# Run it after touching anything under blocks/, the way snap-all is run after touching core/.
snap-blocks: ## [check] the BLOCK library's regression net, and it is the half snap-all cannot reach: `block` sugar is
	@node quality/gates/snap-blocks.mjs $(BLOCK) $(if $(SAVE),--save) $(if $(JSON),--json,)

# make motion [M=<format>] [D=<file.json>] [STRIDE=2], animation-over-time audit: renders every frame
# headless (no video) and asserts the motion contract (final frame holds, reveals monotonic, payoffs
# settle before the exit, counters sane, typing completes). The check `make snap`/`make audit` can't do.
# D forwards to --data; without it the target silently audited sample.json instead of your scene.
motion: ## [check] animation-over-time audit: renders every frame headless (no video) and asserts the motion contract
	@node quality/gates/motion-audit.mjs $(M) $(if $(D),--data $(D)) $(if $(STRIDE),--stride $(STRIDE)) $(if $(JSON),--json,)

# make motion-trace M=<format> D=<file.json> [STRIDE=N], per-layer velocity/area trace over time: when
# each layer moves vs holds, its peak position velocity and peak area-change (a scale pulse with no
# position velocity still shows here), when each peak lands, and whether the motion is monotonic or
# oscillating. An INSTRUMENT (no pass/fail), sampled not rendered whole, so it costs seconds. Read
# docs/CRAFT/MOTION-TRACE.md for what it can and cannot see.
motion-trace: ## [check] per-layer velocity/area-change trace over time: an agent's way to SEE motion without watching the video
	@node quality/gates/motion-audit.mjs $(M) --trace $(if $(D),--data $(D)) $(if $(STRIDE),--stride $(STRIDE)) $(if $(JSON),--json,)

# make conformance [enums|props|paths]: does the engine DO what it says it accepts? Applies every
# declared enum value and every layer prop, and asserts the OUTPUT CHANGED. Catches the dominant bug
# class in this repo (docs/MISTAKES.md #19-28): input accepted, then silently ignored or substituted.
conformance: ## [check] does the engine DO what it says it accepts?
	@node quality/gates/conformance.mjs $(P) $(if $(JSON),--json,)

# make gate-test, MUTATION-test the gates: feed each one a fixture built to trip it and assert it
# FIRES, plus fixtures that must PASS so a gate cannot buy sensitivity with false positives.
# A gate that cannot fail reports green forever (MISTAKES #26).
gate-test: ## [maintenance] MUTATION-test the gates: feed each one a fixture built to trip it and assert it FIRES, plus
	node quality/gates/gate-mutation.mjs

# make coverage-reel: generate + render a reel of whatever `make coverage` says nothing exercises,
# derived from the LIVE gap so it never goes stale. Watch it: the gates only prove it did not crash.
coverage-reel: ## [check] generate + render a reel of whatever `make coverage` says nothing exercises, derived from the LIVE
	node harness/author/coverage-reel.mjs
	$(MAKE) video D=formats/scene/_coverage-reel.json

# make watermark [TEXT="VAWE DRAFT"] [OPACITY=0.1]: bake the draft watermark sheet. Offline, once;
# the render only reads the finished PNG. Pass it with ./bin/vawe <scene> --watermark assets/watermark/draft.png
watermark: ## [ship] bake the draft watermark sheet.
	node generators/media/watermark.mjs

# make site-counts: every capability number written on the SITE, checked against the registry it
# describes. The copy claimed 96 blocks / 44 families / 22 presets / 32 stings long after the
# registries had moved (docs/MISTAKES.md #114). Hand-typed counts about a growing registry go stale
# by default; this is what notices.
site-counts: ## [maintenance] every capability number written on the SITE, checked against the registry it describes.
	@node quality/gates/site-counts.mjs $(if $(JSON),--json,)

# make knobs-audit [D=<file>], DRIFT GUARD: every dial core/registry/knobs.js advertises must actually change
# the render (a manifest that lies is worse than none). With D, also reports knobs set on a preset that
# ignores them (pointSize on extrudeText), turning a silent no-op into a message.
knobs-audit: ## [check] DRIFT GUARD: every dial core/registry/knobs.js advertises must actually change the render (a
	@node quality/gates/knobs-audit.mjs $(D) $(if $(JSON),--json,)

# make coverage, which engine vocabulary no authored scene exercises. Conformance proves a value
# works; this says whether anything USES it. WARN tier, always exits 0.
coverage: ## [check] which engine vocabulary no authored scene exercises.
	@node quality/gates/coverage.mjs $(if $(JSON),--json,)

# make craft-coverage, keep the docs honest: every look/sting in the engine is classified in
# SELECTION.md, no doc names a removed effect, cross-links resolve REPO-WIDE, no guide is orphaned from
# an index, every indexed doc carries its `when:`/`answers:` frontmatter, and every generated index view
# is current. FAIL tier (exits 1) so the docs can't silently rot. Also runs in .githooks/pre-push,
# because a doc-only commit never touches a render gate. Doc-map detail: quality/gates/doc-map.mjs.
craft-coverage: ## [maintenance] keep the docs honest: every look/sting in the engine is classified in SELECTION.md, no doc names a
	@node quality/gates/craft-coverage.mjs $(if $(JSON),--json,)

# make docs, PRINT THE DOC MAP: every written thing in this repo, one line each (reach for it when…,
# it answers…). Read the line, open only the doc you need. Same map as the `vawe-docs` skill.
docs: ## [site] PRINT THE DOC MAP: every written thing in this repo, one line each (reach for it when…, it answers…).
	@cat docs/INDEX.md

# make doc-index, regenerate every index view from the per-doc frontmatter: docs/INDEX.md, the
# `vawe-docs` skill, and the table inside docs/CRAFT/README.md. Run it after editing a doc's `when:` or
# `answers:`, or after adding a doc. The views are generated so they cannot drift from the docs.
doc-index: ## [site] regenerate every index view from the per-doc frontmatter: docs/INDEX.md, the `vawe-docs` skill, and
	@node quality/gates/doc-map.mjs --write $(if $(JSON),--json,)

# make transitions [BASIC=1], print THE TRANSITION DATABASE (core/transitions/catalog.js): every transition
# across all four mechanisms (anim/cut/sting/seam), grouped, basics marked. Decision theory: docs/CRAFT/TRANSITIONS.md.
transitions: ## [study] print THE TRANSITION DATABASE (core/transitions/catalog.js): every transition across all four
	@node quality/gates/transitions-catalog.mjs $(if $(JSON),--json,)

# make transition-preview FX=<name> [MECH=seam|cut|sting|anim] [DIR=left|right|up|down] [TIMING=smooth|linear] [DUR=0.7]
# SEE one transition before authoring: renders a canned two-beat scene (blue A → orange B) through the
# transition and lays the window out as a labelled filmstrip → /tmp/transition-preview.png. The labels are
# EASED progress, so `TIMING=linear` vs `smooth` shows as where the motion bunches. Mechanism is inferred
# from the name when unambiguous (default seam). Inventory: `make transitions`. Theory: docs/CRAFT/TRANSITIONS.md.
transition-preview: ## [dev] renders a canned two-beat scene (blue A → orange B) through the transition and lays the window out
	node harness/author/transition-preview.mjs

# make measure VIDEO=<file> FROM=<s> TO=<s> [EXPECT=<preset>], MEASURE a transition's real motion and
# name it in OUR vocabulary: per-frame tracks the moving element and fits the progress curve against the
# engine's own easings (core/motion/motion.js + core/cuts.js), reporting the nearest preset + residual. Point it
# at a reference video ("what transition is this?") or at our own render + EXPECT=<preset> ("did my cut
# render as the curve I authored?"). Dependency-free (ffmpeg + Node). Notes/limits: docs/CRAFT/MEASURE.md.
measure: ## [study] MEASURE a transition's real motion and name it in OUR vocabulary: per-frame tracks the moving
	node harness/author/measure-motion.mjs $(VIDEO) $(FROM) $(TO) $(EXPECT)

# make lib-test: fast pure-JS asserts for the core/motion/motion.js motion primitives (no browser),
# plus the W11 phase-coverage check: every Makefile target must carry a `## [phase]` tag, or `make
# list` silently drops it and nobody notices (harness/lib/make-help.mjs --check).
lib-test: ## [maintenance] motion-primitive asserts + every Makefile target carries a [phase] tag
	node quality/gates/lib-test.mjs
	@node harness/lib/make-help.mjs --check

# make mistakes-check: is a docs/MISTAKES.md entry a near-verbatim duplicate of an earlier one?
# A property only knowable across the whole library, so it is a gate, not a write-site fix (CLAUDE.md).
# Two verbatim duplicates and a restatement shipped because nobody rereads a 540-entry file before
# appending; this is the reread, automated. Exits non-zero on a hit.
mistakes-check: ## [maintenance] is a docs/MISTAKES.md entry a near-verbatim duplicate of an earlier one?
	@node quality/gates/mistakes-dupes.mjs $(if $(JSON),--json,)

# make silent-check: is any named vocabulary still resolved with a silent default? A wrong name must
# not become a plausible substitute; absence may keep its documented default. core/registry/registry.js removes
# the ability to BUILD such a fallback, this catches one written by hand. docs/MISTAKES.md #376.
silent-check: ## [maintenance] is any named vocabulary still resolved with a silent default?
	@node quality/gates/silent-fallback.mjs $(if $(JSON),--json,)

# make unused, which registered effects has no shipped scene ever named? A REPORT, not a rule: it
# always exits 0. Read a zero as "nobody can find it", "it does not work", or "something else does it
# better": three effects nobody used turned out to be broken. Do NOT treat the count as a target (#359).
unused: ## [maintenance] which registered effects has no shipped scene ever named?
	@node quality/gates/unused.mjs $(if $(JSON),--json,)

# make lookbook URL=https://site.com NAME=brand, screenshot the site (full page + viewports) for
# art direction study: derive the video's design language from the brand's own look, no canned styles.
lookbook: ## [study] screenshot the site (full page + viewports) for art direction study: derive the video's design
	node scripts/brand/lookbook.mjs $(URL) $(NAME)

# make palette IMG=assets/brands/<brand>/sections/01-*.png: EYEDROP the real hero pixels →
# dominant colours + LIGHT/DARK dominance (grounded, not a heuristic) + a swatch card to /tmp/palette.png.
# Author themes/<brand>.json from THIS, then verify the video with `make beats VS=<brand>`.
palette: ## [study] EYEDROP the real hero pixels → dominant colours + LIGHT/DARK dominance (grounded, not a heuristic)
	node scripts/brand/palette.mjs $(IMG)

# make brandspec URL=https://site.com, READ the site's real CSS + computed styles (don't guess): the
# 1-3 real font families with the WEIGHTS actually used (→ primary/secondary/accent), declared :root
# design tokens (--color-*/--font-*), key colours with WCAG contrast, radius. Run this BEFORE authoring
# a theme: the accurate source for weight/accent that eyedrop (pixels) can't give (it read creed's
# accent as the sky-photo blue; the CSS says #2563eb). Pair with `make palette` for dominance.
brandspec: ## [study] READ the site's real CSS + computed styles (don't guess): the 1-3 real font families with the
	node scripts/brand/brandspec.mjs $(URL)

sections: ## [study] capture a website's real sections into assets/brands/<brand>
	node scripts/brand/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make study VIDEO=refs/ref.mp4 [NAME=… THRESH=0.3]: the film-side twin of `make sections`. Reads a
# REFERENCE video: shot boundaries (ffmpeg scene score), a contact sheet (in/mid/out per shot) and a
# study.md whose four judgement columns you fill by eye. Writes refs/<name>/ (gitignored: study the
# grammar, never ship the frames). docs/CRAFT/REFERENCE-STUDY.md
study: ## [study] the film-side twin of `make sections`.
	node harness/media/study.mjs $(VIDEO) $(NAME) $(if $(THRESH),--threshold $(THRESH))

# make mine: cluster every studied grammar/*.json shot by device into named shapes, each with the
# grammar + shot index that backs it, → grammar/_mined-shapes.json. The receipt beats-mined.mjs's
# `sources:` lines are read from. docs/CRAFT/BLUEPRINTS.md "Mined blueprints".
mine: ## [study] cluster every studied grammar/*.json shot by device into named shapes, each with the grammar + shot
	node harness/author/mine.mjs $(if $(JSON),--json,)

# make preview HTML=path/frag.html [THEME=linear] [BG=#hex] [W=1400] [SERVE=1], render a single
# hand-written fragment (or a captured component JSON) STANDALONE on the theme bg → /tmp/preview.png.
# SERVE=1 keeps it LIVE in your browser instead (real fonts/assets). "is this HTML doing what I want?".
preview: ## [dev] render a single hand-written fragment (or a captured component JSON) STANDALONE on the theme bg →
	node harness/author/preview-fragment.mjs $(HTML) $(if $(THEME),--theme $(THEME)) $(if $(BG),--bg $(BG)) $(if $(W),--w $(W)) $(if $(SERVE),--serve)

# make beats D=formats/x/video.json [VS=brand]: first/mid/last frame of every beat in one contact
# sheet → /tmp/beats/$(notdir $(basename $(D))).png. VS=brand stacks each beat beside its source-section shot (fidelity diff).
# make cutout SRC=<photo> NAME=<name>: remove a photograph's background so it becomes a PROP.
# A rectangular photo cannot be both recognisable and edge-free in a frame it does not fill. With the
# background gone the ground is free, light can sit behind the subject, and a layer can pass in front of
# it. Local (rembg in .venv-tools), no network after the first run, and the alpha is verified.
cutout: ## [dev] remove a photograph's background so it becomes a PROP (SRC=<photo> NAME=<name>)
	node harness/media/cutout.mjs $(SRC) $(NAME)

# make waivers [D=<file>]: every blocking gate can be waived, and a waiver costs nothing and is
# invisible afterwards. So the failure mode is not one bad waiver, it is the SAME waiver film after film
# until the rule is dead and nothing said so. With D= it tells you whether the break you are about to
# make is already a habit; without it, it censuses the library. It never blocks: a gate that blocked on
# this would itself be waived.
waivers: ## [preflight] every blocking gate can be waived, and a waiver costs nothing and is invisible afterwards.
	@node quality/gates/waiver-drift.mjs $(D) $(if $(JSON),--json,)

# make preflight D=<scene.json>, the nine decisions from docs/CRAFT/README.md put in front of you for
# THIS film, plus the arsenal ranked against what the film says it is, then a receipt. It records only
# with --record: a bare run would otherwise certify the whole library by accident (it did, once, for
# all 134).
motion-floor: ## [check] DOES THE FILM EVER STOP: local (content) motion per 0.5s window, ambient reported apart and never counted (D=<film>, needs a render)
	@node quality/gates/motion-floor.mjs $(D) $(if $(JSON),--json,)

# make motion-lab D=<storyboard.md> VARIANTS=<variants.json>: does a motion change actually raise the
# local-motion floor, or is it a feeling. Assembles, renders and motion-floors the base storyboard plus
# every named variant (each one a mutation of the beats' `motion:` lines) THE SAME WAY, one table:
# moves/beat, dead windows, local median, local peak. `make motion-lab --self-test` (no D=) instead
# reproduces docs/MISTAKES.md #608's A/B/C structural experiment end to end.
motion-lab: ## [dev] does a motion change raise the local-motion floor: one table over a base + named variants (D=<storyboard.md> VARIANTS=<variants.json>, or SELFTEST=1)
	@node harness/dev/motion-lab.mjs $(if $(filter 1,$(SELFTEST)),--self-test,$(D) --variants $(VARIANTS)) $(if $(KEEP),--keep,)

frame-check: ## [check] THE PLAN vs THE FRAMES: archetype rotation, one measurable peak, and every size on the kit ramp (D=<film>)
	@node quality/gates/frame-check.mjs $(D) $(if $(JSON),--json,)

stage: ## [preflight] WHERE IS THIS FILM: the stage it is in and the ONE next command (D=<film>, or no D= for the roster, or Q="…" before a film exists)
	@node quality/gates/stage.mjs $(D) $(if $(Q),--q "$(Q)") $(if $(JSON),--json,)

next: ## [preflight] RUN the one command the stage names, then stop (D=<film>). Refuses at approval: only the user signs.
	@node quality/gates/next.mjs $(D)

preflight: ## [preflight] the decisions that belong BEFORE the JSON, recorded for this version of the scene
	node quality/gates/preflight.mjs $(D) --record

# `make legacy` (the ratchet census/adopt/stamp) is RETIRED. quality/gates/legacy-manifest.json and the
# author-check.mjs ratchet engine that read it are gone: quality/gates/legacy-fold.mjs folded every row
# into an explicit per-scene `authoring.allow` + `_why`, so `authoring.allow` is the one excuse mechanism
# left. See docs/TASTE.md "Waivers, not legacy" and AGENTS.md "Waivers, legacy, and the difference".

# make draft D=<scene.json> STAGE=85|95: hand over a draft at a DECLARED level of finish.
# Without one, review is a guess: a reviewer who thinks they are seeing a ship candidate flags the
# placeholder photo, and one who thinks they are seeing a rough cut lets a real defect through. 85% locks
# structure and timing and leaves polish open; 95% adds the checks that need real pixels. It records
# every warning carried to clear the bar, so the next reviewer reads what was knowingly accepted.
draft: ## [dev] hand over a draft at a DECLARED level of finish.
	@node quality/gates/draft-check.mjs $(D) --stage $(if $(STAGE),$(STAGE),85) $(if $(JSON),--json,)

# make treatment SB=<storyboard.md>: WHY this film looks like this, written while the answer is known.
# A treatment's real content is what was TURNED DOWN and on what grounds, and that exists for exactly one
# moment: while the concept set is still on the table. `make concept-pick` records the rejected
# directions into a receipt so this stage can read them back. Regenerating refreshes only the MEASURED
# block; your prose is never touched, because a tool that overwrites what you wrote is one you stop running.
treatment: ## [preflight] WHY this film looks like this, written while the answer is known.
	node harness/author/treatment.mjs $(SB) $(if $(THEME),--theme $(THEME))

# make concept SB=<storyboard.md> [N=3]: N DIRECTIONS FOR ONE BRIEF, before any of them is built.
# The missing first stage: every other stage refines a single idea and nothing ever produced a second
# one. Each direction commits to a thread, a pace and a look at once, the three decisions that actually
# change a film, and leaves every word to you, because a tool that invents copy produces options that
# are all wrong alike. docs/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md has the threads.
concept: ## [preflight] N DIRECTIONS FOR ONE BRIEF, before any of them is built.
	node harness/author/concept.mjs $(SB) $(if $(N),--n $(N)) $(if $(SEED),--seed $(SEED)) $(if $(filter 1,$(STRICT)),--strict)

# make concept-pick SB=<storyboard.md> OPTION=<slug>: promote one direction and record the rest.
# The rejected set is what a treatment argues against; it is only available at the moment of choosing.
concept-pick: ## [preflight] promote one direction and record the rest.
	node harness/author/concept.mjs $(SB) --pick $(OPTION)

# make approve D=<file>: SIGN OFF the plan for this exact film (harness/author/approve.mjs writes
# `approved: <date>` into its storyboard's own frontmatter). Editing the storyboard after this silently
# withdraws the signature (approve.mjs strips any stale `approved:` line before it re-checks), so an
# approval never outlives what it approved. This is the USER's signature: an agent runs `make studio
# D=` to show the plan, but only the user runs this command (or `/vawe-approve`).
approve: ## [preflight] SIGN OFF the plan for this exact film (D=<file>; run by the USER, never an agent)
	@node harness/author/approve.mjs "$(D)"

beats: ## [judge] first/mid/last frame of every beat in one contact sheet (D=<file> [VS=brand])
	node harness/author/beats.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(STRIDE),--stride $(STRIDE))

# make sheets D=<file> [VS=brand], BOTH review contact sheets from ONE browser: the beat sheet
# (/tmp/beats/<name>.png, where each beat LANDS) and the reveal sheet (/tmp/reveal/<name>.png, how each
# beat ARRIVES). `make dev` and `make ship` run this for you, so the sheets are always current; it is
# here as its own target for the times you want them without a render.
# It does NOT count as having looked: the receipt it writes is marked `auto`, and beat-check keeps
# nagging until `make beats` or `make reveal` signs the look off. See harness/author/sheets.mjs.
sheets: ## [dev] BOTH review contact sheets from ONE browser: the beat sheet (/tmp/beats/<name>.png, where each beat
	node harness/author/sheets.mjs $(D) $(if $(VS),--vs $(VS))

# make sheet NAME=brand [SERVE=1], DESIGN SHEET: every captured element on one page (on the theme bg),
# labelled with size + font-substitution warnings. Review + fix the raw material BEFORE building a video.
# Default → /tmp/sheet.png (tall contact sheet). SERVE=1 → live in your browser (real fonts, scrollable).
sheet: ## [dev] DESIGN SHEET: every captured element on one page (on the theme bg), labelled with size +
	node scripts/brand/design-sheet.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(SERVE),--serve)


# make theme-remix PRESET=editorial BRAND=acme [BG=#hex ACCENT=#hex TEXT=#hex], pick a design-system
# PRESET (presets/*.json) and remix it onto a brand's base+accent → a complete themes/<brand>.json. The
# another engine "pick a preset, paint the brand into it" move: good coherent design in one command, not
# hand-authored per pixel. Reads assets/brands/<brand>/palette.json when BG/ACCENT are omitted.
theme-remix: ## [engine] pick a design-system PRESET (presets/*.json) and remix it onto a brand's base+accent → a complete
	node scripts/brand/theme-remix.mjs --preset $(PRESET) --brand $(BRAND) $(if $(BG),--bg "$(BG)") $(if $(ACCENT),--accent "$(ACCENT)") $(if $(TEXT),--text "$(TEXT)")

# make tts (SCRIPT=narration.txt | TEXT="…") OUT=formats/scene/<name>.vo [VOICE=Samantha], LOCAL narration:
# synthesize a voiceover WAV + word-timing sidecar offline with macOS `say` (no cloud, no key). Writes
# <OUT>.wav + <OUT>.words.json; wire them into the scene's audio block: { "vo":…, "voWords":… }.
tts: ## [dev] LOCAL narration: synthesize a voiceover WAV + word-timing sidecar offline with macOS `say` (no cloud, no key).
	node harness/media/tts.mjs $(if $(SCRIPT),--script $(SCRIPT)) $(if $(TEXT),--text "$(TEXT)") --out $(OUT) $(if $(VOICE),--voice $(VOICE))

# make script SB=<storyboard.md> [STRICT=1]: THE WORDS, as a two-column AV script, before a picture
# exists. Lays AUDIO beside VISUAL because the layout is the check: a narration that restates the card
# is one channel and an echo, not two channels, and that is invisible in a list and obvious in columns.
# Timing here is a 150wpm ESTIMATE on purpose, so it stays instant while you write; `make animatic`
# owns the measured clock.
script: ## [preflight] THE WORDS, as a two-column AV script, before a picture exists.
	node harness/author/script.mjs $(SB) $(if $(STRICT),--strict)

# make animatic SB=<storyboard.md> [VOICE=Samantha]: CUT THE PICTURE TO THE SOUND before building the
# film. Synthesizes a scratch read of each beat's `narration:` and measures it; beats with no narration
# are timed by READING speed instead. Then it lays grey slots on that clock and renders draft, so the
# question "does this beat have room for its own copy" is answered by the copy rather than by the
# author's estimate of it. A storyboard grades itself; this grades it against a clock.
animatic: ## [preflight] CUT THE PICTURE TO THE SOUND before building the film.
	node harness/author/animatic.mjs $(SB) $(if $(VOICE),--voice $(VOICE)) $(if $(OUT),--out $(OUT))
	@f=$$(node harness/author/animatic.mjs $(SB) $(if $(OUT),--out $(OUT)) --path); \
	 ./bin/vawe $$f --draft --workers 2

# make panels SB=<storyboard.md>: THE STORYBOARD STOP, AS A PICTURE. One rough grey still per beat,
# tiled into a sheet, before any scene JSON exists. `shot:` drives the size of the subject box and any
# placement the prose states drives where it sits, so a wide and a close are different pictures and a
# beat holding two seconds on one word reads as the hole it is. Deliberately grey: this is BLOCKING, not
# drawing. The animatic checks the clock, styleframes check the look, this checks the composition.
panels: ## [preflight] THE STORYBOARD STOP, AS A PICTURE.
	node harness/author/panels.mjs $(SB) $(if $(OUT),--out $(OUT))

# make styleframes D=<scene.json> [N=4]: THE LOOK, BEFORE THE MOTION IS TRUSTED. Renders the few most
# visually DISTINCT settled moments at full scale as individual stills, plus a sheet, and runs only the
# LOOK gates (designspec). Answers "is this the right-looking film at all", which no static gate
# can: `onefile` passed every gate with a backdrop that rendered as loud blue blooms, and one still
# showed it in three seconds. Approve these, then animate.
styleframes: ## [dev] THE LOOK, BEFORE THE MOTION IS TRUSTED.
	node harness/author/styleframes.mjs $(D) $(if $(N),--n $(N))

# make quiz [NAME=<brand>] [URL=<url>]: THE BRIEF, before anything is authored. Prints an
# AskUserQuestion payload built from the brand's own sections + the DIRECTIONS/PROFILES registries, so the
# options are the site's real words and the engine's real vocabulary. Refuses to ask genericly when a URL
# is known and no site study exists (a generic question wastes the answer). Never names an effect.
quiz: ## [preflight] THE BRIEF, before anything is authored.
	node harness/author/quiz.mjs --ask $(if $(NAME),--name $(NAME)) $(if $(URL),--url $(URL)) $(if $(SLUG),--slug $(SLUG))

# make quiz-round2 PLACEMENT=<k> JOB=<k>: the branched follow-ups, which emit NOTHING already decided.
quiz-round2: ## [preflight] the branched follow-ups, which emit NOTHING already decided.
	node harness/author/quiz.mjs --round 2 --placement $(PLACEMENT) --job $(JOB)

# make quiz-apply ANSWERS=<file.json> NAME=<brand> [OUT=<path>], the answers become a STORYBOARD.
# It delegates the beats to storyboard-draft (one writer, one beat per real section) and locks the
# frontmatter the brief decided: arc, format, duration, and `threads:`, the field storyboard-check
# hard-errors on for a short film. It does NOT write the .intent.json sidecar; `make intent` does, through
# the parser the gate and the animatic share.
quiz-apply: ## [preflight] the answers become a STORYBOARD.
	node harness/author/quiz.mjs --apply --answers $(ANSWERS) --name $(NAME) $(if $(OUT),--out $(OUT)) $(if $(SLUG),--slug $(SLUG))

# make quiz-look SB=<storyboard.md> [N=3]: THE LOOK, SETTLED BY PICTURE. Runs `concept` for N directions
# (each committing to a thread, a pace and a look, with their divergence MEASURED by similarity.mjs), draws
# `panels` for each, and prints the pick-one question with a sheet path per option. Of 23 published studio
# briefs not one asks a client to describe motion in words: every good instrument replaces an adjective
# with an artefact. Two or three options, never five. READ THE SHEETS.
quiz-look: ## [preflight] THE LOOK, SETTLED BY PICTURE.
	node harness/author/quiz.mjs --look --sb $(SB) $(if $(N),--n $(N))

# make storyboard-check SB=path/to/STORYBOARD.md. The storyboard-as-PROPOSAL gate: a one-sentence
# message + audience/arc/format/duration, and per beat a type + on-screen cues + a WHY. Enforces that the
# decisions that make a video good were made and written down BEFORE the JSON. Template: docs/CRAFT/STORYBOARD-TEMPLATE.md
storyboard-check: ## [preflight] The storyboard-as-PROPOSAL gate: a one-sentence message + audience/arc/format/duration, and per
	@node quality/gates/storyboard-check.mjs $(SB) $(if $(JSON),--json,)

# make surface D=formats/scene/<film>.storyboard.md: the neutral, on-demand front door to
# harness/live/beat-surfacer.mjs, for an agent with no PostToolUse hook. Claude Code runs the same
# check automatically after every save; everyone else runs this by hand after writing a beat.
surface: ## [preflight] PUSH the one unused rich capability a storyboard beat could reach for (the neutral form of the beat-surfacer hook)
	@echo '{"tool_input":{"file_path":"$(D)"}}' | node harness/live/beat-surfacer.mjs; true

# make storyboard-draft NAME=<brand> [MSG="one sentence" DUR=30 FORMAT=landscape], auto-draft a
# STORYBOARD.md skeleton from a captured sections.json (one beat per real section, in the site's order,
# pre-wired with type + capture command + suggested blueprint). Fill the <…> fields, then storyboard-check.
storyboard-draft: ## [preflight] auto-draft a STORYBOARD.md skeleton from a captured sections.json (one beat per real section, in
	node scripts/brand/storyboard-draft.mjs

# make intent SB=<storyboard.md> [D=formats/scene/<topic>.json], export the storyboard's per-beat whys
# into a <topic>.intent.json sidecar, so author-check's `inspect` VERIFIES the render delivers each beat's
# on-screen copy + motion (turns "every beat earns its frame" from doctrine into a checked contract).
intent: ## [preflight] export the storyboard's per-beat whys into a <topic>.intent.json sidecar, so author-check's
	node scripts/brand/intent-from-storyboard.mjs

# make designspec-check D=<scene.json> [STRICT=1]. THE DESIGN-SPEC LOCK: the theme is the locked visual
# system; flag any layer using an off-palette chromatic colour or a non-role font. The look twin of the
# storyboard gate. Runs inside author-check every time; TASTE=1 makes its findings block.
# Optional radii/shadow lock via scene "spec".
# ONE gate, one name. Beside the colour/font lock it runs OUR anti-slop rule table
# (harness/lib/designspec-rules.mjs): copy tells and effect doses, over the scene's words AND the html
# fragments it names. Replaces the vendored impeccable detector rule by rule.
#   make designspec-check SELFTEST=1: every rule must fire on its own sample and stay quiet on its counter-sample
#   make designspec-check CENSUS=1: the whole library, one line per scene with a finding
designspec-check: ## [check] THE DESIGN-SPEC LOCK: the theme is the locked visual system; flag any layer using an off-palette
	node quality/gates/designspec-check.mjs $(if $(filter 1,$(SELFTEST)),--self-test,$(if $(filter 1,$(CENSUS)),--census,$(D))) $(if $(STRICT),--strict,)


# make copy-check D=<scene.json> [STRICT=1]. THE COPY GATE: on-screen writing tells (hook >12 words /
# weak opener, marketing jargon, vague quantifiers, restated headlines, a big number as flat text). The
# words are the video's voice. Runs inside author-check every time; TASTE=1 makes its findings block.
copy-check: ## [check] THE COPY GATE: on-screen writing tells (hook >12 words / weak opener, marketing jargon, vague
	node quality/gates/copy-check.mjs $(D) $(if $(STRICT),--strict,)

# make asset-check D=<scene.json> [STRICT=1], ASSET-READINESS PREFLIGHT: confirm every referenced image /
# icon / captured component / VO file exists on disk before you render (a missing one = a broken image or
# silent gap). Prints how to fetch each. Advisory in author-check; STRICT=1 blocks.
asset-check: ## [check] ASSET-READINESS PREFLIGHT: confirm every referenced image / icon / captured component / VO file
	@node quality/gates/asset-check.mjs $(D) $(if $(STRICT),--strict,) $(if $(JSON),--json,)

# make pace-from-vo VO=<file>.words.json [BEATS=n], SCRIPT-FIRST PACING: propose beat start/durations
# timed to the narration (from a voWords sidecar) so the reveals land on the voice. Proposes; never mutates.
pace-from-vo: ## [check] SCRIPT-FIRST PACING: propose beat start/durations timed to the narration (from a voWords sidecar)
	node harness/media/pace-from-vo.mjs

# make export-edl D=formats/scene/<file>.json [OUT=<dir>], HAND THE FILM TO AN EDITOR: read the RESOLVED
# timeline (cuts/seams/stings, per-shot windows, layer in/out + on-screen text, the audio track) and write
# two sidecars beside the source: <name>.shots.json (self-describing) and <name>.edl (CMX3600, importable
# by Premiere/Resolve/FCP7). Read-only, the render path is untouched, deterministic. A vawe mp4 stops being terminal.
export-edl: ## [ship] HAND THE FILM TO AN EDITOR: read the RESOLVED timeline (cuts/seams/stings, per-shot windows, layer
	@node harness/media/export-edl.mjs $(D) $(if $(OUT),--out $(OUT),)

# make sfx-catalog, REGENERATE docs/CRAFT/SFX-CATALOG.md from core/audio/kit.mjs CUES: the "reach for this
# sound" table (family/energy/purpose/placement/pitfall per cue). Fails loudly if a cue has no catalog line,
# so a new cue cannot ship undocumented. Run after adding or renaming a cue.
sfx-catalog: ## [engine] REGENERATE docs/CRAFT/SFX-CATALOG.md from core/audio/kit.mjs CUES: the "reach for this sound" table
	@node harness/author/sfx-catalog.mjs

# make studio D=formats/scene/<file>.json [PORT=8799]: LIVE scrubbable preview (no mp4 render). Serves
# the scene in a browser with a frame slider + play; scrub/step to iterate, edit the JSON + reload. Under
# it, a TIMELINE: a bar per layer against a seconds/frames ruler, cuts/seams/stings marked, enter/exit
# ramps shaded off the settled middle, and every dead-air hole (beat-check) painted as a hazard band.
# Drag the timeline to seek. Dev tooling only (drives the engine's own renderFrame(n)); Ctrl-C to stop.
# EDITING, not just viewing: turn on `key` mode, click a layer's bar, scrub to a frame, drag it on the
# stage. That writes a motion keyframe into the scene at that frame, surgically, the file's hand
# formatting survives and a save that changes nothing is a zero-byte diff (harness/author/patch-motion.mjs).
# `undo` walks back through the session. docs/CRAFT/KEYED-MOTION.md is what you are authoring toward.
studio: ## [dev] LIVE scrubbable preview (no mp4 render). Its `plan` state shows the storyboard with every beat's real fragment live in it.
	node studio/server.mjs $(D)

# make seam-check D=formats/x/video.json, SAMPLE THE SEAMS: pull the frames straddling every transition
# (cut/seam/sting/beat boundary) out of the RENDERED mp4 and flag a luminance flash in the overlap, the
# black-flash / collision class the center-sampling gates (beats/audit/probe) structurally miss (#138).
# Requires out/<name>.mp4 (render first). Sheet → /tmp/seams/$(notdir $(basename $(D))).png (read it, the eye is the backstop).
seam-check: ## [check] SAMPLE THE SEAMS: pull the frames straddling every transition (cut/seam/sting/beat boundary) out of
	@node quality/gates/seam-snap.mjs $(D) $(if $(JSON),--json,)

# make forensics D=formats/x/video.json: three seam defects luminance sampling can't see (seam-check
# flags a flash; this flags a redraw, a lingering fade, or a field that steps). Requires the rendered
# mp4, same as seam-check; run after `./bin/vawe` / `make video` / `make ship`.
forensics: ## [ship] sample a rendered mp4's transitions for a redraw, a lingering fade, or a field that steps
	node quality/gates/seam-forensics.mjs $(D)

# make sweep-static D=formats/x/video.json, THE PIXELS-MOVED CHECK: sample 10 frames from the RENDERED mp4
# and fail if geometry never changes across the whole film (max consecutive change < 0.5%). Complements
# static-bg (which checks declared bg WINDOWS): this checks whether anything actually moved on screen. A
# held beat among real motion cannot trip it (it fails only when EVERY sampled pair is frozen). Render first.
sweep-static: ## [check] THE PIXELS-MOVED CHECK: sample 10 frames from the RENDERED mp4 and fail if geometry never changes
	@node quality/gates/sweep-static.mjs $(D) $(if $(JSON),--json,)

# make similar [D="a.json b.json"], sameness audit: score authored videos pairwise (motion vocab
# + beat structure + layout). Cross-brand SAME (>0.75) fails; the anti-template gate.
similar: ## [check] sameness audit: score authored videos pairwise (motion vocab + beat structure + layout).
	@node quality/gates/similarity.mjs $(D) $(if $(JSON),--json,)

# make feature-audit, static utilization report: framework vocabulary (kinetic presets / cuts /
# shader stings) + capability primitives (group/motion/spring/fitH…) vs what authored videos use.
# Surfaces under-adopted primitives + preset-monotony. WARN tier (always exits 0).
feature-audit: ## [check] static utilization report: framework vocabulary (kinetic presets / cuts / shader stings) +
	@node quality/gates/feature-audit.mjs $(if $(JSON),--json,)

# make captions D=formats/x/video.json TEXT="script": auto-time a script into muted-social burned-in
# subtitles (captionMode:pop). Deterministic (time proportional to word count). See harness/author/captions.mjs.
captions: ## [dev] auto-time a script into muted-social burned-in subtitles (captionMode:pop).
	node harness/author/captions.mjs $(D) "$(TEXT)"

# make ledger D=formats/x/video.json: check a design against ALL shipped designs (cross-video
# memory); make ledger-add D=… logs it after shipping.
ledger: ## [ledger] check a design against ALL shipped designs (cross-video memory); make ledger-add D=… logs it after shipping.
	@node quality/gates/ledger.mjs check $(D) $(if $(JSON),--json,)
ledger-add: ## [ledger] log a shipped design into the cross-video memory (D=<file>)
	@node quality/gates/ledger.mjs add $(D) $(if $(JSON),--json,)

# make photos Q="server room" NAME=brand [N=4], fetch openly-licensed photos (Openverse: cc0/pdm/by)
# with attribution recorded to credits.json. Use in clipped image layers with ken burns zoom.
photos: ## [dev] fetch openly-licensed photos (Openverse: cc0/pdm/by) with attribution recorded to credits.json.
	node scripts/brand/photos.mjs "$(Q)" $(NAME) $(if $(N),--n $(N))

# make capture-scene URL=… SEL="section" NAME=brand LABEL=intake PARTS="sel1,sel2", capture an
# ANIMATED site section as parts (relative geometry) to re-stage with our motion primitives.
capture-scene: ## [dev] capture an ANIMATED site section as parts (relative geometry) to re-stage with our motion primitives.
	node harness/author/capture-scene.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) --parts "$(PARTS)"

# make capture-motion URL=… SEL="section" [ONLOAD=1] [DUR=2.5], WATCH a real element animate and emit a
# motion track (from→rest keyframes) to replay the site's actual move. Scroll-triggered by default; ONLOAD=1
# for on-load reveals. The motion twin of brandspec: measure the animation, don't guess it.
capture-motion: ## [dev] WATCH a real element animate and emit a motion track (from→rest keyframes) to replay the site's actual move.
	node harness/author/capture-motion.mjs $(URL) "$(SEL)" $(if $(ONLOAD),--onload) $(if $(DUR),--dur $(DUR))

# ---- generated media (kie.ai; needs KIE_API_KEY or a gitignored .kie.key) ----
# make gen-image Q="a neon server room" NAME=hero [ASPECT=16:9], generate an image → assets/gen/<NAME>.png
# (use it as a normal { "type": "image", "src": "/assets/gen/<NAME>.png" } layer).
gen-image: ## [dev] generate an image -> assets/gen/<NAME>.png (Q="..." NAME=<name> [ASPECT=16:9])
	node harness/media/kie.mjs image "$(Q)" --out assets/gen/$(NAME).png $(if $(ASPECT),--aspect $(ASPECT))

# make gen-clip IN=path/to.mp4 NAME=city [FPS=30] [W=720]: extract ANY mp4 (a kie.ai generation or a
# local file) to a DETERMINISTIC frame sequence + manifest → assets/gen/<NAME>/ (use as a `clip` layer).
gen-clip: ## [dev] extract ANY mp4 (a kie.ai generation or a local file) to a DETERMINISTIC frame sequence + manifest
	node harness/media/gen-clip.mjs $(IN) $(NAME) $(if $(FPS),--fps $(FPS)) $(if $(W),--w $(W))

# make gen-video Q="a drone shot over a city" NAME=city [ASPECT=16:9], generate a video AND extract it to a
# clip in one step (a deterministic `clip` layer). Chains kie.ai video → gen-clip.
gen-video: ## [dev] generate a video AND extract it to a clip in one step (a deterministic `clip` layer).
	node harness/media/kie.mjs video "$(Q)" --out assets/gen/$(NAME).mp4 $(if $(ASPECT),--aspect $(ASPECT))
	node harness/media/gen-clip.mjs assets/gen/$(NAME).mp4 $(NAME)

# make capture URL=… SEL=".card" NAME=brand LABEL=pricing: lift a REAL UI component off a live site
# (its HTML + computed CSS) into an animatable `component` scene fragment. See harness/author/capture-component.mjs.
capture: ## [dev] lift a REAL UI component off a live site (its HTML + computed CSS) into an animatable `component`
	node harness/author/capture-component.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) $(if $(LS),--localstorage "$(LS)") $(if $(SETTLE),--settle $(SETTLE))

# make validate [D=formats/x/topic.json]: check data + inline theme against the format schema.
# No D = validate every formats/*/sample.json. Same validator boot() runs before rendering.
validate: ## [check] check data + inline theme against the format schema.
	node core/validate/validate.mjs $(D)

# make schema AT='layers[].motion[]', what may I WRITE at this path. The sibling of `make arsenal`:
# arsenal answers "what can the engine DO" from the registries, this answers "what may I write HERE"
# from formats/scene/schema.json, which already carries a written label on every field and served it to
# nobody. Built after an author guessed the two bezier handles on a keyframe were `in`/`out` (they are
# `easeIn`/`easeOut`) and shipped a refusal that rejected three correct films. No AT prints the
# top-level shape; a partial or wrong path names what IS legal there, the way a failed registry pick does.
schema: ## [dev] MOVED into `make arsenal AT=...` (W11); still works, one release
	@echo "  · make schema moved: use make arsenal AT='$(AT)'"
	@node harness/author/schema-at.mjs $(if $(AT),'$(AT)')

# make schema-check: assert every layer prop the engine (scene.html) reads is defined in schema.json
# (catches drift like a new primitive that shipped without a schema entry). Exits 1 on drift.
schema-check: ## [check] assert every layer prop the engine (scene.html) reads is defined in schema.json (catches drift like
	@node quality/gates/schema-drift.mjs $(if $(JSON),--json,)

# make schema-write: regenerate every DERIVED part of schema.json (the layerProps table + the enums
# that copy a code registry) so a registry that grew needs no second, hand edit. schema-check verifies.
schema-write: ## [engine] regenerate every DERIVED part of schema.json (the layerProps table + the enums that copy a code
	@node quality/gates/schema-drift.mjs --write $(if $(JSON),--json,)

# make prop-probe: set EVERY declared layer prop on a layer of EVERY type that declares it, build the
# lot through the real pipeline, and report the ones nothing read. core/registry/prop-audit.js already refuses a
# dead prop at render time; its only gap was that an author had to write the prop first, which is how
# `metalness` sat declared and ignored on the three layer for months. Takes ~35s (one browser, ~110
# probe scenes). PROP=<type> narrows it to one layer type.
prop-probe: ## [check] set EVERY declared layer prop on a layer of EVERY type that declares it, build the lot through the
	@node quality/gates/prop-probe.mjs $(PROP) $(if $(JSON),--json,)

# make lint-test: regression asserts for validate's lintData (missing-duration / typing+markup /
# scene-collision). Each rule caught a real bug this session; this pins that it still fires.
lint-test: ## [check] regression asserts for validate's lintData (missing-duration / typing+markup / scene-collision).
	@node quality/gates/lint-test.mjs $(if $(JSON),--json,)

# make engine-sync [CHECK=1]: publish the engine into site/public, which is what the site's
# in-browser engine actually boots. Runs automatically on the site's prebuild; this target is for
# running it (or checking it) without a site build. CHECK=1 only reports.
.PHONY: engine-sync
engine-sync: ## [engine] publish the engine into site/public (the site's in-browser engine)
	@node scripts/site/site-engine.mjs $(if $(CHECK),--check,)

# make docker-check: will the image carry what the Dockerfile copies? Reads the COPY lines and
# applies .dockerignore. A mismatch here is invisible locally and fails the deploy.
.PHONY: docker-check
docker-check: ## [site] will the image carry what the Dockerfile COPY lines expect?
	@node scripts/site/docker-context-check.mjs

.PHONY: worktrees
# Retire agent worktrees whose work has landed. Reports by default; PRUNE=1 removes.
# Content is the authority, never the commit graph: agent work here is often copied out rather than
# merged (films are gitignored), so a branch whose commit never merged can still be fully landed.
# A worktree holding anything unproven is left alone and told how to rescue it.
worktrees: ## [maintenance] Retire agent worktrees whose work has landed.
	@node harness/dev/worktree-prune.mjs $(if $(PRUNE),--prune,)

# make review. One-command health snapshot: lib-test + layout audit + a master overlay sheet
# (/tmp/review.png). Heavier gates stay separate: make probe (purity), make verify (render integrity).
review: ## [engine] One-command health snapshot: lib-test + layout audit + a master overlay sheet (/tmp/review.png).
	node verify/review.mjs

# make evals: render the fixed set of eval briefs (quality/runs/evals/briefs/*.json) under the CURRENT
# engine + rules, into a fresh quality/runs/evals/runs/<timestamp>/ with a contact sheet per brief, one
# combined sheet, and manifest.json. Asserts LIVENESS only (mp4 exists, duration + dims match the
# scene): no aesthetic score, a human reads the sheets. Exits 1 if any brief is not live. docs/EVALS.md.
evals: build ## [engine] render the fixed set of eval briefs (quality/runs/evals/briefs/*.json) under the CURRENT engine + rules,
	node harness/dev/evals.mjs

# make evals-compare BEFORE=quality/runs/evals/runs/<ts> [AFTER=<ts>]: before/after sheets stacked per brief
# plus compare.html laying the two mp4s side by side (opened automatically). No AFTER renders a fresh
# run first. Run this whenever a change touches motion, transitions, backgrounds, type or layout, and
# carry the compare.html link in the commit/PR body.
evals-compare: build ## [engine] before/after sheets stacked per brief plus compare.html laying the two mp4s side by side (opened
	node harness/dev/evals.mjs --compare --before $(BEFORE) $(if $(AFTER),--after $(AFTER))

# make critics D=<scene.json> [VS=brand] [DECIDERS=1] [RECORD=<panels.json>]: THE ROSTER
# (docs/CRAFT/SUBAGENTS.md), as an invokable, recorded step. Bare: the six critics' prompts, concrete
# for this film, to launch as parallel Agent calls. DECIDERS=1: the other half, the roles that WRITE
# into the film, one brief each in dependency order (motion before transitions, because the
# content-aware cut reads velocity at the joint). RECORD=<file>: given the six verdicts collected into
# one JSON file, writes the receipt to quality/baselines/approved/panels/<name>.json (stale when the scene changes).
critics: ## [judge] THE ROSTER (docs/CRAFT/SUBAGENTS.md): critics bare, deciders with DECIDERS=1.
	node harness/author/critics.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(DECIDERS),--deciders) $(if $(RECORD),--record $(RECORD))

# make core-node-boundary: core/ is fetched and evaluated by a BROWSER, so a `node:fs` or
# `node:path` import inside it is a file that cannot run where it claims to run. core/audio/kit.mjs
# carried one for its whole life and only survived because nothing imported it. Not a gate: a
# boundary, checked where the boundary is.
core-node-boundary: ## [check] refuse a node: builtin imported anywhere under core/
	node harness/dev/core-node-boundary.mjs

# make probe [M=scene]: assert renderFrame(n) is PURE in n (byte-identical regardless of
# render order). Guards sharded/parallel rendering. No M = every format.
probe: ## [check] assert renderFrame(n) is PURE in n (byte-identical regardless of render order).
	@$(if $(M),node quality/gates/probe-purity.mjs $(M),sh harness/dev/probe-all.sh)

# make font-audit [D=formats/scene/x.json] [M=scene]: assert every family the scene renders is
# actually vendored, loaded and painting. Catches the silent substitution that shipped Geist,
# Anybody and Manrope in the wrong typeface. Writes out/<name>.fonts.json. Exits 1 on any non-OK.
# (Distinct from `make fonts`, which DOWNLOADS the faces.)
font-audit: ## [check] assert every family the scene renders is actually vendored, loaded and painting.
	@node quality/gates/font-audit.mjs $(if $(M),$(M),scene) $(D) $(if $(JSON),--json,)

# make install-hooks: activate the version-controlled git hooks (pre-push runs the framework gates)
install-hooks: ## [maintenance] activate the version-controlled git hooks (pre-push runs the framework gates)
	git config core.hooksPath .githooks
	@echo "✓ git hooks active (.githooks): pre-push runs schema-check + lib-test + prop-probe"

clean: ## [maintenance] remove the built binary and rendered mp4s
	rm -rf bin out/*.mp4

# make author-check D=<file>: THE LADDER. Every step runs, every time; there is no opt-in half.
# TASTE=1 does not decide whether the style steps run. It decides whether their findings BLOCK.
author-check: ## [ship] the whole authoring ladder, every step every time (D=<file> [STRICT=1] [TASTE=1=block on style] [VS=<brand>])
	node quality/gates/author-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS))

# Runs inside author-check every time. Here on its own when you want only this finding.
direction-floor: ## [check] ambition floor, fail a plain slideshow (too little motion) (D=<file> [STRICT=1])
	node quality/gates/direction-floor.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

beat-check: ## [check] timeline gate: dead air, empty last frame, empty cut window, dead backdrop (D=<file> [STRICT=1])
	node quality/gates/beat-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

# make impeccable D="a.html b.html": the bundled impeccable anti-slop detector on raw HTML fragments
# (local, no network, token-efficient). the RENDERED-scene twin of this was retired (docs/MISTAKES.md #340);
# this is for a hand-written fragment BEFORE it goes into a scene. Build HTML through impeccable, not by eye.
impeccable: ## [check] impeccable detector on raw HTML fragment(s) (D=<file...>)
	node skills/impeccable/scripts/detect.mjs --json $(D)

blueprints: ## [site] MOVED into `make arsenal BLUEPRINTS=1` (W11); still works, one release
	@echo "  · make blueprints moved: use make arsenal BLUEPRINTS=1"
	node scripts/site/blueprints-catalog.mjs

# make previews [ONLY=<id>]: one rendered preview per beat blueprint (site/public/blocklib/beats/), so
# `make blueprints` shows a picture beside each name instead of only a sentence. Draft, 2 workers: this
# renders every blueprint back to back and other agents render too.
previews: ## [site] MOVED into `make arsenal PREVIEWS=1` (W11); still works, one release
	@echo "  · make previews moved: use make arsenal PREVIEWS=1 $(if $(ONLY),ONLY=$(ONLY))"
	node harness/dev/previews.mjs $(if $(ONLY),--only=$(ONLY))

# make preset-sheets [ONLY=<name>]: one rendered showcase per reference profile (SELECTION.md Part 2),
# site/public/blocklib/presets/. "an adjective is vague; a brand is a spec" made visible, not just named.
preset-sheets: ## [site] MOVED into `make arsenal PRESETS=1` (W11); still works, one release
	@echo "  · make preset-sheets moved: use make arsenal PRESETS=1 $(if $(ONLY),ONLY=$(ONLY))"
	node harness/dev/preset-sheets.mjs $(if $(ONLY),--only=$(ONLY))

# make theme-sheet THEME=<name>: one rendered contact sheet for ONE theme's `look` (W8), so a brand's
# look is a picture, not a JSON. Reuses preset-sheets' own tile machinery. docs/CRAFT/THEME-LOOK.md.
theme-sheet: ## [site] MOVED into `make arsenal THEME=...` (W11); still works, one release
	@echo "  · make theme-sheet moved: use make arsenal THEME=$(THEME)"
	node harness/dev/theme-sheet.mjs --theme=$(THEME)

# make arsenal Q="a page scrolling under a tilt", THE ONE DISCOVERY FRONT DOOR (W11): ranked search
# across every vocabulary the engine names, plus every question a separate `make <x>` used to answer
# ("what may I write here", "emit a track", "show me the blueprint catalog", "what did we already get
# wrong"). It owns no list itself; `defineRegistry` already carries each name's kind, slot and blurb,
# and every folded flag below dispatches straight to the script that used to be its own target - a
# thin front door, not a fourth copy of the answer. Old targets (schema/track/blueprints/previews/
# preset-sheets/mistakes/theme-sheet) still work, printing where they moved, for one release.
arsenal: ## [site] the ONE discovery command: Q= search, AT= what's legal, SHAPE= a track, MISTAKES=1/BLUEPRINTS=1/PREVIEWS=1/PRESETS=1/THEME= the rest, CENSUS=1/NEW=1
	node harness/author/arsenal.mjs "$(Q)" $(if $(KIND),--kind "$(KIND)") $(if $(N),--n $(N)) \
	  $(if $(filter 1,$(CENSUS)),--census) $(if $(filter 1,$(NEW)),--new) \
	  $(if $(AT),--at '$(AT)') $(if $(THEME),--theme=$(THEME)) $(if $(ONLY),--only=$(ONLY)) \
	  $(if $(filter 1,$(BLUEPRINTS)),--blueprints) $(if $(filter 1,$(PREVIEWS)),--previews) \
	  $(if $(filter 1,$(PRESETS)),--presets) $(if $(filter 1,$(MISTAKES)),--mistakes) \
	  $(if $(SHAPE),--shape $(SHAPE)) $(if $(TO),--to $(TO)) $(if $(DUR),--dur $(DUR)) \
	  $(if $(FROM),--from $(FROM)) $(if $(AMP),--amp $(AMP)) $(if $(AXIS),--axis $(AXIS)) \
	  $(if $(OFFSET),--offset $(OFFSET)) $(if $(D),--scene $(D)) $(if $(LAYER),--layer $(LAYER))

# make blurbs: does each entry's own description find that entry? A blurb is not a caption, it is the
# RETRIEVAL INDEX `make arsenal` ranks on, so a description that cannot retrieve the thing it describes
# is carrying no signal whatever it reads like. Take each blurb as the query, strip the words the NAME
# already carries or the test grades itself, and report the rank. It measures DISTINCTIVENESS and never
# accuracy: a confidently wrong blurb full of rare words passes. Reports, never blocks; the refusal that
# blocks is checkBlurb in core/registry/registry.js, at the point a blurb is written.
blurbs: ## [maintenance] how well does each entry's own blurb retrieve it? (ALL=1 for every rank)
	node harness/dev/blurb-retrieval.mjs $(if $(ALL),--all)

# make track SHAPE=pan TO=-600 DUR=1.25 [D=<scene.json> LAYER=<n>], a hand-keyed motion track from a
# MEASURED shape rather than a preset name. studio's keyframe mode writes keys by DRAGGING on the stage,
# which an agent cannot do, so the cheap path existed for a person and not for the author who writes
# most of these scenes. docs/CRAFT/KEYED-MOTION.md.
track: ## [dev] MOVED into `make arsenal SHAPE=...` (W11); still works, one release
	@echo "  · make track moved: use make arsenal SHAPE=$(or $(SHAPE),pan)"
	node harness/author/track.mjs $(or $(SHAPE),pan) $(if $(TO),--to $(TO)) $(if $(DUR),--dur $(DUR)) \
	  $(if $(FROM),--from $(FROM)) $(if $(AMP),--amp $(AMP)) $(if $(AXIS),--axis $(AXIS)) \
	  $(if $(OFFSET),--offset $(OFFSET)) $(if $(D),--scene $(D)) $(if $(LAYER),--layer $(LAYER))

# make mcp-smoke, end-to-end over the real MCP server: connects, reads the guide, refuses three leak
# vectors, drafts a scene. It is the only thing that exercises that path, and it sat FAILING for a while
# because it was wired to no target and nobody ran it (its scene declared no `bg`, which is required).
mcp-smoke: ## [maintenance] end-to-end over the real MCP server: connects, reads the guide, refuses three leak vectors, drafts a scene.
	node mcp/smoke.mjs --no-render

effects: ## [engine] regenerate docs/EFFECTS.md. The whole arsenal in one place (from the registries)
	node scripts/site/effects-catalog.mjs
	node scripts/site/effects-json.mjs

# make effects-json [CHECK=1]. The site's copy of the same arsenal: site/lib/effects.json plus one
# playable scene per previewable effect. Same family list as docs/EFFECTS.md, imported not restated.
.PHONY: effects-json
effects-json: ## [engine] regenerate the /showcase/effects index (and its preview scenes) from the registries
	@node scripts/site/effects-json.mjs $(if $(CHECK),--check,)

# make effect-posters [ONLY=family-or-name]  · one mid-motion still per previewable effect, shot from
# the real scenes effects-json just wrote. Run it after `make effects-json` changes which effects are
# previewable, or to re-shoot one family (ONLY=backgrounds) after tuning its poster frame.
.PHONY: effect-posters
effect-posters: ## [engine] regenerate the /showcase/effects poster stills (site/public/assets/effects/*.jpg)
	node scripts/site/effect-posters.mjs $(if $(ONLY),--only $(ONLY),)

# make globe-dots [SPACING=2.2]: re-bake core/globe-dots.js from Natural Earth. Run this only when
# the spacing or the source changes; the output is committed and the runtime never fetches anything.
.PHONY: globe-dots
globe-dots: ## [engine] re-bake core/globe-dots.js from Natural Earth (SPACING=2.2)
	node generators/media/globe-dots.mjs $(if $(SPACING),--spacing $(SPACING))

# make pace-check [D=scene.json]: events per second, and the longest stretch where nothing arrives or
# leaves. No D prints a census across the committed library.
.PHONY: pace-check
pace-check: ## [check] events per second, and the longest dead stretch (D=<file>)
	node quality/gates/pace-check.mjs $(D)

# make paints-nothing [D=scene.json] [STRICT=1]: did each layer actually paint anything in its own box?
# Renders the scene, screenshots a layer's box against itself hidden, and diffs the PIXELS (a DOM probe
# passes a masked-to-nothing layer, this cannot). No D sweeps every formats/scene/*.json. REPORTS-tier:
# it never blocks without STRICT=1, because the library has never been held to this rule before today.
.PHONY: paints-nothing
paints-nothing: ## [check] does each layer paint anything in its own box? pixel diff, not DOM (D=<file> [STRICT=1])
	@node quality/gates/paints-nothing.mjs $(D) $(if $(filter 1,$(STRICT)),--strict) $(if $(JSON),--json,)

arsenal-check: ## [engine] fail if the engine exports a capability docs/EFFECTS.md never mentions
	@node quality/gates/arsenal-check.mjs $(if $(JSON),--json,)

# discovery: can an author still FIND what the engine can do? Registry blurbs are refused at load, so
# this reads the SEARCH CORPUS instead, which is the only place that sees every source at once: the
# catalogue reaches it without passing a write site, and 33 entries hid there while core/registry/registry.js
# correctly reported zero. It also compares the two indexes over one library, which disagreed by 185
# entries for months with nothing noticing.
discovery: ## [engine] can an author still FIND what the engine can do?
	@node quality/gates/discovery.mjs $(if $(JSON),--json,)

# no-judge: has the eye actually looked at every film that shipped a render? make judge writes a
# receipt (docs/JUDGE.md) hashing both the scene JSON and the rendered mp4's own bytes, so it goes
# stale on either one changing; this ratchets the count of rendered films with no valid one. Not wired
# into `make ship`/CI: formats/scene and out/*.mp4 are gitignored, so a small or fresh checkout would
# report a number about its own thinness, not the library (the same reason doc-refs stays out of CI).
# --stamp lowers the ceiling after judging a batch; it never rises unnoticed.
no-judge: ## [judge] ratchet: rendered films with no valid judge receipt (--stamp to lower)
	@node quality/gates/no-judge.mjs $(if $(STAMP),--stamp,) $(if $(JSON),--json,)

# output-contract: every reporting gate renders through harness/lib/findings.mjs (tight prose + --json).
# Ratchets the count of gates that still print ad-hoc prose DOWN. docs/CRAFT/COMMAND-OUTPUT.md.
# JSON=1 emits the whole migration worklist as findings; --stamp lowers the ratchet after a batch.
output-contract: ## [maintenance] every reporting gate renders through harness/lib/findings.mjs (tight prose + --json).
	@node quality/gates/output-contract.mjs $(if $(JSON),--json,) $(if $(STAMP),--stamp,)

# generated-check: run every generator, then ask git what moved. Three artefacts had no drift check at
# all and one of them, site/lib/arsenal.json, went 67 items stale while still advertising a deleted
# sound cue. WRITE=1 regenerates and exits 0; without it the run fails and leaves the files in place so
# the fix is `git add`, not another command to remember.
generated-check: ## [maintenance] run every generator, then ask git what moved.
	@node quality/gates/generated-check.mjs $(if $(WRITE),--write,) $(if $(JSON),--json,)

effects-check: ## [engine] fail if docs/EFFECTS.md is stale vs the registries
	node scripts/site/effects-catalog.mjs --check

vocab: ## [engine] regenerate docs/CRAFT/VOCABULARY.md. The plain words (feel/duration/camera) from core/registry/vocab.js
	node scripts/site/vocab-catalog.mjs

vocab-check: ## [engine] fail if docs/CRAFT/VOCABULARY.md is stale vs core/registry/vocab.js
	node scripts/site/vocab-catalog.mjs --check

critique: ## [check] value-gate, flag hollow/low-value beats (D=<file>)
	@node quality/gates/critique.mjs $(D) $(if $(JSON),--json,)

compare: ## [dev] variant selection: tile candidate frames to pick the best (args in ARGS)
	node quality/gates/compare.mjs $(ARGS)

expand: ## [dev] expand {type:block} + {type:comp} sugar into real layers (D=<file>)
	node harness/author/expand-blocks.mjs $(D)

catalog: build ## [site] render the block registry to paged sheets (browse the arsenal)
	node scripts/site/blocks-catalog.mjs
	@sh scripts/site/catalog-render.sh

blocks-docs: ## [site] regenerate the docs/BLOCKS.md table from the manifest (CHECK=1 to verify only)
	node scripts/site/blocks-docs.mjs $(if $(CHECK),--check,)

blocks-json: ## [site] regenerate site/lib/blocks.json (the site's grid) from the manifest (CHECK=1 to verify only)
	node scripts/site/blocks-json.mjs $(if $(CHECK),--check,)

scenes-json: ## [site] check site/public/scenes/ against formats/scene/ (WRITE=1 to rewrite)
	node scripts/site/scenes-json.mjs $(if $(WRITE),--write,)

films-json: ## [site] check site/lib/films.json against the rendered films (WRITE=1 to rewrite)
	node scripts/site/films-json.mjs $(if $(WRITE),--write,)

# make site-check: everything the SITE publishes, checked against the thing that produced it.
# These three gates existed and nothing chained them, so they ran when somebody remembered. That is
# how three shipped films drifted from their sources at once: one rendered from a scene edit later
# lost in a merge, one committed before its sound existed, one still 9:16 while its film was 16:9.
# A gate nobody runs is not a gate.
site-check: scenes-json films-json site-counts ## [site] check every published artifact against its source
	@# The three GENERATED artifacts that are committed: registry/ (outside agents fetch it),
	@# docs/BLOCKS.md and site/lib/blocks.json. Each is written by a target somebody has to remember,
	@# and registry/ had drifted from blocks/catalog.mjs for a week before anything ran this.
	@node scripts/site/registry.mjs --check
	@node scripts/site/blocks-docs.mjs --check
	@node scripts/site/blocks-json.mjs --check

# make code-quality: the codebase may get simpler, never more tangled.
# A RATCHET, not a threshold: 334 findings exist today, and a threshold would fail every build on day
# one, which is how a rule gets waived by reflex and quietly repealed. This holds the current line and
# lets it move only downward. WRITE=1 accepts the current state, which is how you bank a cleanup.
code-quality: ## [maintenance] refuse code that is more tangled than the baseline (WRITE=1 to accept the current state)
	@node quality/gates/code-quality.mjs $(if $(WRITE),--write,) $(if $(JSON),--json,)

# make code-quality-top: what is worst right now, ranked. A number here is a question, not a verdict.
code-quality-top: ## [maintenance] the 25 most tangled functions in the repo
	@node quality/gates/code-quality.mjs --top $(if $(JSON),--json,)

# make no-emdash: the house rule, enforced. The owner's standing rule bans the em dash everywhere,
# and this repo held about 6000 of them, including inside the engine's own error messages. The gate
# prints what is still out of scope rather than hiding it, so the remaining debt is never silent.
no-emdash: ## [maintenance] refuse an em dash anywhere the house rule covers
	node harness/dev/no-emdash.mjs


# make og: the social card. Its source is site/og/card.html, which reads the SITE's tokens and the
# SITE's vendored fonts, so the card cannot drift from the site it advertises the way an exported PNG
# does. The three frames it shows are pulled from three shipped films, not mocked up.
og: ## [site] render site/public/assets/og.png from site/og/card.html
	node scripts/site/og-image.mjs


	@echo "\u2713 site: published scenes, films and counts all agree with their sources"

# make blocks-sync, after adding a block: docs table, the site's grid, and the site's per-block
# scenes + posters. blocks-scenes is safe to include here because it needs no render: each block is
# measured on its own stage, so adding one touches only its own files.
blocks-sync: blocks-docs blocks-json blocks-scenes ## [site] regenerate everything derived from the block manifest

# make blocks-scenes: one scene JSON + one poster still per block, for the site's blocks browser.
# Each block gets its OWN 1920x1080 stage, so there is no cell arithmetic, no neighbour bleeding into
# a crop, and no dependency on a rendered catalog reel. The site plays the scene live in the engine it
# already vendors; the poster is the same scene, framed by the same measured rect.
blocks-scenes: ## [site] per-block scene JSON + poster still for the site (no render needed)
	node scripts/site/blocks-scenes.mjs

# make registry. The agent-consumable REGISTRY (registry/): an index plus one item per block and beat,
# in the shadcn/another engine shape, so an outside agent can pick one by name and know what to write
# where. Generated from blocks/catalog.mjs + blueprints/index.mjs; never hand-edited.
# CHECK=1 exits non-zero if registry/ is stale, so a forgotten regeneration is visible.
# PHONY because registry/ is a real directory, and make would otherwise call the target up to date.
.PHONY: registry
registry: ## [site] regenerate registry/ from the block + beat manifests (CHECK=1 to verify only)
	node scripts/site/registry.mjs $(if $(CHECK),--check,)

house-style: ## [preflight] scaffold/refresh a brand's persisted Design Read (NAME=<brand> [THEME=<theme>])
	node scripts/brand/house-style.mjs $(NAME) $(THEME)

direct: ## [dev] direction gate + motion director, suggest cuts/stings (D=<file> [WRITE=1])
	node harness/author/motion-director.mjs $(D) $(if $(filter 1,$(WRITE)),--write)

judge: ## [judge] vision gate: prep key frames + rubric for the agent to score (D=<file> [VS=<brand>])
	@node quality/gates/judge.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(JSON),--json,)

inspect: ## [check] verify a scene against its .intent.json sidecar (D=<file>)
	@node quality/gates/inspect.mjs $(D) $(if $(JSON),--json,)

plan-check: ## [check] plan vs render: does the film change where the storyboard promised it would (D=<file>)
	node quality/gates/plan-vs-render.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

dissolve: ## [check] transition gate, is any text state cross-dissolved into another (D=<file>)
	node quality/gates/dissolve-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

scrub: ## [dev] preview strip: contact sheet of the whole film (M=<fmt> or F=<mp4>)
	node harness/author/scrub.mjs $(F)

batch: ## [dev] data-driven variants: TPL=<template.json> DATA=<data.json> [render]
	node harness/author/batch.mjs $(TPL) $(DATA)

site-assets: ## [site] engine renders -> site/public/assets (+posters). [RENDER=1] [ONLY=films] [CHECK=1] [FORCE=1]
	node scripts/site/site-assets.mjs $(if $(RENDER),--render) $(if $(ONLY),--only $(ONLY)) $(if $(CHECK),--check) $(if $(FORCE),--force)

# make glyphs FONT=Anybody [WEIGHT=700] [CHARSET=ascii|latin1]
# woff2 -> three.js typeface JSON (glyph OUTLINES) for extruded 3D text, into assets/fonts/3d/.
# wawoff2 + fontkit are devDependencies: build-time only, never bundled, never on the render path.
# Every face here is a VARIABLE font, so the weight is baked explicitly, the default master of
# Anybody is Thin, and baking it silently would ship the brand headline in a hairline.
glyphs: ## [engine] woff2 -> 3D typeface JSON (FONT=<Name> [WEIGHT=700] [CHARSET=ascii])
	node generators/fonts/glyphs.mjs $(FONT) $(if $(WEIGHT),--weight $(WEIGHT)) $(if $(CHARSET),--charset $(CHARSET))

glyphs-verify: ## [engine] render a baked typeface with three.js next to the real woff2 -> /tmp/glyphs-<Name>.png (LOOK AT IT)
	node generators/fonts/verify-render.mjs $(FONT) $(TEXT)

glyphs-audit: ## [engine] fail if any baked 3D typeface is stale against its woff2 or has charset gaps
	@node quality/gates/glyphs-audit.mjs $(if $(JSON),--json,)

# ── Tier B: stateful simulation, baked offline ────────────────────────────────────────────────────
# renderFrame(n) is a pure function of n, so a simulation cannot run inside it: frame 412 exists only
# because 411 ran first. So it runs HERE instead, offline, in its own process, in frame order, as
# stateful as it likes, and emits a PNG sequence the scene plays back through the existing `clip`
# layer. Non-determinism is confined to bake time. Same shape as canvas-fx (baked once at boot) and
# `make spectrum` (FFT baked to a per-frame table). Contract: sims/README.md.
sim: ## [engine] bake a simulation to frames: D=sims/<name>.mjs [WRITE=1] -> assets/baked/<name>/
	node generators/sim/run.mjs $(D) $(if $(WRITE),--write)

# It is confined, not abolished: same source + same seed must still give the same PNGs. This fails a
# sim that reaches for Math.random or the clock, a bake whose sim has been edited since (the frames
# would silently keep playing the previous version of the effect), and a sequence with a hole in it.
sim-audit: ## [engine] sims seeded? bakes fresh against their source? sequences intact?
	@node quality/gates/sim-audit.mjs $(if $(JSON),--json,)

# The build context is the WORKING TREE, so .gitignore does not apply to it. assets/baked and
# assets/gen were gitignored, referenced by no COPY, and shipped to the daemon on every build
# regardless: 72M of bake output nobody could see in a diff. This measures what Docker would
# actually send and fails when it exceeds the budget.
docker-context: ## [maintenance] does the docker build context still fit its budget?
	@node quality/gates/docker-context.mjs $(if $(JSON),--json,)

# Bake a pack of REAL cut-out letter images into the sprite set the `ransom` layer composes from.
# Unzip your pack into assets/ransom-src/ (a folder per character is ideal), then run this once.
ransom-sprites: ## [engine] bake assets/ransom-src/ -> assets/ransom/ + manifest.json
	node generators/ransom/sprites.mjs

# Bake a gradient-background pack into a render-ready library (4K -> 1920, indexed).
# Royalty-free to use, NOT to redistribute: assets/gradients is gitignored. SRC=<zip|folder>
gradients: ## [engine] bake a gradient pack -> assets/gradients/ + index.json
	node generators/media/gradients.mjs

# make filmstrip VIDEO=<file> [FPS=2] [COLS=8] [DEDUP=1] [FROM= TO=], SEE a whole video efficiently:
# extract frames and pack them into a few dense timestamped contact sheets (the whole piece in a small
# token budget vs reading 2000+ raw frames). DEDUP=1 keeps only changed keyframes; FROM/TO+FPS=12 zooms
# a transition. Reports sheet count + token estimate. Reusable for any reference or our own renders.
filmstrip: ## [dev] SEE a whole video efficiently: extract frames and pack them into a few dense timestamped contact
	node harness/author/filmstrip.mjs $(VIDEO)

# make reveal D=<scene.json> [ENTER=0.7] [N=8]: see how each beat ANIMATES IN, not where it lands.
# `make beats` samples a beat's middle (the settled state) and hides the reveal motion; this renders,
# per beat, the ENTER arc densely + the settled frame + the EXIT arc, from the scene's exact layer
# start-times. The check that catches "judged the hold, missed the reveal". → /tmp/reveal/$(notdir $(basename $(D))).png
reveal: ## [dev] see how each beat ANIMATES IN, not where it lands.
	node harness/author/reveal.mjs $(D) $(if $(ENTER),--enter $(ENTER)) $(if $(N),--n $(N)) $(if $(filter 1,$(LAYERS)),--layers)

# make cinematic D=<scene.json> [WRITE=1]. The CINEMATIC MOTION director: emit the camera-push +
# per-hero dolly + motion-blur scaffold that makes a video alive-by-default, derived from the scene's
# own beats (not a template). WRITE=1 → <file>.cinematic.json; then refine + `make reveal`.
cinematic: ## [dev] The CINEMATIC MOTION director: emit the camera-push + per-hero dolly + motion-blur scaffold that
	node harness/author/cinematic.mjs $(D) $(if $(filter 1,$(WRITE)),--write)

.PHONY: deck
deck: ## [site] publish docs/animation.html to the site as /deck (site/public/deck.html)
	node scripts/site/deck.mjs

# make lightfield-model  check that the CPU model of the colour field agrees with the renderer.
# The two fitting tools (lightfield-seeds, lightfield-fit) RANK layouts by what that model says, so a
# model that is quietly wrong reports a confident winner that is not the winner. Renders the field
# alone, with no pattern or shadow to hide behind, and fails if the prediction drifts.
.PHONY: lightfield-model
lightfield-model: ## [engine] check the CPU colour-field model against the renderer
	node research/lightfield/lightfield-model-check.mjs

# make lightfield [PRESET=ref|tide|fern] [ARGS='--seed 9 --pattern.kind rings ...']  generate a light
# field: a seeded, palette-driven backdrop. No PRESET rebuilds all three committed fields into
# formats/scene/, shoots a PNG of each into out/, and measures the reference one against
# refs/lightfield-ref.jpg. Options and dials: docs/LIGHTFIELD.md.
.PHONY: lightfield
lightfield: ## [engine] generate a seeded, palette-driven backdrop (PRESET=ref|tide|fern)
ifdef PRESET
	node harness/author/lightfield.mjs --preset $(PRESET) --out formats/scene/_lightfield-$(PRESET).html --shot $(ARGS)
else ifdef ARGS
	node harness/author/lightfield.mjs $(ARGS)
else
	@node research/lightfield/lightfield-test.mjs
	@for p in $$(node -e "import('./core/lightfield/presets.js').then(m=>console.log(Object.keys(m.PRESETS).join(' ')))"); do node harness/author/lightfield.mjs --preset $$p --out formats/scene/_lightfield-$$p.html --shot; done
	@node research/lightfield/lightfield-compare.mjs refs/lightfield-ref.jpg out/_lightfield-ref.png
endif
