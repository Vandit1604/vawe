# assets/

Standing assets a film loads at render time: fonts, icons, flags, cutouts, geo/globe data, licensed
gradient and ransom-note packs (`gen/`), music, and vendored third-party files (`vendor/`).

Read by: the renderer (`renderer/`, at render time) and the bakers under `generators/` that write files
here. Not meant for hand editing; regenerate a baked asset by re-running its generator.

The one doc: `assets/README-LICENCE.md`, which sources are redistributable and which are not (the
Resource Boy gradient and ransom packs must never leave this machine). No gate checks this folder
directly; `make check GATE=asset-check D=<file>` checks that a film's asset references resolve.

Look first: `assets/README-LICENCE.md`, then the subfolder matching what you need.
