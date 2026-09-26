// harness/lib/generated-owners.mjs: [label, argv, owned paths] for every generated tree in the repo.
// The one table quality/gates/generated-check.mjs runs to prove each is current, and
// harness/dev/clean-state.mjs reads (never runs) to say WHICH generator owns a path a run left dirty.
// A generator that writes outside its declared paths is a finding in itself: generated-check's diff
// would report it and name a path this table does not list.
export const GENERATORS = [
  ['effects catalogue', ['scripts/site/effects-catalog.mjs'],
    ['engine-doctrine/EFFECTS.md', 'site/lib/effects.json', 'site/lib/effects-counts.json', 'site/lib/effects-body.json']],
  ['vocabulary catalogue', ['scripts/site/vocab-catalog.mjs'],
    ['engine-doctrine/CRAFT/VOCABULARY.md', 'engine-doctrine/CRAFT/PRIMITIVES-VOCABULARY.md']],
  ['arsenal index', ['scripts/site/arsenal-json.mjs'],
    ['site/lib/arsenal.json', 'site/lib/blocks.json']],
  ['doc map', ['quality/gates/doc-map.mjs', '--write'],
    ['engine-doctrine/INDEX.md', 'engine-doctrine/CRAFT/README.md']],
  // blocks/catalog/ + registry/ is 216 generated files with its own `--check` mode that nothing ran.
  // It went stale the same way arsenal.json did: block blurbs changed, the tree carried the old
  // `description`, and only an agent regenerating it by hand noticed 110 files were behind. A
  // generated tree with a checker nobody calls is a generated tree with no checker.
  ['registry', ['scripts/site/registry.mjs'], ['blocks/catalog', 'registry']],
  // The sitemap needs the docs URLs, and the site builds BEFORE docs-site exists in the Docker image
  // (see scripts/site/site-pages.mjs). So the list is generated here and committed, and this gate is
  // what stops it drifting the day someone adds or renames a docs page.
  ['site pages', ['scripts/site/site-pages.mjs'], ['site/lib/site-pages.json']],
  // Three pages claimed three different MCP tool counts on the same day (six, ten, four) against a
  // server registering eleven. site/CLAUDE.md's law is that site numbers are never typed; this is how
  // that one stops being typed.
  ['mcp tools', ['scripts/site/mcp-tools.mjs'], ['site/lib/mcp-tools.json']],
  // The studio timeline's layer-type lanes, which the site's hero timeline must colour the same way.
  ['layer kinds', ['scripts/site/layer-kinds.mjs'], ['site/lib/layer-kinds.json']],
  // Reads site/lib/site-pages.json + site/lib/arsenal.json, so it must run after both are current.
  // Not a fix for AI-search visibility on its own (Google's guidance treats llms.txt as ineffective,
  // see scripts/site/llms-txt.mjs's header); registered here so it cannot go stale unnoticed either.
  ['llms.txt', ['scripts/site/llms-txt.mjs'], ['site/public/llms.txt']],
  // The vendored copy of blocks/ (+ core/themes/assets) the browser and the editor boot from. Its own
  // sweep keeps an orphan from lingering; `make regen` now calls it, so it is current by the time
  // anything else (the site's own predev, `make e2e`'s site-test) would otherwise re-run it.
  ['site engine (vendored blocklib)', ['scripts/site/site-engine.mjs'], ['site/public/blocklib']],
];
