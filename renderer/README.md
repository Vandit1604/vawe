---
when: changing the Go render pipeline: frame capture, encode, audio mux, the scene file server, the queue
answers: "what renderer/ is: the Go binary (renderer/cmd/render) that drives Chrome headless per frame and muxes the output, split into cmd/, internal/, harness/"
group: engine
---

# renderer/

The Go side of the engine. `cmd/render/main.go` is the entry point `make build` compiles to `bin/vawe`.
`internal/` holds the pipeline: `scene/` (the file server core/JS reads through, default-deny outside
`core`, `themes`, `films`, `assets`), `render/` (per-frame Chrome capture), `encode/` (ffmpeg mux),
`audio/`, `queue/` (built, not yet wired in). `renderer/harness/` is Go-side dev tooling, distinct from
the JS `harness/` at repo root.

Read by: `make build`/`make ship`, and anyone changing frame capture, encode settings, or the file
server's allowlist.

The one doc: `AGENTS.md`'s "Changing the ENGINE, not a film?" section and
`engine-doctrine/CRAFT/ENGINE-CHANGES.md`. Checked by: `go build -C renderer`, then `make check GATE=probe` after
any change touching what a frame renders.

Look first: `renderer/cmd/render/main.go` for the entry point, `renderer/internal/scene/scene.go` for
the file server allowlist.
