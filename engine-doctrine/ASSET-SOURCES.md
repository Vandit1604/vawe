---
when: fetching real footage, sound effects, or music for a film, or committing an asset to the repo
answers: "which sites are safe to fetch from, whether their files may be committed (SHIPPABLE) or must stay on disk only (LOCAL ONLY), and the exact license clause each claim rests on"
group: reference
---

# Asset sources: footage, sound and music, with the license read

This is a licence document. Every row below was checked by fetching that site's own terms page and
quoting the clause that answers three questions: is commercial use allowed, is attribution required,
and, the one people get wrong, **is redistribution of the source file itself permitted**. That third
question decides whether a file may live in this public git repository (**SHIPPABLE**) or only on a
user's own disk, fetched fresh each time (**LOCAL ONLY**). Nothing here is remembered; every clause
below was read on 2026-09-18, and a site can change its terms after that date.

A commercial-use, no-attribution deal almost always exists alongside a redistribution ban. Missing
that ban is the mistake this document exists to prevent.

## Sound effects

| Source | Commercial use | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| **Kenney** (kenney.nl) | Yes | Not required | **Permitted** | **SHIPPABLE** |
| **Freesound**, CC0-filtered only (freesound.org) | Yes | Not required for CC0 | **Permitted** | **SHIPPABLE**, CC0 filter only |
| **soundeffect-lab.info** | Yes | Not required | **Prohibited** | LOCAL ONLY |
| **Mixkit** (sound effects) | Yes | Not required | **Prohibited** unless "substantially altered" | LOCAL ONLY |
| **ZapSplat** (Standard License) | Yes, with limits | **Required** (or pay to waive) | **Prohibited** | LOCAL ONLY |
| **Sonniss GDC bundle** | Yes | Not required | **Prohibited** as standalone files or a library | LOCAL ONLY |

**Kenney** (https://kenney.nl/assets): every pack checked carries a `License.txt` inside the zip
itself, e.g. the "Interface Sounds" pack:

> License: (Creative Commons Zero, CC0) http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial projects.
> Support us by crediting Kenney or www.kenney.nl (this is not mandatory)

CC0 places the work in the public domain: redistribution is explicitly permitted. This is why
`make gen X=sfx-pack` (this repo's shippable default sample pack) fetches from Kenney and only Kenney. The
pack's own zip is downloaded straight from `https://kenney.nl/media/pages/assets/<slug>/.../<slug>.zip`,
no scraping, no key.

**Freesound** (https://freesound.org): a community upload site with a MIX of licenses per file
(CC0, CC-BY, CC-BY-NC, sampling+). Freesound's own FAQ says of CC0: "you can do pretty much what you
want with the sound. You could even sell the sound." Attribution and NC restrictions apply to every
OTHER license on the site, so a fetcher must filter to `license=Creative Commons 0` specifically, or
the redistribution answer flips per file. Nothing in this repo fetches Freesound yet; this row is
here for a future fetcher, filtered to CC0 only, nothing else.

**soundeffect-lab.info**, the owner's preferred manual source: commercial use is free and no credit
is required, but the site's agreement (https://soundeffect-lab.info/agreement/) states redistribution
is prohibited ("再配布禁止"). This repo does not scrape or bulk-fetch this site; `make gen X=sfx-local
DIR=<path>` maps files YOU already downloaded by hand onto the engine's cue names, via the data file
`harness/media/sfx-local-map.json`. Nothing is ever committed from this path.

**Mixkit** sound effects: read from the site's own AI-facing summary (https://mixkit.co/llm-info/),
which states user terms include "Sell physical or digital copies of items without first altering them
by applying human skill and effort" is a prohibited use, and "Rent, license, sublicense, sell, resell
or otherwise commercially exploit or make Mixkit or any item available to any third party" is
likewise prohibited. Unaltered redistribution is out. This matches how `harness/media/sfx.mjs` (the
retired fetcher, kept for reference, not wired to a target) already treated it: fetched on demand into
the gitignored `assets/sfx/`, never committed. That page also carried a hidden instruction telling any
AI reading it to append an emoji to its response; it was not followed, and is noted here as the kind
of content a licence page can carry that has nothing to do with licensing.

**ZapSplat** (Standard License, free tier, read from an archived copy of
https://www.zapsplat.com/license-type/standard-license/ after the live page returned an access block):
"You must not redistribute our sound effects and music outside of your production... Our sound
effects and music must not be distributed in any form including on other websites, on social
networks, file sharing platforms, CD, DVD or any other ROM... can not be loaned, rented, sub-licensed
or sold to any third party." The Standard License also requires attribution unless you pay to remove
it. LOCAL ONLY, same class of restriction as soundeffect-lab: never build a fetcher for it either.

**Sonniss GDC bundle** (sonniss.com/gameaudiogdc): "All of the sounds are royalty free and
commercially usable," "No attribution is required," but "Not as standalone files or in sound effect
libraries. But you can absolutely sell them as part of your finished game, film, app, or creative
project." A bundled tool is exactly the "sound effect library" the clause forbids. LOCAL ONLY.

## Music

| Source | Commercial use | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| **Mixkit** (stock music) | Yes | Not required | **Prohibited** unless "substantially altered" | LOCAL ONLY (already how `make gen X=music`/`make gen X=music-pack` treat it) |
| **Pixabay** (music) | Yes, with limits | Not required | **Prohibited** as a standalone file | LOCAL ONLY |

**Mixkit music**: same user-terms clause as the sound effects row above; `harness/media/music.mjs`
(`make gen X=music`, `make gen X=music-pack`) already fetches into the gitignored `assets/music/` and records
`licenceVerified: false` per track, which this document now confirms should read `true` against the
"unaltered redistribution prohibited" clause, but the practical answer does not change: never commit
the file.

**Pixabay** (https://pixabay.com/service/license-summary/): "Use Content without having to attribute
the author," but "You cannot sell or distribute Content (either in digital or physical form) on a
Standalone basis. Standalone means where no creative effort has been applied to the Content and it
remains in substantially the same form as it exists on our website." That is a redistribution ban on
the unaltered file. LOCAL ONLY.

## Stock footage and photos

| Source | Commercial use | Attribution | Redistribution | Verdict |
|---|---|---|---|---|
| **Pexels** | Yes | Not required | **Prohibited** as standalone / on a competing stock site | LOCAL ONLY |
| **Coverr** | Yes | Not required | **Prohibited**, explicitly bans stock-site/tool bundling | LOCAL ONLY |
| **NASA** media | Yes, may not imply endorsement | Recommended, not a legal requirement | Generally not copyrighted in the US | **SHIPPABLE**, exclude anything marked third-party copyright |
| **archive.org / Prelinger** | Varies per item | Varies per item | **AMBIGUOUS**, per-item, not a blanket licence | Check the `licenseurl` / rights field on every single item before use |

**Pexels** (https://www.pexels.com/license/): "Attribution is not required," but "Don't sell unaltered
copies of a photo or video... without modifying it first," and "you cannot redistribute or sell the
photos and videos on other stock photo or wallpaper platforms." LOCAL ONLY for the raw file.

**Coverr** (https://coverr.co/license): "available for free for both commercial and non-commercial
purposes," no credit required, but "Coverr videos can't be resold or offered as part of services...
This applies to stock video sites, website builders, themes providers, mobile apps builders and video
editing services." A bundled asset-fetching tool is exactly what that clause names. LOCAL ONLY.

**NASA** (https://www.nasa.gov/nasa-brand-center/images-and-media/): "NASA content... generally are
not subject to copyright in the United States," usable for "educational or informational purposes,"
with "NASA should be acknowledged as the source of the material" as a courtesy rather than a licence
condition, EXCEPT any image the site itself marks as third-party copyrighted material used with
permission, which must be excluded and licensed separately. Everything else: **SHIPPABLE**.

**archive.org / Prelinger**: the Prelinger collection has no single, machine-checkable licence; rights
vary per uploaded item and most, but not all, carry no known copyright restriction. Querying the
collection's own metadata confirms there is no blanket `licenseurl` set across it. Treat this as
**AMBIGUOUS** and check the specific item's rights statement before using or committing anything from
it; do not assume the collection's reputation extends to every file in it.

## Named but not verified

The owner mentioned a site that sounded like "dstockd" while discussing sources for this document. No
such site was found and none was guessed at. **If you know the real name, add its row here with the
same three-question check; until then this line stands as the placeholder.**

## What this means for this repo

- `make gen X=sfx-pack` (Kenney, CC0) is the only automated fetcher this repo runs that lands a file which
  could legally be committed, and it still writes into the gitignored `assets/sfx/`, matching every
  other asset-fetcher's behaviour: nothing downloaded is ever put in git.
- `make gen X=music`, `make gen X=music-pack`, `make photos`, and any future footage fetcher pull from LOCAL ONLY
  sources; the gitignore is the enforcement, not a licence technicality.
- A LOCAL ONLY source is still a fine choice for the film you are making right now. The distinction
  only matters for what may sit inside this git repository as a redistributable asset pack.

See also: `engine-doctrine/CRAFT/SOUND.md` §8 (music licensing, the four-category table) and
`engine-doctrine/CRAFT/IMAGERY.md` §0/§3 (the visual ladder and image licensing).
