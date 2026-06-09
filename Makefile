# yt-shorts — render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

.PHONY: build video render all look frame verify hooks list clean

build:
	go build -o bin/render ./cmd/render

# make video D=path/to/video.json  — one self-describing JSON → engine/out/<name>.mp4
video: build
	./bin/render $(D)

# make list  — show formats + where their schema/sample live (for authoring the JSON)
list: build
	./bin/render --list

# make render M=higherlower  — render a format's bundled sample.json
render: build
	./bin/render --module $(M) --data formats/$(M)/sample.json --out engine/out/$(M).mp4

# make all  — every format via the render queue
all: build
	./bin/render --all

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

clean:
	rm -rf bin engine/out/*.mp4
