# Third-party asset packs in this repo

## Sound

Two different things live under `assets/`, with two completely different licence stories. Do not
confuse them.

**`assets/sfx/*.wav`: SYNTHESIZED. No licence at all.** Every cue is baked from parameters by
`make audio` (`core/audio/kit.mjs`: noise, a biquad, an envelope, seeded). Same parameters always give
the same bytes. Nothing was downloaded, so nothing can be claimed. This is the safest audio in the
repo and it is safe by construction, not by permission.

**`assets/music/*.wav`: DOWNLOADED third-party tracks.** `make music` / `make music-pack`
(`harness/media/music.mjs`) fetch these from **Mixkit** and record provenance in
`assets/music/credits.json`.

Mixkit's own terms for the free tier: use in **commercial and personal projects, YouTube, social
media marketing, online ads, music videos, with no attribution required**
(<https://mixkit.co/llm-info/>, <https://mixkit.co/license/>). The licence page additionally excludes
CDs, DVDs, video games and TV or radio broadcast, and forbids remixing a track or registering it as
your own. The platform-wide terms also forbid selling or redistributing an item without substantially
altering it.

Read that last clause carefully, because it decides how these files may be stored:

> **Both `assets/music/` and `assets/sfx/*.wav` are GITIGNORED and untracked, and they must stay that
> way.** Committing the music would publish the tracks as standalone downloadable files, which is the
> one thing the licence forbids. A fresh clone has no beds; `make music-pack` refills them.

Consequences to know:

- **A fresh clone renders every film silent.** A scene naming `assets/music/lofi.wav` finds nothing,
  and the mixer falls back to silence with only a warning. `make audio-check D=<file>` reports it as
  `bed-missing`; run `make audio` and `make music-pack` before rendering anything with a bed.
- **`credits.json` is untracked too**, so provenance is per-machine. Every entry currently carries
  `licenceVerified: false`. The Mixkit terms above are now read and recorded here, which is the
  durable copy.
- **Beds with no credits entry exist** (`launch`, `tense`, `warm` on at least one machine). A track
  nobody recorded the source of cannot be defended if it is ever claimed. `make audio-check` warns
  `bed-provenance-unknown`.

Never put a track from anywhere else under a published film without recording its licence here first.
Paid stock, a commercial release, or anything that could trip Content ID is out, see `CLAUDE.md`.
Decision guidance for choosing a bed at all lives in [`engine-doctrine/CRAFT/SOUND.md`](../engine-doctrine/CRAFT/SOUND.md).

## Images

`assets/gradients/` and `assets/ransom/` are baked from Resource Boy packs.

**Royalty-free to USE** in personal and commercial work, no attribution required. But the licence
explicitly prohibits reselling, sublicensing, or redistributing the files *on their own*.

They are committed here because THIS REPO IS PRIVATE and they are used only inside our own renders.

**If this repo is ever made public, delete these directories first**, a public repo publishes them
as standalone downloadable files, which is the one thing the licence forbids. The bake recipes
(`make gradients`, `make ransom-sprites`) are the durable part; the images can always be re-baked.
