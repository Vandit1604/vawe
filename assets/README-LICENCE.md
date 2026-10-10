# Third-party asset packs in this repo

## Sound

Two different things live under `assets/`, with two completely different licence stories. Do not
confuse them.

**`assets/sfx/*.wav`: SYNTHESIZED. No licence at all.** Every cue is baked from parameters by
`node generators/media/audio-bake.mjs` (`core/audio/kit.mjs`: noise, a biquad, an envelope, seeded). Same
parameters always give the same bytes. Nothing was downloaded, so nothing can be claimed. All 28 wav files
are tracked in git (3.5 MB). They are our own output, so they carry no third-party licence. They ship under
the repo licence (see `LICENSE`), and `audio-bake.mjs --force` rebuilds them.

**`assets/music/*.wav`: DOWNLOADED third-party tracks.** `node harness/media/music.mjs <genre> <rank> <name>` and
`node harness/media/music.mjs --pack` fetch these from **Mixkit** and record provenance in
`assets/music/credits.json`.

Mixkit's own terms for the free tier: use in **commercial and personal projects, YouTube, social
media marketing, online ads, music videos, with no attribution required**
(<https://mixkit.co/llm-info/>, <https://mixkit.co/license/>). The licence page additionally excludes
CDs, DVDs, video games and TV or radio broadcast, and forbids remixing a track or registering it as
your own. The platform-wide terms also forbid selling or redistributing an item without substantially
altering it.

Read that last clause carefully, because it decides how these files may be stored:

> **The downloaded music, `assets/music/*.wav`, is GITIGNORED and untracked, and must stay that way.**
> Committing it would publish the tracks as standalone downloadable files, which is the one thing the
> licence forbids. A fresh clone has no downloaded beds; `node harness/media/music.mjs --pack` refills them.
> The synthesized sfx wavs are not covered by this rule: they are ours and they are tracked.

Consequences to know:

- **A fresh clone renders every film silent.** A scene naming `assets/music/lofi.wav` finds nothing,
  and the mixer falls back to silence with only a warning. Run `node generators/media/audio-bake.mjs` and
  `node harness/media/music.mjs --pack` before rendering anything with a bed.
- **`assets/music/credits.json` is tracked** (it is provenance, not audio). Every downloaded entry carries
  `licenceVerified: false`; the synthesized beds carry `true`. The Mixkit terms above are recorded here.
- **Beds with no credits entry exist** (`launch`, `tense`, `warm` on at least one machine). A track
  nobody recorded the source of cannot be defended if it is ever claimed. No gate checks this yet.

Never put a track from anywhere else under a published film without recording its licence here first.
Paid stock, a commercial release, or anything that could trip Content ID is out, see `CLAUDE.md`.
Decision guidance for choosing a bed at all lives in [`taste/craft/sound.md`](../taste/craft/sound.md).

## Images

`assets/gradients/` and `assets/ransom/` are baked from Resource Boy packs.

**Royalty-free to USE** in personal and commercial work, no attribution required. But the licence
explicitly prohibits reselling, sublicensing, or redistributing the files *on their own*.

They are NOT committed: `.gitignore` lists `assets/gradients/` and `assets/ransom/`, because this repo is public and
a public repo would publish them as standalone downloadable files, which the licence forbids. They stay on the
owner's machine only. The bake recipes are not in this repo.
