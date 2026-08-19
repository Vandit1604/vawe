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
	Width       int         `json:"width"`  // capture size — 0 falls back to the portrait default
	Height      int         `json:"height"` // (set by core/boot.js boot from data.orientation)
	Stings      []float64   `json:"stings"`
	SFX         []audio.Cue `json:"sfx"`
	// Bridges are J/L-cuts already resolved from junction names to spans of seconds by
	// core/audio-bridges.js — the browser is the only place that knows where the film's cuts are.
	Bridges []audio.Bridge `json:"bridges"`
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
		// worker browser loses it independently — which is why four workers damage roughly four times
		// as many frames as one. Measured on brew-launch: 925 of 1890 frames differed between two
		// 4-worker renders, up to 17% of the pixels of a frame, with whole product screenshots missing.
		// Waiting longer only shifts the odds; these two flags remove the race
		// (docs/MISTAKES.pending-worker.md).
		chromedp.Flag("disable-checker-imaging", true),
		chromedp.Flag("run-all-compositor-stages-before-draw", true),
		// SUPERSAMPLE: capture at ss× device pixels so animated transforms (camera, kinetic type,
		// stings) land text on a fine grid — the ss×ss box-resolve in downsample() averages the
		// sub-pixel jitter out, killing the frame-to-frame shimmer at the root instead of by
		// stripping effects. Draft renders at ss=1 for speed.
		chromedp.Flag("force-device-scale-factor", fmt.Sprintf("%d", ss)),
		chromedp.WindowSize(W, H),
	)
	if p := os.Getenv("CHROME_BIN"); p != "" {
		opts = append(opts, chromedp.ExecPath(p))
	}
	return opts
}

// newTab opens a TAB on the browser that `parent` belongs to, loaded at url, ready to render at ss×
// device scale. Pass an allocator context for the first tab (which starts the browser) and that first
// tab's context for every later one.
//
// IT USED TO SPIN UP A WHOLE BROWSER PER CALL — `chromedp.NewExecAllocator` was inside here, and its
// own comment said "an independent browser + tab". Four workers meant four complete Chrome
// installations: measured at 51 processes and 5,604 MB peak against another engine's 12 / 1,738 and
// another engine' 9 / 1,347 for the same job. One browser with four tabs measures 13 processes and
// 1,468 MB. Each extra tab costs exactly one renderer process and about 118 MB; the browser, GPU and
// utility processes stay flat, so the parallelism is unchanged and only the duplication goes.
//
// setFocusEmulationEnabled IS LOAD-BEARING, and it is not the flag anyone would reach for first. A
// background tab in headless Chrome is not throttled, it is FROZEN: measured zero rAF callbacks in
// three seconds while the foreground tab ran 362. `--disable-background-timer-throttling`,
// `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding` change NOTHING —
// all three were measured and all three leave the tab at zero. This one call makes every tab report
// itself focused and visible, and all eight tabs then tick at the full rate.
//
// That matters here more than it would elsewhere, because the readiness Poll below runs in rAF mode
// and `shoot` awaits a double `__realRaf` before every screenshot. Without this, every worker except
// one would wait forever — which is docs/MISTAKES.md #121 exactly.
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

// profile — per-phase wall time across every capture worker, behind VAWE_PROFILE=1.
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
// which IS a box filter — the same operation, in SIMD C instead of a Go loop over image.At(). Measured:
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

// downsample resolves an ss×-supersampled PNG to native size by averaging each ss×ss block — the
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

	// FAST PATH — index Pix instead of calling At().
	//
	// `src.At(x, y).RGBA()` is an interface call returning a boxed color.Color, run once per SUBPIXEL:
	// at ss=2 into 1920x1080 that is 8.3M interface calls and 8.3M allocations per frame. Profiling
	// (VAWE_PROFILE=1) put this loop at 979 ms/frame, 46.6% of a final render — second only to the
	// screenshot itself.
	//
	// EXACT, not approximate. Chrome's screenshots decode to *image.RGBA, whose Pix is already
	// alpha-premultiplied, and color.RGBA.RGBA() returns each channel as pix*0x101. So the old loop
	// computed ((0x101 * Σpix) / n) >> 8, and so does this one, in integer arithmetic, for every pixel
	// including translucent ones. Any other concrete type falls through to the original loop.
	//
	// A previous attempt at this guarded on *image.NRGBA, which Chrome never produces. It fell through
	// to the slow loop, produced a byte-identical mp4, and saved nothing — and the byte-identical hash
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
	// CAPTURE FORMAT. PNG costs 526 ms/frame at 3840x2160 and JPEG q95 costs 80 ms — 6.6x — because a
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
	// whole point is the alpha channel — exactly the kind of silent substitution this repo keeps
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

	// one tab for meta — and it is the tab that owns the browser, so it is cancelled here, not by the
	// worker that borrows it.
	ctx0, cancel0, err := newTab(allocCtx, url, ss)
	// THE ERROR CHECK COMES FIRST. newTab returns (nil, nil, err) on every failure path, so deferring
	// cancel0 before checking err scheduled a call to a nil func: the return ran, the deferred nil call
	// panicked, and the process died with a SIGSEGV attributed to this function's closing brace. That
	// crash REPLACED the message newTab had already built — "scene error: <what the engine actually
	// said>" — with a stack trace naming a line that has nothing to do with the fault, on the one path
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
	// ANCHOR frames are captured anyway and byte-compared — a mismatch means the signature
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
			// twice, wrongly. Unprofiled, the batched call is kept — it is one round trip, not three.
			if prof == nil {
				err := chromedp.Run(ctx,
					chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil),
					chromedp.Evaluate(`window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }),
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
			if err := chromedp.Run(ctx, chromedp.Evaluate(`window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) })); err != nil {
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
						return fmt.Errorf("dedup verification FAILED: frames %d and %d share a signature but differ %.4f%% in one instance — a per-frame effect escapes frameSig; render with VAWE_NO_DEDUP=1 and report (pair in /tmp/dedup_*)", j.frame, j.anchor, ratio*100)
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
