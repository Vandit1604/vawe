// tabprobe opens N tabs the way internal/scene.Capture does and answers the one question a render
// cannot: WHY does the same frame come out differently on two tabs. It gives each tab a paint history
// you choose and prints, per tab, the captured bytes AND the full DOM (rects to six decimals, computed
// transform, filter, font, text), so "same DOM, different pixels" (a compositor fault) and "different
// DOM" (ours) are one command apart.
//
// It is the instrument docs/MISTAKES.md #507 was found with, and every finding there is one line:
//
//	tabprobe -root . -tabs 2 -frame 83 -pre 5,11,17,23,29,35,41,47,53,59,65,71,77
//	  tab 0 got worker 5's history from a six-worker render, tab 1 got none. Different bytes, and the
//	  DOM diff named the layer: a blur written on frame 77 that frame 83 never cleared.
//	tabprobe -root . -tabs 1 -purity -purityN 150
//	  frameSig every frame ascending, then descending, in ONE tab. Any frame whose signature differs
//	  is a DOM write that depends on render order.
//
// -pre / -pre1 take a comma list or a range ("0-113"). Get a real worker history out of a render with
// VAWE_FRAME_MAP=<path>, which records "frame rep worker" per line.
//
// -flags passes extra Chrome flags, which is how --disable-partial-raster was chosen rather than
// guessed at: try one, see whether the two tabs agree.
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"flag"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"

	"vawe/internal/scene"
)

const blankJS = `(async () => { const s = document.getElementById('stage'); s.style.display = 'none'; await new Promise(r => __realRaf(() => __realRaf(r))); s.style.display = ''; })()`

func main() {
	root := flag.String("root", ".", "repo root")
	data := flag.String("data", "/formats/scene/_shardtest.json", "scene json path")
	tabs := flag.Int("tabs", 6, "tabs")
	frame := flag.Int("frame", 4, "frame to render before probing")
	sweep := flag.Int("sweep", 0, "sweep length on tab 0")
	after := flag.Bool("after", false, "sweep AFTER the resize")
	preresize := flag.Bool("preresize", false, "load the tab already at the capture size")
	flags := flag.String("flags", "", "extra chrome flags, comma separated")
	prime := flag.Bool("prime", false, "take a 1x1 screenshot first")
	rafs := flag.Int("rafs", 2, "rAFs to await before the shot")
	pre1 := flag.String("pre1", "", "history for tab 1")
	purity := flag.Bool("purity", false, "compare frameSig ascending vs descending in one tab")
	flush := flag.Bool("flush", false, "hide the stage and let it paint before every renderFrame")
	purityN := flag.Int("purityN", 150, "frames for -purity")
	pre := flag.String("pre", "", "on tab 0, paint+shoot this comma list of frames before the measured frame")
	plain := flag.String("plain", "", "sweep body: render|html|canvas|readback (default frameSig)")
	flag.Parse()
	srv, port, err := scene.Serve(*root)
	if err != nil {
		panic(err)
	}
	defer srv.Close()
	u := fmt.Sprintf("http://127.0.0.1:%d/formats/scene/scene.html?data=%s&fps=30", port, url.QueryEscape(*data))

	opts := append([]chromedp.ExecAllocatorOption{},
		chromedp.Headless,
		chromedp.NoSandbox,
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("force-color-profile", "srgb"),
		chromedp.Flag("font-render-hinting", "none"),
		chromedp.Flag("disable-checker-imaging", true),
		chromedp.Flag("run-all-compositor-stages-before-draw", true),
		chromedp.Flag("disable-partial-raster", true),
		chromedp.Flag("force-device-scale-factor", "1"),
		chromedp.Flag("disable-renderer-backgrounding", true),
		chromedp.Flag("disable-background-timer-throttling", true),
		chromedp.Flag("disable-backgrounding-occluded-windows", true),
		chromedp.WindowSize(1080, 1920),
	)
	for _, f := range strings.Split(*flags, ",") {
		if f == "" {
			continue
		}
		k, v, has := strings.Cut(f, "=")
		if has {
			opts = append(opts, chromedp.Flag(k, v))
		} else {
			opts = append(opts, chromedp.Flag(k, true))
		}
	}
	alloc, cancelAlloc := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancelAlloc()

	bootW, bootH := 1080, 1920
	if *preresize {
		bootW, bootH = 1920, 1080
	}
	var parent context.Context
	for i := 0; i < *tabs; i++ {
		var ctx context.Context
		var cancel context.CancelFunc
		if i == 0 {
			ctx, cancel = chromedp.NewContext(alloc)
			parent = ctx
		} else {
			ctx, cancel = chromedp.NewContext(parent)
		}
		defer cancel()
		if err := chromedp.Run(ctx,
			chromedp.EmulateViewport(int64(bootW), int64(bootH), chromedp.EmulateScale(1)),
			emulation.SetFocusEmulationEnabled(true),
			chromedp.Navigate(u),
			chromedp.Poll("window.__engineReady === true || !!window.__engineError", nil, chromedp.WithPollingTimeout(45*time.Second)),
		); err != nil {
			fmt.Println("tab", i, "load:", err)
			return
		}
		// EXACTLY what Capture does to the meta tab: meta read + a frameSig sweep over every
		// frame, all of it at the PORTRAIT viewport the tab loaded with, before the resize.
		doSweep := func() bool {
			var sigs []string
			call := "window.__engine.frameSig(f)"
			switch *plain {
			case "render":
				call = "window.__engine.renderFrame(f)"
			case "html":
				call = "(window.__engine.renderFrame(f), document.body.innerHTML.length)"
			case "layout":
				call = "(window.__engine.renderFrame(f), document.body.offsetHeight)"
			case "innerhtml-only":
				call = "(f, document.body.innerHTML.length)"
			case "canvas":
				call = "(window.__engine.renderFrame(f), (() => { let a = 0; for (const cv of document.querySelectorAll('canvas')) { if (!cv.width || cv.style.display === 'none') continue; if (cv.getContext('2d')) continue; a++; } return a; })())"
			case "sizeonly":
				call = "(window.__engine.renderFrame(f), [...document.querySelectorAll('canvas')].map(cv => cv.width + 'x' + cv.height).join('|'))"
			case "ctxprobe":
				call = "(window.__engine.renderFrame(f), [...document.querySelectorAll('canvas')].map(cv => cv.width + 'x' + cv.height + ':has2d=' + !!cv.getContext('2d')).join('|'))"
			case "readback":
				call = "(window.__engine.renderFrame(f), (() => { const p = window.__probeC || (window.__probeC = Object.assign(document.createElement('canvas'), {width: 24, height: 14})); const q = p.getContext('2d', {willReadFrequently: true}); let a = 0; for (const cv of document.querySelectorAll('canvas')) { if (!cv.width || cv.style.display === 'none') continue; if (cv.getContext('2d')) continue; q.drawImage(cv, 0, 0, 24, 14); a += q.getImageData(0, 0, 24, 14).data[0]; } return a; })())"
			}
			e := fmt.Sprintf(`(() => { const out = []; for (let f = 0; f < %d; f++) out.push(String(%s)); return out; })()`, *sweep, call)
			if err := chromedp.Run(ctx, chromedp.Evaluate(e, &sigs)); err != nil {
				fmt.Println("sweep:", err)
				return false
			}
			return true
		}
		if i == 0 && *sweep > 0 && !*after {
			if !doSweep() {
				return
			}
		}
		if err := chromedp.Run(ctx, chromedp.EmulateViewport(1920, 1080, chromedp.EmulateScale(1))); err != nil {
			fmt.Println("tab", i, "viewport:", err)
			return
		}
		if i == 0 && *sweep > 0 && *after {
			if !doSweep() {
				return
			}
		}
		preList := *pre
		if i == 1 && *pre1 != "" {
			preList = *pre1
		}
		if i <= 1 && preList != "" {
			list := []int{}
			for _, fs := range strings.Split(preList, ",") {
				if lo, hi, ok := strings.Cut(fs, "-"); ok {
					a, _ := strconv.Atoi(lo)
					b, _ := strconv.Atoi(hi)
					for v := a; v <= b; v++ {
						list = append(list, v)
					}
					continue
				}
				v, _ := strconv.Atoi(fs)
				list = append(list, v)
			}
			for _, f := range list {
				if *flush {
					if err := chromedp.Run(ctx, chromedp.Evaluate(blankJS, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) })); err != nil {
						fmt.Println("flush:", err)
						return
					}
				}
				if err := chromedp.Run(ctx,
					chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", f), nil),
					chromedp.Evaluate(`window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }),
					chromedp.ActionFunc(func(c context.Context) error {
						_, e := page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatJpeg).WithQuality(95).WithCaptureBeyondViewport(false).Do(c)
						return e
					}),
				); err != nil {
					fmt.Println("pre:", err)
					return
				}
			}
		}
		if *purity {
			var out string
			if err := chromedp.Run(ctx, chromedp.Evaluate(fmt.Sprintf(`(() => {
        const N = %d, up = [], down = [];
        for (let f = 0; f < N; f++) up.push(String(window.__engine.frameSig(f)));
        for (let f = N - 1; f >= 0; f--) down[f] = String(window.__engine.frameSig(f));
        const bad = [];
        for (let f = 0; f < N; f++) if (up[f] !== down[f]) bad.push(f);
        return bad.length + ' order-dependent of ' + N + ': ' + bad.slice(0, 40).join(',');
      })()`, *purityN), &out)); err != nil {
				fmt.Println("purity:", err)
				return
			}
			fmt.Println("tab", i, out)
			continue
		}
		var buf []byte
		if *flush {
			if err := chromedp.Run(ctx, chromedp.Evaluate(blankJS, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) })); err != nil {
				fmt.Println("flush:", err)
				return
			}
		}
		if err := chromedp.Run(ctx,
			chromedp.Evaluate(fmt.Sprintf("window.__engine.renderFrame(%d)", *frame), nil),
			chromedp.Evaluate(fmt.Sprintf(`window.__realRaf ? new Promise(res => { let k = %d; const step = () => (--k <= 0 ? res() : __realRaf(step)); __realRaf(step); }) : true`, *rafs), nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }),
			chromedp.ActionFunc(func(c context.Context) error {
				if *prime {
					if _, e := page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatJpeg).WithQuality(1).WithClip(&page.Viewport{X: 0, Y: 0, Width: 1, Height: 1, Scale: 1}).Do(c); e != nil {
						return e
					}
				}
				var e error
				buf, e = page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatJpeg).WithQuality(95).WithCaptureBeyondViewport(false).Do(c)
				return e
			}),
		); err != nil {
			fmt.Println("tab", i, "shot:", err)
			return
		}
		var geo string
		if err := chromedp.Run(ctx, chromedp.Evaluate(`(() => {
      const r = [];
      const st = document.querySelector('.stage') || document.body;
      st.querySelectorAll('*').forEach(el => {
        const q = el.getBoundingClientRect();
        if (!q.width && !q.height) return;
        const cs = getComputedStyle(el);
        r.push(el.tagName + '.' + el.className + ' ' + [q.x,q.y,q.width,q.height].map(v=>v.toFixed(6)).join(',')
               + ' ' + cs.transform + ' ff=' + cs.fontFamily + ' fs=' + cs.fontSize + ' fw=' + cs.fontWeight + ' ls=' + cs.letterSpacing
               + ' zoom=' + cs.zoom + ' op=' + cs.opacity + ' fl=' + cs.filter + ' ws=' + cs.willChange + ' fvs=' + cs.fontVariationSettings + ' fst=' + cs.fontStretch + ' txt=' + JSON.stringify((el.textContent||'').slice(0,18)));
      });
      r.push('faces=' + [...document.fonts].map(f => f.family + '/' + f.weight + '/' + f.status).sort().join(' '));
      r.push('sig=' + window.__engine.frameSig(4), 'hook=' + HTMLCanvasElement.prototype.getContext.name, 'ncanvas=' + document.querySelectorAll('canvas').length, 'fsrc=' + (window.__engine.frameSig.toString().includes('canvasKind') || window.__engine.frameSig.toString().includes('kind')));
      return r.join('\n');
    })()`, &geo)); err != nil {
			fmt.Println("geo:", err)
			return
		}
		var buf2 []byte
		if err := chromedp.Run(ctx,
			chromedp.Evaluate(`window.__realRaf ? new Promise(res => __realRaf(() => __realRaf(res))) : true`, nil, func(p *runtime.EvaluateParams) *runtime.EvaluateParams { return p.WithAwaitPromise(true) }),
			chromedp.ActionFunc(func(c context.Context) error {
				var e error
				buf2, e = page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatJpeg).WithQuality(95).WithCaptureBeyondViewport(false).Do(c)
				return e
			}),
		); err == nil && !bytes.Equal(buf, buf2) {
			fmt.Printf("tab %d  SECOND SHOT DIFFERS (%d vs %d bytes)\n", i, len(buf), len(buf2))
			os.WriteFile(fmt.Sprintf("/tmp/tabshot2_%d.jpg", i), buf2, 0644)
		}
		fmt.Printf("tab %d  sha=%x  bytes=%d\nGEO\n%s\n", i, sha256.Sum256(buf), len(buf), geo)
		os.WriteFile(fmt.Sprintf("/tmp/tabshot_%d.jpg", i), buf, 0644)

	}
}
