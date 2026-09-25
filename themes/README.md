---
when: picking or writing a named colour/type theme for a scene's top-level `theme` field
answers: "what themes/ is: named theme JSON files (argus, brew, cadence, default, linear, mercury, and more), one per look"
group: look
---

# themes/

Named theme packs, one JSON per theme (`default.json`, `brew.json`/`brew-dark.json`, `linear.json`,
`mercury.json`, and others), each setting the colour and type tokens a scene's top-level `theme` field
selects. Distinct from `directions/`, which packs a fuller design direction (motion feel included, not
just colour/type).

**A theme file is a token store**, not a fixed palette object: free-shape `tokens` (any nested group,
each leaf `{ "$type", "$value" }`; an alias is `"{group.token}"`), plus a required `roles` map (`ground`,
`ink`, `accent`, `font.sans`, `font.mono`, the only mandatory keys). Every legacy palette/type key
(`bg2`, `surface`, `line`, `text2`, `dim`, ...) is an OPTIONAL role: set it to point at a token, or leave
it out and the engine derives it in OKLCH from `ground`/`ink`/`accent` (`core/theme/roles.js`). A scene
may also reference any token directly, anywhere in its JSON: a string written exactly `"{path.to.token}"`
resolves at load (`core/theme/refs.js`). Schema: `core/theme/theme.schema.json`. A theme still written in
the retired `palette`/`type`/`gradient` shape is refused at validate and at boot; convert it first with
`node harness/author/migrate-themes.mjs`.

Read by: the renderer, at load (`core/theme/tokens.js`/`core/theme/roles.js` expand a token file to the
`palette`/`type`/`gradient` shape every consumer already reads), via a scene's `theme` field, and an
author picking a look at stage 4.

The one doc: `engine-doctrine/CRAFT/THEME-LOOK.md`. No dedicated gate; a chosen theme still passes
`core/validate/validate.mjs` like any other scene input.

Look first: `themes/default.json` for the shape, `engine-doctrine/CRAFT/THEME-LOOK.md` for how to pick
or add one.
