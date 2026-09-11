package scene

import "testing"

// TestFrameRangeNoRange asserts the sentinel path (fromSec < 0) is untouched: a full-film capture must
// still shoot every frame, exactly as it did before --from/--to existed.
func TestFrameRangeNoRange(t *testing.T) {
	start, end, err := frameRange(-1, -1, 10, 30, 300)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if start != 0 || end != 300 {
		t.Errorf("no-range window: got [%d,%d), want [0,300)", start, end)
	}
}

func TestFrameRangeMapping(t *testing.T) {
	cases := []struct {
		name               string
		from, to           float64
		duration, fps      float64
		total              int
		wantStart, wantEnd int
	}{
		{"30fps mid-film", 1, 2, 10, 30, 300, 30, 60},
		{"60fps mid-film", 1, 2, 10, 60, 600, 60, 120},
		{"fractional seconds round outward", 0.4, 0.6, 10, 30, 300, 12, 18},
		{"from 0", 0, 1, 10, 30, 300, 0, 30},
		{"to end of film clamps to total", 9, 10, 10, 30, 300, 270, 300},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			start, end, err := frameRange(c.from, c.to, c.duration, c.fps, c.total)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if start != c.wantStart || end != c.wantEnd {
				t.Errorf("frameRange(%.2f,%.2f, dur=%.1f, fps=%.0f, total=%d) = [%d,%d), want [%d,%d)",
					c.from, c.to, c.duration, c.fps, c.total, start, end, c.wantStart, c.wantEnd)
			}
		})
	}
}

// TestFrameRangeRefusals covers the two ways an author can hand this a window that makes no sense:
// past the film's own duration, or empty/inverted after rounding to frames.
func TestFrameRangeRefusals(t *testing.T) {
	if _, _, err := frameRange(1, 20, 10, 30, 300); err == nil {
		t.Error("--to past duration should be refused")
	}
	if _, _, err := frameRange(2, 2, 10, 30, 300); err == nil {
		t.Error("--from == --to should be refused")
	}
	if _, _, err := frameRange(5, 4, 10, 30, 300); err == nil {
		t.Error("--from > --to should be refused")
	}
}
