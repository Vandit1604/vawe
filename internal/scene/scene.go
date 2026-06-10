// Package scene drives a format's HTML scene in headless Chrome (chromedp) and
// captures every frame to numbered PNGs. The format contract is unchanged: the page
// exposes window.__engine.{meta, renderFrame(n)}.
package scene

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/chromedp/chromedp"
	"shortwave/internal/audio"
)

const W, H = 1080, 1920

// Meta mirrors window.__engine.meta.
type Meta struct {
	FPS         float64     `json:"fps"`
	Duration    float64     `json:"duration"`
	TotalFrames int         `json:"totalFrames"`
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

func allocOpts() []chromedp.ExecAllocatorOption {
	opts := append([]chromedp.ExecAllocatorOption{},
		chromedp.Headless,
		chromedp.NoSandbox,
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("force-color-profile", "srgb"),
		chromedp.Flag("font-render-hinting", "none"),
		chromedp.Flag("force-device-scale-factor", "1"),
		chromedp.WindowSize(W, H),
	)
	if p := os.Getenv("CHROME_BIN"); p != "" {
		opts = append(opts, chromedp.ExecPath(p))
	}
	return opts
}

// newTab spins up an independent browser + tab loaded at url, ready to render.
func newTab(parent context.Context, url string) (context.Context, context.CancelFunc, error) {
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(parent, allocOpts()...)
	ctx, cancelCtx := chromedp.NewContext(allocCtx)
	cancel := func() { cancelCtx(); cancelAlloc() }
	err := chromedp.Run(ctx,
		chromedp.EmulateViewport(W, H),
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
func Capture(repoRoot, module, dataURL string, fps, workers int, framesDir string) (Meta, error) {
	var meta Meta
	srv, port, err := Serve(repoRoot)
	if err != nil {
		return meta, err
	}
	defer srv.Close()
	url := fmt.Sprintf("http://127.0.0.1:%d/formats/%s/scene.html?data=%s&fps=%d", port, module, dataURL, fps)

	// one tab for meta
	ctx0, cancel0, err := newTab(context.Background(), url)
	if err != nil {
		return meta, err
	}
	if err := chromedp.Run(ctx0, chromedp.Evaluate("window.__engine.meta", &meta)); err != nil {
		cancel0()
		return meta, fmt.Errorf("meta eval: %w", err)
	}
	total := meta.TotalFrames
	if workers < 1 {
		workers = 1
	}
	if workers > total {
		workers = total
	}

	frames := make(chan int, total)
	for f := 0; f < total; f++ {
		frames <- f
	}
	close(frames)

	worker := func(ctx context.Context) error {
		for f := range frames {
			var buf []byte
			if err := chromedp.Run(ctx,
				chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil),
				chromedp.CaptureScreenshot(&buf),
			); err != nil {
				return fmt.Errorf("frame %d: %w", f, err)
			}
			if err := os.WriteFile(filepath.Join(framesDir, fmt.Sprintf("%05d.png", f)), buf, 0644); err != nil {
				return err
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
				ctx, cancel, e = newTab(context.Background(), url)
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
	return meta, nil
}
