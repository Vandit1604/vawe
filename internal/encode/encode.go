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
// Video encodes the captured frame sequence. `ext` is the captured format (".jpg" normally, ".png" for
// the alpha path) and w/h are the FINAL frame size: when frames were captured supersampled, ffmpeg does
// the ss×ss box resolve here via scale=flags=area, which is the same box filter scene.downsample() ran
// in Go at 838 ms/frame against ffmpeg's 12.6 ms for decode+scale+encode combined. w/h of 0 means the
// frames are already at native size and no scale is inserted.
// watermarkChain lays input 1 (the sheet) over input 0 (the frames), applying preFx to the frames
// first. Split out of Video so its shape can be asserted without an ffmpeg run: the defect it encodes
// was invisible in every log and every exit code, and showed up only in a pixel (encode_test.go).
func watermarkChain(preFx string) string {
	base := "[0:v]"
	fc := ""
	if preFx != "" {
		fc = "[0:v]" + preFx + "[base];"
		base = "[base]"
	}
	return fc + "[1:v]" + base + "scale2ref[wm][b];[b][wm]overlay=0:0[v]"
}

// startNumber names the first frame ffmpeg reads off disk: 0 for an ordinary render, or a range
// render's RangeStart (internal/scene.Meta), since a range only ever writes files at its own global
// frame indices, never a fresh 0-based run.
func Video(framesDir string, fps int, grain, draft bool, watermark, out, ext string, w, h, startNumber int) error {
	if ext == "" {
		ext = ".png"
	}
	seq := filepath.Join(framesDir, "%05d"+ext)
	r := strconv.Itoa(fps)
	args := []string{"-y", "-framerate", r, "-start_number", strconv.Itoa(startNumber), "-i", seq}
	if watermark != "" {
		args = append(args, "-i", watermark)
	}
	args = append(args, "-an")
	// grain is OPT-IN (`"grain": true`): only genuinely filmic brands reach here. Low-strength luma
	// temporal grain: heavy/temporal noise is incompressible and crawls over sharp text as shimmer.
	grainFx := ""
	if !draft && grain {
		grainFx = "noise=c0s=3:c0f=t"
	}
	// The supersample resolve. `area` is a box filter: the exact ss×ss average the Go resolve did, so
	// this is the same operation, not an approximation of it. Placed first in the chain so grain and the
	// watermark apply at final size, exactly as they did when Go resolved before encoding.
	scaleFx := ""
	if w > 0 && h > 0 {
		scaleFx = fmt.Sprintf("scale=%d:%d:flags=area", w, h)
	}
	if scaleFx != "" && grainFx != "" {
		grainFx = scaleFx + "," + grainFx
	} else if scaleFx != "" {
		grainFx = scaleFx
	}
	switch {
	case watermark != "":
		// scale2ref sizes the 1920x1080 sheet to whatever this scene's frame is, so one baked PNG
		// serves every aspect. Built as one filter_complex because -vf and -filter_complex cannot
		// both be given: folding grain in here keeps the two features composable instead of
		// mutually exclusive.
		//
		// THE BASE IS SCALED FIRST, and the sheet is sized against the RESULT. scale2ref used to take
		// the raw captured frame as its reference, which on any non-draft render is 2x supersampled,
		// so the sheet was built at 2160x3840, the frame was scaled down under it, and overlay=0:0 kept
		// the sheet's top-left quarter. Every free preview shipped an oversized watermark clipped at
		// all four edges, and only --draft looked right because ss=1 inserts no scale (MISTAKES #225).
		args = append(args, "-filter_complex", watermarkChain(grainFx), "-map", "[v]")
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
// (yuva420p): a motion-graphics overlay layer to composite over other footage. Video-only.
// A watermark is overlaid the same way it is on the opaque path: the export a customer can drop
// straight onto their own footage used to be the one that came out clean (MISTAKES #225).
// These frames were already resolved to final size in Go, so no scale precedes the sheet.
func VideoAlpha(framesDir string, fps int, watermark, out string) error {
	seq := filepath.Join(framesDir, "%05d.png")
	r := strconv.Itoa(fps)
	args := []string{"-y", "-framerate", r, "-start_number", "0", "-i", seq}
	if watermark != "" {
		args = append(args, "-i", watermark)
	}
	args = append(args, "-an")
	if watermark != "" {
		// format=auto keeps overlay working in the input's own alpha format, so the sheet is composited
		// INTO the transparent frame rather than flattening it.
		args = append(args, "-filter_complex", "[1:v][0:v]scale2ref[wm][b];[b][wm]overlay=0:0:format=auto[v]", "-map", "[v]")
	}
	args = append(args, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-r", r, out)
	return run(args...)
}

// Composite overlays an alpha graphics layer (webm w/ alpha) on top of a background video →
// out. The bg is scaled/cropped to the graphics canvas and looped/trimmed to the overlay length
// (overlay drives duration). This is the deterministic "motion graphics on a video" layer:
// the graphics are rendered pure-in-n with alpha, the video is composited at encode time.
// The watermark goes on the FINISHED composite, not on the overlay, because the composite is the
// deliverable a viewer sees; watermarking the overlay would put the sheet under the graphics.
func Composite(bgVideo, overlayWebm string, w, h, fps int, watermark, out string) error {
	r := strconv.Itoa(fps)
	filter := fmt.Sprintf(
		"[0:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,fps=%s,setsar=1[bg];",
		w, h, w, h, r)
	// The overlay MUST be decoded by libvpx-vp9. ffmpeg's own faster vp9 decoder cannot read the alpha
	// side data WebM stores the plane in, and hands back yuv420p with no complaint, so the overlay
	// arrived fully opaque and every transparent pixel composited as black, which looks like a
	// background that failed to load rather than a decoder that dropped a channel (MISTAKES #224).
	args := []string{"-y", "-stream_loop", "-1", "-i", bgVideo, "-c:v", "libvpx-vp9", "-i", overlayWebm}
	if watermark != "" {
		args = append(args, "-i", watermark)
		filter += "[bg][1:v]overlay=0:0:shortest=1[c];" +
			"[2:v][c]scale2ref[wm][b];[b][wm]overlay=0:0,format=yuv420p[v]"
	} else {
		filter += "[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]"
	}
	args = append(args, "-filter_complex", filter, "-map", "[v]",
		"-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20",
		"-movflags", "+faststart", "-r", r, out)
	return run(args...)
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
