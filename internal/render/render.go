// Package render orchestrates one render: capture frames -> encode (+grain) -> mix audio -> mux.
package render

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"yt-shorts/internal/audio"
	"yt-shorts/internal/encode"
	"yt-shorts/internal/scene"
)

type Options struct {
	FPS     int
	Workers int
	Draft   bool
	Grain   bool
}

type dataFile struct {
	Audio audio.Config `json:"audio"`
}

// Render renders module (data at dataPath, relative or absolute) to out.
func Render(repoRoot, module, dataPath, out string, o Options) error {
	if o.FPS == 0 {
		o.FPS = 30
	}
	dataAbs, _ := filepath.Abs(dataPath)
	var df dataFile
	if b, err := os.ReadFile(dataAbs); err == nil {
		_ = json.Unmarshal(b, &df)
	} else {
		return fmt.Errorf("read data: %w", err)
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
	meta, err := scene.Capture(repoRoot, module, dataURL, o.FPS, o.Workers, framesDir)
	if err != nil {
		return err
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
