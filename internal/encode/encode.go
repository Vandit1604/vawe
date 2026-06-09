// Package encode wraps ffmpeg: PNG sequence -> H.264 (+ film grain), and audio mux.
package encode

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
)

func run(args ...string) error {
	cmd := exec.Command("ffmpeg", args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ffmpeg failed: %v\n%s", err, lastLines(string(out), 12))
	}
	return nil
}

// Video encodes the numbered PNG sequence in framesDir to out. grain adds the film-grain
// post-process; draft uses an ultrafast preset and skips grain.
func Video(framesDir string, fps int, grain, draft bool, out string) error {
	seq := filepath.Join(framesDir, "%05d.png")
	r := strconv.Itoa(fps)
	args := []string{"-y", "-framerate", r, "-start_number", "0", "-i", seq, "-an"}
	if !draft && grain {
		// subtle luma grain only — heavy/temporal noise is incompressible (balloons files)
		args = append(args, "-vf", "noise=c0s=5:c0f=t")
	}
	if draft {
		args = append(args, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast")
	} else if grain {
		// -tune grain keeps x264 from wasting bits trying to "denoise" the grain
		args = append(args, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-preset", "medium", "-tune", "grain", "-crf", "23")
	} else {
		args = append(args, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-preset", "medium", "-crf", "20")
	}
	args = append(args, "-movflags", "+faststart", "-r", r, out)
	return run(args...)
}

// Mux combines a silent video with an audio WAV into out (AAC).
func Mux(video, audioWav, out string) error {
	return run("-y", "-i", video, "-i", audioWav, "-map", "0:v", "-map", "1:a",
		"-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out)
}

// Copy remuxes video to out unchanged (no audio).
func Copy(video, out string) error {
	return run("-y", "-i", video, "-c", "copy", "-movflags", "+faststart", out)
}

func lastLines(s string, n int) string {
	lines := []string{}
	start := len(s)
	for i := len(s) - 1; i >= 0 && len(lines) < n; i-- {
		if s[i] == '\n' {
			lines = append([]string{s[i+1 : start]}, lines...)
			start = i
		}
	}
	out := ""
	for _, l := range lines {
		out += l + "\n"
	}
	return out
}
