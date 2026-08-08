// Vawe Company License 1.0 — see LICENSE at the repository root.
//
// Command vawe — Go render service CLI (mirrors engine/render.js).
//
//	go run ./cmd/render --module higherlower --data formats/higherlower/sample.json --out out/q.mp4
//	go run ./cmd/render --all
//
// flags: --fps N  --workers N  --draft  --no-grain  --concurrency 1 (for --all)
// fps: unset = 60 for a final render, 30 with --draft (iteration). A scene may pin its own "fps".
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"vawe/internal/queue"
	"vawe/internal/render"
)

func main() {
	module := flag.String("module", "", "format name (optional — taken from the JSON's \"module\" field)")
	data := flag.String("data", "", "data JSON file (also accepted as a positional arg)")
	out := flag.String("out", "", "output mp4 (optional — defaults to out/<json-name>.mp4)")
	list := flag.Bool("list", false, "list available formats + their schema/sample, then exit")
	fps := flag.Int("fps", 0, "frames per second (0 = the scene's fps, else 60 final / 30 --draft)")
	// CAP AT 4, NOT 8. Each worker is a full browser capturing at ss× supersample, and past about four
	// of them raster cannot keep up with the draw: frames come back with the most raster-expensive
	// region (large text) partially painted, fading off left to right in tile order. It is invisible to
	// every gate we had. `make probe` compares the DOM and this happens downstream of it; the DOM is
	// order-independent and correct on exactly the frames that ship wrong.
	//
	// Measured on showcase-flight, the heaviest film in the library (588 frames, eight text layers over
	// a full-frame inline SVG): 8 workers gave 8-11 corrupted frames per run and a DIFFERENT set each
	// run, 4 workers gave zero. Compositor determinism flags, doubling the rAF settle wait, and
	// capture-until-stable all left it untouched, which is what ruled out the capture path and pointed
	// at raster starvation. See docs/MISTAKES.md #190 and `make flicker-check`.
	workers := flag.Int("workers", max(1, min(runtime.NumCPU()-1, 4)), "parallel capture browsers")
	draft := flag.Bool("draft", false, "fast encode, no grain")
	// SUPERSAMPLE override. ss=2 costs 4x the pixels of every expensive stage and exists to stop text
	// shimmering under motion; whether it survives the h264 encode had never been tested, and a flag is
	// what makes testing it possible. 0 = the default for this render mode (2 final, 1 draft).
	ssFlag := flag.Int("ss", 0, "supersample factor (0 = 2 final / 1 --draft)")
	noGrain := flag.Bool("no-grain", false, "skip the film-grain pass")
	all := flag.Bool("all", false, "render every format's sample.json")
	concurrency := flag.Int("concurrency", 1, "formats rendered at once (--all)")
	alpha := flag.Bool("alpha", false, "transparent overlay export → VP9/yuva420p .webm (video-only)")
	bg := flag.String("bg", "", "composite the (alpha) graphics over this background video → out.mp4")
	watermark := flag.String("watermark", "", "transparent PNG laid over every frame (free previews); empty = clean export")
	aspect := flag.String("aspect", "", "render aspect(s): comma-separated 16:9,9:16,1:1,4:5,4:3 (empty = the scene's own)")
	flag.Parse()

	repoRoot := repoRoot()
	opts := render.Options{FPS: *fps, Workers: *workers, Draft: *draft, SS: *ssFlag, Grain: !*noGrain, Transparent: *alpha, BgVideo: *bg, Watermark: *watermark}

	if *list {
		listFormats(repoRoot)
		return
	}

	if *all {
		formatsDir := filepath.Join(repoRoot, "formats")
		entries, _ := os.ReadDir(formatsDir)
		var jobs []func() error
		var names []string
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			name := e.Name()
			scenePath := filepath.Join(formatsDir, name, "scene.html")
			sample := filepath.Join(formatsDir, name, "sample.json")
			if !exists(scenePath) || !exists(sample) {
				continue
			}
			outPath := filepath.Join(repoRoot, "out", name+".mp4")
			names = append(names, name)
			jobs = append(jobs, func() error { return render.Render(repoRoot, name, sample, outPath, opts) })
		}
		errs := queue.Run(jobs, *concurrency)
		fail := 0
		for i, e := range errs {
			if e != nil {
				fail++
				fmt.Printf("✗ %s: %v\n", names[i], e)
			}
		}
		fmt.Printf("\nvawe --all: %d ok, %d failed\n", len(jobs)-fail, fail)
		if fail > 0 {
			os.Exit(1)
		}
		return
	}

	// One self-describing JSON drives everything:
	//   vawe path/to/video.json     → module from its "module" field, out = out/<name>.mp4
	dataPath := *data
	if dataPath == "" && flag.NArg() > 0 {
		dataPath = flag.Arg(0)
		if flag.NArg() > 1 {
			_ = flag.CommandLine.Parse(flag.Args()[1:]) // flags may follow the file: vawe foo.json --draft --out x.mp4
		}
	}
	opts = render.Options{FPS: *fps, Workers: *workers, Draft: *draft, SS: *ssFlag, Grain: !*noGrain, Transparent: *alpha, BgVideo: *bg, Watermark: *watermark} // rebuild after any trailing flags
	if dataPath == "" {
		fmt.Fprintln(os.Stderr, "usage: vawe <video.json>  [--module N] [--out F] [--draft] | --all | --list")
		os.Exit(1)
	}
	// READ THE FILE BEFORE SAYING ANYTHING ABOUT ITS CONTENTS. Every reader below (videoGrain,
	// moduleOf) used to swallow its read error and hand back a zero value, so a path that does not
	// exist arrived at the "no module field" message — a complaint about the contents of a file
	// nothing had opened (docs/MISTAKES.md #223).
	if _, err := os.Stat(dataPath); err != nil {
		if os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "✗ %s: no such file\n", dataPath)
		} else {
			fmt.Fprintf(os.Stderr, "✗ %s: cannot be read (%v)\n", dataPath, err)
		}
		os.Exit(1)
	}

	// film grain is OPT-IN (`"grain": true`), not a default. Most brands are clean/digital and have no
	// grain; it also crawls over sharp text edges as shimmer. Only genuinely filmic/analog brands turn
	// it on. (--no-grain still forces it off regardless.)
	opts.Grain = opts.Grain && videoGrain(dataPath)

	mod := *module
	if mod == "" {
		m, err := moduleOf(dataPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "✗ %s is not valid JSON: %v\n", dataPath, err)
			os.Exit(1)
		}
		mod = m
	}
	if mod == "" {
		fmt.Fprintf(os.Stderr, "✗ %s has no \"module\" field — add one (e.g. \"module\": \"higherlower\") or pass --module\n", dataPath)
		os.Exit(1)
	}

	// aspects: empty = one render at the scene's own aspect; a comma list = one render per aspect,
	// each output tagged (e.g. video.9x16.mp4). One source → every platform ratio.
	aspects := []string{""}
	if *aspect != "" {
		aspects = strings.Split(*aspect, ",")
	}
	ext := ".mp4"
	if *alpha && *bg == "" {
		ext = ".webm" // alpha overlay (no bg composite)
	}
	name := strings.TrimSuffix(filepath.Base(dataPath), filepath.Ext(dataPath))
	// `.expanded` is a BUILD artifact (scripts/author/expand-blocks.mjs writes <name>.expanded.json
	// from <name>.json), not part of what the video is called. Without this every block-authored
	// scene ships as "search-demo.expanded.mp4" — the pipeline's internals leaking into the
	// deliverable's filename, which is the one string a human actually reads (docs/MISTAKES.md #54).
	name = strings.TrimSuffix(name, ".expanded")
	for _, asp := range aspects {
		o := opts
		o.Aspect = strings.TrimSpace(asp)
		outPath := *out
		if outPath == "" || len(aspects) > 1 {
			// TAG ON ANY EXPLICIT --aspect, not only when several were asked for. The tag used to be
			// gated on `len(aspects) > 1`, so rendering a 16:9 scene with `--aspect 9:16` wrote
			// out/<name>.mp4 — silently REPLACING the scene's own-aspect render with a
			// differently-shaped film under the identical filename. Nothing said anything, and the
			// only way to notice was to open the file (docs/MISTAKES.md #215).
			// An explicit --out still wins: naming the file is the author's call.
			tag := ""
			if o.Aspect != "" {
				tag = "." + strings.ReplaceAll(o.Aspect, ":", "x")
			}
			base := name
			if outPath != "" {
				base = strings.TrimSuffix(filepath.Base(outPath), filepath.Ext(outPath))
			}
			outPath = filepath.Join(repoRoot, "out", base+tag+ext)
		}
		if err := render.Render(repoRoot, mod, dataPath, outPath, o); err != nil {
			fmt.Fprintf(os.Stderr, "✗ render failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("✓ %s\n", outPath)
	}
}

// videoGrain reports whether a video OPTS IN to film grain via `"grain": true`. Default (absent) is
// false — grain is a deliberate filmic choice, not something every video pays the shimmer cost for.
func videoGrain(path string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var d struct {
		Grain *bool `json:"grain"`
	}
	_ = json.Unmarshal(b, &d)
	return d.Grain != nil && *d.Grain
}

// moduleOf reads just the "module" field from a data JSON. An unreadable or malformed file is an
// ERROR, not an empty module: the two are indistinguishable to the caller otherwise, and the caller
// then blames the field rather than the file.
func moduleOf(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var d struct {
		Module string `json:"module"`
	}
	if err := json.Unmarshal(b, &d); err != nil {
		return "", err
	}
	return d.Module, nil
}

// listFormats prints each format folder with its schema + sample paths (the authoring contract).
func listFormats(repoRoot string) {
	formatsDir := filepath.Join(repoRoot, "formats")
	entries, _ := os.ReadDir(formatsDir)
	fmt.Println("formats (write a JSON with \"module\": \"<name>\" + the fields in schema.json):")
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if !exists(filepath.Join(formatsDir, name, "scene.html")) {
			continue
		}
		fmt.Printf("  %-12s schema: formats/%s/schema.json   sample: formats/%s/sample.json\n", name, name, name)
	}
}

// repoRoot finds the directory containing formats/ (walk up from cwd; REPO env overrides).
func repoRoot() string {
	if r := os.Getenv("REPO"); r != "" {
		return r
	}
	dir, _ := os.Getwd()
	for {
		if exists(filepath.Join(dir, "formats")) && exists(filepath.Join(dir, "core")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	cwd, _ := os.Getwd()
	return cwd
}

func exists(p string) bool { _, err := os.Stat(p); return err == nil }
