package audio

import (
	"fmt"
	"math"
	"sort"
)

// Synthesis, so a film's sound design is code rather than 19 unlicensed WAVs a fresh clone does not
// have. The model is sfxr's: one oscillator that blends tone with seeded noise, one frequency sweep,
// one resonance-free lowpass that rides the same sweep, an attack/decay envelope and a punch spike.
// Six named VOICES are presets over that one generator; a cue may override any parameter.
//
// Everything here is a pure function of the parameters. No wall clock, no global RNG, no file.

// voiceDefaults is the vocabulary a motion engine needs. Names are the registry: a cue naming
// anything else fails the render rather than mixing silence.
var voiceDefaults = map[string]map[string]float64{
	// a cut, a step, a beat: a click with almost no tail
	"tick": {"freq": 2600, "freqSweep": -6, "attack": 0.0005, "decay": 0.03, "noise": 0.35, "punch": 0.5, "lowpass": 9000, "gain": 0.55},
	// a card landing: low sine falling fast
	"thud": {"freq": 110, "freqSweep": -4.5, "attack": 0.002, "decay": 0.28, "noise": 0.05, "punch": 0.7, "lowpass": 1200, "gain": 0.8},
	// a camera move or a slide: filtered noise opening upward
	"whoosh": {"freq": 400, "freqSweep": 1.2, "attack": 0.08, "decay": 0.45, "noise": 1, "punch": 0, "lowpass": 1400, "gain": 0.5},
	// building to a spectacle
	"riser": {"freq": 180, "freqSweep": 2.2, "attack": 0.25, "decay": 0.55, "noise": 0.25, "punch": 0, "lowpass": 5000, "gain": 0.55},
	// a counter digit, a small element
	"pluck": {"freq": 880, "freqSweep": -0.6, "attack": 0.001, "decay": 0.14, "noise": 0.05, "punch": 0.4, "lowpass": 6000, "gain": 0.6},
	// a wipe: a noise band travelling up through the spectrum
	"sweep": {"freq": 300, "freqSweep": 3.5, "attack": 0.03, "decay": 0.35, "noise": 1, "punch": 0, "lowpass": 800, "gain": 0.5},
}

// VoiceNames lists the registry, sorted, for error messages and tools.
func VoiceNames() []string {
	names := make([]string, 0, len(voiceDefaults))
	for n := range voiceDefaults {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}

const (
	synthMinAttack  = 0.0005 // 22 samples: the shortest ramp-in that does not pop
	synthTailFade   = 0.003  // forced ramp to exactly zero at the end, same reason
	synthPunchTime  = 0.02   // how long the initial amplitude spike lasts
	synthDecayCurve = 4.5    // e-folds across `decay`; the envelope is then flattened to zero
)

// Synth renders one voice to mono PCM at sr. Params override the voice's defaults key by key;
// unknown keys are ignored so the JS side can carry a parameter this build has not learned yet.
func Synth(voice string, params map[string]float64) ([]float64, error) {
	def, ok := voiceDefaults[voice]
	if !ok {
		return nil, fmt.Errorf("audio: unknown voice %q, the synth knows %v", voice, VoiceNames())
	}
	p := func(k string) float64 {
		if v, ok := params[k]; ok {
			return v
		}
		return def[k]
	}
	attack := math.Max(synthMinAttack, p("attack"))
	decay := math.Max(0.005, p("decay"))
	freq := math.Max(1, p("freq"))
	sweep := p("freqSweep")
	noise := math.Min(1, math.Max(0, p("noise")))
	punch := math.Max(0, p("punch"))
	cutoff := p("lowpass")
	gain := math.Min(1, math.Max(0, p("gain")))

	n := int(math.Round((attack + decay) * sr))
	if n < 8 {
		n = 8
	}
	out := make([]float64, n)
	rng := newNoise(uint64(p("seed")))
	attackN := int(math.Round(attack * sr))
	tailN := int(math.Round(synthTailFade * sr))
	if tailN > n/4 {
		tailN = n / 4
	}
	phase, lp := 0.0, 0.0
	for i := 0; i < n; i++ {
		t := float64(i) / sr
		// One sweep drives both the pitch and the filter, in octaves per second. That is what makes a
		// thud's tone fall with its own brightness, and what turns filtered noise into a whoosh.
		ratio := math.Exp2(sweep * t)
		f := math.Min(sr/2.2, freq*ratio)
		phase += f / sr
		s := math.Sin(2*math.Pi*phase)*(1-noise) + rng.next()*noise

		if cutoff > 0 {
			fc := math.Min(sr/2.2, math.Max(20, cutoff*ratio))
			a := 1 - math.Exp(-2*math.Pi*fc/sr)
			lp += a * (s - lp)
			s = lp
		}

		env := 1.0
		if i < attackN {
			env = float64(i) / float64(attackN) // starts at exactly 0: no opening click
		} else {
			u := (t - attack) / decay
			env = math.Exp(-synthDecayCurve * u)
		}
		if punch > 0 && t < synthPunchTime {
			env *= 1 + punch*(1-t/synthPunchTime)
		}
		// The tail is forced to zero at the last sample; an exponential never gets there on its own,
		// and a waveform that stops on a non-zero sample pops.
		if fade := n - 1 - i; fade < tailN {
			env *= float64(fade) / float64(tailN)
		}
		out[i] = s * env
	}
	// Peak-normalise to `gain`, so the parameter set can never clip and the level of a voice is a
	// number an author chose rather than whatever the envelope happened to sum to.
	if pk := peakOf(out); pk > 0 {
		k := gain / pk
		for i := range out {
			out[i] *= k
		}
	}
	return out, nil
}

// noiseSrc is a seeded xorshift64*. It is here, and not math/rand, because the global source is
// shared state and a render must be reproducible on any machine and in any order.
type noiseSrc struct{ s uint64 }

func newNoise(seed uint64) *noiseSrc {
	if seed == 0 {
		seed = 0x9E3779B97F4A7C15
	}
	return &noiseSrc{s: seed}
}

// next returns the next sample in [-1, 1).
func (n *noiseSrc) next() float64 {
	n.s ^= n.s >> 12
	n.s ^= n.s << 25
	n.s ^= n.s >> 27
	v := n.s * 2685821657736338717
	return float64(v>>11)/float64(uint64(1)<<52) - 1
}
