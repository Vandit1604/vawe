package scene

import "testing"

// The wall, asserted. If someone widens `served` or an allowed path stops resolving, this fails
// before a render leaks or breaks.
func TestAllowed(t *testing.T) {
	allow := []string{
		"core/boot.js", "core/layers/index.js", "themes/vawe.json",
		"formats/scene/scene.html", "formats/scene/schema.json",
		"assets/fonts/Anybody.woff2", "assets/brands/preface/agents/claude.svg",
		".vawe-data/scenes/vid_abc.json", ".vawe-data/uploads/anon/deadbeef.png",
	}
	deny := []string{
		"docs/MISTAKES.md", "blocks/index.mjs", "LICENSE", ".git/config",
		"quality/gates/ledger.mjs", "internal/scene/scene.go", "package.json",
		".vawe-data/records/vid_abc.json", // records hold owner data; never served
		"../../etc/passwd", "core/../docs/MISTAKES.md", "core/../../etc/passwd",
		"", "/", "\x00core/boot.js",
	}
	for _, p := range allow {
		if !allowed(p) {
			t.Errorf("should ALLOW but denied: %q", p)
		}
	}
	for _, p := range deny {
		if allowed(p) {
			t.Errorf("should DENY but allowed: %q", p)
		}
	}
}
