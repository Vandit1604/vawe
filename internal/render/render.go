// Package render orchestrates one render: capture frames -> encode (+grain) -> mix audio -> mux.
package render

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"vawe/internal/audio"
	"vawe/internal/encode"
	"vawe/internal/scene"
)

type Options struct {
	FPS         int
	Workers     int
	Draft       bool
	Grain       bool
	Transparent bool   // alpha export: transparent capture → VP9/yuva420p .webm (no audio, no grain)
	BgVideo     string // composite the (alpha) graphics over this background video → out.mp4
	Aspect      string // render aspect ("16:9"/"9:16"/"1:1"/"4:5"); empty = the scene's own
	SS          int    // supersample factor; 0 = the default for the mode (2 final, 1 draft)
	Watermark   string // transparent PNG laid over every frame (free previews); empty = clean export
}

type dataFile struct {
	Audio audio.Config `json:"audio"`
	FPS   float64      `json:"fps"` // per-scene frame rate (opt-in; default 30, use 60 for smoother fast motion)
}

// Render renders module (data at dataPath, relative or absolute) to out.
func Render(repoRoot, module, dataPath, out string, o Options) error {
	dataAbs, _ := filepath.Abs(dataPath)
	var df dataFile
	if b, err := os.ReadFile(dataAbs); err == nil {
		_ = json.Unmarshal(b, &df)
	} else {
		return fmt.Errorf("read data: %w", err)
	}
	// fps resolution: explicit CLI flag wins; else the scene's own "fps"; else the DRAFT SPLIT.
	//
	// A final render ships at 60 and an iteration pass runs at 30. The two rates are not a preference,
	// they are two different jobs: while authoring you re-render constantly and want the loop short,
	// and 30fps halves both the capture and the encode. What ships wants the smoothness, and product
	// and UI motion in particular reads noticeably better at 60 (the Arc reference films are 60).
	//
	// This is safe to make automatic only because the per-frame budget is now expressed per SECOND
	// rather than per frame. Until #204 the same scene rendered at 60 silently lost its auto motion
	// blur entirely, so a "smoother" final was quietly worse than the draft it was signed off from.
	if o.FPS == 0 {
		if df.FPS > 0 {
			o.FPS = int(df.FPS)
		} else if o.Draft {
			o.FPS = 30
		} else {
			o.FPS = 60
		}
	}

	rel, _ := filepath.Rel(repoRoot, dataAbs)
	// The page fetches the scene over the render server, which serves a fixed prefix set and 404s
	// everything else. A scene sitting outside those prefixes therefore reached the browser as the
	// literal body "not found" and was reported as malformed JSON. Refuse it here, before a browser
	// starts, and say where a scene may live — that is the only part of the answer the author needs.
	if !scene.ServeAll() && !scene.Allowed(filepath.ToSlash(rel)) {
		return fmt.Errorf("%s is outside the paths the render server serves (%s), so the page cannot fetch it.\n"+
			"  Move the scene under formats/scene/ (or .vawe-data/scenes/), or set VAWE_SERVE_ALL=1 for a local debug render",
			dataPath, strings.Join(scene.Served(), " "))
	}
	dataURL := url.QueryEscape("/" + filepath.ToSlash(rel))

	framesDir := filepath.Join(os.TempDir(), "frames_"+strings.TrimSuffix(filepath.Base(out), ".mp4"))
	os.RemoveAll(framesDir)
	if err := os.MkdirAll(framesDir, 0755); err != nil {
		return err
	}
	defer os.RemoveAll(framesDir)
	os.MkdirAll(filepath.Dir(out), 0755)

	fmt.Printf("▶ %s : capturing across %d workers…\n", module, o.Workers)
	transparent := o.Transparent || o.BgVideo != "" // compositing needs a transparent graphics layer
	ss := 2                                         // 2× supersample → crisp text under motion (see scene.downsample)
	if o.Draft {
		ss = 1 // draft: skip supersample for fast previews
	}
	if o.SS > 0 {
		ss = o.SS // explicit -ss wins, so the cost of supersampling can be measured against its benefit
	}
	meta, err := scene.Capture(repoRoot, module, dataURL, o.FPS, o.Workers, framesDir, transparent, ss, o.Aspect)
	if err != nil {
		return err
	}

	// alpha export / video compositing: transparent frames → VP9 (yuva420p) webm.
	if transparent {
		w, h := meta.Width, meta.Height
		if w == 0 || h == 0 {
			w, h = 1080, 1920
		}
		// REFUSE AN OPAQUE OVERLAY. Both of these exports are only worth anything if the graphics layer
		// has somewhere to let the background through, and both used to hand back a file that did not,
		// with exit 0 and a cheerful "· alpha" (MISTAKES #224). The scene suppresses its backdrop under
		// &alpha=1, so what is left is a scene whose own content covers the frame: a full-bleed rect, a
		// paint/shader/raymarch field, an image sized to the canvas. That is the author's design and the
		// engine cannot fix it, so it says which flag it cannot honour and stops.
		clear, err := scene.TransparentPixels(framesDir, meta.TotalFrames)
		if err != nil {
			return fmt.Errorf("checking the captured frames for transparency: %w", err)
		}
		if !clear {
			flag := "--alpha"
			purpose := "an overlay with nothing to composite it over is not a transparent export"
			if o.BgVideo != "" {
				flag = "--bg"
				purpose = "the background video would be completely hidden"
			}
			return fmt.Errorf("%s: every captured frame is fully opaque, so %s.\n"+
				"  The scene's backdrop is already suppressed for this export, so something in the scene "+
				"itself covers the whole canvas — a full-bleed rect, image, paint/shader/raymarch layer or "+
				"group. Give it a smaller box, or drop it, and render again", flag, purpose)
		}
		if o.BgVideo != "" {
			// composite the graphics over a background video → out (mp4).
			overlay := filepath.Join(filepath.Dir(out), "."+filepath.Base(out)+".ov.webm")
			defer os.Remove(overlay)
			fmt.Println("▶ encoding (alpha overlay)…")
			if err := encode.VideoAlpha(framesDir, o.FPS, "", overlay); err != nil {
				return err
			}
			fmt.Println("▶ compositing over background video…")
			if err := encode.Composite(o.BgVideo, overlay, w, h, o.FPS, o.Watermark, out); err != nil {
				return err
			}
			fmt.Printf("✓ done → %s  (%.1fs, %d frames · over video)\n", out, meta.Duration, meta.TotalFrames)
			return nil
		}
		fmt.Println("▶ encoding (alpha / vp9)…")
		if err := encode.VideoAlpha(framesDir, o.FPS, o.Watermark, out); err != nil {
			return err
		}
		fmt.Printf("✓ done → %s  (%.1fs, %d frames · alpha)\n", out, meta.Duration, meta.TotalFrames)
		return nil
	}

	tmpVideo := filepath.Join(filepath.Dir(out), "."+filepath.Base(out)+".v.mp4")
	tmpAudio := filepath.Join(filepath.Dir(out), "."+filepath.Base(out)+".a.wav")
	defer os.Remove(tmpVideo)
	defer os.Remove(tmpAudio)

	fmt.Println("▶ encoding…")
	// The supersample resolve happens in ffmpeg for the JPEG path and happened in Go for the PNG one,
	// so only pass a target size when Go did not already resolve.
	sw, sh := 0, 0
	if ss > 1 && !scene.ResolvedInGo(transparent) {
		sw, sh = meta.Width, meta.Height
		if sw == 0 || sh == 0 {
			sw, sh = 1080, 1920
		}
	}
	if err := encode.Video(framesDir, o.FPS, o.Grain, o.Draft, o.Watermark, tmpVideo, scene.CaptureExt(transparent), sw, sh); err != nil {
		return err
	}

	formatDir := filepath.Join(repoRoot, "formats", module)
	// assets/ lives at the repo root now (it was engine/assets). The resolver joins base+path and
	// falls back to base+"assets"+file, so the base IS the repo root.
	hasAudio := audio.Render(df.Audio, meta.Duration, meta.Stings, meta.SFX, formatDir, repoRoot, tmpAudio)
	if hasAudio {
		fmt.Println("▶ muxing audio…")
		if err := encode.Mux(tmpVideo, tmpAudio, out, df.Audio.Loudness); err != nil {
			return err
		}
	} else if err := encode.Copy(tmpVideo, out); err != nil {
		return err
	}
	fmt.Printf("✓ done → %s  (%.1fs, %d frames)\n", out, meta.Duration, meta.TotalFrames)
	return nil
}
