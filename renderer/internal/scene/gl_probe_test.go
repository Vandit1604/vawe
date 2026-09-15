package scene

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/chromedp/chromedp"
)

// TestGLRenderer prints what Chrome's WebGL implementation actually is under the launcher this
// package ships (allocOpts), plus whatever extra flags VAWE_GL_FLAGS names. Nothing here asserts a
// vendor: the point is to measure rather than assume, because "headless means SwiftShader" is a guess
// and this repo has retracted several of those.
//
//	go test ./internal/scene -run TestGLRenderer -v
//	VAWE_GL_FLAGS='use-angle=metal,enable-gpu' go test ./internal/scene -run TestGLRenderer -v
func TestGLRenderer(t *testing.T) {
	opts := allocOpts(1)
	for _, f := range strings.Split(os.Getenv("VAWE_GL_FLAGS"), ",") {
		if f = strings.TrimSpace(f); f == "" {
			continue
		}
		if k, v, ok := strings.Cut(f, "="); ok {
			opts = append(opts, chromedp.Flag(k, v))
		} else {
			opts = append(opts, chromedp.Flag(k, true))
		}
	}
	alloc, cancelAlloc := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancelAlloc()
	ctx, cancel := chromedp.NewContext(alloc)
	defer cancel()
	ctx, cancelT := context.WithTimeout(ctx, 60*time.Second)
	defer cancelT()

	const js = `(() => {
		const c = document.createElement('canvas');
		const gl = c.getContext('webgl2') || c.getContext('webgl');
		if (!gl) return 'NO WEBGL CONTEXT';
		const d = gl.getExtension('WEBGL_debug_renderer_info');
		return JSON.stringify({
			unmaskedRenderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '(no debug ext)',
			unmaskedVendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : '(no debug ext)',
			renderer: gl.getParameter(gl.RENDERER),
			version: gl.getParameter(gl.VERSION),
		});
	})()`
	var out string
	if err := chromedp.Run(ctx, chromedp.Navigate("about:blank"), chromedp.Evaluate(js, &out)); err != nil {
		t.Skipf("no chrome in this environment: %v", err)
	}
	t.Logf("VAWE_GL_FLAGS=%q -> %s", os.Getenv("VAWE_GL_FLAGS"), out)

	// chrome://gpu carries the half WebGL cannot answer: whether 2D canvas and tile RASTER run on the
	// GPU, which is what a shader-heavy film's compositing actually rides on.
	var status string
	if err := chromedp.Run(ctx,
		chromedp.Navigate("chrome://gpu"),
		chromedp.Sleep(2*time.Second),
		chromedp.Evaluate(`(document.querySelector('info-view')?.shadowRoot?.textContent || document.body.textContent || '').replace(/\s*\n\s*/g, '\n').slice(0, 1400)`, &status),
	); err != nil {
		t.Logf("chrome://gpu unavailable: %v", err)
		return
	}
	t.Logf("feature status:\n%s", status)
}
