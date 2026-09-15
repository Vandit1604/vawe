package render

import "testing"

// hasSugar decides whether a scene takes the pre-expand trip through core/engine/expand.js. Anything
// that ONLY that pass resolves has to be named here, or the feature is silently ignored at render time.
// `tempo` was: a catalog film asked for 0.6 and rendered at its authored speed, no warning anywhere.
func TestHasSugar(t *testing.T) {
	yes := map[string]string{
		"block":        `{"layers":[{"type":"block"}]}`,
		"beat":         `{"layers":[{"type":"beat"}]}`,
		"comp":         `{"layers":[{"type":"comp"}]}`,
		"recipes":      `{"recipes":[],"layers":[]}`,
		"voice":        `{"voice":"a line","layers":[]}`,
		"tempo":        `{"tempo":0.6,"layers":[]}`,
		"tempo spaced": `{"tempo" : 0.85,"layers":[]}`,
	}
	for name, raw := range yes {
		if !hasSugar([]byte(raw)) {
			t.Errorf("%s: hasSugar = false, want true (the feature would be silently ignored)", name)
		}
	}
	no := map[string]string{
		"plain":            `{"module":"scene","layers":[{"type":"text","text":"hi"}]}`,
		"the word in text": `{"layers":[{"type":"text","text":"tempo and recipes"}]}`,
	}
	for name, raw := range no {
		if hasSugar([]byte(raw)) {
			t.Errorf("%s: hasSugar = true, want false (an extra node round trip on every render)", name)
		}
	}
}
