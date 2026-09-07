// Package scene drives a format's HTML scene in headless Chrome (chromedp) and
// captures every frame to numbered PNGs. The format contract is unchanged: the page
// exposes window.__engine.{meta, renderFrame(n)}.
package scene

import (
	"bytes"

	"context"
	"fmt"
	"github.com/chromedp/cdproto/runtime"
	"image"
	_ "image/jpeg"
	"image/png"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"vawe/internal/audio"
)

const W, H = 1080, 1920

// Meta mirrors window.__engine.meta.
type Meta struct {
	FPS         float64     `json:"fps"`
	Duration    float64     `json:"duration"`
	TotalFrames int         `json:"totalFrames"`
	Width       int         `json:"width"`  // capture size. 0 falls back to the portrait default
	Height      int         `json:"height"` // (set by core/boot.js boot from data.orientation)
	Stings      []float64   `json:"stings"`
	SFX         []audio.Cue `json:"sfx"`
	// Bridges are J/L-cuts already resolved from junction names to spans of seconds by
	// core/audio-bridges.js: the browser is the only place that knows where the film's cuts are.
	Bridges []audio.Bridge `json:"bridges"`
	// BeatSync is core/beat-bind.js's one-line report of every joint the track's grid moved. It is
	// informational, and it only reaches an author because it is DECLARED here: encoding/json drops
	// an unknown key without a word, which is how it went missing (docs/MISTAKES.md #477).
	BeatSync string `json:"beatSync"`
}

// served is the ONLY prefix set the render page may fetch. A render needs the engine (core), the
// theme JSON, the scene HTML + schema (formats), any asset a scene references (assets), and the
// caller's own scene JSON + uploads under .vawe-data. Nothing else exists as far as the browser is
// concerned.
//
// WHY DEFAULT-DENY, AND WHY HERE. This process renders scenes written by strangers (the MCP product),
// and a bare http.FileServer rooted at the repo hands the browser every file in it. An <img> or
// <iframe> pointing at /docs/MISTAKES.md, /blocks/index.mjs or /.git/config renders that file INTO
// the video and returns it. The html/svg layers strip such tags, but a sanitiser is a curtain; this
// handler is the wall. A layer type added next year that forgets to sanitise is still contained,
// because the SERVER, not the layer, decides what may leave.
var served = []string{
	"core/", "themes/", "formats/", "assets/",
	".vawe-data/scenes/", ".vawe-data/uploads/",
}

// Served lists the prefixes, for a caller that has to TELL the author where a scene may live. It
// returns a copy so the policy stays owned here.
func Served() []string { return append([]string(nil), served...) }

// ServeAll reports the local-debug escape hatch. A caller pre-checking a path against Allowed must ask
// this too, or it refuses a render the server would in fact have served.
func ServeAll() bool { return os.Getenv("VAWE_SERVE_ALL") == "1" }

// Allowed is exported so the render path can refuse an unservable scene BEFORE it starts a browser,
// instead of letting the page fetch a 404 and report it as a parse error.
func Allowed(p string) bool { return allowed(p) }

func allowed(p string) bool {
	// path.Clean via filepath collapses ".." so a cleaned path can never climb above the prefix it
	// starts with; a request that still points outside every prefix is denied.
	c := filepath.ToSlash(filepath.Clean("/" + p))[1:]
	if c == "" || strings.Contains(c, "\x00") {
		return false
	}
	for _, pre := range served {
		if c == strings.TrimSuffix(pre, "/") || strings.HasPrefix(c, pre) {
			return true
		}
	}
	return false
}

// Serve starts a static file server rooted at root; returns the server + port.
func Serve(root string) (*http.Server, int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, 0, err
	}
	fileServer := http.FileServer(http.Dir(root))
	// VAWE_SERVE_ALL=1 restores the old serve-everything behaviour for local debugging ONLY. It must
	// never be set on a host that renders untrusted scenes.
	serveAll := ServeAll()
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !serveAll && !allowed(r.URL.Path) {
			http.Error(w, "not found", http.StatusNotFound) // 404 not 403: reveal nothing about what exists
			return
		}
		fileServer.ServeHTTP(w, r)
	})
	srv := &http.Server{Handler: h}
	go srv.Serve(ln)
	return srv, ln.Addr().(*net.TCPAddr).Port, nil
}

// THE TWO JS BARRIERS OF A CAPTURE, in the order they must run. They are constants because the
// profiled and the unprofiled path both run them, and two copies of a barrier that disagree is how
// the unprofiled path came to skip `__frameSettle` entirely: the drain was written into the profiled
// branch only, so every REAL render shot a <video> frame without waiting for its decode, which is the
// defect #370 and #383 were fixed for, live again on the path that ships.
//
// settleJS: DRAIN THE ASYNC WORK. A <video> seek fires `seeked` whenever the decode is ready, which
// is routinely longer than two frames; shooting without waiting captures whatever the decoder had
// lying around, which varies by worker and by machine (docs/MISTAKES.md #370, #383). __frameSettle is
// installed by core/frame-settle.js for every scene, so the guard is about a stale tab on an older
// page, not about whether this film uses video.
const settleJS = `window.__frameSettle ? window.__frameSettle() : true`

// paintJS: WAIT FOR PAINT. Two real rAFs: the first schedules the commit, the second runs after it.
const paintJS = `window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`

func awaitPromise(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }

func allocOpts(ss int) []chromedp.ExecAllocatorOption {
	opts := append([]chromedp.ExecAllocatorOption{},
		chromedp.Headless,
		chromedp.NoSandbox,
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("force-color-profile", "srgb"),
		chromedp.Flag("font-render-hinting", "none"),
		// DETERMINISTIC RASTER. Chrome's "checker imaging" defers an image's decode off the raster
		// thread and paints a blank placeholder in the meantime, and the compositor is free to draw a
		// frame before every stage has finished. Neither is visible to renderFrame(n), to a rAF, or to
		// document.images (which report complete). The screenshot simply catches the placeholder, so a
		// captured component's screenshots vanish from a frame or two and reappear.
		//
		// That is a race against wall time, so it lands on different frames in every render, and each
		// worker browser loses it independently, which is why four workers damage roughly four times
		// as many frames as one. Measured on brew-launch: 925 of 1890 frames differed between two
		// 4-worker renders, up to 17% of the pixels of a frame, with whole product screenshots missing.
		// Waiting longer only shifts the odds; these two flags remove the race
		// (docs/MISTAKES.pending-worker.md).
		chromedp.Flag("disable-checker-imaging", true),
		chromedp.Flag("run-all-compositor-stages-before-draw", true),
		// PARTIAL RASTER IS INCREMENTAL, AND AN INCREMENTAL PICTURE IS NOT A FUNCTION OF n. Chrome
		// re-rasters only the invalidated part of a tile and reuses what was already there, so a tile's
		// pixels depend on which frames were painted into it earlier. Seeking straight to one frame and
		// shooting it is a different history from seeking sixty, and a sharded capture gives every tab a
		// different history by construction, so the same frame came out differently at -workers 1 and
		// -workers 6. Measured on a 60-frame scene once the will-change promotions were gone (see
		// formats/scene/scene.css): 1 of 60 frames still differed between the two, and 0 of 60 with this
		// flag. Cost: none measurable on a 60-frame draft (docs/MISTAKES.md #507).
		//
		// PRICED PROPERLY, against a real baseline, once the stopwatch existed. Turning partial raster back
		// ON (VAWE_CHROME_FLAGS="disable-partial-raster=false", 3 runs each against verify/perf/baseline.json)
		// moved plinth-ad +4.2% and site-backdrop +1.9%, both INSIDE the run-to-run spread and both in the
		// slower direction. So this flag buys byte-identical frames for nothing measurable, and that is the
		// whole record: CLAUDE.md asks for two numbers when the capture path changes, and these are them.
		chromedp.Flag("disable-partial-raster", true),
		// GPU RASTERISATION IS NOT A FUNCTION OF THE DISPLAY LIST AT ss=2, AND THAT IS #541.
		//
		// The GPU is already on and has always been on: the launcher above names no GL flag, and
		// Chrome still reports ANGLE Metal on the real device, with canvas, compositing and
		// rasterisation all hardware accelerated (TestGLRenderer in this package prints it). So there
		// was never a SwiftShader fallback to escape. What there was is a GPU rasteriser that gives two
		// COLD tabs of the SAME browser different pixels for an identical display list, but only at
		// device scale 2:
		//
		//	tabprobe -root . -data /formats/scene/plinth-ad.json -tabs 2 -frame 45 -ss 1  identical sha
		//	tabprobe -root . -data /formats/scene/plinth-ad.json -tabs 2 -frame 45 -ss 2  different sha,
		//	  and its 118-line DOM dump (rects to six decimals, transform, filter, font) is line-for-line
		//	  the same on both tabs. Same display list, different raster.
		//
		// Measured on plinth-ad, 900 frames at ss=2, byte-different frames (scripts/dev/framediff):
		//
		//	                 with GPU raster    with this flag
		//	1 worker twice        19 of 900        0 of 900
		//	6 workers twice      391 of 900        0 of 900
		//	1 against 6          405 of 900        3 of 900
		//
		// The remaining 3 are #531's residue, a different defect with its own reproduction in
		// docs/BUGS/. Everything else in that table is this flag.
		//
		// PRICE, measured, three runs each, median: plinth-ad 51.2s -> 54.6s at 6 workers (+6.6%);
		// site-backdrop, a shader film, 42.2s -> 36.8s, inside its own 8s run-to-run spread. Raster is
		// not what a shader film spends its time on, so only the type-heavy case pays.
		//
		// `--disable-skia-graphite` converges the same repro and is NOT the flag to use: it takes
		// WebGL away entirely, and every ambient shader, sting and three.js scene then refuses to boot
		// (core/webgl.js). VAWE_CHROME_FLAGS below is how both were tried on the real path.
		chromedp.Flag("disable-gpu-rasterization", true),
		// SUPERSAMPLE: capture at ss× device pixels so animated transforms (camera, kinetic type,
		// stings) land text on a fine grid: the ss×ss box-resolve in downsample() averages the
		// sub-pixel jitter out, killing the frame-to-frame shimmer at the root instead of by
		// stripping effects. Draft renders at ss=1 for speed.
		chromedp.Flag("force-device-scale-factor", fmt.Sprintf("%d", ss)),
		// BACKGROUND THROTTLING, and why the capture DEADLOCKS without these three.
		//
		// The capture drives several TABS on one browser. Chrome throttles a tab that is not the
		// visible one, and shoot() waits on `new Promise(res => __realRaf(() => __realRaf(res)))` with
		// WithAwaitPromise. A backgrounded tab never fires that rAF, so the promise never settles and
		// nothing bounds the wait: frames stop arriving, every Chrome process goes idle, and the Go
		// process blocks forever with no error and no timeout.
		//
		// It does not reproduce on a desktop, where a window is genuinely visible. It reproduces every
		// time in a CONTAINER, which is how it was found: `--workers 1` always finished, and 2, 3 and 6
		// always hung, on two different scenes. Adding these three made 6 workers render clean.
		//
		// THEY CHANGE NO PIXEL. Each one only stops Chrome de-prioritising a hidden tab; none touches
		// raster, layout or colour. Verified by A/B: the same scene built with and without these three
		// renders a byte-identical mp4 (2892399 bytes both ways). That is one scene, not the library,
		// stated precisely because the earlier draft of this comment claimed the library and had not
		// checked it.
		chromedp.Flag("disable-renderer-backgrounding", true),
		chromedp.Flag("disable-background-timer-throttling", true),
		chromedp.Flag("disable-backgrounding-occluded-windows", true),
		chromedp.WindowSize(W, H),
	)
	if p := os.Getenv("CHROME_BIN"); p != "" {
		opts = append(opts, chromedp.ExecPath(p))
	}
	// VAWE_CHROME_FLAGS: extra Chrome flags on the REAL capture path, comma separated, "k=v" or bare
	// "k" for a boolean. It exists so a flag question is answered by a render instead of by reasoning.
	// scripts/dev/tabprobe already had -flags for two tabs; this is the same lever for a whole film,
	// and it is how the GPU question was settled (docs/MISTAKES.md #551).
	for _, f := range strings.Split(os.Getenv("VAWE_CHROME_FLAGS"), ",") {
		if f = strings.TrimSpace(f); f == "" {
			continue
		}
		if k, v, ok := strings.Cut(f, "="); ok {
			opts = append(opts, chromedp.Flag(k, v))
		} else {
			opts = append(opts, chromedp.Flag(f, true))
		}
	}
	return opts
}

// newTab opens a TAB on the browser that `parent` belongs to, loaded at url, ready to render at ss×
// device scale. Pass an allocator context for the first tab (which starts the browser) and that first
// tab's context for every later one.
//
// IT USED TO SPIN UP A WHOLE BROWSER PER CALL: `chromedp.NewExecAllocator` was inside here, and its
// own comment said "an independent browser + tab". Four workers meant four complete Chrome
// installations: measured at 51 processes and 5,604 MB peak against another engine's 12 / 1,738 and
// another engine' 9 / 1,347 for the same job. One browser with four tabs measures 13 processes and
// 1,468 MB. Each extra tab costs exactly one renderer process and about 118 MB; the browser, GPU and
// utility processes stay flat, so the parallelism is unchanged and only the duplication goes.
//
// setFocusEmulationEnabled IS LOAD-BEARING, and it is not the flag anyone would reach for first. A
// background tab in headless Chrome is not throttled, it is FROZEN: measured zero rAF callbacks in
// three seconds while the foreground tab ran 362. `--disable-background-timer-throttling`,
// `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding` change NOTHING:
// all three were measured and all three leave the tab at zero. This one call makes every tab report
// itself focused and visible, and all eight tabs then tick at the full rate.
//
// That matters here more than it would elsewhere, because the readiness Poll below runs in rAF mode
// and `shoot` awaits a double `__realRaf` before every screenshot. Without this, every worker except
// one would wait forever, which is docs/MISTAKES.md #121 exactly.
func newTab(parent context.Context, url string, ss int) (context.Context, context.CancelFunc, error) {
	ctx, cancel := chromedp.NewContext(parent)
	err := chromedp.Run(ctx,
		chromedp.EmulateViewport(W, H, chromedp.EmulateScale(float64(ss))),
		emulation.SetFocusEmulationEnabled(true),
		chromedp.Navigate(url),
		chromedp.Poll("window.__engineReady === true || !!window.__engineError", nil, chromedp.WithPollingTimeout(45*time.Second)),
	)
	if err != nil {
		cancel()
		return nil, nil, fmt.Errorf("load %s: %w", url, err)
	}
	var serr string
	_ = chromedp.Run(ctx, chromedp.Evaluate("window.__engineError || ''", &serr))
	if serr != "" {
		cancel()
		return nil, nil, fmt.Errorf("scene error: %s", serr)
	}
	return ctx, cancel, nil
}

// Capture renders module's scene (data at dataURL) and writes total PNGs to framesDir.
// pngDiffRatio: fraction of pixels whose any-channel delta exceeds a small epsilon.
// Distinguishes cross-tab raster noise (a few hundredths of a percent) from real motion.
func pngDiffRatio(a, b []byte) (float64, error) {
	ia, _, err := image.Decode(bytes.NewReader(a))
	if err != nil {
		return 1, err
	}
	ib, _, err := image.Decode(bytes.NewReader(b))
	if err != nil {
		return 1, err
	}
	ra, rb := ia.Bounds(), ib.Bounds()
	if ra != rb {
		return 1, fmt.Errorf("dims differ")
	}
	var diff, total int
	for y := ra.Min.Y; y < ra.Max.Y; y++ {
		for x := ra.Min.X; x < ra.Max.X; x++ {
			r1, g1, b1, _ := ia.At(x, y).RGBA()
			r2, g2, b2, _ := ib.At(x, y).RGBA()
			total++
			const eps = 3 << 8 // 8-bit delta of 3, in 16-bit space
			if absd(r1, r2) > eps || absd(g1, g2) > eps || absd(b1, b2) > eps {
				diff++
			}
		}
	}
	return float64(diff) / float64(total), nil
}

func absd(a, b uint32) uint32 {
	if a > b {
		return a - b
	}
	return b - a
}

// profile: per-phase wall time across every capture worker, behind VAWE_PROFILE=1.
//
// It exists because the render's cost had never been attributed. A 14.6s film costs 2.13s of CPU per
// frame; a synthetic browser benchmark explained about a quarter of that, and the remainder was
// guessed at twice and wrong both times (once at the Go downsample, which turned out to cost nothing
// measurable). Phases are summed, not averaged per worker, so the numbers add up to the wall time
// times the worker count and the biggest one is unambiguous.
type profile struct {
	mu                             sync.Mutex
	render, raf, shot, down, write time.Duration
	frames                         int
	rawBytes, outBytes             int64
}

func (p *profile) add(render, raf, shot, down, write time.Duration, raw, out int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.render += render
	p.raf += raf
	p.shot += shot
	p.down += down
	p.write += write
	if raw > 0 || out > 0 {
		p.frames++
		p.rawBytes += int64(raw)
		p.outBytes += int64(out)
	}
}

func (p *profile) report(wall time.Duration, workers int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	tot := p.render + p.raf + p.shot + p.down + p.write
	if tot == 0 || p.frames == 0 {
		return
	}
	row := func(name string, d time.Duration) {
		fmt.Printf("    %-22s %8.1fs  %5.1f%%   %7.1f ms/frame\n",
			name, d.Seconds(), float64(d)/float64(tot)*100, float64(d.Milliseconds())/float64(p.frames))
	}
	fmt.Printf("\n  ▶ profile · %d frames · %d workers · %.1fs wall\n", p.frames, workers, wall.Seconds())
	row("renderFrame (paint)", p.render)
	row("rAF settle wait", p.raf)
	row("screenshot+transfer", p.shot)
	row("downsample (Go)", p.down)
	row("write to disk", p.write)
	fmt.Printf("    %-22s %8.1fs\n", "TOTAL (all workers)", tot.Seconds())
	fmt.Printf("    captured %.0f MB raw → %.0f MB on disk (%.1f MB/frame raw)\n",
		float64(p.rawBytes)/1e6, float64(p.outBytes)/1e6, float64(p.rawBytes)/1e6/float64(p.frames))
	fmt.Printf("    downsample path: %d fast / %d slow\n\n", atomic.LoadInt64(&downsampleFast), atomic.LoadInt64(&downsampleSlow))
}

// CaptureExt is the file extension frames are written with, and it is EXPORTED so the encoder asks the
// capturer what it produced instead of re-deriving it. Two copies of this condition that disagree is
// how the encoder would silently look for %05d.png in a directory of .jpg and fail at the last step of
// a ten-minute render.
func CaptureExt(transparent bool) string {
	if transparent || os.Getenv("VAWE_CAPTURE") == "png" {
		return ".png"
	}
	return ".jpg"
}

// ResolvedInGo reports whether the Go side already did the supersample resolve. It did for PNG (the
// alpha path); for JPEG the frames are still supersampled and ffmpeg must resolve them.
func ResolvedInGo(transparent bool) bool { return CaptureExt(transparent) == ".png" }

// TransparentPixels reports whether any sampled captured frame has a pixel that is not fully opaque.
//
// It is the acceptance test for the alpha and compositing exports, run on the FRAMES rather than on the
// finished file, so a wrong deliverable is refused before it is encoded. Suppressing the backdrop makes
// the channel real for a normal scene, but nothing stops a scene from covering the frame with content
// of its own, and the failure looks exactly like success: ffmpeg exits 0 and writes a file whose alpha
// is uniformly 255. Sampling beats a full scan because one transparent pixel anywhere settles it, and
// a scene that is opaque in the sampled frames is opaque in the ones between them.
func TransparentPixels(framesDir string, total int) (bool, error) {
	if total <= 0 {
		return false, fmt.Errorf("no frames were captured")
	}
	const samples = 8
	step := total / samples
	if step < 1 {
		step = 1
	}
	checked := 0
	for n := 0; n < total; n += step {
		b, err := os.ReadFile(filepath.Join(framesDir, fmt.Sprintf("%05d.png", n)))
		if err != nil {
			continue // a gap in the sequence is the encoder's error to report, not this check's
		}
		img, err := png.Decode(bytes.NewReader(b))
		if err != nil {
			return false, err
		}
		checked++
		r := img.Bounds()
		for y := r.Min.Y; y < r.Max.Y; y++ {
			for x := r.Min.X; x < r.Max.X; x++ {
				if _, _, _, a := img.At(x, y).RGBA(); a < 0xffff {
					return true, nil
				}
			}
		}
	}
	if checked == 0 {
		return false, fmt.Errorf("no captured frame in %s could be read", framesDir)
	}
	return false, nil
}

// capture builds the screenshot action for a format. chromedp.CaptureScreenshot is PNG-only, so the
// jpeg path drops to the CDP call it wraps.
func capture(format string, buf *[]byte) chromedp.Action {
	if format == "png" {
		return chromedp.CaptureScreenshot(buf)
	}
	return chromedp.ActionFunc(func(ctx context.Context) error {
		b, err := page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatJpeg).WithQuality(95).Do(ctx)
		if err != nil {
			return err
		}
		*buf = b
		return nil
	})
}

// resolve turns a captured frame into the bytes written to disk.
//
// For JPEG it does NOTHING, deliberately. The ss×ss box resolve is now ffmpeg's `scale=flags=area`,
// which IS a box filter: the same operation, in SIMD C instead of a Go loop over image.At(). Measured:
// 838 ms/frame in Go against 12.6 ms/frame in ffmpeg for decode + scale + h264 together. Re-encoding
// here would also mean a second lossy generation for no reason.
//
// The PNG path (alpha export) keeps the Go resolve, because encode.VideoAlpha's VP9 stream is built
// from those files directly and its alpha must survive untouched.
func resolve(buf []byte, ss int, format string) ([]byte, error) {
	if format != "png" {
		return buf, nil
	}
	return downsample(buf, ss)
}

// Which downsample path each frame took. Counted, and printed by the profile, because the first
// attempt at the fast path silently never ran and the identical output was mistaken for proof.
var downsampleFast, downsampleSlow int64

// downsample resolves an ss×-supersampled PNG to native size by averaging each ss×ss block: the
// exact SSAA resolve. Sub-pixel jitter from animated transforms averages out, so text stays crisp
// instead of shimmering frame-to-frame. Averages alpha-premultiplied channels (correct over the
// transparent/alpha export too). ss<=1 returns the bytes untouched. Deterministic (fixed kernel).
func downsample(buf []byte, ss int) ([]byte, error) {
	if ss <= 1 {
		return buf, nil
	}
	src, err := png.Decode(bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	b := src.Bounds()
	ow, oh := b.Dx()/ss, b.Dy()/ss
	dst := image.NewRGBA(image.Rect(0, 0, ow, oh))
	n := uint32(ss * ss)

	// FAST PATH: index Pix instead of calling At().
	//
	// `src.At(x, y).RGBA()` is an interface call returning a boxed color.Color, run once per SUBPIXEL:
	// at ss=2 into 1920x1080 that is 8.3M interface calls and 8.3M allocations per frame. Profiling
	// (VAWE_PROFILE=1) put this loop at 979 ms/frame, 46.6% of a final render, second only to the
	// screenshot itself.
	//
	// EXACT, not approximate. Chrome's screenshots decode to *image.RGBA, whose Pix is already
	// alpha-premultiplied, and color.RGBA.RGBA() returns each channel as pix*0x101. So the old loop
	// computed ((0x101 * Σpix) / n) >> 8, and so does this one, in integer arithmetic, for every pixel
	// including translucent ones. Any other concrete type falls through to the original loop.
	//
	// A previous attempt at this guarded on *image.NRGBA, which Chrome never produces. It fell through
	// to the slow loop, produced a byte-identical mp4, and saved nothing, and the byte-identical hash
	// was read as proof of correctness when it was proof of nothing. Hence downsampleFast: the profile
	// prints how many frames took which path, so "never ran" cannot masquerade as "correct".
	if rgba, ok := src.(*image.RGBA); ok {
		atomic.AddInt64(&downsampleFast, 1)
		for y := 0; y < oh; y++ {
			for x := 0; x < ow; x++ {
				var r, g, bl, a uint32
				for dy := 0; dy < ss; dy++ {
					row := (b.Min.Y+y*ss+dy-rgba.Rect.Min.Y)*rgba.Stride - rgba.Rect.Min.X*4
					for dx := 0; dx < ss; dx++ {
						i := row + (b.Min.X+x*ss+dx)*4
						r += uint32(rgba.Pix[i+0])
						g += uint32(rgba.Pix[i+1])
						bl += uint32(rgba.Pix[i+2])
						a += uint32(rgba.Pix[i+3])
					}
				}
				o := dst.PixOffset(x, y)
				dst.Pix[o+0] = uint8((r * 0x101 / n) >> 8)
				dst.Pix[o+1] = uint8((g * 0x101 / n) >> 8)
				dst.Pix[o+2] = uint8((bl * 0x101 / n) >> 8)
				dst.Pix[o+3] = uint8((a * 0x101 / n) >> 8)
			}
		}
		var out bytes.Buffer
		if err := png.Encode(&out, dst); err != nil {
			return nil, err
		}
		return out.Bytes(), nil
	}
	atomic.AddInt64(&downsampleSlow, 1)

	for y := 0; y < oh; y++ {
		for x := 0; x < ow; x++ {
			var r, g, bl, a uint32
			for dy := 0; dy < ss; dy++ {
				for dx := 0; dx < ss; dx++ {
					pr, pg, pb, pa := src.At(b.Min.X+x*ss+dx, b.Min.Y+y*ss+dy).RGBA() // 16-bit premultiplied
					r += pr
					g += pg
					bl += pb
					a += pa
				}
			}
			i := dst.PixOffset(x, y)
			dst.Pix[i+0] = uint8((r / n) >> 8)
			dst.Pix[i+1] = uint8((g / n) >> 8)
			dst.Pix[i+2] = uint8((bl / n) >> 8)
			dst.Pix[i+3] = uint8((a / n) >> 8)
		}
	}
	var out bytes.Buffer
	if err := png.Encode(&out, dst); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func Capture(repoRoot, module, dataURL string, fps, workers int, framesDir string, transparent bool, ss int, aspect string) (Meta, error) {
	if ss < 1 {
		ss = 1
	}
	// CAPTURE FORMAT. PNG costs 526 ms/frame at 3840x2160 and JPEG q95 costs 80 ms (6.6x), because a
	// lossless compressor is being asked to encode 8.3 megapixels that end up in a lossy h264 anyway.
	// NOT byte-stable across repeats, and the claim that it was is now deleted. Measured on brew-launch:
	// two renders of identical code differed on 373 of 1890 captures with ONE worker and 1078 with four.
	//
	// The four-worker half of that WAS content, not noise, and #258's reading of it as antialiasing was
	// wrong: whole product screenshots were missing from a card, up to 17% of a frame's pixels. That is
	// the deferred image decode the raster flags above now close, and it is why the counts are lower
	// than these. What remains after the fix is 250 frames, of which one span of 122 moves ~1.8% of its
	// pixels with a content group offset by about 60 supersampled pixels. That is still open and it is
	// still not antialiasing (docs/MISTAKES.pending-worker.md).
	//
	// What that means for the two things this comment used to lean on. Dedup is FINE, and by design
	// rather than by luck: its anchor check re-shoots inside the SAME browser and tolerates 0.05% of
	// pixels (see the anchor block below), which is an order of magnitude above what was measured.
	// renderFrame(n) purity is a claim about the DOM, which is what `make probe` compares, and it holds.
	// Neither was ever a claim about bytes. VAWE_KEEP_FRAMES=1 keeps the captures if you need to
	// re-measure this (docs/MISTAKES.md #258).
	//
	// ALPHA STAYS PNG. JPEG has no alpha channel, and the transparent export is the one path whose
	// whole point is the alpha channel: exactly the kind of silent substitution this repo keeps
	// logging. VAWE_CAPTURE=png forces the old path for everything.
	capExt := CaptureExt(transparent)
	capFmt := "jpeg"
	if capExt == ".png" {
		capFmt = "png"
	}

	// VAWE_PROFILE=1 splits the capture into timed phases (see type profile). Off by default because
	// timing it costs three CDP round trips per frame instead of one.
	var prof *profile
	var profStart time.Time
	if os.Getenv("VAWE_PROFILE") == "1" {
		prof = &profile{}
		profStart = time.Now()
		defer func() { prof.report(time.Since(profStart), workers) }()
	}
	var meta Meta
	srv, port, err := Serve(repoRoot)
	if err != nil {
		return meta, err
	}
	defer srv.Close()
	url := fmt.Sprintf("http://127.0.0.1:%d/formats/%s/scene.html?data=%s&fps=%d", port, module, dataURL, fps)
	if aspect != "" {
		url += "&aspect=" + aspect
	}
	if transparent {
		url += "&alpha=1" // scene drops its opaque background so unpainted pixels stay transparent
	}

	// ONE browser for the whole render. The allocator and the first tab outlive every worker, so no
	// worker's `defer cancel()` can take the browser down under its siblings.
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), allocOpts(ss)...)
	defer cancelAlloc()

	// one tab for meta, and it is the tab that owns the browser, so it is cancelled here, not by the
	// worker that borrows it.
	ctx0, cancel0, err := newTab(allocCtx, url, ss)
	// THE ERROR CHECK COMES FIRST. newTab returns (nil, nil, err) on every failure path, so deferring
	// cancel0 before checking err scheduled a call to a nil func: the return ran, the deferred nil call
	// panicked, and the process died with a SIGSEGV attributed to this function's closing brace. That
	// crash REPLACED the message newTab had already built ("scene error: <what the engine actually
	// said>") with a stack trace naming a line that has nothing to do with the fault, on the one path
	// whose whole job is to report why a scene would not load (docs/MISTAKES.md #372).
	if err != nil {
		return meta, err
	}
	defer cancel0()
	if err := chromedp.Run(ctx0, chromedp.Evaluate("window.__engine.meta", &meta)); err != nil {
		cancel0()
		return meta, fmt.Errorf("meta eval: %w", err)
	}
	total := meta.TotalFrames
	// capture size from the scene's meta (orientation-aware); fall back to portrait default.
	cw, ch := int64(meta.Width), int64(meta.Height)
	if cw == 0 || ch == 0 {
		cw, ch = W, H
	}
	if workers < 1 {
		workers = 1
	}
	if workers > total {
		workers = total
	}

	// ---- static-frame dedup: capture each RUN of identical frames once ----
	// frameSig(n) hashes every per-frame DOM write + downsampled canvas pixels. Runs of equal
	// signatures capture only their first frame; the rest are hardlinked afterwards. Mid-run
	// ANCHOR frames are captured anyway and byte-compared: a mismatch means the signature
	// missed real motion, and we fail LOUDLY (purity culture: no silent wrong frames).
	// VAWE_NO_DEDUP=1 disables.
	rep := make([]int, total)
	for f := range rep {
		rep[f] = f
	}
	if os.Getenv("VAWE_NO_DEDUP") == "" {
		var sigs []string
		expr := fmt.Sprintf(`(() => { const out = []; for (let f = 0; f < %d; f++) out.push(window.__engine.frameSig ? String(window.__engine.frameSig(f)) : 'nofsig' + f); return out; })()`, total)
		if err := chromedp.Run(ctx0, chromedp.Evaluate(expr, &sigs)); err == nil && len(sigs) == total {
			for f := 1; f < total; f++ {
				if sigs[f] == sigs[f-1] {
					rep[f] = rep[f-1]
				}
			}
		}
	}
	type capJob struct {
		frame  int
		path   string
		anchor int // ≥0: after capturing, render THIS frame too and verify pixels match in-memory.
		// Same-worker verification on purpose: it checks the SIGNATURE's honesty (does equal-sig
		// mean equal pixels in one instance), not cross-instance raster identity, which differs
		// at baseline for saturated text and always has across adjacent frames.
	}
	framePath := func(f int) string { return filepath.Join(framesDir, fmt.Sprintf("%05d%s", f, capExt)) }
	anchorFor := map[int]int{} // rep frame → mid-run anchor frame (runs ≥10)
	for f := 0; f < total; {
		r := rep[f]
		end := f
		for end < total && rep[end] == r {
			end++
		}
		if end-f >= 10 {
			mid := f + (end-f)/2
			if mid != r {
				anchorFor[r] = mid
			}
		}
		f = end
	}
	jobs := []capJob{}
	dups := 0
	for f := 0; f < total; f++ {
		if rep[f] == f {
			a := -1
			if m, ok := anchorFor[f]; ok {
				a = m
			}
			jobs = append(jobs, capJob{f, framePath(f), a})
		} else {
			dups++
		}
	}
	// DEAL THE FRAMES, do not race for them. A shared job channel gives whichever browser asks first,
	// so frame 856 is drawn by a different worker in every render and no two renders can be compared
	// frame by frame. Round-robin is the same balanced interleave the channel produced in practice, and
	// it is decided here, once, before any browser starts. A measurement of what changes between two
	// renders is only possible when this is fixed.
	perWorker := make([][]capJob, workers)
	for i, j := range jobs {
		w := i % workers
		perWorker[w] = append(perWorker[w], j)
	}

	// VAWE_FRAME_MAP=<path> records which worker browser drew each frame, one "frame rep worker" triple
	// per line. It exists so a byte difference between two renders can be attributed: same worker or a
	// different one is the question, and no other signal in the render answers it.
	frameMap := make([]int32, total)
	for i := range frameMap {
		frameMap[i] = -1
	}

	worker := func(ctx context.Context, widx int) error {
		// size this tab's viewport to the capture dimensions (landscape support)
		if err := chromedp.Run(ctx, chromedp.EmulateViewport(cw, ch, chromedp.EmulateScale(float64(ss)))); err != nil {
			return fmt.Errorf("emulate viewport: %w", err)
		}
		// alpha export: override the default page backdrop to fully transparent so
		// CaptureScreenshot emits PNGs with a real alpha channel (unpainted → transparent).
		if transparent {
			if err := chromedp.Run(ctx, emulation.SetDefaultBackgroundColorOverride().WithColor(&cdp.RGBA{R: 0, G: 0, B: 0, A: 0})); err != nil {
				return fmt.Errorf("transparent bg: %w", err)
			}
		}
		shoot := func(f int) ([]byte, error) {
			var buf []byte
			// The three steps are run SEPARATELY under VAWE_PROFILE so each can be timed. Batched into
			// one chromedp.Run they are one number, and one number is what let a 2.13s-per-frame cost
			// go unexplained: a synthetic bench accounted for ~500ms of it and the rest was guessed at
			// twice, wrongly. Unprofiled, the batched call is kept: it is one round trip, not three.
			if prof == nil {
				err := chromedp.Run(ctx,
					chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil),
					chromedp.Evaluate(settleJS, nil, awaitPromise),
					chromedp.Evaluate(paintJS, nil, awaitPromise),
					capture(capFmt, &buf),
				)
				if err != nil {
					return nil, err
				}
				return resolve(buf, ss, capFmt)
			}
			t0 := time.Now()
			if err := chromedp.Run(ctx, chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil)); err != nil {
				return nil, err
			}
			t1 := time.Now()
			// The same two barriers the unprofiled branch runs, timed separately. See settleJS/paintJS.
			if err := chromedp.Run(ctx, chromedp.Evaluate(settleJS, nil, awaitPromise)); err != nil {
				return nil, err
			}
			if err := chromedp.Run(ctx, chromedp.Evaluate(paintJS, nil, awaitPromise)); err != nil {
				return nil, err
			}
			t2 := time.Now()
			if err := chromedp.Run(ctx, capture(capFmt, &buf)); err != nil {
				return nil, err
			}
			t3 := time.Now()
			out, derr := resolve(buf, ss, capFmt)
			t4 := time.Now()
			prof.add(t1.Sub(t0), t2.Sub(t1), t3.Sub(t2), t4.Sub(t3), 0, len(buf), len(out))
			return out, derr
		}
		for _, j := range perWorker[widx] {
			atomic.StoreInt32(&frameMap[j.frame], int32(widx))
			buf, err := shoot(j.frame)
			if err != nil {
				return fmt.Errorf("frame %d: %w", j.frame, err)
			}
			tw := time.Now()
			if err := os.WriteFile(j.path, buf, 0644); err != nil {
				return err
			}
			if prof != nil {
				prof.add(0, 0, 0, 0, time.Since(tw), 0, 0)
			}
			if j.anchor >= 0 { // same-instance signature honesty check
				abuf, err := shoot(j.anchor)
				if err != nil {
					return fmt.Errorf("anchor %d: %w", j.anchor, err)
				}
				if !bytes.Equal(buf, abuf) {
					ratio, derr := pngDiffRatio(buf, abuf)
					if derr != nil || ratio > 0.0005 {
						os.WriteFile("/tmp/dedup_rep"+capExt, buf, 0644)
						os.WriteFile("/tmp/dedup_anchor"+capExt, abuf, 0644)
						return fmt.Errorf("dedup verification FAILED: frames %d and %d share a signature but differ %.4f%% in one instance: a per-frame effect escapes frameSig; render with VAWE_NO_DEDUP=1 and report (pair in /tmp/dedup_*)", j.frame, j.anchor, ratio*100)
					}
				}
			}
		}
		return nil
	}

	var wg sync.WaitGroup
	errs := make(chan error, workers)
	// worker 0 reuses the meta tab; the rest get their own browsers
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			var ctx context.Context
			var cancel context.CancelFunc
			if w == 0 {
				// Borrowed, not owned: Capture cancels ctx0. A worker cancelling it would close the
				// browser every other tab is running on.
				ctx = ctx0
			} else {
				var e error
				ctx, cancel, e = newTab(ctx0, url, ss) // a TAB on the same browser
				if e != nil {
					errs <- e
					return
				}
				defer cancel()
			}
			if e := worker(ctx, w); e != nil {
				errs <- e
			}
		}(w)
	}
	wg.Wait()
	close(errs)
	for e := range errs {
		if e != nil {
			return meta, e
		}
	}
	if mp := os.Getenv("VAWE_FRAME_MAP"); mp != "" {
		var sb strings.Builder
		for f := 0; f < total; f++ {
			// A deduped frame is drawn by whichever worker drew its representative.
			fmt.Fprintf(&sb, "%d %d %d\n", f, rep[f], frameMap[rep[f]])
		}
		if err := os.WriteFile(mp, []byte(sb.String()), 0644); err != nil {
			return meta, err
		}
	}

	anchorsOK := len(anchorFor)
	if dups > 0 {
		for f := 0; f < total; f++ {
			if rep[f] == f {
				continue
			}
			src, dst := framePath(rep[f]), framePath(f)
			if err := os.Link(src, dst); err != nil {
				b, rerr := os.ReadFile(src)
				if rerr != nil {
					return meta, rerr
				}
				if werr := os.WriteFile(dst, b, 0644); werr != nil {
					return meta, werr
				}
			}
		}
		fmt.Printf("▶ dedup: %d/%d frames captured (%d reused · %d anchors verified)\n", total-dups, total, dups, anchorsOK)
	}
	return meta, nil
}

// ---- STILLNESS: how much of this film actually moves -------------------------------------------
//
// A film can pass every static gate and still read as a slideshow, because every gate we have looks at
// one frame at a time, or at the structure that produced it. None of them asks the only question a
// viewer answers instantly: is anything happening right now.
//
// Measured against the reference films the owner keeps (refs/) and reported by `node
// scripts/author/claims.mjs`, the real spread is 11% to 77% still, median 29%: the "13% to 24%" figure
// this comment carried before was CONTRADICTED by the corpus it claimed to summarise (grammar/_claims.json
// id ref-still-share), sourced from a plan file and never checked. It sent authors chasing a target their
// films did not have. A launch film of ours that passed the whole ladder was still for 84%, still above
// the real spread. That number belongs beside the duration, printed by the renderer on every run, for the
// same reason the duration is: it is a fact about the film, not an opinion about it, and an author who
// never sees it optimises for the gates that do print.
//
// THE COMPARISON IS STILL LOOSE, EVEN CORRECTED, and the renderer says so when it prints: the reference
// spread above was measured on decoded H.264 frames (scripts/media/study.mjs, via ffmpeg signalstats),
// while this film's own frames are JPEG screenshots by default (CaptureExt). scripts/gates/motion-split.mjs
// measured a JPEG quantisation floor around 0.9, well above `stillFloor` below, against 0.05 for a
// lossless PNG of the same instant: two codecs read the same held frame as two different numbers. Render
// with `VAWE_CAPTURE=png` for a codec-comparable reading, or read the codec printed beside the percentage
// and treat the two figures as directional, not identical units.
//
// NOT A GATE, deliberately. It refuses nothing and blocks nobody. CLAUDE.md's architecture rule is that
// a gate is the last resort and the fix belongs where the value is written; the fix here is the engine's
// own motion defaults, and this is the instrument that says whether they worked.
//
// Modelled on TransparentPixels above: same directory, same already-captured frames, decoded once more
// before they are deleted. No second ffmpeg pass and no new channel out of the page, because unlike
// beatSync (docs/MISTAKES.md #477) this property does not exist in the page at all. It is a difference
// BETWEEN two rendered frames, and only the Go side ever holds two.
const (
	stillPairs = 48  // consecutive pairs sampled across the film. 48 is enough to shape a 20s cut.
	stillGrid  = 12  // cell size per axis: a 1920x1080 frame becomes ~160x90 cells.
	stillSub   = 3   // sub-sample step INSIDE each cell, so every reading is an average, not a point.
	stillFloor = 0.5 // mean |luma delta| below this reads as "the same picture", matching the ffmpeg
	// probe this was calibrated against (scale=160:90,tblend=difference,signalstats).
)

// Stillness samples consecutive frame PAIRS and reports what share of them are unchanged, the median
// per-pair change, and the PEAK change among the samples. Returns ok=false when the film is too short
// to say anything useful.
//
// PEAK EXISTS BECAUSE THE MEDIAN AND THE STILL SHARE HIDE A BURST-AND-HOLD FILM, which is the exact
// shape our own doctrine tells authors to build (AGENTS.md, THE FILM'S ENERGY OVER TIME). 48 evenly
// spaced probes measure velocity at 48 random instants, not motion over time: a shot that holds for
// most of its length and then explodes for a few frames lands most of its probes inside the hold and
// reports mostly-still, same as a shot that never moves at all. scripts/media/study.mjs solved this for
// references by keeping `peak` (the loudest single frame) beside `held` (the still share) for exactly
// this reason: "a shot that holds for three seconds and then explodes has the same mean as one that
// moves steadily". A burst-and-hold film and a genuinely static one now read differently: both can
// report a high still share, but only the first also reports a high peak.
// A FRAME DIFFERENCE IS A MEASUREMENT OF THE GAP BETWEEN FRAMES, so the number it returns depends on
// how far apart they are. The same film measured 0.43 rendered at 30fps and 0.22 at 60: consecutive
// frames are half as far apart, so roughly half the change lands between them. Every reference in
// grammar/ was measured at about 30fps, so an un-normalised figure made our 60fps output look half as
// alive as it is, against the only numbers there are to compare it to.
//
// Normalised to change-per-thirtieth-of-a-second, which is the rate the references were read at and
// the rate `scripts/media/study.mjs` still reads them at. `stillFloor` is applied to the NORMALISED
// value for the same reason: a floor on a raw delta means a different thing at every frame rate.
const normFPS = 30.0

func Stillness(framesDir string, total int, ext string, fps float64) (stillPct float64, median float64, peak float64, ok bool) {
	if total < 4 {
		return 0, 0, 0, false
	}
	step := total / stillPairs
	if step < 1 {
		step = 1
	}
	readGray := func(n int) []float64 {
		b, err := os.ReadFile(filepath.Join(framesDir, fmt.Sprintf("%05d%s", n, ext)))
		if err != nil {
			return nil
		}
		img, _, err := image.Decode(bytes.NewReader(b))
		if err != nil {
			return nil
		}
		r := img.Bounds()
		out := make([]float64, 0, 16384)
		// AREA-AVERAGE each cell, do not point-sample it. The first cut read one pixel per 12x12 block
		// and disagreed with the ffmpeg probe these numbers are compared against by twenty points
		// (58% still vs 77% on the same file), because a single pixel lands on a glyph edge or a grain
		// speck and reports change where the eye sees none. `scale=160:90` box-filters, so this has to.
		// An instrument that does not agree with the measurement it is quoted beside is worse than none.
		for y := r.Min.Y; y < r.Max.Y; y += stillGrid {
			for x := r.Min.X; x < r.Max.X; x += stillGrid {
				sum, n := 0.0, 0.0
				for dy := 0; dy < stillGrid && y+dy < r.Max.Y; dy += stillSub {
					for dx := 0; dx < stillGrid && x+dx < r.Max.X; dx += stillSub {
						cr, cg, cb, _ := img.At(x+dx, y+dy).RGBA()
						// Rec. 601 luma on the 0-255 scale, which is what signalstats YAVG reports.
						sum += (0.299*float64(cr) + 0.587*float64(cg) + 0.114*float64(cb)) / 257
						n++
					}
				}
				if n > 0 {
					out = append(out, sum/n)
				}
			}
		}
		return out
	}
	deltas := make([]float64, 0, stillPairs)
	for n := 0; n+1 < total; n += step {
		a, b := readGray(n), readGray(n+1)
		if a == nil || b == nil || len(a) != len(b) || len(a) == 0 {
			continue // a gap in the sequence is the encoder's error to report, not this measurement's
		}
		sum := 0.0
		for i := range a {
			d := a[i] - b[i]
			if d < 0 {
				d = -d
			}
			sum += d
		}
		d := sum / float64(len(a))
		if fps > 0 {
			d *= fps / normFPS // change per 1/30s, whatever this film was rendered at
		}
		deltas = append(deltas, d)
	}
	if len(deltas) < 3 {
		return 0, 0, 0, false
	}
	still, top := 0, 0.0
	for _, d := range deltas {
		if d < stillFloor {
			still++
		}
		if d > top {
			top = d
		}
	}
	sorted := append([]float64(nil), deltas...)
	for i := 1; i < len(sorted); i++ { // insertion sort: the slice is at most stillPairs long
		for j := i; j > 0 && sorted[j] < sorted[j-1]; j-- {
			sorted[j], sorted[j-1] = sorted[j-1], sorted[j]
		}
	}
	return 100 * float64(still) / float64(len(deltas)), sorted[len(sorted)/2], top, true
}
