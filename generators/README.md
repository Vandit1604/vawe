---
when: deciding whether a script belongs in generators/ or somewhere else
answers: "what generators/ is: it bakes an asset a film later loads, as opposed to core/ which assembles a frame"
group: engine
---

# generators/

Everything here bakes an asset a film later loads: fonts (`fonts/glyphs.mjs`, `media/fonts.mjs`) and
the audio bake (`media/audio-bake.mjs`). Run one, get a file in `assets/`, and no render touches the
generator again until the source changes.

This differs from `scripts/` (repo maintenance and site capture) and from `harness/media/` (voice,
music, captions and other tools that shape one film's data).
