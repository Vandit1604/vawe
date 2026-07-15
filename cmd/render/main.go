// Command vawe — Go render service CLI (mirrors engine/render.js).
//
//	go run ./cmd/render --module higherlower --data formats/higherlower/sample.json --out engine/out/q.mp4
//	go run ./cmd/render --all
//
// flags: --fps 30  --workers N  --draft  --no-grain  --concurrency 1 (for --all)
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
	out := flag.String("out", "", "output mp4 (optional — defaults to engine/out/<json-name>.mp4)")
	list := flag.Bool("list", false, "list available formats + their schema/sample, then exit")
	fps := flag.Int("fps", 0, "frames per second (0 = use the scene's fps, else 30)")
	workers := flag.Int("workers", max(1, min(runtime.NumCPU()-1, 8)), "parallel capture browsers")
	draft := flag.Bool("draft", false, "fast encode, no grain")
	noGrain := flag.Bool("no-grain", false, "skip the film-grain pass")
	all := flag.Bool("all", false, "render every format's sample.json")
	concurrency := flag.Int("concurrency", 1, "formats rendered at once (--all)")
	alpha := flag.Bool("alpha", false, "transparent overlay export → VP9/yuva420p .webm (video-only)")
	bg := flag.String("bg", "", "composite the (alpha) graphics over this background video → out.mp4")
	aspect := flag.String("aspect", "", "render aspect(s): comma-separated 16:9,9:16,1:1,4:5,4:3 (empty = the scene's own)")
	flag.Parse()

	repoRoot := repoRoot()
	opts := render.Options{FPS: *fps, Workers: *workers, Draft: *draft, Grain: !*noGrain, Transparent: *alpha, BgVideo: *bg}

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
			outPath := filepath.Join(repoRoot, "engine", "out", name+".mp4")
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
	//   vawe path/to/video.json     → module from its "module" field, out = engine/out/<name>.mp4
	dataPath := *data
	if dataPath == "" && flag.NArg() > 0 {
		dataPath = flag.Arg(0)
		if flag.NArg() > 1 {
			_ = flag.CommandLine.Parse(flag.Args()[1:]) // flags may follow the file: vawe foo.json --draft --out x.mp4
		}
	}
	opts = render.Options{FPS: *fps, Workers: *workers, Draft: *draft, Grain: !*noGrain, Transparent: *alpha, BgVideo: *bg} // rebuild after any trailing flags
	if dataPath == "" {
		fmt.Fprintln(os.Stderr, "usage: vawe <video.json>  [--module N] [--out F] [--draft] | --all | --list")
		os.Exit(1)
	}
	// film grain is OPT-IN (`"grain": true`), not a default. Most brands are clean/digital and have no
	// grain; it also crawls over sharp text edges as shimmer. Only genuinely filmic/analog brands turn
	// it on. (--no-grain still forces it off regardless.)
	opts.Grain = opts.Grain && videoGrain(dataPath)

	mod := *module
	if mod == "" {
		mod = moduleOf(dataPath)
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
	for _, asp := range aspects {
		o := opts
		o.Aspect = strings.TrimSpace(asp)
		outPath := *out
		if outPath == "" || len(aspects) > 1 {
			tag := ""
			if len(aspects) > 1 && o.Aspect != "" {
				tag = "." + strings.ReplaceAll(o.Aspect, ":", "x")
			}
			base := name
			if outPath != "" {
				base = strings.TrimSuffix(filepath.Base(outPath), filepath.Ext(outPath))
			}
			outPath = filepath.Join(repoRoot, "engine", "out", base+tag+ext)
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

// moduleOf reads just the "module" field from a data JSON.
func moduleOf(path string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var d struct {
		Module string `json:"module"`
	}
	_ = json.Unmarshal(b, &d)
	return d.Module
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
