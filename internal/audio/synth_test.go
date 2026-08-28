package audio

import (
	"bytes"
	"math"
	"os"
	"path/filepath"
	"testing"
)

// Identical parameters must give identical samples, or a re-render is a different film.
func TestSynthDeterministic(t *testing.T) {
	for _, v := range VoiceNames() {
		a, err := Synth(v, map[string]float64{"seed": 7})
		if err != nil {
			t.Fatalf("%s: %v", v, err)
		}
		b, _ := Synth(v, map[string]float64{"seed": 7})
		if len(a) != len(b) {
			t.Fatalf("%s: length %d vs %d", v, len(a), len(b))
		}
		for i := range a {
			if a[i] != b[i] {
				t.Fatalf("%s: sample %d differs: %v vs %v", v, i, a[i], b[i])
			}
		}
	}
}

// A different seed must actually change the noise, else the PRNG is not wired in.
func TestSynthSeedChangesNoise(t *testing.T) {
	a, _ := Synth("whoosh", map[string]float64{"seed": 1})
	b, _ := Synth("whoosh", map[string]float64{"seed": 2})
	same := true
	for i := range a {
		if a[i] != b[i] {
			same = false
			break
		}
	}
	if same {
		t.Fatal("whoosh ignored its seed")
	}
}

// Edges at zero (no pop) and peak at the voice's gain (no clip).
func TestSynthEdgesAndPeak(t *testing.T) {
	for _, v := range VoiceNames() {
		s, err := Synth(v, nil)
		if err != nil {
			t.Fatalf("%s: %v", v, err)
		}
		if s[0] != 0 || s[len(s)-1] != 0 {
			t.Fatalf("%s: edges not zero: first=%v last=%v", v, s[0], s[len(s)-1])
		}
		if pk := peakOf(s); pk > 1 || pk < 0.3 {
			t.Fatalf("%s: peak %v out of range", v, pk)
		}
	}
}

func TestSynthUnknownVoiceFails(t *testing.T) {
	if _, err := Synth("kazoo", nil); err == nil {
		t.Fatal("an unknown voice must fail the render, not mix silence")
	}
}

// A voice cue reaches the mix, and a scene of nothing but voice cues still renders.
func TestRenderVoiceCue(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "a.wav")
	ok, err := Render(Config{}, 2, nil, []Cue{{T: 0.5, Voice: "thud"}}, nil, dir, dir, out)
	if err != nil || !ok {
		t.Fatalf("render: ok=%v err=%v", ok, err)
	}
	w := readWavMono(out)
	if w == nil {
		t.Fatal("no wav written")
	}
	if peakOf(w.data) < 0.05 {
		t.Fatalf("voice cue never reached the mix: peak %v", peakOf(w.data))
	}
	// Same input, byte-identical file.
	out2 := filepath.Join(dir, "b.wav")
	Render(Config{}, 2, nil, []Cue{{T: 0.5, Voice: "thud"}}, nil, dir, dir, out2)
	x, _ := os.ReadFile(out)
	y, _ := os.ReadFile(out2)
	if !bytes.Equal(x, y) {
		t.Fatal("two renders of the same voice cue differ")
	}
}

func TestRenderUnknownVoiceFails(t *testing.T) {
	dir := t.TempDir()
	_, err := Render(Config{}, 2, nil, []Cue{{T: 0.5, Voice: "kazoo"}}, nil, dir, dir, filepath.Join(dir, "a.wav"))
	if err == nil {
		t.Fatal("an unknown voice must fail the render")
	}
}

// Params override the preset: a longer decay makes a longer clip.
func TestSynthParamsOverride(t *testing.T) {
	short, _ := Synth("pluck", nil)
	long, _ := Synth("pluck", map[string]float64{"decay": 1})
	if len(long) <= len(short) {
		t.Fatalf("decay override ignored: %d vs %d", len(long), len(short))
	}
	if math.Abs(float64(len(long))-(0.001+1)*sr) > 100 {
		t.Fatalf("unexpected length %d", len(long))
	}
}
