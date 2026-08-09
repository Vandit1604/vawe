// Package audio is a code PCM mixer (port of engine/audio.js): build the full
// audio bed in memory (music + named SFX at cue times + micro-silence + soft limiter),
// write a WAV; ffmpeg only muxes it.
package audio

import (
	"encoding/binary"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
)

const (
	sr        = 44100
	duckGain  = 0.126 // ~-18dB
	musicGain = 0.6
	micro     = 0.3 // micro-silence before each sting (seconds)
)

// Per-cue trim, so cues of different natures sit together at their authored gain. Anything absent
// defaults to 0.6. `correct`/`wrong`/`beep`/`beep3` were dropped when the library became Cuelume-only;
// entries for cues that cannot be emitted are dead config, so they are gone too.
var sfxGain = map[string]float64{"tick": 0.45, "whoosh": 0.45, "reveal": 0.82}

// Cue is one placed sound effect.
type Cue struct {
	T    float64  `json:"t"`
	Name string   `json:"name"`
	Gain *float64 `json:"gain,omitempty"`
}

// Bridge is one sound bridge, already resolved to a span of seconds by core/audio-bridges.js. A
// J-cut leans its start before the junction, an L-cut leans its end past it; by the time it reaches
// here the two are the same object and the mixer does not need to know which. Kind and At survive
// only so a failure can say WHICH bridge in the film broke.
type Bridge struct {
	Sound string  `json:"sound"`
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Fade  float64 `json:"fade"`
	Gain  float64 `json:"gain"`
	Duck  float64 `json:"duck"` // floor the music bed drops to under the bridge; 1 = no duck
	At    float64 `json:"at"`
	Kind  string  `json:"kind"` // "j" | "l"
}

// Config is the data.audio block.
type Config struct {
	Music     string   `json:"music"`
	VO        string   `json:"vo"`
	MusicGain *float64 `json:"musicGain,omitempty"`
	// SfxGain scales EVERY effect cue, including the ones auto sound-design derives from cuts and
	// stings. Without it a scene could only trim the cues it placed by hand: the derived ones fell back
	// to the table above and drowned quiet authored cues (keystrokes at 0.055 under cuts at 0.6).
	SfxGain *float64 `json:"sfxGain,omitempty"`
	// Silent renders the video with no audio track at all — skips the default
	// music.wav/sting.wav auto-discovery. Use for motion-graphics overlays.
	Silent bool `json:"silent,omitempty"`
	// MusicFade fades the MUSIC bed in from t=0 and out to `duration`, in seconds. Zero/absent legs
	// leave the bed at full level, so today's no-fade behaviour is the default.
	MusicFade struct {
		In  float64 `json:"in"`
		Out float64 `json:"out"`
	} `json:"musicFade"`
	// MusicDuck is the floor the music ducks to under VO (0..1). It overrides the hardcoded duckGain
	// so an author can choose how far the bed drops. Absent keeps the ~-18dB default.
	MusicDuck *float64 `json:"musicDuck,omitempty"`
	// Loudness is an integrated-loudness target in LUFS (negative, e.g. -14 for socials). Applied at
	// the MUX by ffmpeg loudnorm (gated BS.1770), not here; render.go reads it. Absent = no normalization.
	Loudness *float64 `json:"loudness,omitempty"`
}

type wav struct {
	rate int
	data []float64
}

// Render writes the mixed stereo WAV to outWav. Returns false if there was nothing to mix, and an
// error only for a mix that would come out WRONG rather than absent — today that is a sound bridge
// whose source file is missing, because a film whose beats are held together by a texture that never
// plays is not a quieter film, it is a different one.
func Render(cfg Config, duration float64, stings []float64, sfx []Cue, bridges []Bridge, formatDir, assetsBase, outWav string) (bool, error) {
	if cfg.Silent {
		return false, nil
	}
	bases := []string{}
	if formatDir != "" {
		bases = append(bases, formatDir)
	}
	if assetsBase != "" {
		bases = append(bases, assetsBase)
	}

	// Silence is the DEFAULT. This used to fall back to a discovered "music.wav", so ANY scene that
	// simply omitted an `audio` key shipped with a bed under it — sound you never asked for, on every
	// video authored without thinking about audio. A music track is now opt-in: name it, or get silence.
	musicFile := ""
	if cfg.Music != "" {
		// A bare bed NAME (no path separator, no extension — e.g. "tense") resolves to
		// assets/music/<name>.wav, the same place `make audio`/`make music-pack` write and the same
		// rule core/validate.mjs checks. Without this, a named bed matched nothing and dropped to
		// silence with no error — a silent substitution the validator wrongly reported as fine
		// (docs/MISTAKES.md #132). A real path ("assets/music/lofi.wav") resolves directly and never
		// hits the fallback.
		fallback := ""
		if !strings.ContainsAny(cfg.Music, "/\\") && filepath.Ext(cfg.Music) == "" {
			fallback = filepath.Join("music", cfg.Music+".wav")
		}
		musicFile = resolve(bases, cfg.Music, fallback)
		if musicFile == "" {
			// Not fatal — assets/music/ is gitignored, so a fresh clone legitimately has no beds and
			// every sounded film would otherwise refuse to render. But it must never pass unremarked:
			// this exact silence shipped in argus-launch for months while the scene claimed a bed.
			fmt.Fprintf(os.Stderr, "⚠ audio.music %q resolved to no file — the film renders with NO BED. Run `make music-pack`, or fix the name.\n", cfg.Music)
		}
	}
	voFile := resolve(bases, cfg.VO, "")
	// Bridge sources resolve BEFORE anything is mixed, so a missing one fails the render instead of
	// half-mixing a film that has lost its continuity. Order: an explicit path, then a bed name, then
	// a synthesized cue name — the three things `sound` is allowed to be.
	bridgeFiles := make([]string, len(bridges))
	for i, b := range bridges {
		f := ""
		if strings.ContainsAny(b.Sound, "/\\") || filepath.Ext(b.Sound) != "" {
			f = resolve(bases, b.Sound, "")
		} else {
			f = resolve(bases, "", filepath.Join("music", b.Sound+".wav"))
			if f == "" {
				f = resolve(bases, "", filepath.Join("sfx", b.Sound+".wav"))
			}
		}
		if f == "" {
			return false, fmt.Errorf("audio bridge (%s-cut at t=%.2f) names sound %q, which is not on disk — looked for it as a path, as assets/music/%s.wav and as assets/sfx/%s.wav. Run `make audio` for a cue or `make music-pack` for a bed",
				b.Kind, b.At, b.Sound, b.Sound, b.Sound)
		}
		bridgeFiles[i] = f
	}
	// `Sting` was resolved here and then used ONLY in the emptiness guard below — its samples never
	// reached the mix, so the field did nothing except let an auto-discovered assets/sting.wav force a
	// silent audio track onto a scene that asked for none. No scene sets it, and what a "sting file"
	// should mean is ambiguous now that scene.html emits per-sting `reveal` cues into the sfx list.
	// Removed rather than left as config that reads as intent (docs/MISTAKES.md #70).
	if musicFile == "" && voFile == "" && len(sfx) == 0 && len(bridges) == 0 {
		return false, nil
	}

	total := int(math.Round(duration * sr))
	left := make([]float64, total)
	right := make([]float64, total)

	music := fitFile(musicFile, total, true)
	vo := fitFile(voFile, total, false)

	// VO activity envelope -> duck music where VO present
	voEnv := make([]float64, total)
	if vo != nil {
		env := 0.0
		for i := 0; i < total; i++ {
			a := math.Abs(vo[i])
			if a > env {
				env = a
			} else {
				env *= 0.9995
			}
			voEnv[i] = env
		}
	}

	// micro-silence: ramp music to 0 over MICRO sec before each sting
	microGain := make([]float64, total)
	for i := range microGain {
		microGain[i] = 1
	}
	microN := int(math.Round(micro * sr))
	for _, t := range stings {
		end := int(math.Round(t * sr))
		for i := max(0, end-microN); i < min(total, end); i++ {
			g := 1 - float64(i-(end-microN))/float64(microN)
			if g < microGain[i] {
				microGain[i] = g
			}
		}
	}

	// SOUND BRIDGES. Each is laid down as its own looped texture with an equal-power ramp at both
	// ends, and may pull the music bed down under itself by the same curve — that mirrored pair IS the
	// cross in "cross it under", and it is what makes the join a bridge rather than a second file
	// switching on. Every value is a function of the sample index, so the mix is reproducible.
	var bridgeMix []float64
	var bedDuck []float64
	if len(bridges) > 0 {
		bridgeMix = make([]float64, total)
		bedDuck = make([]float64, total)
		for i := range bedDuck {
			bedDuck[i] = 1
		}
		for bi, b := range bridges {
			src := readWavMono(bridgeFiles[bi])
			if src == nil {
				return false, fmt.Errorf("audio bridge (%s-cut at t=%.2f): %s is not a WAV this mixer can read", b.Kind, b.At, bridgeFiles[bi])
			}
			start := int(math.Round(b.Start * sr))
			end := int(math.Round(b.End * sr))
			if start < 0 {
				start = 0
			}
			if end > total {
				end = total
			}
			clip := fit(src, end-start, true)
			fadeN := int(math.Round(b.Fade * sr))
			for i := start; i < end; i++ {
				env := bridgeEnv(i-start, end-start, fadeN)
				bridgeMix[i] += clip[i-start] * b.Gain * env
				if d := b.Duck + (1-b.Duck)*(1-env); d < bedDuck[i] {
					bedDuck[i] = d
				}
			}
		}
	}

	mg := musicGain
	if cfg.MusicGain != nil {
		mg = *cfg.MusicGain
	}
	// Author can pick how far the bed ducks under VO; else the ~-18dB default floor.
	duckFloor := duckGain
	if cfg.MusicDuck != nil {
		duckFloor = *cfg.MusicDuck
	}
	fadeInN := int(math.Round(cfg.MusicFade.In * sr))
	fadeOutN := int(math.Round(cfg.MusicFade.Out * sr))
	for i := 0; i < total; i++ {
		ducked := mg
		if vo != nil {
			ducked = math.Max(duckFloor, mg*(1-math.Min(1, voEnv[i]*4)))
		}
		s := 0.0
		if music != nil {
			bd := 1.0
			if bedDuck != nil {
				bd = bedDuck[i]
			}
			s += music[i] * ducked * fadeGain(i, total, fadeInN, fadeOutN) * bd
		}
		if vo != nil {
			s += vo[i]
		}
		left[i] += s * microGain[i]
		right[i] += s * microGain[i]
		if bridgeMix != nil {
			left[i] += bridgeMix[i]
			right[i] += bridgeMix[i]
		}
	}

	// named SFX placed at cue times
	sfxCache := map[string][]float64{}
	loadSfx := func(name string) []float64 {
		if c, ok := sfxCache[name]; ok {
			return c
		}
		f := resolve(bases, "", filepath.Join("sfx", name+".wav"))
		var clip []float64
		if f != "" {
			if w := readWavMono(f); w != nil {
				clip = fit(w, int(math.Round(float64(len(w.data))*sr/float64(w.rate))), false)
			}
		}
		sfxCache[name] = clip
		return clip
	}
	for _, cue := range sfx {
		clip := loadSfx(cue.Name)
		if clip == nil {
			continue
		}
		g := sfxGain[cue.Name]
		if g == 0 {
			g = 0.6
		}
		if cue.Gain != nil {
			g = *cue.Gain
		}
		if cfg.SfxGain != nil {
			g *= *cfg.SfxGain
		}
		start := int(math.Round(cue.T * sr))
		for i := 0; i < len(clip) && start+i >= 0 && start+i < total; i++ {
			left[start+i] += clip[i] * g
			right[start+i] += clip[i] * g
		}
	}

	// Loudness normalization is NOT done here: hitting a true (gated BS.1770) LUFS target by hand needs
	// K-weighting + gated blocks, and an un-weighted PCM gain shipped ~7 dB off. It is applied at the
	// mux instead, where ffmpeg's `loudnorm` does the standard measurement (see encode.Mux + Config.Loudness).
	writeWavStereo(outWav, left, right)
	return true, nil
}

// bridgeEnv is the level of a bridge at sample i of an n-sample span: an equal-power (sine) ramp up
// over the first fadeN samples and down over the last. Equal-power rather than linear because a
// bridge crosses AGAINST the bed, and two linear ramps meeting in the middle dip audibly.
func bridgeEnv(i, n, fadeN int) float64 {
	g := 1.0
	if fadeN > 0 {
		if i < fadeN {
			g = float64(i) / float64(fadeN)
		}
		if rem := n - i; rem < fadeN {
			if out := float64(rem) / float64(fadeN); out < g {
				g = out
			}
		}
	}
	return math.Sin(g * math.Pi / 2)
}

// fadeGain is the pure per-sample level of the music bed: a linear ramp up over the first fadeInN
// samples and down over the last fadeOutN before `total`. Depends only on the index, so the same
// scene always fades identically. Zero-length legs return 1 (no fade).
func fadeGain(i, total, fadeInN, fadeOutN int) float64 {
	g := 1.0
	if fadeInN > 0 && i < fadeInN {
		g = float64(i) / float64(fadeInN)
	}
	if fadeOutN > 0 {
		if rem := total - i; rem < fadeOutN {
			if out := float64(rem) / float64(fadeOutN); out < g {
				g = out
			}
		}
	}
	return g
}


func resolve(bases []string, p, fallback string) string {
	for _, base := range bases {
		if p != "" {
			a := p
			if !filepath.IsAbs(a) {
				a = filepath.Join(base, p)
			}
			if exists(a) {
				return a
			}
		}
	}
	if fallback == "" {
		return ""
	}
	for _, base := range bases {
		f := filepath.Join(base, "assets", fallback)
		if exists(f) {
			return f
		}
	}
	return ""
}

func exists(p string) bool { _, err := os.Stat(p); return err == nil }

func fitFile(file string, n int, loop bool) []float64 {
	if file == "" {
		return nil
	}
	w := readWavMono(file)
	if w == nil {
		return nil
	}
	return fit(w, n, loop)
}

// nearest-rate linear resample to sr, length n (loop or pad)
func fit(src *wav, n int, loop bool) []float64 {
	out := make([]float64, n)
	if src == nil || len(src.data) == 0 {
		return out
	}
	ratio := float64(src.rate) / sr
	for i := 0; i < n; i++ {
		si := float64(i) * ratio
		if loop {
			si = math.Mod(si, float64(len(src.data)))
		} else if si >= float64(len(src.data)-1) {
			continue
		}
		i0 := int(si)
		frac := si - float64(i0)
		v0 := src.data[i0]
		var v1 float64
		if i0+1 < len(src.data) {
			v1 = src.data[i0+1]
		}
		out[i] = v0*(1-frac) + v1*frac
	}
	return out
}

// minimal WAV decode (PCM16/PCM8/float32) -> mono float64
func readWavMono(file string) *wav {
	buf, err := os.ReadFile(file)
	if err != nil || len(buf) < 12 || string(buf[0:4]) != "RIFF" {
		return nil
	}
	var channels, bits, format int
	rate := 0
	dataOff, dataLen := -1, 0
	p := 12
	for p+8 <= len(buf) {
		id := string(buf[p : p+4])
		sz := int(binary.LittleEndian.Uint32(buf[p+4 : p+8]))
		if id == "fmt " {
			format = int(binary.LittleEndian.Uint16(buf[p+8 : p+10]))
			channels = int(binary.LittleEndian.Uint16(buf[p+10 : p+12]))
			rate = int(binary.LittleEndian.Uint32(buf[p+12 : p+16]))
			bits = int(binary.LittleEndian.Uint16(buf[p+22 : p+24]))
		} else if id == "data" {
			dataOff, dataLen = p+8, sz
		}
		p += 8 + sz + (sz & 1)
	}
	if rate == 0 || dataOff < 0 || channels == 0 {
		return nil
	}
	bytesPer := bits / 8
	frame := bytesPer * channels
	var out []float64
	for i := dataOff; i+frame <= dataOff+dataLen && i+frame <= len(buf); i += frame {
		acc := 0.0
		for c := 0; c < channels; c++ {
			o := i + c*bytesPer
			var v float64
			switch {
			case format == 3 && bits == 32:
				v = float64(math.Float32frombits(binary.LittleEndian.Uint32(buf[o : o+4])))
			case bits == 16:
				v = float64(int16(binary.LittleEndian.Uint16(buf[o:o+2]))) / 32768
			case bits == 8:
				v = (float64(buf[o]) - 128) / 128
			}
			acc += v
		}
		out = append(out, acc/float64(channels))
	}
	return &wav{rate: rate, data: out}
}

func writeWavStereo(file string, left, right []float64) {
	n := len(left)
	buf := make([]byte, 44+n*4)
	copy(buf[0:], "RIFF")
	binary.LittleEndian.PutUint32(buf[4:], uint32(36+n*4))
	copy(buf[8:], "WAVE")
	copy(buf[12:], "fmt ")
	binary.LittleEndian.PutUint32(buf[16:], 16)
	binary.LittleEndian.PutUint16(buf[20:], 1)
	binary.LittleEndian.PutUint16(buf[22:], 2)
	binary.LittleEndian.PutUint32(buf[24:], sr)
	binary.LittleEndian.PutUint32(buf[28:], sr*4)
	binary.LittleEndian.PutUint16(buf[32:], 4)
	binary.LittleEndian.PutUint16(buf[34:], 16)
	copy(buf[36:], "data")
	binary.LittleEndian.PutUint32(buf[40:], uint32(n*4))
	o := 44
	q := func(v float64) int16 {
		a := math.Abs(v)
		if a > 0.95 { // soft-knee limiter
			v = math.Copysign(0.95+0.05*math.Tanh((a-0.95)/0.05), v)
		}
		s := math.Round(v * 32767)
		if s > 32767 {
			s = 32767
		} else if s < -32768 {
			s = -32768
		}
		return int16(s)
	}
	for i := 0; i < n; i++ {
		binary.LittleEndian.PutUint16(buf[o:], uint16(q(left[i])))
		binary.LittleEndian.PutUint16(buf[o+2:], uint16(q(right[i])))
		o += 4
	}
	os.WriteFile(file, buf, 0644)
}
