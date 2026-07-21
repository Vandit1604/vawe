package audio

import (
	"bytes"
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"testing"
)

// writeMonoWav lays down a minimal PCM16 mono WAV so Render has a real bed to load.
func writeMonoWav(t *testing.T, path string, samples []float64) {
	t.Helper()
	n := len(samples)
	buf := make([]byte, 44+n*2)
	copy(buf[0:], "RIFF")
	binary.LittleEndian.PutUint32(buf[4:], uint32(36+n*2))
	copy(buf[8:], "WAVE")
	copy(buf[12:], "fmt ")
	binary.LittleEndian.PutUint32(buf[16:], 16)
	binary.LittleEndian.PutUint16(buf[20:], 1)
	binary.LittleEndian.PutUint16(buf[22:], 1)
	binary.LittleEndian.PutUint32(buf[24:], sr)
	binary.LittleEndian.PutUint32(buf[28:], sr*2)
	binary.LittleEndian.PutUint16(buf[32:], 2)
	binary.LittleEndian.PutUint16(buf[34:], 16)
	copy(buf[36:], "data")
	binary.LittleEndian.PutUint32(buf[40:], uint32(n*2))
	for i, s := range samples {
		v := int16(math.Round(s * 32767))
		binary.LittleEndian.PutUint16(buf[44+i*2:], uint16(v))
	}
	if err := os.WriteFile(path, buf, 0644); err != nil {
		t.Fatalf("write wav: %v", err)
	}
}

// constMusic writes a flat-amplitude bed of `secs` seconds.
func constMusic(t *testing.T, dir string, amp, secs float64) string {
	path := filepath.Join(dir, "bed.wav")
	writeMonoWav(t, path, flat(amp, int(secs*sr)))
	return path
}

func flat(amp float64, n int) []float64 {
	s := make([]float64, n)
	for i := range s {
		s[i] = amp
	}
	return s
}

// (a) Same config in, byte-identical PCM out — determinism is the contract.
func TestRenderDeterministic(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.4, 3)}
	out1 := filepath.Join(dir, "a.wav")
	out2 := filepath.Join(dir, "b.wav")

	if !Render(cfg, 2, nil, nil, dir, dir, out1) {
		t.Fatal("expected a track")
	}
	if !Render(cfg, 2, nil, nil, dir, dir, out2) {
		t.Fatal("expected a track")
	}
	b1, _ := os.ReadFile(out1)
	b2, _ := os.ReadFile(out2)
	if !bytes.Equal(b1, b2) {
		t.Fatal("two renders of one config differ")
	}
}

// (b) Silent asks for no track at all.
func TestRenderSilent(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.4, 3), Silent: true}
	out := filepath.Join(dir, "s.wav")
	if Render(cfg, 2, nil, nil, dir, dir, out) {
		t.Fatal("silent must return false")
	}
	if _, err := os.Stat(out); err == nil {
		t.Fatal("silent must not write a file")
	}
}

// (c) A fade-in starts the bed near zero and below its steady level.
func TestFadeInRampsUp(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.5, 3)}
	cfg.MusicFade.In = 1.0
	out := filepath.Join(dir, "f.wav")
	if !Render(cfg, 2, nil, nil, dir, dir, out) {
		t.Fatal("expected a track")
	}
	w := readWavMono(out)
	if w == nil || len(w.data) < sr {
		t.Fatal("short output")
	}
	first := math.Abs(w.data[0])
	early := math.Abs(w.data[sr/10])   // 0.1s in, still inside the ramp
	steady := math.Abs(w.data[sr*3/2]) // 1.5s in, past the 1s fade
	if first > 1e-3 {
		t.Fatalf("first sample should be ~0, got %v", first)
	}
	if early >= steady {
		t.Fatalf("early sample %v should be quieter than steady %v", early, steady)
	}
}

// Loudness is applied at the mux by ffmpeg loudnorm (encode.Mux), not in this package, so it is
// verified end-to-end at render time (measured near the target with ffmpeg), not by a unit test here.
