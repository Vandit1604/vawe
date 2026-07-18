// Package audio is a code PCM mixer (port of engine/audio.js): build the full
// audio bed in memory (music + named SFX at cue times + micro-silence + soft limiter),
// write a WAV; ffmpeg only muxes it.
package audio

import (
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
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
}

type wav struct {
	rate int
	data []float64
}

// Render writes the mixed stereo WAV to outWav. Returns false if there was nothing to mix.
func Render(cfg Config, duration float64, stings []float64, sfx []Cue, formatDir, assetsBase, outWav string) bool {
	if cfg.Silent {
		return false
	}
	bases := []string{}
	if formatDir != "" {
		bases = append(bases, formatDir)
	}
	if assetsBase != "" {
		bases = append(bases, assetsBase)
	}

	musicFile := resolve(bases, cfg.Music, "music.wav")
	voFile := resolve(bases, cfg.VO, "")
	// `Sting` was resolved here and then used ONLY in the emptiness guard below — its samples never
	// reached the mix, so the field did nothing except let an auto-discovered assets/sting.wav force a
	// silent audio track onto a scene that asked for none. No scene sets it, and what a "sting file"
	// should mean is ambiguous now that scene.html emits per-sting `reveal` cues into the sfx list.
	// Removed rather than left as config that reads as intent (docs/MISTAKES.md #70).
	if musicFile == "" && voFile == "" && len(sfx) == 0 {
		return false
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

	mg := musicGain
	if cfg.MusicGain != nil {
		mg = *cfg.MusicGain
	}
	for i := 0; i < total; i++ {
		ducked := mg
		if vo != nil {
			ducked = math.Max(duckGain, mg*(1-math.Min(1, voEnv[i]*4)))
		}
		s := 0.0
		if music != nil {
			s += music[i] * ducked
		}
		if vo != nil {
			s += vo[i]
		}
		left[i] += s * microGain[i]
		right[i] += s * microGain[i]
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

	writeWavStereo(outWav, left, right)
	return true
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
