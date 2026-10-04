---
when: fetching real footage, sound effects, or music for a film, or committing an asset to the repo
answers: "which sites are safe to fetch from, whether their files may be committed (SHIPPABLE) or must stay on disk only (LOCAL ONLY), and the licence clause each claim rests on"
group: reference
---

# Asset sources: footage, sound and music, with the licence read

Each row was checked against the site's own terms on 2026-09-18. A site can change its terms later.
Three questions decide the verdict: is commercial use allowed, is attribution required, and (the one
people get wrong) **may the source file itself be redistributed**. That third answer decides whether a
file may live in this public repository (**SHIPPABLE**) or only on your own disk (**LOCAL ONLY**).
A commercial-use, no-attribution deal almost always sits beside a redistribution ban.

Using a LOCAL ONLY asset in the film you are making now is fine. The distinction matters only for what
may be committed to git. Downloaded assets land in gitignored folders and are never committed.

## Sound effects

| Source | Commercial | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| Kenney (kenney.nl) | yes | not required | permitted (CC0) | SHIPPABLE |
| Freesound, CC0 filter only | yes | not required for CC0 | permitted | SHIPPABLE, CC0 only |
| soundeffect-lab.info | yes | not required | prohibited | LOCAL ONLY |
| Mixkit sound effects | yes | not required | prohibited unless "substantially altered" | LOCAL ONLY |
| ZapSplat (Standard License) | yes, with limits | required, or pay to waive | prohibited | LOCAL ONLY |
| Sonniss GDC bundle | yes | not required | prohibited as standalone files or a library | LOCAL ONLY |

- **Kenney:** every pack carries a `License.txt` in the zip: "Creative Commons Zero, CC0 ... free to use in personal, educational and commercial projects."
- **Freesound:** licences mix per file (CC0, CC-BY, CC-BY-NC). Filter to `license=Creative Commons 0` or the answer flips per file.
- **soundeffect-lab.info:** the agreement (soundeffect-lab.info/agreement/) prohibits redistribution.
- **Mixkit:** user terms forbid selling or making items available "without first altering them by applying human skill and effort."
- **ZapSplat:** "You must not redistribute our sound effects and music outside of your production."
- **Sonniss:** "Not as standalone files or in sound effect libraries. But you can absolutely sell them as part of your finished game, film, app, or creative project."

## Music

| Source | Commercial | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| Mixkit stock music | yes | not required | prohibited unless "substantially altered" | LOCAL ONLY |
| Pixabay music | yes, with limits | not required | prohibited as a standalone file | LOCAL ONLY |

Pixabay (pixabay.com/service/license-summary/): "You cannot sell or distribute Content ... on a
Standalone basis." Never commit a raw music file.

## Stock footage and photos

| Source | Commercial | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| Pexels | yes | not required | prohibited as standalone or on a competing stock site | LOCAL ONLY |
| Coverr | yes | not required | prohibited; bans bundling in tools and stock sites | LOCAL ONLY |
| NASA media | yes; do not imply endorsement | courtesy, not a condition | generally not copyrighted in the US | SHIPPABLE, exclude anything marked third-party copyright |
| archive.org / Prelinger | varies per item | varies | ambiguous, per item | check the item's rights field before any use |

- **Pexels** (pexels.com/license/): "Don't sell unaltered copies of a photo or video."
- **Coverr** (coverr.co/license): videos "can't be resold or offered as part of services," which includes bundled asset tools.
- **NASA:** content "generally are not subject to copyright in the United States." Acknowledge NASA as the source.
- **Prelinger:** the collection has no blanket licence. Do not assume its reputation covers every file.

See also `taste/craft/sound.md` (music licensing) and `taste/craft/imagery.md`
(the visual ladder and image licensing).
