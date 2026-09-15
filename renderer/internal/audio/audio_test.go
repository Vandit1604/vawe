package audio

import (
	"bytes"
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"strings"
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

// (a) Same config in, byte-identical PCM out: determinism is the contract.
func TestRenderDeterministic(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.4, 3)}
	out1 := filepath.Join(dir, "a.wav")
	out2 := filepath.Join(dir, "b.wav")

	if ok, err := Render(cfg, 2, nil, nil, nil, dir, dir, out1); !ok || err != nil {
		t.Fatal("expected a track")
	}
	if ok, err := Render(cfg, 2, nil, nil, nil, dir, dir, out2); !ok || err != nil {
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
	if ok, _ := Render(cfg, 2, nil, nil, nil, dir, dir, out); ok {
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
	if ok, err := Render(cfg, 2, nil, nil, nil, dir, dir, out); !ok || err != nil {
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

// bridgeSource writes a flat texture the bridge can loop, under assets/music/ so a bare NAME resolves
// the same way an author's would.
func bridgeSource(t *testing.T, dir, name string, amp float64) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(dir, "assets", "music"), 0755); err != nil {
		t.Fatal(err)
	}
	writeMonoWav(t, filepath.Join(dir, "assets", "music", name+".wav"), flat(amp, sr))
}

// rms of one second-window of the mixed file, so a test asserts what an ear would hear.
func rmsAt(w *wav, from, to float64) float64 {
	a, b := int(from*float64(w.rate)), int(to*float64(w.rate))
	if b > len(w.data) {
		b = len(w.data)
	}
	acc := 0.0
	for i := a; i < b; i++ {
		acc += w.data[i] * w.data[i]
	}
	if b <= a {
		return 0
	}
	return math.Sqrt(acc / float64(b-a))
}

// (d) A J-cut is audible BEFORE its junction and silent well before that. The whole device is that
// the sound arrives first, so this is the assertion the feature exists for.
func TestJCutLeadsThePicture(t *testing.T) {
	dir := t.TempDir()
	bridgeSource(t, dir, "texture", 0.5)
	out := filepath.Join(dir, "j.wav")
	br := []Bridge{{Sound: "texture", Kind: "j", At: 3, Start: 2, End: 5, Fade: 0.2, Gain: 0.5, Duck: 1}}
	if ok, err := Render(Config{}, 6, nil, nil, br, dir, dir, out); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	w := readWavMono(out)
	before, lead, after := rmsAt(w, 0.5, 1.5), rmsAt(w, 2.4, 2.9), rmsAt(w, 3.5, 4.5)
	if before > 1e-3 {
		t.Fatalf("nothing should sound before the bridge, got rms %.4f", before)
	}
	if lead < 0.2 {
		t.Fatalf("the J-cut must be audible BEFORE its junction, got rms %.4f in the lead", lead)
	}
	if after < 0.2 {
		t.Fatalf("the J-cut must keep playing after the junction, got rms %.4f", after)
	}
}

// (e) An L-cut still sounds AFTER its junction and stops at the end of its lag.
func TestLCutTrailsThePicture(t *testing.T) {
	dir := t.TempDir()
	bridgeSource(t, dir, "texture", 0.5)
	out := filepath.Join(dir, "l.wav")
	br := []Bridge{{Sound: "texture", Kind: "l", At: 3, Start: 1, End: 4, Fade: 0.2, Gain: 0.5, Duck: 1}}
	if ok, err := Render(Config{}, 6, nil, nil, br, dir, dir, out); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	w := readWavMono(out)
	lag, past := rmsAt(w, 3.1, 3.6), rmsAt(w, 4.5, 5.5)
	if lag < 0.2 {
		t.Fatalf("the L-cut must run past its junction, got rms %.4f", lag)
	}
	if past > 1e-3 {
		t.Fatalf("the L-cut must stop at the end of its lag, got rms %.4f", past)
	}
}

// (f) A bridge with `duck` pulls the music bed down under itself: the cross in "cross it under".
func TestBridgeDucksTheBed(t *testing.T) {
	dir := t.TempDir()
	bridgeSource(t, dir, "texture", 0.5)
	out := filepath.Join(dir, "d.wav")
	cfg := Config{Music: constMusic(t, dir, 0.5, 6)}
	br := []Bridge{{Sound: "texture", Kind: "j", At: 3, Start: 2, End: 5, Fade: 0.2, Gain: 0, Duck: 0}}
	if ok, err := Render(cfg, 6, nil, nil, br, dir, dir, out); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	w := readWavMono(out)
	open, under := rmsAt(w, 0.5, 1.5), rmsAt(w, 3, 4)
	if under > open*0.05 {
		t.Fatalf("the bed should duck to near nothing under the bridge: open %.4f, under %.4f", open, under)
	}
}

// (g) A missing bridge source FAILS the render. Silence here is not a quieter film, it is a film that
// has lost the thing holding it together, and that must never pass unremarked.
func TestMissingBridgeSourceFails(t *testing.T) {
	dir := t.TempDir()
	br := []Bridge{{Sound: "nosuchbed", Kind: "j", At: 3, Start: 2, End: 5, Fade: 0.2, Gain: 0.5, Duck: 1}}
	ok, err := Render(Config{}, 6, nil, nil, br, dir, dir, filepath.Join(dir, "x.wav"))
	if ok || err == nil {
		t.Fatal("a missing bridge source must fail the render")
	}
	if !bytes.Contains([]byte(err.Error()), []byte("nosuchbed")) {
		t.Fatalf("the error must name the sound it could not find, got: %v", err)
	}
}

// (h) No bridges = the mix the engine produced before this feature existed.
func TestNoBridgesIsUnchanged(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.4, 3)}
	a, b := filepath.Join(dir, "a.wav"), filepath.Join(dir, "b.wav")
	Render(cfg, 2, nil, nil, nil, dir, dir, a)
	Render(cfg, 2, nil, nil, []Bridge{}, dir, dir, b)
	x, _ := os.ReadFile(a)
	y, _ := os.ReadFile(b)
	if !bytes.Equal(x, y) {
		t.Fatal("an empty bridge list must mix byte-identically to no bridge list")
	}
}

// cueSource writes a flat-amplitude cue under assets/sfx/, where the mixer looks up a cue by name.
func cueSource(t *testing.T, dir, name string, amp, secs float64) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(dir, "assets", "sfx"), 0755); err != nil {
		t.Fatal(err)
	}
	writeMonoWav(t, filepath.Join(dir, "assets", "sfx", name+".wav"), flat(amp, int(secs*sr)))
}

// rmsDiff is the level of what the SECOND file added to the first: the cue on its own, lifted out of
// a mix it is summed into. Measuring the mix would only prove the window got louder.
func rmsDiff(a, b *wav, from, to float64) float64 {
	i, j := int(from*float64(a.rate)), int(to*float64(a.rate))
	acc := 0.0
	for k := i; k < j && k < len(a.data) && k < len(b.data); k++ {
		d := b.data[k] - a.data[k]
		acc += d * d
	}
	if j <= i {
		return 0
	}
	return math.Sqrt(acc / float64(j-i))
}

// (i) A cue must be HEARD over the bed under it. A cue is causal, it says the thing happened, and a
// bed is atmosphere; a `tick` at its table gain of 0.45 against a bed at 0.6 sat UNDER the atmosphere.
func TestCueClearsTheBed(t *testing.T) {
	dir := t.TempDir()
	cueSource(t, dir, "tick", 0.5, 0.2)
	cfg := Config{Music: constMusic(t, dir, 0.5, 6)}
	bedOnly, mixed := filepath.Join(dir, "bed.out.wav"), filepath.Join(dir, "mix.out.wav")
	if ok, err := Render(cfg, 4, nil, nil, nil, dir, dir, bedOnly); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	if ok, err := Render(cfg, 4, nil, []Cue{{T: 2, Name: "tick"}}, nil, dir, dir, mixed); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	a, b := readWavMono(bedOnly), readWavMono(mixed)
	bed, cue := rmsAt(a, 2, 2.2), rmsDiff(a, b, 2, 2.2)
	if cue < bed*cueHeadroom*0.98 {
		t.Fatalf("the cue must clear the bed by %.1fdB: bed %.4f, cue %.4f (%.1fdB over)",
			20*math.Log10(cueHeadroom), bed, cue, 20*math.Log10(cue/bed))
	}
}

// (j) An AUTHORED gain is a decision, not a starting point. The mixer must never quietly raise it.
func TestAuthoredCueGainIsNeverLifted(t *testing.T) {
	dir := t.TempDir()
	cueSource(t, dir, "key", 0.5, 0.2)
	cfg := Config{Music: constMusic(t, dir, 0.5, 6)}
	bedOnly, mixed := filepath.Join(dir, "bed.out.wav"), filepath.Join(dir, "mix.out.wav")
	Render(cfg, 4, nil, nil, nil, dir, dir, bedOnly)
	g := 0.1
	Render(cfg, 4, nil, []Cue{{T: 2, Name: "key", Gain: &g}}, nil, dir, dir, mixed)
	a, b := readWavMono(bedOnly), readWavMono(mixed)
	if cue := rmsDiff(a, b, 2, 2.2); math.Abs(cue-0.05) > 2e-3 {
		t.Fatalf("an authored gain of 0.1 on a 0.5 clip must mix at 0.05, got %.4f", cue)
	}
}

// (k) No bed, nothing to clear: a film without music mixes exactly as it did before this rule.
func TestCueWithNoBedIsUnchanged(t *testing.T) {
	dir := t.TempDir()
	cueSource(t, dir, "tick", 0.5, 0.2)
	out := filepath.Join(dir, "n.wav")
	if ok, err := Render(Config{}, 4, nil, []Cue{{T: 2, Name: "tick"}}, nil, dir, dir, out); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	if cue := rmsAt(readWavMono(out), 2, 2.2); math.Abs(cue-0.5*0.45) > 2e-3 {
		t.Fatalf("with no bed a tick must stay at its table gain 0.45, got %.4f", cue)
	}
}

// (m) A clip track lands at the right sample offset: silent before its `start`, audible from it.
func TestClipAudioLandsAtOffset(t *testing.T) {
	dir := t.TempDir()
	clip := filepath.Join(dir, "clip.wav")
	writeMonoWav(t, clip, flat(0.5, int(2*sr)))
	out := filepath.Join(dir, "c.wav")
	clips := []ClipTrack{{File: clip, Start: 3, Gain: 1, Duck: 1}}
	if ok, err := Render(Config{ClipAudio: clips}, 6, nil, nil, nil, dir, dir, out); !ok || err != nil {
		t.Fatalf("expected a track: %v", err)
	}
	w := readWavMono(out)
	before, during := rmsAt(w, 0, 2.9), rmsAt(w, 3.1, 4.9)
	if before > 1e-3 {
		t.Fatalf("nothing should sound before the clip's start, got rms %.4f", before)
	}
	if during < 0.2 {
		t.Fatalf("the clip must be audible from its start, got rms %.4f", during)
	}
}

// (n) An empty clip list changes nothing: same mix as no clip audio at all.
func TestNoClipAudioIsUnchanged(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{Music: constMusic(t, dir, 0.4, 3)}
	a, b := filepath.Join(dir, "a.wav"), filepath.Join(dir, "b.wav")
	Render(cfg, 2, nil, nil, nil, dir, dir, a)
	cfg.ClipAudio = []ClipTrack{}
	Render(cfg, 2, nil, nil, nil, dir, dir, b)
	x, _ := os.ReadFile(a)
	y, _ := os.ReadFile(b)
	if !bytes.Equal(x, y) {
		t.Fatal("an empty clip list must mix byte-identically to no clip list")
	}
}

// (l) A cue that resolves to no file used to `continue` without a word (the same failure class the
// music-bed warning above exists to close): a typo'd name or an unbaked voice cue played SILENCE and
// nothing said so. It must now name the cue and the time on stderr, restoring the sound-cue doctrine
// this repo's own comment at the call site cites (engine-doctrine/MISTAKES.md #492: one synthesiser, in JS).
func TestUnresolvedCueLogsWarning(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "n.wav")

	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	real := os.Stderr
	os.Stderr = w
	ok, rerr := Render(Config{}, 4, nil, []Cue{{T: 2.5, Name: "typo-name"}}, nil, dir, dir, out)
	os.Stderr = real
	w.Close()
	var buf bytes.Buffer
	buf.ReadFrom(r)
	logged := buf.String()

	if !ok || rerr != nil {
		t.Fatalf("an unresolved cue must not fail the render, only warn: ok=%v err=%v", ok, rerr)
	}
	if !strings.Contains(logged, "typo-name") || !strings.Contains(logged, "2.50") {
		t.Fatalf("stderr must name the cue and its time, got: %q", logged)
	}
}
