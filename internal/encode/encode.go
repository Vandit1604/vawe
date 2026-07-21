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
// watermark is a transparent PNG (assets/watermark/draft.png, baked by `make watermark`) laid over
// every frame; empty means none. It is deliberately INDEPENDENT of `draft`: a free preview still has
// to be good enough to judge composition and colour, so quality and postability are separate dials.
func Video(framesDir string, fps int, grain, draft bool, watermark, out string) error {
	seq := filepath.Join(framesDir, "%05d.png")
	r := strconv.Itoa(fps)
	args := []string{"-y", "-framerate", r, "-start_number", "0", "-i", seq}
	if watermark != "" {
		args = append(args, "-i", watermark)
	}
	args = append(args, "-an")
	// grain is OPT-IN (`"grain": true`) — only genuinely filmic brands reach here. Low-strength luma
	// temporal grain: heavy/temporal noise is incompressible and crawls over sharp text as shimmer.
	grainFx := ""
	if !draft && grain {
		grainFx = "noise=c0s=3:c0f=t"
	}
	switch {
	case watermark != "":
		// scale2ref sizes the 1920x1080 sheet to whatever this scene's frame is, so one baked PNG
		// serves every aspect. Built as one filter_complex because -vf and -filter_complex cannot
		// both be given: folding grain in here keeps the two features composable instead of
		// mutually exclusive.
		chain := "[base]"
		if grainFx != "" {
			chain = "[g]"
		}
		fc := "[1:v][0:v]scale2ref[wm][base];"
		if grainFx != "" {
			fc += "[base]" + grainFx + "[g];"
		}
		fc += chain + "[wm]overlay=0:0[v]"
		args = append(args, "-filter_complex", fc, "-map", "[v]")
	case grainFx != "":
		args = append(args, "-vf", grainFx)
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

// VideoAlpha encodes the transparent PNG sequence to a VP9 WebM with a real alpha channel
// (yuva420p) — a motion-graphics overlay layer to composite over other footage. Video-only.
func VideoAlpha(framesDir string, fps int, out string) error {
	seq := filepath.Join(framesDir, "%05d.png")
	r := strconv.Itoa(fps)
	return run("-y", "-framerate", r, "-start_number", "0", "-i", seq, "-an",
		"-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-r", r, out)
}

// Composite overlays an alpha graphics layer (webm w/ alpha) on top of a background video →
// out. The bg is scaled/cropped to the graphics canvas and looped/trimmed to the overlay length
// (overlay drives duration). This is the deterministic "motion graphics on a video" layer:
// the graphics are rendered pure-in-n with alpha, the video is composited at encode time.
func Composite(bgVideo, overlayWebm string, w, h, fps int, out string) error {
	r := strconv.Itoa(fps)
	filter := fmt.Sprintf(
		"[0:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,fps=%s,setsar=1[bg];"+
			"[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]",
		w, h, w, h, r)
	return run("-y", "-stream_loop", "-1", "-i", bgVideo, "-i", overlayWebm,
		"-filter_complex", filter, "-map", "[v]",
		"-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20",
		"-movflags", "+faststart", "-r", r, out)
}

// Mux combines a silent video with an audio WAV into out (AAC).
// Mux stitches the audio WAV onto the video. When loudnessLUFS is non-nil, ffmpeg's loudnorm
// (gated BS.1770, the ITU/EBU standard) normalizes the track to that integrated target with a safe
// -1.5 dBTP true-peak ceiling. Deterministic for a fixed input + ffmpeg build; absent = no change.
func Mux(video, audioWav, out string, loudnessLUFS *float64) error {
	args := []string{"-y", "-i", video, "-i", audioWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy"}
	if loudnessLUFS != nil {
		args = append(args, "-af", fmt.Sprintf("loudnorm=I=%.1f:TP=-1.5:LRA=11", *loudnessLUFS))
	}
	args = append(args, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out)
	return run(args...)
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
