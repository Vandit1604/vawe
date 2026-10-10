# assets/

What stays in git: fonts' 3D outlines (`fonts/3d`), open-licence icons (`icons/ui`, a few own marks), flags,
geo and globe data, two hand-made Lottie files, and `vendor/`. Everything else here is local to each
machine and gitignored: downloaded fonts and music, generated sound files (`sfx/`), one film's captures
(`vawe-flow-2/`), and third-party logos.

Logos: put a brand's marks in `assets/brands/<name>/` (or `assets/icons/`); a page loads them by path. Only
`brands/*/house-style.md` is tracked.

Read by: the renderer, and the generators under `generators/` that write files here. Regenerate a baked
asset by re-running its generator; do not hand-edit it. The mixer builds sound cues from code, not from `sfx/`.

Licences: `assets/README-LICENCE.md`.
