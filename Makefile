# Vawe: a film is one HTML page, films/<name>/page.html. harness/media/render-page.mjs seeks the page
# frame by frame in Chrome and encodes it with ffmpeg. Every render target takes PAGE=<page.html>.
#
# Every target here is .PHONY: this is a command catalogue with memorable names, not a dependency graph.
# A target named like a real path (`study`, `media`) must be listed here or make calls it up to date.

.DEFAULT_GOAL := help

.PHONY: doctor dev ship next critique judge spec ref study sections kit studio check dev-tool gen media \
  study-tool test e2e bench-fast verify-batch install-hooks list help

# make doctor: is the checkout ready to render? Today: is gsap vendored (assets/vendor/gsap.min.js,
# gitignored, written by the root "postinstall" script). Prints the fix command.
doctor: ## [engine] is the checkout ready to render (gsap vendored); prints the fix
	node scripts/vendor-gsap.mjs --check

# make dev PAGE=films/<name>/page.html [ASPECT=9:16] [FROM= TO=] [AUDIO=1] [OUT=file.mp4]: THE ITERATION LOOP.
# A half-size draft render of the page, no gates. FROM=/TO= (seconds) render only that window.
dev: ## [dev] THE ITERATION LOOP. PAGE=<page.html> [ASPECT=] [FROM= TO=] [AUDIO=1] [OUT=]: a half-size draft render of a page film.
	@test -n "$(PAGE)" || { echo "usage: make dev PAGE=films/<name>/page.html [ASPECT=16:9] [FROM=<s> TO=<s>] [AUDIO=1]"; exit 2; }
	node harness/media/render-page.mjs $(PAGE) $(if $(OUT),$(OUT)) $(if $(ASPECT),--aspect $(ASPECT)) $(if $(FROM),--from $(FROM)) $(if $(TO),--to $(TO)) $(if $(AUDIO),--audio)

# make ship PAGE=films/<name>/page.html [ASPECT=all]: the final 60 fps render, with audio mixed offline.
ship: ## [ship] the final 60 fps render of a page film. PAGE=<page.html> [ASPECT=all] [OUT=]
	@test -n "$(PAGE)" || { echo "usage: make ship PAGE=films/<name>/page.html [ASPECT=all]"; exit 2; }
	node harness/media/render-page.mjs $(PAGE) $(if $(OUT),$(OUT)) --final $(if $(ASPECT),--aspect $(ASPECT))

# make next PAGE=<page.html> REF=<ref.mp4>: the anim-traps source checks, then see.mjs measures the page against
# the reference, then page-check. FROM=/TO= window a half-size draft, FINAL=1 checks the full render, WORDS=1
# adds the per-word entrance/highlight/exit/star check.
next: ## [dev] anim-traps + the page measured against its reference + page-check (PAGE=<html> REF=<mp4> [FROM= TO=] [FINAL=1] [WORDS=1])
	@test -n "$(PAGE)" || { echo "usage: make next PAGE=films/<name>/page.html REF=<ref.mp4>"; exit 2; }
	@node quality/gates/anim-traps.mjs $(PAGE)
	@node harness/media/see.mjs $(PAGE) --dom --ref $(REF) $(if $(D),--film $(D),) $(if $(FROM),--from $(FROM)) $(if $(TO),--to $(TO)) $(if $(FINAL),--final) $(if $(WORDS),--words)
	@node quality/gates/page-check.mjs $(PAGE) $(if $(REF),--ref $(REF))

critique: ## [judge] the critique loop for a page film: phone sheet, strip, loop seam and page-check to LOOK at, then the judge command for a fresh session (PAGE=<html> [REF=<mp4>] [AT=<s>])
	@test -n "$(PAGE)" || { echo "usage: make critique PAGE=films/<name>/page.html [REF=<ref.mp4>] [AT=<seconds>]"; exit 2; }
	@node harness/media/see.mjs $(PAGE) --phone --strip $(or $(AT),auto) --loop
	@node quality/gates/page-check.mjs $(PAGE) $(if $(REF),--ref $(REF))
	@echo ""
	@echo "  LOOK at the sheets printed above first. Then, in a FRESH session (never the author):"
	@echo "    VAWE_AGENT=judge-$(notdir $(patsubst %/,%,$(dir $(PAGE)))) make judge D=$(PAGE) STRUCT=1 $(if $(REF),REF=$(REF))"

judge: ## [judge] vision gate: prep key frames + rubric for the agent to score (D=<page.html|mp4> [REF=<ref.mp4>] [STRUCT=1] [RUNS=A,B] [VERDICT_JSON=<f> RUN=<id>] [COMPARE="a.mp4 b.mp4"])
	@$(if $(COMPARE),node quality/gates/judge.mjs --compare $(COMPARE),node quality/gates/judge.mjs $(D) $(if $(REF),--ref $(REF)) $(if $(JSON),--json,) $(if $(filter 1,$(STRUCT)),--struct) $(if $(RUNS),--runs $(RUNS)) $(if $(VERDICT_JSON),--verdict-json $(VERDICT_JSON) --run $(RUN)))
	@echo "  (judge is synchronous, it already returned above; do not poll or sleep for it)"

# make studio PAGE=films/<name>/page.html [PORT=8799]: LIVE scrubbable preview (no mp4 render). Drag keys, edit
# the page's tunable literals in place (studio/page-server.mjs). Ctrl-C to stop.
studio: ## [dev] LIVE scrubbable preview of a page film, the human layer (PAGE=<page.html> [PORT=]): drag keys, edit literals in place
	@test -n "$(PAGE)" || { echo "usage: make studio PAGE=films/<name>/page.html [PORT=8799]"; exit 2; }
	node studio/page-server.mjs $(PAGE)

# make spec REF=<reference.mp4> [OUT=<dir>] [FPS=29.97] [ELEMENTS=6] [OCR=1]: reverse-engineer a reference
# into SPEC.md + spec.json next to it: cuts by frame number, per shot the camera zoom/pan per frame, moving
# elements tracked per frame, blur timing, hex palette, every sound hit and the beat grid. ffmpeg only; OCR=1
# adds text boxes (needs tesseract). harness/media/ref-spec.mjs
spec: ## [study] REF=<reference.mp4>: measure it into SPEC.md (cuts, per-frame moves, camera, blur, palette, sound hits, KEEP/CHANGE) an agent rebuilds frame for frame.
	@test -n "$(REF)" || { echo "usage: make spec REF=<reference.mp4> [OUT=<dir>] [FPS=29.97] [ELEMENTS=6] [OCR=1]"; exit 1; }
	node harness/media/ref-spec.mjs $(REF) $(if $(OUT),--out $(OUT)) $(if $(FPS),--fps $(FPS)) $(if $(ELEMENTS),--elements $(ELEMENTS)) $(if $(OCR),--ocr)

# make ref URL=<pin or video url> [NAME=x]: fetch a reference film and study it in one step. The file
# lands in refs/ (gitignored).
ref: ## [study] fetch a reference film and study it in one step.
	node harness/media/ref.mjs $(URL) $(if $(NAME),--name $(NAME))

sections: ## [study] capture a website's real sections into assets/brands/<brand>
	node scripts/brand/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make kit URL=https://site.com NAME=brand: ONE command for `sections` + palette + a fetched favicon, written to
# assets/brands/<brand>/kit.json. INIT=1 additionally runs the doctor check first.
kit: ## [study] sections + palette + favicon in one command -> assets/brands/<brand>/kit.json (INIT=1: also doctor)
	node scripts/brand/kit.mjs $(URL) $(NAME) $(if $(INIT),--init)

# make study VIDEO=refs/ref.mp4 [NAME=... THRESH=0.3]: read a REFERENCE video: shot boundaries, a contact sheet and
# a study.md. Writes refs/<name>/ (gitignored). The other modes, all through harness/media/see.mjs unless noted:
#   MATCH=1 REF=<ref.mp4> D=<render.mp4>   score a recreation against its reference, beat by beat (match.mjs)
#   SEE=1 REF=<ref.mp4>                    cuts/holds/beats/ease/OCR + frame grids, cheaply
#   SHOT=<from>-<to> REF=<ref.mp4>         a dense strip of one time window
#   COMPARE=<draft.mp4> REF=<ref.mp4>      reference vs draft at the same timestamps (FROM= TO= WORDS=1)
#   PROBE=1 REF=<page.html> AT=<s> SEL=<css>   box, opacity, transform and animation progress of matching elements
#   LOOK=<s,s,...> REF=<page.html> [COMPARE=<ref.mp4>]   a still per time, paired against the reference
#   LAYOUT=<s,s,...> REF=<page.html>       clipped, overlapping and off-frame text at each time
study: ## [study] the reference side: VIDEO= study; MATCH=1 REF= D=<render.mp4>; SEE=1 / SHOT= / COMPARE= REF=<video>; PROBE=1 / LOOK= / LAYOUT= REF=<page.html>
	@if [ -n "$(MATCH)" ]; then \
	  node harness/media/match.mjs $(REF) $(D) $(if $(STEP),--step $(STEP)); \
	elif [ -n "$(SEE)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) $(if $(FRAMES),--frames $(FRAMES)); \
	elif [ -n "$(SHOT)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) --shot $(SHOT) $(if $(FPS),--fps $(FPS)); \
	elif [ -n "$(PROBE)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) --probe --at $(AT) --sel "$(SEL)"; \
	elif [ -n "$(LOOK)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) --look --times $(LOOK) $(if $(COMPARE),--ref $(COMPARE)); \
	elif [ -n "$(LAYOUT)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) --layout --times $(LAYOUT) $(if $(D),--film $(D)); \
	elif [ -n "$(COMPARE)" ]; then \
	  node harness/media/see.mjs $(REF) $(OUT) --compare $(COMPARE) $(if $(FROM),--from $(FROM)) $(if $(TO),--to $(TO)) $(if $(D),--film $(D)) $(if $(WORDS),--words); \
	else \
	  node harness/media/study.mjs $(VIDEO) $(NAME) $(if $(THRESH),--threshold $(THRESH)) $(if $(STRIPS),--strips $(STRIPS)) $(if $(STRIPFPS),--strip-fps $(STRIPFPS)); \
	fi

# make check GATE=<name>: one gate, routed by harness/lib/check-gate.mjs (the one table that answers what GATE= means).
check: ## [check] one gate by name (GATE=<name>; bare GATE lists them): no-emdash, page-check, anim-traps, doc-refs, provenance, ...
	@node harness/lib/check-gate.mjs "$(GATE)"

# The routed sub-tools. X=<name> picks one; a bare X lists the known names and exits 2.
dev-tool: ## [maintenance] one-off dev/maintenance tools, routed by name (X=<name>; bare X lists them)
	@node harness/lib/dev-tool.mjs "$(X)"

gen: ## [engine] the asset bakers (fonts, glyphs, audio, music, sfx), routed by name (X=<name>; bare X lists them)
	@node harness/lib/gen-tool.mjs "$(X)"

media: ## [dev] capture, generation and audio/video processing tools, routed by name (X=<name>; bare X lists them)
	@node harness/lib/media-tool.mjs "$(X)"

study-tool: ## [study] reference-material tools, routed by name (X=<name>; bare X lists them)
	@node harness/lib/study-tool.mjs "$(X)"

test: ## [maintenance] the whole test suite: tests/**/*.test.mjs (node --test)
	node --test "tests/**/*.test.mjs"

# make e2e: the page tests plus a half-size draft render of every page film, in parallel, each checked for a
# non-empty mp4 of the right duration. Leaves quality/runs/e2e/<timestamp>/report.md. See harness/dev/e2e.mjs.
e2e: ## [check] THE E2E SUITE: the page tests + a half-size draft render of every films/*/page.html and tests/fixtures/pages/*.html, in parallel, one report
	node harness/dev/e2e.mjs

# make bench-fast: read-load word count and Makefile target count against their stamped ceilings. Warns when a
# count grows; STAMP=1 records the new count.
bench-fast: ## [maintenance] read-load word count + fast-path command and Makefile-target count, warns on growth
	@node harness/dev/bench.mjs fast $(if $(filter 1,$(STAMP)),--stamp) $(if $(filter 1,$(JSON)),--json)

# make verify-batch: the full pre-push tier as its own step, then a stamp pre-push trusts.
verify-batch: ## [maintenance] the full push tier plus e2e as its own step; stamps the verified commit
	@sh harness/dev/verify-batch.sh

# make install-hooks: activate the version-controlled git hooks
install-hooks: ## [maintenance] activate the version-controlled git hooks (pre-push runs the framework gates)
	git config core.hooksPath .githooks
	git config merge.vawe-generated.driver 'harness/dev/merge-generated.sh %O %A %B %P'
	@echo "✓ git hooks active (.githooks):"
	@echo "    commit-msg  refuses an assistant attribution trailer as it is written"
	@echo "    pre-commit  em dashes, and bench-fast (warns), scoped to this commit's files"
	@echo "    pre-push    push-guard (attribution + force-added ignored files) then the fast gates"
	@echo "    post-merge  regenerates a generated file .gitattributes marked merge=vawe-generated"
	@echo "    post-checkout  a linked worktree gets its untracked library, fonts and node_modules link"
	@echo "✓ merge.vawe-generated.driver registered (.gitattributes marks the owned paths)"

# make list / make help: every target, grouped by phase, with its one-line help. Reads the Makefile itself
# (harness/lib/make-help.mjs), so it cannot drift from the real target list.
list: ## [maintenance] every target, grouped by phase, with its one-line help (the front page)
	@node harness/lib/make-help.mjs
help: ## [maintenance] the fast path only: the commands from a page to a shipped film (make list: everything)
	@node harness/lib/make-help.mjs --fast
