# Credits & third-party attribution

Vawe itself is licensed under the [Vawe Company License 1.0](LICENSE). It builds on the
following third-party work, each under its own license. Nothing here is claimed as
Vawe's own.

## Vendored code & skills

| What | Where | License | Notes |
|---|---|---|---|
| **impeccable** (design skill) | `.claude/skills/impeccable/` | Apache 2.0 | License text vendored alongside it (`.claude/skills/impeccable/LICENSE`). |
| **lottie-web** (runtime) | `engine/assets/vendor/` | MIT | Airbnb / lottie-web; see the vendor README. |
| **taste-skill** (design skill) | `.claude/skills/taste-skill/` | *no declared license* | **Not redistributed.** Kept local-only and gitignored until its license is clarified. |

## First-party skills (Vawe)

`.claude/skills/shortwave-scene-authoring/` and `.claude/skills/shortwave-video-planning/`
are authored for this project and covered by the Vawe Company License.

## Fonts

No font binary is committed to this repository. `make fonts` downloads the free, openly-licensed
faces (OFL 1.1 / Apache) from [Fontsource](https://fontsource.org/) at build time, into the
gitignored `engine/assets/fonts/`:

Inter, Geist, Geist Mono, JetBrains Mono, Plus Jakarta Sans, Hanken Grotesk, Archivo, Caveat,
Space Grotesk, Instrument Serif — all OFL 1.1.

**Söhne** (Klim Type Foundry) is a paid face and is **never** distributed. It is used locally only
for brand-fidelity captures; supply your own copy at `engine/assets/fonts/local/Sohne.woff2`.

## Asset sources (fetched on demand, not committed)

- **Brand logos** — [Simple Icons](https://simpleicons.org/) (CC0).
- **Flags** — [flagcdn.com](https://flagcdn.com/) (public domain).
- **Photos** — CC0 / CC-BY via the photo fetcher; CC-BY credits are recorded per video.

If you believe something here is misattributed, please open an issue.
