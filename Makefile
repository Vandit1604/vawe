# Vawe: render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

# Every target whose name matches a real path MUST be listed here, or make sees the directory,
# calls the target up to date and never runs it. `blueprints/` shadowed `make blueprints` this way.
.PHONY: worktrees dev check ship script animatic panels beats sheets preview storyboard-check styleframes beatsync gradients ransom-sprites docker-context build video render all look frame verify audit blueprints audit-test probe snap snap-all motion lib-test validate palette brandspec lookbook sections study photos similar ledger ledger-add feature-audit captions review install-hooks assets list clean gen-image gen-clip gen-video sim sim-audit music music-pack gallery examples docs doc-index grammar mistakes claims study-verify recreate

# make fonts: download the free, openly-licensed faces into the gitignored assets/fonts/
# (no font binary is committed; a fresh clone self-heals). Sohne is paid → drop it in fonts/local/.
fonts:
	node scripts/media/fonts.mjs

# make fonts-discover SEED=7 [COUNT=12] [CATEGORY=serif|sans-serif|display|monospace|handwriting] [JSON=1]:
# sample the live Google Fonts catalogue by popularity band and by recency, minus every family already
# named in themes/*.json and the training-data defaults (Inter, Poppins, Space Grotesk and the rest).
# Seeded and deterministic: the same seed returns the same faces, so a look stays reproducible.
# (Distinct from `make fonts`, which DOWNLOADS a fixed vendored set, and from `make font-audit`, which
# verifies those vendored faces painted. Neither can name a face you have not already used.)
fonts-discover:
	node scripts/author/fonts-discover.mjs --seed $(SEED) $(if $(COUNT),--count $(COUNT)) $(if $(CATEGORY),--category $(CATEGORY)) $(if $(filter 1,$(JSON)),--json)

# make invent-look SB=<storyboard.md> [SEED=7] [COUNT=5] [PICK=n NAME=<theme>] [JSON=1]:
# AUTHOR a look instead of picking one. Reads the storyboard's brief, proposes 4 to 6 complete
# candidate looks that each tell a DIFFERENT story about that subject (palette named after the subject's
# world + a type pairing from `make fonts-discover` + a texture stance + one sentence), photographs each
# one through the engine's own applyTheme → /tmp/invent-look/<name>-sheet.png. READ the sheet, then
# PICK=<n> writes themes/<NAME>.json and vendors its faces.
# Every other look tool here reflects a real brand or selects an existing theme; this is the third move.
invent-look:
	node scripts/author/invent-look.mjs $(SB) $(if $(SEED),--seed $(SEED)) $(if $(COUNT),--count $(COUNT)) $(if $(PICK),--pick $(PICK)) $(if $(NAME),--name $(NAME)) $(if $(FORCE),--force) $(if $(filter 1,$(JSON)),--json)

# make audio: bake every cue + music bed from PARAMETERS (core/audio-kit.mjs). No network, no
# licence, deterministic: same params -> same bytes. Replaces downloading a sample library.
audio:
	node scripts/media/audio-bake.mjs

# make audio-bed D=<file> [WRITE=1]: resolve `audio.music:"auto"` to a concrete bed from the scene's
# profile (docs/CRAFT/SOUND.md via core/audio-select.js). Prints by default; WRITE bakes it in place,
# because the render binary has no JS pre-pass and would read "auto" as a filename → silence.
audio-bed:
	node core/audio-select.js $(D) $(if $(filter 1,$(WRITE)),--write)

# make audio-check D=<file> [STRICT=1]. THE SOUND GATE: is this film's silence a decision or an
# omission? Blocks (STRICT=1) on a scene with no `audio` block, on `silent:true` with no `_why`, on an
# audio block that names nothing, and on a bed that resolves to no file. Warns on an unresolved "auto"
# and on a bed whose licence nobody has verified. `make audio-check` with no D prints the library census.
audio-check:
	node scripts/gates/audio-check.mjs $(if $(D),$(D),--all) $(if $(filter 1,$(STRICT)),--strict)

# make vo-captions D=<file> [STYLE=weightShift] [WRITE=1]: turn a VO word-timing sidecar (audio.voWords)
# into timed karaoke captions. No TTS; reads the transcript only. Prints by default; WRITE → <file>.captioned.json.
# (Distinct from `make captions`, which times captions from a plain SCRIPT string, scripts/author/captions.mjs.)
vo-captions:
	node scripts/media/vo-captions.mjs $(D) $(if $(STYLE),--style $(STYLE)) $(if $(filter 1,$(WRITE)),--write)

# make music GENRE=ambient N=0 NAME=launch: fetch a real soundtrack (Mixkit free stock music) into
#   NOTE: SFX are synthesized (`make audio`); this MUSIC fetcher is the only remaining download.
# the gitignored assets/music/ and record its provenance in credits.json. The MUSIC licence differs
# from the sfx one and is not machine-readable: confirm before commercial release.
music:
	node scripts/media/music.mjs $(if $(ID),--id $(ID)) $(GENRE) $(N) $(NAME)

# make music-pack: fetch the curated real-loop pack (lofi/chill/beat) the engine ships as its
# default sound, replacing the synthesized drone beds. core/audio-select.js maps profiles onto these.
music-pack:
	node scripts/media/music.mjs --pack

# make gallery: build the hover-to-play example showcase (out/gallery/index.html) from the flagship
# registry (formats/scene/examples.json). Render the examples first (make video / beatsync).
gallery:
	node scripts/site/examples-gallery.mjs

# make examples: rebuild the whole flagship showcase from committed sources (beatsync + render each,
# then the gallery). Reproducible fixtures. Run `make music-pack` first for the beat-synced ones.
examples: build
	node scripts/site/examples-build.mjs

# make beatmap MUSIC=assets/music/launch.wav: detect tempo + beat grid -> <name>.beats.json, so an
# edit can be built ON the music. Reports confidence; an ambient pad has no beat and it says so.
beatmap:
	node scripts/media/beatmap.mjs $(MUSIC)

# make beatsync D=formats/x/video.json MUSIC=assets/music/warm.wav [GRID=beat|downbeat] [SNAP=0.12]
# [LAYERS=1] [WRITE=1]: snap the scene's cuts and seams onto the track's beat grid so the edit lands
# ON the beat. The policy is core/beat-bind.js's, not a second copy of it: same tolerance, same joints,
# stings never. Reports drift; WRITE writes <scene>.beatsync.json. Deterministic + idempotent.
# A film that wants this on EVERY render declares `"audio":{"beatSync":true}` and needs no derivative.
beatsync:
	node scripts/media/beatsync.mjs $(D) --music $(MUSIC) $(if $(GRID),--grid $(GRID)) $(if $(SNAP),--snap $(SNAP)) $(if $(filter 1,$(LAYERS)),--layers) $(if $(filter 1,$(WRITE)),--write)

# The sound library is SYNTHESIZED, not downloaded: `make audio` bakes every cue from the Cuelume
# voicings in core/audio-kit.mjs (noise + biquad + envelope, seeded, deterministic, no licence).
# scripts/media/sfx.mjs (the old Mixkit fetcher) is kept for reference but is NOT wired to a target:
# a downloaded file named `click` turned out to be 19.6 seconds long and nothing noticed (MISTAKES #51).

# make sfx-check: is each sound effect the SHAPE its role claims? A 19.6s file named `click` is how
# a typed line came out sounding like a passing train (docs/MISTAKES.md #51).
# make spectrum MUSIC=assets/music/x.wav [FPS=30]: bake per-frame band energy beside a track, so
# layers can react to the music while renderFrame(n) stays a pure table lookup.
spectrum:
	node scripts/media/spectrum.mjs $(MUSIC) $(if $(FPS),--fps $(FPS))

# make blocks-audit: do the block FACTORIES obey the copy rules the videos are held to? A block
# ships to every caller, so an invented number or a brand default in one reaches every video.
blocks-audit:
	node scripts/gates/blocks-audit.mjs

# make layer-props [D=<file>]: does the engine READ the props a layer sets? `make expand` does this
# for blocks; the primitive path had nothing, so {"type":"glow","r":620} was accepted and dropped.
# make dead-branch: a ternary whose arms are identical, i.e. a decision that decides nothing.
# deploySuccess shipped one next to an always-true condition and its cascade was unreachable; no
# RENDER gate can see that, because the output is valid, deterministic and wrong by omission.
dead-branch:
	node scripts/gates/dead-branch.mjs

# make doc-refs · every `make <target>` and every repo path the docs NAME must exist, and every
# Makefile recipe must run a script that exists. Docs are read as instructions: a wrong one is worse
# than a missing one, because an author types it and then distrusts the whole file. `craft-coverage`
# already resolves markdown links to .md files; nothing checked a command, a backticked source path,
# or a target whose script had been deleted under it.
doc-refs:
	node scripts/gates/doc-refs.mjs

# make docs-drift: ROADMAP/PRIMITIVES list shipped effects as missing, or quote a stale count. It decayed this way twice and
# routed two planning passes at work that already existed; its own closing warning says nothing
# checked it. Now something does.
docs-drift:
	node scripts/gates/docs-drift.mjs

layer-props:
	node scripts/gates/layer-props.mjs $(D)

sfx-check:
	node scripts/gates/sfx-audit.mjs

# make canvas-purity [M=scene] [D=<file>]: do the shader/paint PIXELS depend only on n? `make probe`
# compares a DOM signature and structurally cannot see inside a canvas (docs/MISTAKES.md #64).
canvas-purity:
	node scripts/gates/canvas-purity.mjs $(if $(M),$(M),scene) $(D)

build: fonts
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
build-all: fonts ## cross-compile a render binary for every shipped platform
	@set -e; for t in darwin-arm64 darwin-amd64 linux-amd64 linux-arm64 windows-amd64; do \
	  os=$${t%%-*}; arch=$${t##*-}; ext=""; [ "$$os" = "windows" ] && ext=".exe"; \
	  echo "  building bin/vawe-$$t$$ext"; \
	  GOOS=$$os GOARCH=$$arch go build -o bin/vawe-$$t$$ext ./cmd/render; \
	done
	@echo "" && ls -lh bin/vawe-* | awk '{printf "  %-28s %s\n", $$9, $$5}'
	@echo "  NOTE: five binaries is ~55MB. scripts/dev/pack-check.mjs caps the tarball at 25MB, so"
	@echo "  publishing all five needs per-platform optionalDependencies (the esbuild/swc pattern)."

# make video D=path/to/video.json: one self-describing JSON → out/<name>.mp4
# Runs the mandatory authoring-quality ladder first (set NOCHECK=1 to skip during rapid iteration), then
# renders, then the layout/contrast/size audit (set NOAUDIT=1 to skip). The ladder is what stops an
# effect-soup video shipping silently; NOCHECK=1 is the explicit, logged waiver.
video: build
	@$(if $(NOCHECK),echo "  · author-check skipped (NOCHECK=1)",echo "▶ author-check (every step, every time; TASTE=1 gives the style findings teeth) …" && node scripts/gates/author-check.mjs $(D) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS)))
	./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT))
	@$(if $(NOAUDIT),echo "  · audit skipped (NOAUDIT=1)",echo "" && echo "▶ audit (contrast · size · safe-zone · overlap) …" && node verify/audit.mjs $(D))
	@echo "" && echo "▶ REQUIRED before shipping: make judge D=$(D)$(if $(VS), VS=$(VS)), then read /tmp/judge/sheet.png vs the rubric (docs/JUDGE.md)."

# make dev D=<file>: THE ITERATION LOOP. Build, draft-render, open. No gates, no audit, no ladder.
# This exists because the fast path was already reachable (NOCHECK=1 NOAUDIT=1) and nobody would ever
# find it. Measured on a 15s film: the whole static ladder is ~1s against an 8.4s draft render, so the
# gates were never the cost: being interrupted mid-thought was. Iterate here; prove it with `make ship`.
# Then it writes both contact sheets (`make sheets`), because the two images an author MUST read were
# separate commands nobody remembered. Set NOSHEETS=1 to skip them: they cost roughly one more render.
dev: build
	./bin/vawe $(D) --draft $(if $(WORKERS),--workers $(WORKERS),--workers 4)
	@o=out/$$(basename $(D) .json).mp4; echo "  → $$o"; open $$o 2>/dev/null || true
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node scripts/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))

# make check D=<file>: every gate, every finding, ZERO consequence. Same information `make ship`
# blocks on, printed while you are still exploring. Use it to see where a film stands without stopping.
check:
	@MODE=iterate node scripts/gates/author-check.mjs $(D) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS))

# make ship D=<file>. The ladder with its teeth in: full author-check, render, audit, seams.
# `make video` is the same render with the ladder in front of it; `ship` adds the post-render gates that
# need real pixels, so it is the one command that says a film is actually done.
# It finishes with both contact sheets (`make sheets`); NOSHEETS=1 skips them. Producing them is not the
# same as reading them: the receipt is marked `auto` and beat-check still asks you to open the sheet.
ship: build
	node scripts/gates/author-check.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(filter 1,$(TASTE)),--taste) $(if $(filter 1,$(STRICT)),--strict)
	./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT))
	node verify/audit.mjs $(D)
	node scripts/gates/seam-snap.mjs $(D)
	@$(if $(NOSHEETS),echo "  · contact sheets skipped (NOSHEETS=1)",node scripts/author/sheets.mjs $(D) $(if $(VS),--vs $(VS)))
	@echo "" && echo "▶ LAST STEP, and no gate can do it: make judge D=$(D)$(if $(VS), VS=$(VS)), then READ the sheet."

# make list: show formats + where their schema/sample live (for authoring the JSON)
list: build
	./bin/vawe --list

# make render M=scene: render a format's bundled sample.json
render: build
	./bin/vawe --module $(M) --data formats/$(M)/sample.json --out out/$(M).mp4

# make all: every format via the render queue
all: build
	./bin/vawe --all

# make look M=scene [D=<file.json>]: storyboard (key frames) for visual review
# D forwards to --data; without it both targets silently previewed sample.json while naming your scene.
look:
	node scripts/author/preview.mjs $(M) "" $(if $(D),--data $(D))

# make frame M=scene N=560 [D=<file.json>]: one exact frame
frame:
	node scripts/author/preview.mjs $(M) $(N) $(if $(D),--data $(D))

# make grammar [N=<name>]: what we have learned about how good films are BUILT, from the committed
# grammar/ store that `make study` writes. No argument prints every reference as one comparison table
# and names the ones nobody has read.
# DOC=1 regenerates docs/CRAFT/GRAMMAR.md, the cross-film page, from the same store.
grammar:
	node scripts/author/grammar.mjs $(if $(DOC),--doc,$(N))

# make mistakes [Q="…"] [N=496]: ASK the mistake log. It is 533 entries and 45% of every documented
# word in this repo, so nothing can read it whole; with no argument this prints the census and says so.
mistakes:
	node scripts/author/mistakes.mjs $(if $(N),--n $(N),$(if $(Q),$(Q)))

# make claims: check this repo's own doctrine against the films it claims to describe. Every
# quantitative claim in CRAFT/CLAUDE.md is a test over grammar/*.json; the verdict strengthens or
# reverses as references are studied.
claims:
	node scripts/author/claims.mjs

# make study-verify D=formats/scene/<scene>.json: prove `make study` measures correctly, by running it
# on a film whose answers the scene file already declares (duration, boundary times, backdrop runs).
study-verify:
	node scripts/gates/study-verify.mjs $(D) $(if $(NORENDER),--no-render)

# make recreate NAME=<grammar> [THEME=vawe] [OUT=path]: a scene SKELETON from a studied reference.
# Emits only what was MEASURED (duration, boundary times, backdrop lightness, a motion target per beat).
# Every composition decision is left as a hole, on purpose: see the header for why.
recreate:
	node scripts/author/recreate.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(OUT),--out $(OUT))

# make census: every named population in formats/scene, with the question each one answers.
# Quote a NAME in prose and print this to get the number (scripts/lib/census.mjs owns the definitions).
census:
	node scripts/lib/census.mjs

# make assets D=formats/x/topic.json [WRITE=1], fill missing icons: country→flag, brand→logo,
# else a generated topic card. Dry-run without WRITE.
assets:
	node scripts/media/assets.mjs $(D) $(if $(WRITE),--write)

# make verify: integrity + safe-zone + contact sheets (all formats)
verify:
	node verify/run.js

# make audit [M=scene] [ASPECT=16:9,9:16|all], layout audit: overlap / overflow / safe-zone /
# tight-spacing on [data-layer=critical] across sampled frames. Annotated overlays →
# /tmp/audit/<format>[.<aspect>].png. ASPECT mirrors `bin/vawe --aspect`: audit every canvas you ship,
# because a scene can pass at its own ratio and overflow every other one.
audit:
	node verify/audit.mjs $(if $(D),$(D),$(M)) $(if $(ASPECT),--aspect $(ASPECT))

# make audit-all [SCENE=<name-substring>] [ASPECT=16:9,9:16], the same layout audit, over the WHOLE
# library. `make audit` grades the one scene you have open, which is a check against NEW defects only:
# two scenes shipped dark-on-dark and stayed that way because nothing ever asked them again
# (docs/MISTAKES.md #373). Slow on purpose; an on-demand sweep, never part of the per-edit ladder.
audit-all:
	node scripts/gates/audit-scenes.mjs $(SCENE) $(if $(ASPECT),--aspect $(ASPECT))

# make audit-test: regression on both edges of `make audit`. contrast-regression proves it still
# CATCHES invisible emphasis (blue-on-blue). measure-regression proves it measures the DRAWN ink and
# not the box the author declared, which is the error this repo logged four times (#214/#216/#217/#242).
audit-test:
	node verify/contrast-regression.mjs
	node verify/measure-regression.mjs

# make snap M=<format> [SAVE=1], check a scene WITHOUT rendering video: capture/diff the per-frame
# DOM signature (bbox/transform/opacity/font/text). Baseline a refactor, then prove frames unchanged.
snap:
	node scripts/gates/scene-snap.mjs $(M) $(if $(SAVE),--save)

# make snap-all [SAVE=1] [SCENE=<name>]. The WHOLE-LIBRARY net: sweep every shipped scene, quarantine
# any that render order-dependently (non-deterministic), and baseline/diff the rest. Run before/after any
# engine-wide change (a refactor, a version bump) to prove all scenes are byte-identical or see what moved.
snap-all:
	node scripts/gates/snap-scenes.mjs $(SCENE) $(if $(SAVE),--save)

# make snap-blocks [SAVE=1] [BLOCK=<name>]: the BLOCK library's regression net, and it is the half
# snap-all cannot reach: `block` sugar is baked into a film by `make expand`, so every shipped scene
# holds layers frozen as the factory was at authoring time and editing a factory moves snap-all zero
# bytes. This diffs the layer JSON each of the 179 catalog entries returns. No render, ~0.35s.
# NOT part of `make author-check`: author-check grades ONE scene, and a block belongs to no scene.
# Run it after touching anything under blocks/, the way snap-all is run after touching core/.
snap-blocks:
	node scripts/gates/snap-blocks.mjs $(BLOCK) $(if $(SAVE),--save)

# make motion [M=<format>] [D=<file.json>] [STRIDE=2], animation-over-time audit: renders every frame
# headless (no video) and asserts the motion contract (final frame holds, reveals monotonic, payoffs
# settle before the exit, counters sane, typing completes). The check `make snap`/`make audit` can't do.
# D forwards to --data; without it the target silently audited sample.json instead of your scene.
motion:
	node scripts/gates/motion-audit.mjs $(M) $(if $(D),--data $(D)) $(if $(STRIDE),--stride $(STRIDE))

# make conformance [enums|props|paths]: does the engine DO what it says it accepts? Applies every
# declared enum value and every layer prop, and asserts the OUTPUT CHANGED. Catches the dominant bug
# class in this repo (docs/MISTAKES.md #19-28): input accepted, then silently ignored or substituted.
conformance:
	node scripts/gates/conformance.mjs $(P)

# make gate-test, MUTATION-test the gates: feed each one a fixture built to trip it and assert it
# FIRES, plus fixtures that must PASS so a gate cannot buy sensitivity with false positives.
# A gate that cannot fail reports green forever (MISTAKES #26).
gate-test:
	node scripts/gates/gate-mutation.mjs

# make coverage-reel: generate + render a reel of whatever `make coverage` says nothing exercises,
# derived from the LIVE gap so it never goes stale. Watch it: the gates only prove it did not crash.
coverage-reel:
	node scripts/author/coverage-reel.mjs
	$(MAKE) video D=formats/scene/_coverage-reel.json

# make watermark [TEXT="VAWE DRAFT"] [OPACITY=0.1]: bake the draft watermark sheet. Offline, once;
# the render only reads the finished PNG. Pass it with ./bin/vawe <scene> --watermark assets/watermark/draft.png
watermark:
	node scripts/media/watermark.mjs

# make site-counts: every capability number written on the SITE, checked against the registry it
# describes. The copy claimed 96 blocks / 44 families / 22 presets / 32 stings long after the
# registries had moved (docs/MISTAKES.md #111). Hand-typed counts about a growing registry go stale
# by default; this is what notices.
site-counts:
	node scripts/gates/site-counts.mjs

# make knobs-audit [D=<file>], DRIFT GUARD: every dial core/knobs.js advertises must actually change
# the render (a manifest that lies is worse than none). With D, also reports knobs set on a preset that
# ignores them (pointSize on extrudeText), turning a silent no-op into a message.
knobs-audit:
	node scripts/gates/knobs-audit.mjs $(D)

# make coverage, which engine vocabulary no authored scene exercises. Conformance proves a value
# works; this says whether anything USES it. WARN tier, always exits 0.
coverage:
	node scripts/gates/coverage.mjs

# make craft-coverage, keep the docs honest: every look/sting in the engine is classified in
# SELECTION.md, no doc names a removed effect, cross-links resolve REPO-WIDE, no guide is orphaned from
# an index, every indexed doc carries its `when:`/`answers:` frontmatter, and every generated index view
# is current. FAIL tier (exits 1) so the docs can't silently rot. Also runs in .githooks/pre-push,
# because a doc-only commit never touches a render gate. Doc-map detail: scripts/gates/doc-map.mjs.
craft-coverage:
	node scripts/gates/craft-coverage.mjs

# make docs, PRINT THE DOC MAP: every written thing in this repo, one line each (reach for it when…,
# it answers…). Read the line, open only the doc you need. Same map as the `vawe-docs` skill.
docs:
	@cat docs/INDEX.md

# make doc-index, regenerate every index view from the per-doc frontmatter: docs/INDEX.md, the
# `vawe-docs` skill, and the table inside docs/CRAFT/README.md. Run it after editing a doc's `when:` or
# `answers:`, or after adding a doc. The views are generated so they cannot drift from the docs.
doc-index:
	node scripts/gates/doc-map.mjs --write

# make transitions [BASIC=1], print THE TRANSITION DATABASE (core/transitions.js): every transition
# across all four mechanisms (anim/cut/sting/seam), grouped, basics marked. Decision theory: docs/CRAFT/TRANSITIONS.md.
transitions:
	node scripts/gates/transitions-catalog.mjs

# make transition-preview FX=<name> [MECH=seam|cut|sting|anim] [DIR=left|right|up|down] [TIMING=smooth|linear] [DUR=0.7]
# SEE one transition before authoring: renders a canned two-beat scene (blue A → orange B) through the
# transition and lays the window out as a labelled filmstrip → /tmp/transition-preview.png. The labels are
# EASED progress, so `TIMING=linear` vs `smooth` shows as where the motion bunches. Mechanism is inferred
# from the name when unambiguous (default seam). Inventory: `make transitions`. Theory: docs/CRAFT/TRANSITIONS.md.
transition-preview:
	node scripts/author/transition-preview.mjs

# make measure VIDEO=<file> FROM=<s> TO=<s> [EXPECT=<preset>], MEASURE a transition's real motion and
# name it in OUR vocabulary: per-frame tracks the moving element and fits the progress curve against the
# engine's own easings (core/motion.js + core/cuts.js), reporting the nearest preset + residual. Point it
# at a reference video ("what transition is this?") or at our own render + EXPECT=<preset> ("did my cut
# render as the curve I authored?"). Dependency-free (ffmpeg + Node). Notes/limits: docs/CRAFT/MEASURE.md.
measure:
	node scripts/author/measure-motion.mjs $(VIDEO) $(FROM) $(TO) $(EXPECT)

# make lib-test: fast pure-JS asserts for the core/motion.js motion primitives (no browser)
lib-test:
	node scripts/gates/lib-test.mjs

# make silent-check: is any named vocabulary still resolved with a silent default? A wrong name must
# not become a plausible substitute; absence may keep its documented default. core/registry.js removes
# the ability to BUILD such a fallback, this catches one written by hand. docs/MISTAKES.md #362.
silent-check:
	node scripts/gates/silent-fallback.mjs

# make unused, which registered effects has no shipped scene ever named? A REPORT, not a rule: it
# always exits 0. Read a zero as "nobody can find it", "it does not work", or "something else does it
# better": three effects nobody used turned out to be broken. Do NOT treat the count as a target (#359).
unused:
	node scripts/gates/unused.mjs

# make lookbook URL=https://site.com NAME=brand, screenshot the site (full page + viewports) for
# art direction study: derive the video's design language from the brand's own look, no canned styles.
lookbook:
	node scripts/brand/lookbook.mjs $(URL) $(NAME)

# make palette IMG=assets/brands/<brand>/sections/01-*.png: EYEDROP the real hero pixels →
# dominant colours + LIGHT/DARK dominance (grounded, not a heuristic) + a swatch card to /tmp/palette.png.
# Author themes/<brand>.json from THIS, then verify the video with `make beats VS=<brand>`.
palette:
	node scripts/brand/palette.mjs $(IMG)

# make brandspec URL=https://site.com, READ the site's real CSS + computed styles (don't guess): the
# 1-3 real font families with the WEIGHTS actually used (→ primary/secondary/accent), declared :root
# design tokens (--color-*/--font-*), key colours with WCAG contrast, radius. Run this BEFORE authoring
# a theme: the accurate source for weight/accent that eyedrop (pixels) can't give (it read creed's
# accent as the sky-photo blue; the CSS says #2563eb). Pair with `make palette` for dominance.
brandspec:
	node scripts/brand/brandspec.mjs $(URL)

sections:
	node scripts/brand/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make study VIDEO=refs/ref.mp4 [NAME=… THRESH=0.3]: the film-side twin of `make sections`. Reads a
# REFERENCE video: shot boundaries (ffmpeg scene score), a contact sheet (in/mid/out per shot) and a
# study.md whose four judgement columns you fill by eye. Writes refs/<name>/ (gitignored: study the
# grammar, never ship the frames). docs/CRAFT/REFERENCE-STUDY.md
study:
	node scripts/media/study.mjs $(VIDEO) $(NAME) $(if $(THRESH),--threshold $(THRESH))

# make preview HTML=path/frag.html [THEME=linear] [BG=#hex] [W=1400] [SERVE=1], render a single
# hand-written fragment (or a captured component JSON) STANDALONE on the theme bg → /tmp/preview.png.
# SERVE=1 keeps it LIVE in your browser instead (real fonts/assets). "is this HTML doing what I want?".
preview:
	node scripts/author/preview-fragment.mjs $(HTML) $(if $(THEME),--theme $(THEME)) $(if $(BG),--bg $(BG)) $(if $(W),--w $(W)) $(if $(SERVE),--serve)

# make beats D=formats/x/video.json [VS=brand]: first/mid/last frame of every beat in one contact
# sheet → /tmp/beats/$(notdir $(basename $(D))).png. VS=brand stacks each beat beside its source-section shot (fidelity diff).
# make cutout SRC=<photo> NAME=<name>: remove a photograph's background so it becomes a PROP.
# A rectangular photo cannot be both recognisable and edge-free in a frame it does not fill. With the
# background gone the ground is free, light can sit behind the subject, and a layer can pass in front of
# it. Local (rembg in .venv-tools), no network after the first run, and the alpha is verified.
cutout:
	node scripts/media/cutout.mjs $(SRC) $(NAME)

# make waivers [D=<file>]: every blocking gate can be waived, and a waiver costs nothing and is
# invisible afterwards. So the failure mode is not one bad waiver, it is the SAME waiver film after film
# until the rule is dead and nothing said so. With D= it tells you whether the break you are about to
# make is already a habit; without it, it censuses the library. It never blocks: a gate that blocked on
# this would itself be waived.
waivers:
	node scripts/gates/waiver-drift.mjs $(D)

# make legacy [ADOPT=<rule>] [STAMP=1]: THE RATCHET. A new rule fails the whole library on its first
# run, and both usual answers are worse than the red: backfilling a judgement rule produces fake work,
# and waiting for a threshold leaves the rule toothless. So the films that predate a rule are recorded
# as LEGACY in a generated manifest, and everything new must comply at once. Legacy is NOT a waiver: a
# waiver is a decision with a reason in the scene, legacy means nobody has looked yet.
# ADOPT freezes a rule's legacy set once, on the day it is promoted, and refuses to run twice. STAMP can
# only remove rows (fixed, deleted, or EDITED since). Nothing can add one, so the ratchet only tightens.
# make preflight D=<scene.json>, the nine decisions from docs/CRAFT/README.md put in front of you for
# THIS film, plus the arsenal ranked against what the film says it is, then a receipt. It records only
# with --record: the ratchet runs gates bare to see which films fail them, and a checker that certifies
# on that invocation would excuse the whole library (it did, once, for all 134).
preflight: ## the decisions that belong BEFORE the JSON, recorded for this version of the scene
	node scripts/gates/preflight.mjs $(D) --record

legacy:
	node scripts/gates/author-check.mjs --legacy $(if $(ADOPT),--adopt $(ADOPT)) $(if $(filter 1,$(STAMP)),--stamp)

# make draft D=<scene.json> STAGE=85|95: hand over a draft at a DECLARED level of finish.
# Without one, review is a guess: a reviewer who thinks they are seeing a ship candidate flags the
# placeholder photo, and one who thinks they are seeing a rough cut lets a real defect through. 85% locks
# structure and timing and leaves polish open; 95% adds the checks that need real pixels. It records
# every warning carried to clear the bar, so the next reviewer reads what was knowingly accepted.
draft:
	node scripts/gates/draft-check.mjs $(D) --stage $(if $(STAGE),$(STAGE),85)

# make treatment SB=<storyboard.md>: WHY this film looks like this, written while the answer is known.
# A treatment's real content is what was TURNED DOWN and on what grounds, and that exists for exactly one
# moment: while the concept set is still on the table. `make concept-pick` records the rejected
# directions into a receipt so this stage can read them back. Regenerating refreshes only the MEASURED
# block; your prose is never touched, because a tool that overwrites what you wrote is one you stop running.
treatment:
	node scripts/author/treatment.mjs $(SB) $(if $(THEME),--theme $(THEME))

# make concept SB=<storyboard.md> [N=3]: N DIRECTIONS FOR ONE BRIEF, before any of them is built.
# The missing first stage: every other stage refines a single idea and nothing ever produced a second
# one. Each direction commits to a thread, a pace and a look at once, the three decisions that actually
# change a film, and leaves every word to you, because a tool that invents copy produces options that
# are all wrong alike. docs/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md has the threads.
concept:
	node scripts/author/concept.mjs $(SB) $(if $(N),--n $(N)) $(if $(SEED),--seed $(SEED)) $(if $(filter 1,$(STRICT)),--strict)

# make concept-pick SB=<storyboard.md> OPTION=<slug>: promote one direction and record the rest.
# The rejected set is what a treatment argues against; it is only available at the moment of choosing.
concept-pick:
	node scripts/author/concept.mjs $(SB) --pick $(OPTION)

# make approve STAGE=<stage> D=<file>: SIGN OFF a stage for this exact file. Records a content hash, so
# editing the file silently withdraws its own approval; an approval that outlives what it approved is
# worse than none, because it reads as verified. Stages: beats · concept · treatment · draft.
approve:
	@node -e "import('./scripts/lib/receipt.mjs').then(({writeReceipt})=>{const r=writeReceipt(process.argv[1],process.argv[2],{by:'make approve'});console.log(r?'  ✓ '+process.argv[1]+' approved for '+process.argv[2]:'  ✗ could not read '+process.argv[2]);})" "$(STAGE)" "$(D)"

beats:
	node scripts/author/beats.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(STRIDE),--stride $(STRIDE))

# make sheets D=<file> [VS=brand], BOTH review contact sheets from ONE browser: the beat sheet
# (/tmp/beats/<name>.png, where each beat LANDS) and the reveal sheet (/tmp/reveal/<name>.png, how each
# beat ARRIVES). `make dev` and `make ship` run this for you, so the sheets are always current; it is
# here as its own target for the times you want them without a render.
# It does NOT count as having looked: the receipt it writes is marked `auto`, and beat-check keeps
# nagging until `make beats` or `make reveal` signs the look off. See scripts/author/sheets.mjs.
sheets:
	node scripts/author/sheets.mjs $(D) $(if $(VS),--vs $(VS))

# make sheet NAME=brand [SERVE=1], DESIGN SHEET: every captured element on one page (on the theme bg),
# labelled with size + font-substitution warnings. Review + fix the raw material BEFORE building a video.
# Default → /tmp/sheet.png (tall contact sheet). SERVE=1 → live in your browser (real fonts, scrollable).
sheet:
	node scripts/brand/design-sheet.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(SERVE),--serve)


# make theme-remix PRESET=editorial BRAND=acme [BG=#hex ACCENT=#hex TEXT=#hex], pick a design-system
# PRESET (presets/*.json) and remix it onto a brand's base+accent → a complete themes/<brand>.json. The
# another engine "pick a preset, paint the brand into it" move: good coherent design in one command, not
# hand-authored per pixel. Reads assets/brands/<brand>/palette.json when BG/ACCENT are omitted.
theme-remix:
	node scripts/brand/theme-remix.mjs --preset $(PRESET) --brand $(BRAND) $(if $(BG),--bg "$(BG)") $(if $(ACCENT),--accent "$(ACCENT)") $(if $(TEXT),--text "$(TEXT)")

# make tts (SCRIPT=narration.txt | TEXT="…") OUT=formats/scene/<name>.vo [VOICE=Samantha], LOCAL narration:
# synthesize a voiceover WAV + word-timing sidecar offline with macOS `say` (no cloud, no key). Writes
# <OUT>.wav + <OUT>.words.json; wire them into the scene's audio block: { "vo":…, "voWords":… }.
tts:
	node scripts/media/tts.mjs $(if $(SCRIPT),--script $(SCRIPT)) $(if $(TEXT),--text "$(TEXT)") --out $(OUT) $(if $(VOICE),--voice $(VOICE))

# make script SB=<storyboard.md> [STRICT=1]: THE WORDS, as a two-column AV script, before a picture
# exists. Lays AUDIO beside VISUAL because the layout is the check: a narration that restates the card
# is one channel and an echo, not two channels, and that is invisible in a list and obvious in columns.
# Timing here is a 150wpm ESTIMATE on purpose, so it stays instant while you write; `make animatic`
# owns the measured clock.
script:
	node scripts/author/script.mjs $(SB) $(if $(STRICT),--strict)

# make animatic SB=<storyboard.md> [VOICE=Samantha]: CUT THE PICTURE TO THE SOUND before building the
# film. Synthesizes a scratch read of each beat's `narration:` and measures it; beats with no narration
# are timed by READING speed instead. Then it lays grey slots on that clock and renders draft, so the
# question "does this beat have room for its own copy" is answered by the copy rather than by the
# author's estimate of it. A storyboard grades itself; this grades it against a clock.
animatic:
	node scripts/author/animatic.mjs $(SB) $(if $(VOICE),--voice $(VOICE)) $(if $(OUT),--out $(OUT))
	@f=$$(node scripts/author/animatic.mjs $(SB) $(if $(OUT),--out $(OUT)) --path); \
	 ./bin/vawe $$f --draft --workers 2

# make panels SB=<storyboard.md>: THE STORYBOARD STOP, AS A PICTURE. One rough grey still per beat,
# tiled into a sheet, before any scene JSON exists. `shot:` drives the size of the subject box and any
# placement the prose states drives where it sits, so a wide and a close are different pictures and a
# beat holding two seconds on one word reads as the hole it is. Deliberately grey: this is BLOCKING, not
# drawing. The animatic checks the clock, styleframes check the look, this checks the composition.
panels:
	node scripts/author/panels.mjs $(SB) $(if $(OUT),--out $(OUT))

# make styleframes D=<scene.json> [N=4]: THE LOOK, BEFORE THE MOTION IS TRUSTED. Renders the few most
# visually DISTINCT settled moments at full scale as individual stills, plus a sheet, and runs only the
# LOOK gates (designspec). Answers "is this the right-looking film at all", which no static gate
# can: `onefile` passed every gate with a backdrop that rendered as loud blue blooms, and one still
# showed it in three seconds. Approve these, then animate.
styleframes:
	node scripts/author/styleframes.mjs $(D) $(if $(N),--n $(N))

# make quiz [NAME=<brand>] [URL=<url>]: THE BRIEF, before anything is authored. Prints an
# AskUserQuestion payload built from the brand's own sections + the DIRECTIONS/PROFILES registries, so the
# options are the site's real words and the engine's real vocabulary. Refuses to ask genericly when a URL
# is known and no site study exists (a generic question wastes the answer). Never names an effect.
quiz:
	node scripts/author/quiz.mjs --ask $(if $(NAME),--name $(NAME)) $(if $(URL),--url $(URL)) $(if $(SLUG),--slug $(SLUG))

# make quiz-round2 PLACEMENT=<k> JOB=<k>: the branched follow-ups, which emit NOTHING already decided.
quiz-round2:
	node scripts/author/quiz.mjs --round 2 --placement $(PLACEMENT) --job $(JOB)

# make quiz-apply ANSWERS=<file.json> NAME=<brand> [OUT=<path>], the answers become a STORYBOARD.
# It delegates the beats to storyboard-draft (one writer, one beat per real section) and locks the
# frontmatter the brief decided: arc, format, duration, and `threads:`, the field storyboard-check
# hard-errors on for a short film. It does NOT write the .intent.json sidecar; `make intent` does, through
# the parser the gate and the animatic share.
quiz-apply:
	node scripts/author/quiz.mjs --apply --answers $(ANSWERS) --name $(NAME) $(if $(OUT),--out $(OUT)) $(if $(SLUG),--slug $(SLUG))

# make quiz-look SB=<storyboard.md> [N=3]: THE LOOK, SETTLED BY PICTURE. Runs `concept` for N directions
# (each committing to a thread, a pace and a look, with their divergence MEASURED by similarity.mjs), draws
# `panels` for each, and prints the pick-one question with a sheet path per option. Of 23 published studio
# briefs not one asks a client to describe motion in words: every good instrument replaces an adjective
# with an artefact. Two or three options, never five. READ THE SHEETS.
quiz-look:
	node scripts/author/quiz.mjs --look --sb $(SB) $(if $(N),--n $(N))

# make storyboard-check SB=path/to/STORYBOARD.md. The storyboard-as-PROPOSAL gate: a one-sentence
# message + audience/arc/format/duration, and per beat a type + on-screen cues + a WHY. Enforces that the
# decisions that make a video good were made and written down BEFORE the JSON. Template: docs/CRAFT/STORYBOARD-TEMPLATE.md
storyboard-check:
	node scripts/gates/storyboard-check.mjs $(SB)

# make storyboard-draft NAME=<brand> [MSG="one sentence" DUR=30 FORMAT=landscape], auto-draft a
# STORYBOARD.md skeleton from a captured sections.json (one beat per real section, in the site's order,
# pre-wired with type + capture command + suggested blueprint). Fill the <…> fields, then storyboard-check.
storyboard-draft:
	node scripts/brand/storyboard-draft.mjs

# make intent SB=<storyboard.md> [D=formats/scene/<topic>.json], export the storyboard's per-beat whys
# into a <topic>.intent.json sidecar, so author-check's `inspect` VERIFIES the render delivers each beat's
# on-screen copy + motion (turns "every beat earns its frame" from doctrine into a checked contract).
intent:
	node scripts/brand/intent-from-storyboard.mjs

# make designspec-check D=<scene.json> [STRICT=1]. THE DESIGN-SPEC LOCK: the theme is the locked visual
# system; flag any layer using an off-palette chromatic colour or a non-role font. The look twin of the
# storyboard gate. Runs inside author-check every time; TASTE=1 makes its findings block.
# Optional radii/shadow lock via scene "spec".
# ONE gate, one name. Beside the colour/font lock it runs OUR anti-slop rule table
# (scripts/lib/designspec-rules.mjs): copy tells and effect doses, over the scene's words AND the html
# fragments it names. Replaces the vendored impeccable detector rule by rule.
#   make designspec-check SELFTEST=1: every rule must fire on its own sample and stay quiet on its counter-sample
#   make designspec-check CENSUS=1: the whole library, one line per scene with a finding
designspec-check:
	node scripts/gates/designspec-check.mjs $(if $(filter 1,$(SELFTEST)),--self-test,$(if $(filter 1,$(CENSUS)),--census,$(D))) $(if $(STRICT),--strict,)


# make copy-check D=<scene.json> [STRICT=1]. THE COPY GATE: on-screen writing tells (hook >12 words /
# weak opener, marketing jargon, vague quantifiers, restated headlines, a big number as flat text). The
# words are the video's voice. Runs inside author-check every time; TASTE=1 makes its findings block.
copy-check:
	node scripts/gates/copy-check.mjs $(D) $(if $(STRICT),--strict,)

# make asset-check D=<scene.json> [STRICT=1], ASSET-READINESS PREFLIGHT: confirm every referenced image /
# icon / captured component / VO file exists on disk before you render (a missing one = a broken image or
# silent gap). Prints how to fetch each. Advisory in author-check; STRICT=1 blocks.
asset-check:
	node scripts/gates/asset-check.mjs $(D) $(if $(STRICT),--strict,)

# make pace-from-vo VO=<file>.words.json [BEATS=n], SCRIPT-FIRST PACING: propose beat start/durations
# timed to the narration (from a voWords sidecar) so the reveals land on the voice. Proposes; never mutates.
pace-from-vo:
	node scripts/media/pace-from-vo.mjs

# make studio D=formats/scene/<file>.json [PORT=8799]: LIVE scrubbable preview (no mp4 render). Serves
# the scene in a browser with a frame slider + play; scrub/step to iterate, edit the JSON + reload. Under
# it, a TIMELINE: a bar per layer against a seconds/frames ruler, cuts/seams/stings marked, enter/exit
# ramps shaded off the settled middle, and every dead-air hole (beat-check) painted as a hazard band.
# Drag the timeline to seek. Dev tooling only (drives the engine's own renderFrame(n)); Ctrl-C to stop.
# EDITING, not just viewing: turn on `key` mode, click a layer's bar, scrub to a frame, drag it on the
# stage. That writes a motion keyframe into the scene at that frame, surgically, the file's hand
# formatting survives and a save that changes nothing is a zero-byte diff (scripts/author/patch-motion.mjs).
# `undo` walks back through the session. docs/CRAFT/KEYED-MOTION.md is what you are authoring toward.
studio:
	node scripts/dev/studio.mjs $(D)

# make seam-check D=formats/x/video.json, SAMPLE THE SEAMS: pull the frames straddling every transition
# (cut/seam/sting/beat boundary) out of the RENDERED mp4 and flag a luminance flash in the overlap, the
# black-flash / collision class the center-sampling gates (beats/audit/probe) structurally miss (#138).
# Requires out/<name>.mp4 (render first). Sheet → /tmp/seams/$(notdir $(basename $(D))).png (read it, the eye is the backstop).
seam-check:
	node scripts/gates/seam-snap.mjs $(D)

# make similar [D="a.json b.json"], sameness audit: score authored videos pairwise (motion vocab
# + beat structure + layout). Cross-brand SAME (>0.75) fails; the anti-template gate.
similar:
	node scripts/gates/similarity.mjs $(D)

# make feature-audit, static utilization report: framework vocabulary (kinetic presets / cuts /
# shader stings) + capability primitives (group/motion/spring/fitH…) vs what authored videos use.
# Surfaces under-adopted primitives + preset-monotony. WARN tier (always exits 0).
feature-audit:
	node scripts/gates/feature-audit.mjs

# make captions D=formats/x/video.json TEXT="script": auto-time a script into muted-social burned-in
# subtitles (captionMode:pop). Deterministic (time proportional to word count). See scripts/author/captions.mjs.
captions:
	node scripts/author/captions.mjs $(D) "$(TEXT)"

# make ledger D=formats/x/video.json: check a design against ALL shipped designs (cross-video
# memory); make ledger-add D=… logs it after shipping.
ledger:
	node scripts/gates/ledger.mjs check $(D)
ledger-add:
	node scripts/gates/ledger.mjs add $(D)

# make photos Q="server room" NAME=brand [N=4], fetch openly-licensed photos (Openverse: cc0/pdm/by)
# with attribution recorded to credits.json. Use in clipped image layers with ken burns zoom.
photos:
	node scripts/brand/photos.mjs "$(Q)" $(NAME) $(if $(N),--n $(N))

# make capture-scene URL=… SEL="section" NAME=brand LABEL=intake PARTS="sel1,sel2", capture an
# ANIMATED site section as parts (relative geometry) to re-stage with our motion primitives.
capture-scene:
	node scripts/author/capture-scene.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) --parts "$(PARTS)"

# make capture-motion URL=… SEL="section" [ONLOAD=1] [DUR=2.5], WATCH a real element animate and emit a
# motion track (from→rest keyframes) to replay the site's actual move. Scroll-triggered by default; ONLOAD=1
# for on-load reveals. The motion twin of brandspec: measure the animation, don't guess it.
capture-motion:
	node scripts/author/capture-motion.mjs $(URL) "$(SEL)" $(if $(ONLOAD),--onload) $(if $(DUR),--dur $(DUR))

# ---- generated media (kie.ai; needs KIE_API_KEY or a gitignored .kie.key) ----
# make gen-image Q="a neon server room" NAME=hero [ASPECT=16:9], generate an image → assets/gen/<NAME>.png
# (use it as a normal { "type": "image", "src": "/assets/gen/<NAME>.png" } layer).
gen-image:
	node scripts/media/kie.mjs image "$(Q)" --out assets/gen/$(NAME).png $(if $(ASPECT),--aspect $(ASPECT))

# make gen-clip IN=path/to.mp4 NAME=city [FPS=30] [W=720]: extract ANY mp4 (a kie.ai generation or a
# local file) to a DETERMINISTIC frame sequence + manifest → assets/gen/<NAME>/ (use as a `clip` layer).
gen-clip:
	node scripts/media/gen-clip.mjs $(IN) $(NAME) $(if $(FPS),--fps $(FPS)) $(if $(W),--w $(W))

# make gen-video Q="a drone shot over a city" NAME=city [ASPECT=16:9], generate a video AND extract it to a
# clip in one step (a deterministic `clip` layer). Chains kie.ai video → gen-clip.
gen-video:
	node scripts/media/kie.mjs video "$(Q)" --out assets/gen/$(NAME).mp4 $(if $(ASPECT),--aspect $(ASPECT))
	node scripts/media/gen-clip.mjs assets/gen/$(NAME).mp4 $(NAME)

# make capture URL=… SEL=".card" NAME=brand LABEL=pricing: lift a REAL UI component off a live site
# (its HTML + computed CSS) into an animatable `component` scene fragment. See scripts/author/capture-component.mjs.
capture:
	node scripts/author/capture-component.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) $(if $(LS),--localstorage "$(LS)") $(if $(SETTLE),--settle $(SETTLE))

# make validate [D=formats/x/topic.json]: check data + inline theme against the format schema.
# No D = validate every formats/*/sample.json. Same validator boot() runs before rendering.
validate:
	node core/validate.mjs $(D)

# make schema-check: assert every layer prop the engine (scene.html) reads is defined in schema.json
# (catches drift like a new primitive that shipped without a schema entry). Exits 1 on drift.
schema-check:
	node scripts/gates/schema-drift.mjs

# make schema-write: regenerate every DERIVED part of schema.json (the layerProps table + the enums
# that copy a code registry) so a registry that grew needs no second, hand edit. schema-check verifies.
schema-write:
	node scripts/gates/schema-drift.mjs --write

# make lint-test: regression asserts for validate's lintData (missing-duration / typing+markup /
# scene-collision). Each rule caught a real bug this session; this pins that it still fires.
lint-test:
	node scripts/gates/lint-test.mjs

# make engine-sync [CHECK=1]: publish the engine into site/public, which is what the site's
# in-browser engine actually boots. Runs automatically on the site's prebuild; this target is for
# running it (or checking it) without a site build. CHECK=1 only reports.
.PHONY: engine-sync
engine-sync:
	@node scripts/site/site-engine.mjs $(if $(CHECK),--check,)

# make docker-check: will the image carry what the Dockerfile copies? Reads the COPY lines and
# applies .dockerignore. A mismatch here is invisible locally and fails the deploy.
.PHONY: docker-check
docker-check:
	@node scripts/site/docker-context-check.mjs

.PHONY: worktrees
# Retire agent worktrees whose work has landed. Reports by default; PRUNE=1 removes.
# Content is the authority, never the commit graph: agent work here is often copied out rather than
# merged (films are gitignored), so a branch whose commit never merged can still be fully landed.
# A worktree holding anything unproven is left alone and told how to rescue it.
worktrees:
	@node scripts/dev/worktree-prune.mjs $(if $(PRUNE),--prune,)

# make review. One-command health snapshot: lib-test + layout audit + a master overlay sheet
# (/tmp/review.png). Heavier gates stay separate: make probe (purity), make verify (render integrity).
review:
	node verify/review.mjs

# make probe [M=scene]: assert renderFrame(n) is PURE in n (byte-identical regardless of
# render order). Guards sharded/parallel rendering. No M = every format.
probe:
	@if [ -n "$(M)" ]; then node scripts/gates/probe-purity.mjs $(M); else \
		for d in formats/*/scene.html; do f=$$(basename $$(dirname $$d)); \
		node scripts/gates/probe-purity.mjs $$f || exit 1; done; fi

# make font-audit [D=formats/scene/x.json] [M=scene]: assert every family the scene renders is
# actually vendored, loaded and painting. Catches the silent substitution that shipped Geist,
# Anybody and Manrope in the wrong typeface. Writes out/<name>.fonts.json. Exits 1 on any non-OK.
# (Distinct from `make fonts`, which DOWNLOADS the faces.)
font-audit:
	node scripts/gates/font-audit.mjs $(if $(M),$(M),scene) $(D)

# make install-hooks: activate the version-controlled git hooks (pre-push runs the framework gates)
install-hooks:
	git config core.hooksPath .githooks
	@echo "✓ git hooks active (.githooks): pre-push runs schema-check + lib-test"

clean:
	rm -rf bin out/*.mp4

# make author-check D=<file>: THE LADDER. Every step runs, every time; there is no opt-in half.
# TASTE=1 does not decide whether the style steps run. It decides whether their findings BLOCK.
author-check: ## the whole authoring ladder, every step every time (D=<file> [STRICT=1] [TASTE=1=block on style] [VS=<brand>])
	node scripts/gates/author-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict) $(if $(filter 1,$(TASTE)),--taste) $(if $(VS),--vs $(VS))

# Runs inside author-check every time. Here on its own when you want only this finding.
direction-floor: ## ambition floor, fail a plain slideshow (too little motion) (D=<file> [STRICT=1])
	node scripts/gates/direction-floor.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

beat-check: ## timeline gate: dead air, empty last frame, empty cut window, dead backdrop (D=<file> [STRICT=1])
	node scripts/gates/beat-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

# make impeccable D="a.html b.html": the bundled impeccable anti-slop detector on raw HTML fragments
# (local, no network, token-efficient). the RENDERED-scene twin of this was retired (docs/MISTAKES.md #326);
# this is for a hand-written fragment BEFORE it goes into a scene. Build HTML through impeccable, not by eye.
impeccable: ## impeccable detector on raw HTML fragment(s) (D=<file...>)
	node .claude/skills/impeccable/scripts/detect.mjs --json $(D)

blueprints: ## catalog the directed-motion beat blueprints (blueprints/index.mjs)
	node scripts/site/blueprints-catalog.mjs

# make arsenal Q="a page scrolling under a tilt", ONE ranked search across every vocabulary the engine
# names: beats, effects, camera moves, cuts, seams, looks, anims. It owns no list; `defineRegistry`
# already carries each name's kind, slot and blurb, and blueprints/index.mjs already carries a prose
# sentence per beat. Built because the census is unambiguous: the {type:"beat"} mechanism is used by 2
# of 153 scenes and EXIT_FX by none, which is what happens when 337 named things are reachable only by
# reading an 849-line generated file. CENSUS=1 lists what nothing uses.
arsenal: ## search the whole arsenal in plain english (Q="..."), or CENSUS=1 for what is never used
ifeq ($(CENSUS),1)
	node scripts/author/arsenal.mjs --census
else
	node scripts/author/arsenal.mjs "$(Q)" $(if $(KIND),--kind "$(KIND)") $(if $(N),--n $(N))
endif

# make track SHAPE=pan TO=-600 DUR=1.25 [D=<scene.json> LAYER=<n>], a hand-keyed motion track from a
# MEASURED shape rather than a preset name. studio's keyframe mode writes keys by DRAGGING on the stage,
# which an agent cannot do, so the cheap path existed for a person and not for the author who writes
# most of these scenes. docs/CRAFT/KEYED-MOTION.md.
track: ## emit a keyed motion track (SHAPE=pan|blast|drift|enter|exit), optionally patch it into D
	node scripts/author/track.mjs $(or $(SHAPE),pan) $(if $(TO),--to $(TO)) $(if $(DUR),--dur $(DUR)) \
	  $(if $(FROM),--from $(FROM)) $(if $(AMP),--amp $(AMP)) $(if $(AXIS),--axis $(AXIS)) \
	  $(if $(OFFSET),--offset $(OFFSET)) $(if $(D),--scene $(D)) $(if $(LAYER),--layer $(LAYER))

# make mcp-smoke, end-to-end over the real MCP server: connects, reads the guide, refuses three leak
# vectors, drafts a scene. It is the only thing that exercises that path, and it sat FAILING for a while
# because it was wired to no target and nobody ran it (its scene declared no `bg`, which is required).
mcp-smoke:
	node mcp/smoke.mjs --no-render

effects: ## regenerate docs/EFFECTS.md. The whole arsenal in one place (from the registries)
	node scripts/site/effects-catalog.mjs
	node scripts/site/effects-json.mjs

# make effects-json [CHECK=1]. The site's copy of the same arsenal: site/lib/effects.json plus one
# playable scene per previewable effect. Same family list as docs/EFFECTS.md, imported not restated.
.PHONY: effects-json
effects-json: ## regenerate the /showcase/effects index (and its preview scenes) from the registries
	@node scripts/site/effects-json.mjs $(if $(CHECK),--check,)

# make effect-posters [ONLY=family-or-name]  · one mid-motion still per previewable effect, shot from
# the real scenes effects-json just wrote. Run it after `make effects-json` changes which effects are
# previewable, or to re-shoot one family (ONLY=backgrounds) after tuning its poster frame.
.PHONY: effect-posters
effect-posters: ## regenerate the /showcase/effects poster stills (site/public/assets/effects/*.jpg)
	node scripts/site/effect-posters.mjs $(if $(ONLY),--only $(ONLY),)

# make globe-dots [SPACING=2.2]: re-bake core/globe-dots.js from Natural Earth. Run this only when
# the spacing or the source changes; the output is committed and the runtime never fetches anything.
.PHONY: globe-dots
globe-dots:
	node scripts/media/globe-dots.mjs $(if $(SPACING),--spacing $(SPACING))

# make pace-check [D=scene.json]: events per second, and the longest stretch where nothing arrives or
# leaves. No D prints a census across the committed library.
.PHONY: pace-check
pace-check:
	node scripts/gates/pace-check.mjs $(D)

# make paints-nothing [D=scene.json] [STRICT=1]: did each layer actually paint anything in its own box?
# Renders the scene, screenshots a layer's box against itself hidden, and diffs the PIXELS (a DOM probe
# passes a masked-to-nothing layer, this cannot). No D sweeps every formats/scene/*.json. REPORTS-tier:
# it never blocks without STRICT=1, because the library has never been held to this rule before today.
.PHONY: paints-nothing
paints-nothing: ## does each layer paint anything in its own box? pixel diff, not DOM (D=<file> [STRICT=1])
	node scripts/gates/paints-nothing.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

arsenal-check: ## fail if the engine exports a capability docs/EFFECTS.md never mentions
	node scripts/gates/arsenal-check.mjs

effects-check: ## fail if docs/EFFECTS.md is stale vs the registries
	node scripts/site/effects-catalog.mjs --check

vocab: ## regenerate docs/CRAFT/VOCABULARY.md. The plain words (feel/duration/camera) from core/vocab.js
	node scripts/site/vocab-catalog.mjs

vocab-check: ## fail if docs/CRAFT/VOCABULARY.md is stale vs core/vocab.js
	node scripts/site/vocab-catalog.mjs --check

critique: ## value-gate, flag hollow/low-value beats (D=<file>)
	node scripts/gates/critique.mjs $(D)

compare: ## variant selection: tile candidate frames to pick the best (args in ARGS)
	node scripts/gates/compare.mjs $(ARGS)

expand: ## expand {type:block} + {type:comp} sugar into real layers (D=<file>)
	node scripts/author/expand-blocks.mjs $(D)

catalog: build ## render the block registry to paged sheets (browse the arsenal)
	node scripts/site/blocks-catalog.mjs
	@# render only pages whose JSON changed since their mp4 (blocks-catalog writes-on-change): the
	@# renderer's frame-dedup makes re-renders of UNCHANGED pages pixel-different (worker-order picks
	@# a different representative frame per static group), which churns every cropped clip in git.
	@for f in formats/scene/_catalog-*.json; do \
	  m=out/_catalog-$$(basename $$f .json | sed 's/_catalog-//').mp4; \
	  if [ ! -f $$m ] || [ $$f -nt $$m ]; then ./bin/vawe $$f --draft || exit 1; else echo "  · $$m up to date"; fi; \
	done
	@echo "→ out/_catalog-*.mp4 (one page per file)"

blocks-docs: ## regenerate the docs/BLOCKS.md table from the manifest
	node scripts/site/blocks-docs.mjs

blocks-json: ## regenerate site/lib/blocks.json (the site's grid) from the manifest
	node scripts/site/blocks-json.mjs

scenes-json: ## check site/public/scenes/ against formats/scene/ (WRITE=1 to rewrite)
	node scripts/site/scenes-json.mjs $(if $(WRITE),--write,)

films-json: ## check site/lib/films.json against the rendered films (WRITE=1 to rewrite)
	node scripts/site/films-json.mjs $(if $(WRITE),--write,)

# make site-check: everything the SITE publishes, checked against the thing that produced it.
# These three gates existed and nothing chained them, so they ran when somebody remembered. That is
# how three shipped films drifted from their sources at once: one rendered from a scene edit later
# lost in a merge, one committed before its sound existed, one still 9:16 while its film was 16:9.
# A gate nobody runs is not a gate.
site-check: scenes-json films-json site-counts ## check every published artifact against its source

# make code-quality: the codebase may get simpler, never more tangled.
# A RATCHET, not a threshold: 334 findings exist today, and a threshold would fail every build on day
# one, which is how a rule gets waived by reflex and quietly repealed. This holds the current line and
# lets it move only downward. WRITE=1 accepts the current state, which is how you bank a cleanup.
code-quality: ## refuse code that is more tangled than the baseline (WRITE=1 to accept the current state)
	node scripts/gates/code-quality.mjs $(if $(WRITE),--write,)

# make code-quality-top: what is worst right now, ranked. A number here is a question, not a verdict.
code-quality-top: ## the 25 most tangled functions in the repo
	node scripts/gates/code-quality.mjs --top

# make no-emdash: the house rule, enforced. The owner's standing rule bans the em dash everywhere,
# and this repo held about 6000 of them, including inside the engine's own error messages. The gate
# prints what is still out of scope rather than hiding it, so the remaining debt is never silent.
no-emdash: ## refuse an em dash anywhere the house rule covers
	node scripts/dev/no-emdash.mjs


# make og: the social card. Its source is site/og/card.html, which reads the SITE's tokens and the
# SITE's vendored fonts, so the card cannot drift from the site it advertises the way an exported PNG
# does. The three frames it shows are pulled from three shipped films, not mocked up.
og: ## render site/public/assets/og.png from site/og/card.html
	node scripts/site/og-image.mjs


	@echo "\u2713 site: published scenes, films and counts all agree with their sources"

# make blocks-sync, after adding a block: docs table, the site's grid, and the site's per-block
# scenes + posters. blocks-scenes is safe to include here because it needs no render: each block is
# measured on its own stage, so adding one touches only its own files.
blocks-sync: blocks-docs blocks-json blocks-scenes ## regenerate everything derived from the block manifest

# make blocks-scenes: one scene JSON + one poster still per block, for the site's blocks browser.
# Each block gets its OWN 1920x1080 stage, so there is no cell arithmetic, no neighbour bleeding into
# a crop, and no dependency on a rendered catalog reel. The site plays the scene live in the engine it
# already vendors; the poster is the same scene, framed by the same measured rect.
blocks-scenes: ## per-block scene JSON + poster still for the site (no render needed)
	node scripts/site/blocks-scenes.mjs

# make registry. The agent-consumable REGISTRY (registry/): an index plus one item per block and beat,
# in the shadcn/another engine shape, so an outside agent can pick one by name and know what to write
# where. Generated from blocks/catalog.mjs + blueprints/index.mjs; never hand-edited.
# CHECK=1 exits non-zero if registry/ is stale, so a forgotten regeneration is visible.
# PHONY because registry/ is a real directory, and make would otherwise call the target up to date.
.PHONY: registry
registry: ## regenerate registry/ from the block + beat manifests (CHECK=1 to verify only)
	node scripts/site/registry.mjs

house-style: ## scaffold/refresh a brand's persisted Design Read (NAME=<brand> [THEME=<theme>])
	node scripts/brand/house-style.mjs $(NAME) $(THEME)

direct: ## direction gate + motion director, suggest cuts/stings (D=<file> [WRITE=1])
	node scripts/author/motion-director.mjs $(D) $(if $(filter 1,$(WRITE)),--write)

judge: ## vision gate: prep key frames + rubric for the agent to score (D=<file> [VS=<brand>])
	node scripts/gates/judge.mjs $(D) $(if $(VS),--vs $(VS))

inspect: ## verify a scene against its .intent.json sidecar (D=<file>)
	node scripts/gates/inspect.mjs $(D)

plan-check: ## plan vs render: does the film change where the storyboard promised it would (D=<file>)
	node scripts/gates/plan-vs-render.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

dissolve: ## transition gate, is any text state cross-dissolved into another (D=<file>)
	node scripts/gates/dissolve-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

scrub: ## preview strip: contact sheet of the whole film (M=<fmt> or F=<mp4>)
	node scripts/author/scrub.mjs $(F)

batch: ## data-driven variants: TPL=<template.json> DATA=<data.json> [render]
	node scripts/author/batch.mjs $(TPL) $(DATA)

site-assets: ## engine renders -> site/public/assets (+posters). [RENDER=1] [ONLY=films] [CHECK=1] [FORCE=1]
	node scripts/site/site-assets.mjs $(if $(RENDER),--render) $(if $(ONLY),--only $(ONLY)) $(if $(CHECK),--check) $(if $(FORCE),--force)

# make glyphs FONT=Anybody [WEIGHT=700] [CHARSET=ascii|latin1]
# woff2 -> three.js typeface JSON (glyph OUTLINES) for extruded 3D text, into assets/fonts/3d/.
# wawoff2 + fontkit are devDependencies: build-time only, never bundled, never on the render path.
# Every face here is a VARIABLE font, so the weight is baked explicitly, the default master of
# Anybody is Thin, and baking it silently would ship the brand headline in a hairline.
glyphs: ## woff2 -> 3D typeface JSON (FONT=<Name> [WEIGHT=700] [CHARSET=ascii])
	node scripts/fonts/glyphs.mjs $(FONT) $(if $(WEIGHT),--weight $(WEIGHT)) $(if $(CHARSET),--charset $(CHARSET))

glyphs-verify: ## render a baked typeface with three.js next to the real woff2 -> /tmp/glyphs-<Name>.png (LOOK AT IT)
	node scripts/fonts/verify-render.mjs $(FONT) $(TEXT)

glyphs-audit: ## fail if any baked 3D typeface is stale against its woff2 or has charset gaps
	node scripts/gates/glyphs-audit.mjs

# ── Tier B: stateful simulation, baked offline ────────────────────────────────────────────────────
# renderFrame(n) is a pure function of n, so a simulation cannot run inside it: frame 412 exists only
# because 411 ran first. So it runs HERE instead, offline, in its own process, in frame order, as
# stateful as it likes, and emits a PNG sequence the scene plays back through the existing `clip`
# layer. Non-determinism is confined to bake time. Same shape as canvas-fx (baked once at boot) and
# `make spectrum` (FFT baked to a per-frame table). Contract: sims/README.md.
sim: ## bake a simulation to frames: D=sims/<name>.mjs [WRITE=1] -> assets/baked/<name>/
	node scripts/sim/run.mjs $(D) $(if $(WRITE),--write)

# It is confined, not abolished: same source + same seed must still give the same PNGs. This fails a
# sim that reaches for Math.random or the clock, a bake whose sim has been edited since (the frames
# would silently keep playing the previous version of the effect), and a sequence with a hole in it.
sim-audit: ## sims seeded? bakes fresh against their source? sequences intact?
	node scripts/gates/sim-audit.mjs

# The build context is the WORKING TREE, so .gitignore does not apply to it. assets/baked and
# assets/gen were gitignored, referenced by no COPY, and shipped to the daemon on every build
# regardless: 72M of bake output nobody could see in a diff. This measures what Docker would
# actually send and fails when it exceeds the budget.
docker-context: ## does the docker build context still fit its budget?
	node scripts/gates/docker-context.mjs

# Bake a pack of REAL cut-out letter images into the sprite set the `ransom` layer composes from.
# Unzip your pack into assets/ransom-src/ (a folder per character is ideal), then run this once.
ransom-sprites: ## bake assets/ransom-src/ -> assets/ransom/ + manifest.json
	node scripts/ransom/sprites.mjs

# Bake a gradient-background pack into a render-ready library (4K -> 1920, indexed).
# Royalty-free to use, NOT to redistribute: assets/gradients is gitignored. SRC=<zip|folder>
gradients: ## bake a gradient pack -> assets/gradients/ + index.json
	node scripts/media/gradients.mjs

# make filmstrip VIDEO=<file> [FPS=2] [COLS=8] [DEDUP=1] [FROM= TO=], SEE a whole video efficiently:
# extract frames and pack them into a few dense timestamped contact sheets (the whole piece in a small
# token budget vs reading 2000+ raw frames). DEDUP=1 keeps only changed keyframes; FROM/TO+FPS=12 zooms
# a transition. Reports sheet count + token estimate. Reusable for any reference or our own renders.
filmstrip:
	node scripts/author/filmstrip.mjs $(VIDEO)

# make reveal D=<scene.json> [ENTER=0.7] [N=8]: see how each beat ANIMATES IN, not where it lands.
# `make beats` samples a beat's middle (the settled state) and hides the reveal motion; this renders,
# per beat, the ENTER arc densely + the settled frame + the EXIT arc, from the scene's exact layer
# start-times. The check that catches "judged the hold, missed the reveal". → /tmp/reveal/$(notdir $(basename $(D))).png
reveal:
	node scripts/author/reveal.mjs $(D) $(if $(ENTER),--enter $(ENTER)) $(if $(N),--n $(N)) $(if $(filter 1,$(LAYERS)),--layers)

# make cinematic D=<scene.json> [WRITE=1]. The CINEMATIC MOTION director: emit the camera-push +
# per-hero dolly + motion-blur scaffold that makes a video alive-by-default, derived from the scene's
# own beats (not a template). WRITE=1 → <file>.cinematic.json; then refine + `make reveal`.
cinematic:
	node scripts/author/cinematic.mjs $(D) $(if $(filter 1,$(WRITE)),--write)

.PHONY: deck
deck: ## publish docs/animation.html to the site as /deck (site/public/deck.html)
	node scripts/site/deck.mjs

# make lightfield-model  check that the CPU model of the colour field agrees with the renderer.
# The two fitting tools (lightfield-seeds, lightfield-fit) RANK layouts by what that model says, so a
# model that is quietly wrong reports a confident winner that is not the winner. Renders the field
# alone, with no pattern or shadow to hide behind, and fails if the prediction drifts.
.PHONY: lightfield-model
lightfield-model:
	node scripts/author/lightfield-model-check.mjs

# make lightfield [PRESET=ref|tide|fern] [ARGS='--seed 9 --pattern.kind rings ...']  generate a light
# field: a seeded, palette-driven backdrop. No PRESET rebuilds all three committed fields into
# formats/scene/, shoots a PNG of each into out/, and measures the reference one against
# refs/lightfield-ref.jpg. Options and dials: docs/LIGHTFIELD.md.
.PHONY: lightfield
lightfield:
ifdef PRESET
	node scripts/author/lightfield.mjs --preset $(PRESET) --out formats/scene/_lightfield-$(PRESET).html --shot $(ARGS)
else ifdef ARGS
	node scripts/author/lightfield.mjs $(ARGS)
else
	@node scripts/author/lightfield-test.mjs
	@for p in $$(node -e "import('./core/lightfield/presets.js').then(m=>console.log(Object.keys(m.PRESETS).join(' ')))"); do node scripts/author/lightfield.mjs --preset $$p --out formats/scene/_lightfield-$$p.html --shot; done
	@node scripts/author/lightfield-compare.mjs refs/lightfield-ref.jpg out/_lightfield-ref.png
endif
