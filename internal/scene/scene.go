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
	serveAll := os.Getenv("VAWE_SERVE_ALL") == "1"
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

// newTab spins up an independent browser + tab loaded at url, ready to render at ss× device scale.
func newTab(parent context.Context, url string, ss int) (context.Context, context.CancelFunc, error) {
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(parent, allocOpts(ss)...)
	ctx, cancelCtx := chromedp.NewContext(allocCtx)
	cancel := func() { cancelCtx(); cancelAlloc() }
	err := chromedp.Run(ctx,
		chromedp.EmulateViewport(W, H, chromedp.EmulateScale(float64(ss))),
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
	ia, err := png.Decode(bytes.NewReader(a))
	if err != nil {
		return 1, err
	}
	ib, err := png.Decode(bytes.NewReader(b))
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

	// one tab for meta
	ctx0, cancel0, err := newTab(context.Background(), url, ss)
	if err != nil {
		return meta, err
	}
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
	framePath := func(f int) string { return filepath.Join(framesDir, fmt.Sprintf("%05d.png", f)) }
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
	frames := make(chan capJob, len(jobs))
	for _, j := range jobs {
		frames <- j
	}
	close(frames)

	worker := func(ctx context.Context) error {
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
					chromedp.CaptureScreenshot(&buf),
				)
				if err != nil {
					return nil, err
				}
				return downsample(buf, ss)
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
			if err := chromedp.Run(ctx, chromedp.CaptureScreenshot(&buf)); err != nil {
				return nil, err
			}
			t3 := time.Now()
			out, derr := downsample(buf, ss)
			t4 := time.Now()
			prof.add(t1.Sub(t0), t2.Sub(t1), t3.Sub(t2), t4.Sub(t3), 0, len(buf), len(out))
			return out, derr
		}
		for j := range frames {
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
						os.WriteFile("/tmp/dedup_rep.png", buf, 0644)
						os.WriteFile("/tmp/dedup_anchor.png", abuf, 0644)
						return fmt.Errorf("dedup verification FAILED: frames %d and %d share a signature but differ %.4f%% in one instance — a per-frame effect escapes frameSig; render with VAWE_NO_DEDUP=1 and report (pair in /tmp/dedup_*.png)", j.frame, j.anchor, ratio*100)
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
				ctx, cancel = ctx0, cancel0
			} else {
				var e error
				ctx, cancel, e = newTab(context.Background(), url, ss)
				if e != nil {
					errs <- e
					return
				}
			}
			defer cancel()
			if e := worker(ctx); e != nil {
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
