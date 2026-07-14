// Package render orchestrates one render: capture frames -> encode (+grain) -> mix audio -> mux.
package render

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"shortwave/internal/audio"
	"shortwave/internal/encode"
	"shortwave/internal/scene"
)

type Options struct {
	FPS         int
	Workers     int
	Draft       bool
	Grain       bool
	Transparent bool   // alpha export: transparent capture → VP9/yuva420p .webm (no audio, no grain)
	BgVideo     string // composite the (alpha) graphics over this background video → out.mp4
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
	// fps resolution: explicit CLI flag wins; else the scene's own "fps"; else 30.
	if o.FPS == 0 {
		if df.FPS > 0 {
			o.FPS = int(df.FPS)
		} else {
			o.FPS = 30
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
	ss := 2                                          // 2× supersample → crisp text under motion (see scene.downsample)
	if o.Draft {
		ss = 1 // draft: skip supersample for fast previews
	}
	meta, err := scene.Capture(repoRoot, module, dataURL, o.FPS, o.Workers, framesDir, transparent, ss)
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
	if err := encode.Video(framesDir, o.FPS, o.Grain, o.Draft, tmpVideo); err != nil {
		return err
	}

	formatDir := filepath.Join(repoRoot, "formats", module)
	engineRoot := filepath.Join(repoRoot, "engine")
	hasAudio := audio.Render(df.Audio, meta.Duration, meta.Stings, meta.SFX, formatDir, engineRoot, tmpAudio)
	if hasAudio {
		fmt.Println("▶ muxing audio…")
		if err := encode.Mux(tmpVideo, tmpAudio, out); err != nil {
			return err
		}
	} else if err := encode.Copy(tmpVideo, out); err != nil {
		return err
	}
	fmt.Printf("✓ done → %s  (%.1fs, %d frames)\n", out, meta.Duration, meta.TotalFrames)
	return nil
}
