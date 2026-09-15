---
when: composing a beat from pre-vetted structure instead of authoring layers from scratch
answers: "what blocks/ is: the taste library, pure prop-to-layers factories, assembled through index.mjs"
group: engine
---

# blocks/

The taste library. Each `blocks/*.mjs` file is a family of pure factories: props in, an array of
already-tasteful scene-layer JSON out. `blocks/index.mjs` holds no factories itself, it only discovers
and validates them. `blocks/catalog/` is the generated JSON catalog authors and agents search.

Read by: an authoring script that spreads factory output into `scene.layers`, and the MCP server's
`expand` step, which inlines a block before a caller ever sees it.

The one doc: the CONTRACT comment at the top of `blocks/index.mjs` (pure function, absolute
coordinates, deterministic timing). Checked by: `make arsenal Q="…"` to search it, `make expand` to
verify a block's declared props are actually read.

Look first: `blocks/index.mjs` for the contract, then `blocks/catalog/` for what already exists.
