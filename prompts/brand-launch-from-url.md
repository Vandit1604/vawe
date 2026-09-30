---
when: "a real product or site from a URL is the subject and only its own kit and real captures may appear"
answers: "the six-section launch brief (inputs, direction, structure, build, gotchas, start) targeting one page.html with kit assets"
group: reference
---

# Brand or product launch from a URL, with real assets

**Use when** a real product, company or site is the subject and the film must show it as it is:
its own colours, its own type, its own screens. Never invented UI.

**Length:** 15 to 40 seconds. Under 15 seconds, use one continuous action.

## The template

```
<inputs>
Ask me for: the site URL, the one-line promise, 3 to 5 moments in the product worth showing, the
platform (16:9 or 9:16) and length, and a song or "no music". If I skip one, take the default from
the Questions section and go on. Then run `node scripts/brand/kit.mjs <url> <name> --init`: it writes
assets/brands/<brand>/kit.json with the site's own palette, fonts and favicon. Use nothing else.
</inputs>

<direction>
One idea per shot. Empty space. The brand's own accent, once per frame. The brand's own sans, tight
tracking, no full stops in on-screen text. Real captures only: every screen in the film is a capture
of the real site or app, cropped, never a placeholder card. One camera language for the whole film.
Banned: shockwave rings, particle bursts, RGB split, camera shake, lens flares, neon glows, grid
floors, flashing backgrounds, bouncy easing, a feature the product does not have.
</direction>

<structure>
Write the beat list first, with a timestamp per beat, one message per beat, and the real capture that
proves it. Hook: the promise, word by word, first frame under 12 words. Then one move per beat: the
hook word becomes the product; a cursor does one real thing; the key output, big; the second
surface; a stat you can source; the wordmark. End on the wordmark, still, for 1.5 seconds.
</structure>

<build>
1. One page: films/<name>/page.html, <meta name="duration" content="<s>">. Relative asset paths.
2. Time is the seek. Either CSS @keyframes and element.animate() (the renderer seeks them), or
   window.seek(t) with every style computed from t. No timers, no state carried between frames.
3. Captures live in films/<name>/assets/. Each capture is a real screenshot with its source URL in a
   comment next to the <img>.
4. Audio is <audio data-at="…"> elements, never played live. Soft ticks on a few key moments:
   <audio data-synth="pluck" data-at="1.85" data-gain="-8"> (the same number the CSS --beat-2
   holds; every delay in that beat reads it), and one swell (-6 dB) into the big cut. Music: <audio src="music.mp3" data-at="0"
   data-gain="-3" data-fade-out="0.4">. Sound is felt, not noticed.
5. Draft before polish: bin/vawe dev films/<name>/page.html. Read the sheet. Fix what is
   cramped, overlapping or unreadable before any motion work.
</build>

<gotchas>
The brand's accent on its dark surface may fail contrast (vawe's cobalt on charcoal is about 2.5:1;
the kit says which pair to use). A capture scaled below 0.6 loses its type; crop instead. Never set
opacity or filter on a preserve-3d element; fade its wrapper. A feature you did not see on the site is
a feature you must not show.
</gotchas>

<start>
Ask me for the inputs, run the kit, then show me the beat list with a capture named per beat before
you write any code.
</start>
```

## Questions

Ask in this order; the first changes the film most. A skipped question takes its default; never wait.

1. **URL**: which site or product is the subject? Default: `site/app/` (vawe's own site, served locally). Why: the kit, every capture and every colour come from it; nothing invented may appear.
2. **Promise**: the one line the film proves, under 12 words? Default: the site's own hero headline, verbatim. Why: it is the first frame and the hook, and every beat has to prove it.
3. **Moments**: which 3 to 5 things does the film show the product doing? Default: the first three surfaces the hero links to. Why: density is information per frame; each moment is one beat with one real capture.
4. **Platform**: 16:9 or 9:16, and how long? Default: 16:9, 24 s. Why: the canvas decides the layout and the pace; a reel is one column, a launch is a stage.
5. **Music**: a licensed song file, or synth cues only? Default: synth cues, no music. Why: a song sets the beat grid; without one the cuts follow the picture.

A claim that needs a source (a number, a customer name) gets its source before the beat list.

## Gotchas

- `scripts/brand/kit.mjs` builds the kit from the site's own colours only. Do not "improve" the palette.
- Density is information per frame: show the product working, not slogans on black.
- A launch film's logo is prominent early and late, not only at the end.
- Adjacent transitions change axis or direction (house rule). Three slide-lefts in a row read as a
  template.

## Worked example (vawe)

URL `site/app/` (local), promise "Write a scene. Get a film.", moments: the editor diff, the same
scene on five canvases, frame 412 rendered twice, `bin/vawe ship`. Kit: `themes/vawe.css` (white first,
cobalt `#2563eb`, Anybody + JetBrains Mono).

source: pattern from twoclipping's "Beat-Synced Product Motion Ad" brief,
https://x.com/twoclipping/status/2102554209166000267 (via
https://github.com/guanmo-ai/awesome-ai-motion, case 2102554209166000267), third-party text, not
redistributable, so this is our own template in the same six-section shape; the "real assets only,
list what was reused" rule is adapted from the CC BY 4.0 playbook at
https://github.com/athemeroy/awesome-opus-5-5-videos/blob/main/docs/prompt-playbook.zh-CN.md
(section 3) by athemeroy; and from the Movez course's brand prompt (owner-shared article, not
redistributable, pattern only).
