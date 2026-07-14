// Package scene drives a format's HTML scene in headless Chrome (chromedp) and
// captures every frame to numbered PNGs. The format contract is unchanged: the page
// exposes window.__engine.{meta, renderFrame(n)}.
package scene

import (
	"bytes"

	"github.com/chromedp/cdproto/runtime"
	"image"
	"image/png"
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/chromedp"
	"shortwave/internal/audio"
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

// Serve starts a static file server rooted at root; returns the server + port.
func Serve(root string) (*http.Server, int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, 0, err
	}
	srv := &http.Server{Handler: http.FileServer(http.Dir(root))}
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

func Capture(repoRoot, module, dataURL string, fps, workers int, framesDir string, transparent bool, ss int) (Meta, error) {
	if ss < 1 {
		ss = 1
	}
	var meta Meta
	srv, port, err := Serve(repoRoot)
	if err != nil {
		return meta, err
	}
	defer srv.Close()
	url := fmt.Sprintf("http://127.0.0.1:%d/formats/%s/scene.html?data=%s&fps=%d", port, module, dataURL, fps)
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
	// SHORTWAVE_NO_DEDUP=1 disables.
	rep := make([]int, total)
	for f := range rep {
		rep[f] = f
	}
	if os.Getenv("SHORTWAVE_NO_DEDUP") == "" {
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
			// await two REAL animation frames after renderFrame so the compositor has committed
			// this frame's paint before the screenshot (rAF is virtualized for scene code; the
			// renderer keeps the native one as __realRaf).
			err := chromedp.Run(ctx,
				chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil),
				chromedp.Evaluate(`window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }),
				chromedp.CaptureScreenshot(&buf),
			)
			if err != nil {
				return nil, err
			}
			return downsample(buf, ss) // ss× supersample → native size (crisp text under motion)
		}
		for j := range frames {
			buf, err := shoot(j.frame)
			if err != nil {
				return fmt.Errorf("frame %d: %w", j.frame, err)
			}
			if err := os.WriteFile(j.path, buf, 0644); err != nil {
				return err
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
						return fmt.Errorf("dedup verification FAILED: frames %d and %d share a signature but differ %.4f%% in one instance — a per-frame effect escapes frameSig; render with SHORTWAVE_NO_DEDUP=1 and report (pair in /tmp/dedup_*.png)", j.frame, j.anchor, ratio*100)
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
