# Shortwave — render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

.PHONY: build video render all look frame verify audit probe lib-test review hooks install-hooks studio studio-check assets list clean

build:
	go build -o bin/shortwave ./cmd/render

# make video D=path/to/video.json  — one self-describing JSON → engine/out/<name>.mp4
video: build
	./bin/shortwave $(D)

# make list  — show formats + where their schema/sample live (for authoring the JSON)
list: build
	./bin/shortwave --list

# make render M=higherlower  — render a format's bundled sample.json
render: build
	./bin/shortwave --module $(M) --data formats/$(M)/sample.json --out engine/out/$(M).mp4

# make all  — every format via the render queue
all: build
	./bin/shortwave --all

# make look M=higherlower         — storyboard (key frames) for visual review
look:
	node scripts/preview.mjs $(M)

# make frame M=higherlower N=560  — one exact frame
frame:
	node scripts/preview.mjs $(M) $(N)

# make assets D=formats/x/topic.json [WRITE=1]  — fill missing icons: country→flag, brand→logo,
# else a generated topic card. Dry-run without WRITE.
assets:
	node scripts/assets.mjs $(D) $(if $(WRITE),--write)

# make hooks D=formats/higherlower/apps.json [SLOT=hook] — print hook variants to pick
hooks:
	node scripts/hooks.mjs --data $(D) --slot $(or $(SLOT),hook)

# make verify  — integrity + safe-zone + contact sheets (all formats)
verify:
	node verify/run.js

# make audit [M=higherlower]  — layout audit: overlap / overflow / safe-zone / tight-spacing on
# [data-layer=critical] across sampled frames. Annotated overlays → /tmp/audit/<format>.png.
audit:
	node verify/audit.mjs $(M)

# make lib-test  — fast pure-JS asserts for the core/lib.js motion primitives (no browser)
lib-test:
	node scripts/lib-test.mjs

# make probe [M=bracket]  — assert renderFrame(n) is PURE in n (byte-identical regardless of
# render order). Guards sharded/parallel rendering. No M = every format.
probe:
	@if [ -n "$(M)" ]; then node scripts/probe-purity.mjs $(M); else \
		for d in formats/*/scene.html; do f=$$(basename $$(dirname $$d)); \
		node scripts/probe-purity.mjs $$f || exit 1; done; fi

# make studio  — live in-browser editor + preview (edit content, see it instantly; no render)
studio:
	node studio/server.mjs

# make studio-check  — drive the studio headless across every format×orientation; fail on
# scene errors, 4xx, or wrong dims. Writes a contact sheet to /tmp/studio_check.png.
studio-check:
	node studio/check.mjs

# make install-hooks  — activate the version-controlled git hooks (pre-push runs studio-check)
install-hooks:
	git config core.hooksPath .githooks
	@echo "✓ git hooks active (.githooks) — pre-push runs studio-check"

clean:
	rm -rf bin engine/out/*.mp4
