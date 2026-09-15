---
when: publishing or reading the installable-effects registry a caller (or the MCP server) browses
answers: "what registry/ is: registry.json, the generated catalog of every installable block/beat as a layer object, plus its generators/ source data"
group: engine
---

# registry/

`registry.json` is the generated, publishable catalog: every block and beat, each with an
`install.layer` an author appends straight into a scene's `layers` array. `generators/` holds the
per-effect source JSON (e.g. `bands.json`, `crt.json`, `spectrum.json`) that the catalog is built from.

Read by: `vawe_capabilities` (the MCP tool) and any author searching for what the engine can install
without hand-building it.

The one doc: the `usage` field at the top of `registry/registry.json` itself. Checked by:
`make discovery` (can an author still find what's registered here).

Look first: `registry/registry.json`'s `usage` field, then `registry/generators/` for a source entry.
