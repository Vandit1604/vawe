# Shortwave — render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

.PHONY: build video render all look frame verify audit audit-test probe snap motion lib-test validate palette lookbook sections photos similar ledger ledger-add feature-audit captions review install-hooks assets list clean

build:
	go build -o bin/shortwave ./cmd/render

# make video D=path/to/video.json  — one self-describing JSON → engine/out/<name>.mp4
video: build
	./bin/shortwave $(D)

# make list  — show formats + where their schema/sample live (for authoring the JSON)
list: build
	./bin/shortwave --list

# make render M=hyperscene  — render a format's bundled sample.json
render: build
	./bin/shortwave --module $(M) --data formats/$(M)/sample.json --out engine/out/$(M).mp4

# make all  — every format via the render queue
all: build
	./bin/shortwave --all

# make look M=hyperscene         — storyboard (key frames) for visual review
look:
	node scripts/preview.mjs $(M)

# make frame M=hyperscene N=560  — one exact frame
frame:
	node scripts/preview.mjs $(M) $(N)

# make assets D=formats/x/topic.json [WRITE=1]  — fill missing icons: country→flag, brand→logo,
# else a generated topic card. Dry-run without WRITE.
assets:
	node scripts/assets.mjs $(D) $(if $(WRITE),--write)

# make verify  — integrity + safe-zone + contact sheets (all formats)
verify:
	node verify/run.js

# make audit [M=hyperscene]  — layout audit: overlap / overflow / safe-zone / tight-spacing on
# [data-layer=critical] across sampled frames. Annotated overlays → /tmp/audit/<format>.png.
audit:
	node verify/audit.mjs $(M)

# make audit-test  — regression: proves `make audit` still CATCHES invisible emphasis (blue-on-blue).
# Runs the audit on a fixture that forces accent-<b>-on-accent-bg and asserts a hard contrast fail.
audit-test:
	node verify/contrast-regression.mjs

# make snap M=<format> [SAVE=1]  — check a scene WITHOUT rendering video: capture/diff the per-frame
# DOM signature (bbox/transform/opacity/font/text). Baseline a refactor, then prove frames unchanged.
snap:
	node scripts/scene-snap.mjs $(M) $(if $(SAVE),--save)

# make motion [M=<format>] [STRIDE=2]  — animation-over-time audit: renders every frame headless (no
# video) and asserts the motion contract (final frame holds, reveals monotonic, payoffs settle before
# the exit, counters sane, typing completes). The check `make snap`/`make audit` can't do.
motion:
	node scripts/motion-audit.mjs $(M) $(if $(STRIDE),--stride $(STRIDE))

# make lib-test  — fast pure-JS asserts for the core/lib.js motion primitives (no browser)
lib-test:
	node scripts/lib-test.mjs

# make lookbook URL=https://site.com NAME=brand  — screenshot the site (full page + viewports) for
# art direction study: derive the video's design language from the brand's own look, no canned styles.
lookbook:
	node scripts/lookbook.mjs $(URL) $(NAME)

# make palette IMG=engine/assets/brands/<brand>/sections/01-*.png  — EYEDROP the real hero pixels →
# dominant colours + LIGHT/DARK dominance (grounded, not a heuristic) + a swatch card to /tmp/palette.png.
# Author themes/<brand>.json from THIS, then verify the video with `make beats VS=<brand>`.
palette:
	node scripts/palette.mjs $(IMG)

# make sections URL=https://site.com NAME=brand  — inventory the page as SECTIONS: one screenshot per
# major block + sections.json (stable selector + ready-to-paste `make capture` command per section).
# The doctrine step: capture the real sections, don't rewrite them. Storyboard = one beat per section.
sections:
	node scripts/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make preview HTML=path/frag.html [THEME=linear] [BG=#hex] [W=1400] [SERVE=1]  — render a single
# hand-written fragment (or a captured component JSON) STANDALONE on the theme bg → /tmp/preview.png.
# SERVE=1 keeps it LIVE in your browser instead (real fonts/assets). "is this HTML doing what I want?".
preview:
	node scripts/preview-fragment.mjs $(HTML) $(if $(THEME),--theme $(THEME)) $(if $(BG),--bg $(BG)) $(if $(W),--w $(W)) $(if $(SERVE),--serve)

# make beats D=formats/x/video.json [VS=brand]  — first/mid/last frame of every beat in one contact
# sheet → /tmp/beats.png. VS=brand stacks each beat beside its source-section shot (fidelity diff).
beats:
	node scripts/beats.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(STRIDE),--stride $(STRIDE))

# make sheet NAME=brand [SERVE=1]  — DESIGN SHEET: every captured element on one page (on the theme bg),
# labelled with size + font-substitution warnings. Review + fix the raw material BEFORE building a video.
# Default → /tmp/sheet.png (tall contact sheet). SERVE=1 → live in your browser (real fonts, scrollable).
sheet:
	node scripts/design-sheet.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(SERVE),--serve)

# make slop D=formats/x/video.json [AT=1.5]  — ANTI-SLOP gate: render the real DOM at a frame and run the
# vendored impeccable detector (41 rules: overused fonts, purple/blue gradients, card-in-card, centered
# defaults, …). Catches AI-generic tells in the HTML we hand-author. See .claude/skills/{taste-skill,impeccable}.
slop:
	node scripts/slop.mjs $(D) $(if $(AT),--at $(AT))

# make similar [D="a.json b.json"]  — sameness audit: score authored videos pairwise (motion vocab
# + beat structure + layout). Cross-brand SAME (>0.75) fails; the anti-template gate.
similar:
	node scripts/similarity.mjs $(D)

# make feature-audit  — static utilization report: framework vocabulary (kinetic presets / cuts /
# shader stings) + capability primitives (group/motion/spring/fitH…) vs what authored videos use.
# Surfaces under-adopted primitives + preset-monotony. WARN tier (always exits 0).
feature-audit:
	node scripts/feature-audit.mjs

# make captions D=formats/x/video.json TEXT="script"  — auto-time a script into muted-social burned-in
# subtitles (captionMode:pop). Deterministic (time proportional to word count). See scripts/captions.mjs.
captions:
	node scripts/captions.mjs $(D) "$(TEXT)"

# make ledger D=formats/x/video.json  — check a design against ALL shipped designs (cross-video
# memory); make ledger-add D=… logs it after shipping.
ledger:
	node scripts/ledger.mjs check $(D)
ledger-add:
	node scripts/ledger.mjs add $(D)

# make photos Q="server room" NAME=brand [N=4]  — fetch openly-licensed photos (Openverse: cc0/pdm/by)
# with attribution recorded to credits.json. Use in clipped image layers with ken burns zoom.
photos:
	node scripts/photos.mjs "$(Q)" $(NAME) $(if $(N),--n $(N))

# make capture-scene URL=… SEL="section" NAME=brand LABEL=intake PARTS="sel1,sel2"  — capture an
# ANIMATED site section as parts (relative geometry) to re-stage with our motion primitives.
capture-scene:
	node scripts/capture-scene.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) --parts "$(PARTS)"

# make capture URL=… SEL=".card" NAME=brand LABEL=pricing  — lift a REAL UI component off a live site
# (its HTML + computed CSS) into an animatable `component` scene fragment. See scripts/capture-component.mjs.
capture:
	node scripts/capture-component.mjs $(URL) "$(SEL)" $(NAME) $(LABEL)

# make validate [D=formats/x/topic.json]  — check data + inline theme against the format schema.
# No D = validate every formats/*/sample.json. Same validator boot() runs before rendering.
validate:
	node scripts/validate.mjs $(D)

# make schema-check  — assert every layer prop the engine (scene.html) reads is defined in schema.json
# (catches drift like a new primitive that shipped without a schema entry). Exits 1 on drift.
schema-check:
	node scripts/schema-drift.mjs

# make review  — one-command health snapshot: lib-test + layout audit + a master overlay sheet
# (/tmp/review.png). Heavier gates stay separate: make probe (purity), make verify (render integrity).
review:
	node verify/review.mjs

# make probe [M=hyperscene]  — assert renderFrame(n) is PURE in n (byte-identical regardless of
# render order). Guards sharded/parallel rendering. No M = every format.
probe:
	@if [ -n "$(M)" ]; then node scripts/probe-purity.mjs $(M); else \
		for d in formats/*/scene.html; do f=$$(basename $$(dirname $$d)); \
		node scripts/probe-purity.mjs $$f || exit 1; done; fi

# make install-hooks  — activate the version-controlled git hooks (pre-push runs the framework gates)
install-hooks:
	git config core.hooksPath .githooks
	@echo "✓ git hooks active (.githooks) — pre-push runs schema-check + lib-test"

clean:
	rm -rf bin engine/out/*.mp4
