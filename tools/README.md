# tools/

Repo maintenance and research that is not part of making a film. `scripts/` writes, checks, or ships a
film; nothing here does. A file lands here when it fits, ranks, or studies something the engine already
uses, not when it produces or edits scene JSON.

`tools/lightfield/` is the first tenant: the fitting and research rig that tuned `core/lightfield/`'s
presets against a reference image. `core/lightfield/` stays where it is, a registered generator; this
is the harness that fitted it once and can re-check or re-fit it later.
