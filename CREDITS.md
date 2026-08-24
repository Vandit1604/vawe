---
when: shipping a video that uses bundled assets
answers: the attribution the fonts, icons and photo sources require
group: project
---

# Credits & third-party attribution

Vawe itself is licensed under the [Vawe Company License 1.0](LICENSE). It builds on the
following third-party work, each under its own license. Nothing here is claimed as
Vawe's own.

## Vendored code & skills

| What | Where | License | Notes |
|---|---|---|---|
| **impeccable** (design skill) | `.claude/skills/impeccable/` | Apache 2.0 | License text vendored alongside it (`.claude/skills/impeccable/LICENSE`). |
| **lottie-web** (runtime) | `assets/vendor/` | MIT | Airbnb / lottie-web; see the vendor README. |
| **taste-skill** (design skill) | `.claude/skills/taste-skill/` | *no declared license* | **Not redistributed.** Kept local-only and gitignored until its license is clarified. |

## First-party skills (Vawe)

`.claude/skills/shortwave-scene-authoring/` and `.claude/skills/shortwave-video-planning/`
are authored for this project and covered by the Vawe Company License.

## Fonts

No font binary is committed to this repository. `make fonts` downloads the free, openly-licensed
faces (OFL 1.1 / Apache) from [Fontsource](https://fontsource.org/) at build time, into the
gitignored `assets/fonts/`:

Inter, Geist, Geist Mono, JetBrains Mono, Plus Jakarta Sans, Hanken Grotesk, Archivo, Caveat,
Space Grotesk, Instrument Serif — all OFL 1.1.

**Söhne** (Klim Type Foundry) is a paid face and is **never** distributed. It is used locally only
for brand-fidelity captures; supply your own copy at `assets/fonts/local/Sohne.woff2`.

## Asset sources

- **Brand logos** — [Simple Icons](https://simpleicons.org/) (CC0). A handful of these SVGs are
  committed under `assets/icons/` because local demos load them. **CC0 covers the icon file, not the
  trademark.** A company mark stays that company's mark: use one to refer to that company, never as
  decoration in a film about something else, and never in a way that suggests they endorse anything.
- **Flags** — [flagcdn.com](https://flagcdn.com/) (public domain). Fetched on demand.
- **Photos** — CC0 / CC-BY via the photo fetcher; CC-BY credits are recorded per video. Fetched on
  demand, not committed.

## Third-party brands: what this repo does NOT publish

Authoring here often starts by reflecting a real website, and the working files that come out of it
stay local. **No recreation of another company's marketing page ships from this repository** — not
the scene JSON, not the rendered mp4, not the poster frame, not the palette file named after them.
`.gitignore` enforces it by allowlist rather than by blocklist (`formats/scene/*.json`, plus the
`site/public/scenes/`, `site/public/assets/films/` and `themes/` blocks near the end of the file), so
a new brand study cannot ship by being named something nobody thought to exclude.

Two such recreations were published for a while, and were **converted rather than deleted**. What was
worth keeping in them was never the brand: it was the composition, the timing, the camera and the
beat structure. Those are now
`formats/scene/saas-hero-launch.json` and `formats/scene/product-feature-tour.json` — fillable
templates for a fictional product, drawing every colour from a theme token and every mark from an
inline SVG. Nothing in either file traces to a real company.

If you believe something here is misattributed, please open an issue.
