# Shortwave — render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

.PHONY: build video render all look frame verify probe hooks install-hooks studio studio-check list clean

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

# make hooks D=formats/higherlower/apps.json [SLOT=hook] — print hook variants to pick
hooks:
	node scripts/hooks.mjs --data $(D) --slot $(or $(SLOT),hook)

# make verify  — integrity + safe-zone + contact sheets (all formats)
verify:
	node verify/run.js

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
