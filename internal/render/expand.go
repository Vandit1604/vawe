package render

// expandSugar: `{"type":"block"}`, `{"type":"beat"}` and `{"type":"comp"}` are build-time sugar,
// resolved by core/engine/expand.js `expandScene`. That function runs fine in a browser (it is pure ESM, no
// `fs`), but THIS browser cannot reach it: internal/scene's file server default-denies everything
// outside core/themes/formats/assets/.vawe-data (scene.go `served`), by design, because this process
// renders scenes from strangers over MCP, and `blocks/`/`blueprints/` (156+30 factories, one of which
// imports `d3-geo` by bare specifier, resolvable only through an import map neither this page nor this
// server carries) sit outside that allowlist on purpose. So a scene using this vocabulary is expanded
// HERE, server-side, in Node (which resolves `d3-geo` through the ordinary directory walk-up), before
// the browser ever sees the JSON: the other of the two options AGENTS.md's engine-changes doctrine
// names for sugar that cannot run in the render page.
//
// Gated on an actual sugar hit (`hasSugar`), not run unconditionally: a Node subprocess importing the
// whole block/beat catalog has a real, measured cost (docs/CRAFT/ENGINE-CHANGES.md "SUGAR MUST NEVER
// SILENTLY NO-OP"), and it has no business paying itself on every render when the vast majority carry
// no sugar at all.
import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
)

var sugarType = regexp.MustCompile(`"type"\s*:\s*"(block|beat|comp)"`)

func hasSugar(raw []byte) bool { return sugarType.Match(raw) }

// expandSugar reads dataAbs, and if it carries block/beat/comp sugar, runs
// `node harness/author/expand-blocks.mjs` over it and writes the result to a temp file under the one
// served prefix meant for exactly this (`.vawe-data/scenes/`, scene.go `served`), returning that path.
// A scene with no sugar is returned unchanged, and the empty cleanup string means "nothing to remove".
func expandSugar(repoRoot, dataAbs string) (path string, cleanup string, err error) {
	raw, err := os.ReadFile(dataAbs)
	if err != nil {
		return "", "", fmt.Errorf("read data: %w", err)
	}
	if !hasSugar(raw) {
		return dataAbs, "", nil
	}
	cmd := exec.Command("node", filepath.Join(repoRoot, "harness/author/expand-blocks.mjs"), dataAbs)
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err != nil {
		msg := ""
		if ee, ok := err.(*exec.ExitError); ok {
			msg = string(ee.Stderr)
		}
		return "", "", fmt.Errorf("expanding block/beat/comp sugar in %s: %w\n%s", dataAbs, err, msg)
	}
	dir := filepath.Join(repoRoot, ".vawe-data", "scenes")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", "", fmt.Errorf("expand scratch dir: %w", err)
	}
	name := fmt.Sprintf("_expand.%d.%s", os.Getpid(), filepath.Base(dataAbs))
	dest := filepath.Join(dir, name)
	if err := os.WriteFile(dest, out, 0644); err != nil {
		return "", "", fmt.Errorf("writing expanded scene: %w", err)
	}
	return dest, dest, nil
}
