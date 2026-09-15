---
when: publishing or changing the npm-installed `vawe` command
answers: "what cli/ is: the npx wrapper around the Go renderer, and the three CLI behaviours it adds"
group: engine
---

# cli/

One file, `vawe.mjs`, the npm entry point for `npx vawe my.json`. It wraps the already-relocatable Go
renderer with three CLI behaviours the binary alone lacks: staging a user's scene into the engine's
served paths, copying the rendered mp4 out of `$REPO/out/` into the working directory, and finding
ffmpeg/Chrome off PATH with a loud failure instead of a silent hang.

Read by: a human or script running `npx vawe`, not by the render pipeline itself.

The one doc: the header comment in `cli/vawe.mjs`, which states the three fixes and the known limit
(a scene referencing the user's own local images cannot resolve them). No dedicated gate; `make build`
compiles the binary this wraps.

Look first: `cli/vawe.mjs`, top comment.
