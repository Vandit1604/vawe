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

Read by: the renderer, at load, via a scene's `theme` field, and an author picking a look at stage 4.

The one doc: `engine-doctrine/CRAFT/THEME-LOOK.md`. No dedicated gate; a chosen theme still passes
`core/validate/validate.mjs` like any other scene input.

Look first: `themes/default.json` for the shape, `engine-doctrine/CRAFT/THEME-LOOK.md` for how to pick
or add one.
