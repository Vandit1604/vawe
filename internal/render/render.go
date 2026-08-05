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
		if o.BgVideo != "" {
			// composite the graphics over a background video → out (mp4).
			overlay := filepath.Join(filepath.Dir(out), "."+filepath.Base(out)+".ov.webm")
			defer os.Remove(overlay)
			fmt.Println("▶ encoding (alpha overlay)…")
			if err := encode.VideoAlpha(framesDir, o.FPS, overlay); err != nil {
				return err
			}
			fmt.Println("▶ compositing over background video…")
			if err := encode.Composite(o.BgVideo, overlay, w, h, o.FPS, out); err != nil {
				return err
			}
			fmt.Printf("✓ done → %s  (%.1fs, %d frames · over video)\n", out, meta.Duration, meta.TotalFrames)
			return nil
		}
		fmt.Println("▶ encoding (alpha / vp9)…")
		if err := encode.VideoAlpha(framesDir, o.FPS, out); err != nil {
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
	if err := encode.Video(framesDir, o.FPS, o.Grain, o.Draft, o.Watermark, tmpVideo); err != nil {
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
