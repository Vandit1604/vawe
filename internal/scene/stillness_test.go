package scene

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

// writeGrayFrame writes one flat-grey PNG frame, small enough (24x24, two stillGrid cells per axis)
// that the test runs in milliseconds and still exercises the real cell-averaging path.
func writeGrayFrame(t *testing.T, dir string, n int, val uint8) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 24, 24))
	for y := 0; y < 24; y++ {
		for x := 0; x < 24; x++ {
			img.Set(x, y, color.RGBA{val, val, val, 255})
		}
	}
	f, err := os.Create(filepath.Join(dir, fmt.Sprintf("%05d.png", n)))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

// A held frame reads still whichever way it is scored; the failure this test guards against is scoring
// a burst-and-hold film (mostly still, with one real spike) as indistinguishable from a film that never
// moves at all. Both report a high still share by design; only `peak` tells them apart, which is the
// whole reason Stillness returns it (see the comment above the function).
func TestStillnessPeakDistinguishesBurstFromStatic(t *testing.T) {
	const total = 20

	staticDir := t.TempDir()
	for n := 0; n < total; n++ {
		writeGrayFrame(t, staticDir, n, 128)
	}
	staticStill, _, staticPeak, ok := Stillness(staticDir, total, ".png", 30)
	if !ok {
		t.Fatal("static sequence: Stillness reported not ok")
	}

	burstDir := t.TempDir()
	for n := 0; n < total; n++ {
		val := uint8(128)
		if n == 10 { // one bright frame in an otherwise flat sequence: the burst
			val = 250
		}
		writeGrayFrame(t, burstDir, n, val)
	}
	burstStill, _, burstPeak, ok := Stillness(burstDir, total, ".png", 30)
	if !ok {
		t.Fatal("burst sequence: Stillness reported not ok")
	}

	if staticPeak > 1 {
		t.Errorf("a genuinely static sequence should have peak near 0, got %.2f", staticPeak)
	}
	if burstPeak < 30 {
		t.Errorf("a burst-and-hold sequence should have a real peak, got %.2f", burstPeak)
	}
	// The failure this whole change fixes: still-share ALONE cannot tell these two apart, because both
	// sequences spend most of their frames held. Assert that stays true, so a future edit that makes
	// still-share diverge does not silently make this test meaningless.
	if staticStill < 90 || burstStill < 80 {
		t.Fatalf("both sequences should read mostly-still by share (static %.0f, burst %.0f); the test setup no longer represents burst-and-hold", staticStill, burstStill)
	}
	if burstPeak <= staticPeak*10 {
		t.Errorf("peak should separate the two sequences by an order of magnitude; static %.2f, burst %.2f", staticPeak, burstPeak)
	}
}
