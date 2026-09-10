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

	// block/beat/comp sugar (core/engine/expand.js) resolves SERVER-SIDE here, before the browser ever sees
	// the JSON: the render page cannot reach it itself (internal/render/expand.go says why). A no-op,
	// unchanged dataAbs, for the overwhelming majority of scenes that carry no sugar.
	//
	// o.Aspect (empty = the scene's own, same default expandScene already applies) is threaded through so
	// an aspect-dependent bake (cameraMove, a flow-seam's travel) resolves against the canvas THIS render
	// actually targets, not always the scene's declared one: expandScene runs once, here, before the
	// browser knows which aspect it is drawing (formats/scene/scene.js never calls it, see expand.go).
	expandedAbs, expandedCleanup, err := expandSugar(repoRoot, dataAbs, o.Aspect)
	if err != nil {
		return err
	}
	if expandedCleanup != "" {
		defer os.Remove(expandedCleanup)
	}
	dataAbs = expandedAbs
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
	// starts, and say where a scene may live: that is the only part of the answer the author needs.
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
	// VAWE_KEEP_FRAMES leaves the captured PNGs on disk. The mp4 container is not byte-reproducible, so
	// hashing two renders answers nothing, and without the frames nobody can tell a non-deterministic
	// DRAW from a non-deterministic ENCODE. `make probe` compares the DOM, which is a different claim.
	if os.Getenv("VAWE_KEEP_FRAMES") == "" {
		defer os.RemoveAll(framesDir)
	} else {
		defer fmt.Printf("frames kept: %s\n", framesDir)
	}
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

	// beatSync moved the film's joints onto the track's pulse. The report is built in the page and
	// console.log cannot cross into this process, so it rides out on Meta (docs/MISTAKES.md #477).
	if meta.BeatSync != "" {
		fmt.Println("\u25b6 " + meta.BeatSync)
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
				"itself covers the whole canvas: a full-bleed rect, image, paint/shader/raymarch layer or "+
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
	hasAudio, err := audio.Render(df.Audio, meta.Duration, meta.Stings, meta.SFX, meta.Bridges, formatDir, repoRoot, tmpAudio)
	if err != nil {
		return err
	}
	if hasAudio {
		fmt.Println("▶ muxing audio…")
		if err := encode.Mux(tmpVideo, tmpAudio, out, df.Audio.Loudness); err != nil {
			return err
		}
	} else if err := encode.Copy(tmpVideo, out); err != nil {
		return err
	}
	// STILLNESS RIDES OUT WITH THE DURATION, on every render, for every caller. Both are facts about the
	// film rather than opinions about it, and this one answers the question no static gate can: is
	// anything happening. The reference films in refs/ measure 11% to 77% still, median 29% (`node
	// harness/author/claims.mjs`, grammar/_claims.json id ref-still-share): not the "13% to 24%" this
	// comment quoted before, which was the doctrine's own CONTRADICTED figure, sourced from a plan file
	// and never checked against the corpus it claimed to summarise. A film of ours that passed the whole
	// ladder measured 84%, still above the real spread. An author who never sees the number optimises for
	// the numbers that print. Measured off the frames still on disk (they are deleted a few lines from
	// here), so it costs no second decode of the mp4 and no extra ffmpeg pass.
	//
	// THE CODEC IS PART OF THE NUMBER. The reference spread above was measured on decoded H.264 frames;
	// these frames are JPEG by default (scene.CaptureExt), and quality/gates/motion-split.mjs measured a
	// JPEG quantisation floor around 0.9 against 0.05 for a lossless PNG of the same instant. So the
	// printed line below names its own codec rather than implying an exact comparison.
	// A NUMBER THAT COMPARES TWO WORKERS' PIXELS IS NOT A PROPERTY OF THE FILM, so it used to print
	// nothing at all above -workers 1. The capture shards across o.Workers tabs and adjacent frames
	// can come from different ones. Those tabs do not produce identical pixels, so a frame pair that
	// straddles a worker boundary reports a large change with nothing on screen having moved. Measured
	// on vawe-teaser, same JSON, same metric, same frame indices, only -workers differing:
	//
	//   1 worker    3.19 2.53 2.40 2.37 2.45 1.01 1.05 0.96 0.86 0.97 0.95 0.46   median 1.06
	//   6 workers   2.47 1.94 3.71 1.26 4.54 4.39 0.49 4.23 0.51 4.41 4.36 4.41   median 4.23
	//
	// The one-worker row is the film: high through the entrance settle, about 1.0 across the hold,
	// falling at the end. The six-worker row swings between 0.49 and 4.54 with no relation to what is
	// on screen. It is measuring worker boundaries.
	//
	// scene.StillnessAcrossShards fixes this without touching capture: it never compares two frames
	// unless Meta.FrameWorker says the same tab drew both of them, which is the one guarantee
	// `make motion-split` also relies on (a single page, seeked in order). See its doc comment in
	// internal/scene/scene.go for how a same-worker pair is found and why its delta is divided by the
	// frame gap before the usual fps normalisation. This does not fix the underlying difference
	// between tabs, which is a real determinism defect and is bigger than this line; it only stops the
	// number that difference corrupts from ever being the number reported.
	var still, med, peak float64
	var ok bool
	if o.Workers > 1 {
		still, med, peak, ok = scene.StillnessAcrossShards(framesDir, meta.TotalFrames, scene.CaptureExt(transparent), meta.FPS, meta.FrameWorker)
	} else {
		still, med, peak, ok = scene.Stillness(framesDir, meta.TotalFrames, scene.CaptureExt(transparent), meta.FPS)
	}
	if ok {
		codec := strings.TrimPrefix(scene.CaptureExt(transparent), ".")
		fmt.Printf("✓ done → %s  (%.1fs, %d frames · %.0f%% still on %s, motion %.2f, peak %.2f)\n",
			out, meta.Duration, meta.TotalFrames, still, codec, med, peak)
		// 80, not 60: the real reference spread tops out at 77% still (arc-space-swiping), so a 60%
		// warning fired on films that were doing exactly what the doctrine asks for. See the comment
		// above this block for where 60 came from and why it was never sourced.
		if still > 80 {
			fmt.Printf("  ⚠ %.0f%% of sampled %s frames are unchanged from the one before. The measured reference spread tops out at 77%%.\n", still, codec)
			fmt.Printf("    Nothing is blocking you. The usual causes are a ground that does not move and layers with no idle.\n")
		}
		return nil
	}
	fmt.Printf("✓ done → %s  (%.1fs, %d frames)\n", out, meta.Duration, meta.TotalFrames)
	if o.Workers > 1 {
		fmt.Printf("  · motion not measured: too few frames landed on any one worker to compare. Use\n")
		fmt.Printf("    `make motion-split D=<scene>`, or re-render with -workers 1.\n")
	}
	return nil
}
