package encode

import (
	"strings"
	"testing"
)

// The watermark sheet must be sized against the FINAL frame, never the raw captured one. On any
// non-draft render the captured frame is 2x supersampled, so a sheet sized against it comes out at
// twice the size and overlay=0:0 keeps only its top-left quarter. Nothing in the pipeline can see
// that: ffmpeg exits 0, the file plays, and the damage is only in the pixels (engine-doctrine/MISTAKES.md #225).
func TestWatermarkIsSizedAgainstTheFinalFrame(t *testing.T) {
	const scale = "scale=1080:1920:flags=area"
	fc := watermarkChain(scale)

	if strings.Index(fc, scale) > strings.Index(fc, "scale2ref") {
		t.Fatalf("the frame must be scaled BEFORE scale2ref reads it as the reference; got %q", fc)
	}
	if !strings.Contains(fc, "[1:v][base]scale2ref") {
		t.Fatalf("scale2ref's reference must be the scaled frame, not [0:v]; got %q", fc)
	}
}

// With no scale and no grain the frames are already final, so the sheet may reference them directly.
// This is the draft path, and it is the one that accidentally looked right while the other was broken.
func TestWatermarkChainWithoutPreEffects(t *testing.T) {
	fc := watermarkChain("")
	if want := "[1:v][0:v]scale2ref[wm][b];[b][wm]overlay=0:0[v]"; fc != want {
		t.Fatalf("got %q, want %q", fc, want)
	}
}
