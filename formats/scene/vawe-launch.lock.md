# LOCK SHEET: vawe launch film

Frozen spec. Authoring is transcription of this, not exploration. If a decision is needed while
authoring, this sheet had a gap: surface it, do not improvise.

## Brief

    SUBJECT   vawe, a deterministic motion-graphics engine
    DATA      the real site (studied, assets/brands/vawe-site/sections/) and the real editor
    PAYOFF    one JSON, one video                                        (lands LAST)
    AUDIENCE  developers and design engineers, X and LinkedIn, SOUND OFF, 16:9
    FEELING   the site itself: cobalt-drenched, huge tight type, the editor as the hero object
    SPECTACLE beat 4 at 11.5s, the arsenal wall arrives all at once, 25 real rendered frames
              staggered in over 0.6s. Every other beat holds one idea at one volume.
    NOT       no narration, no stock, no third-party logos, no dark mode, no invented UI,
              no claim the film has not already shown, no shot over five seconds.

## Look, locked

    theme        themes/vawe.json          the shipped brand, unmodified
    ground       #ffffff white  /  #2563eb cobalt        alternating, one flip per cut
    ink          #0f1620 on white   ·   #ffffff on cobalt
    sans         Anybody, wdth 105 for display          (DESIGN.md's static width role)
    mono         JetBrains Mono, for anything literal: JSON, file names, counts
    grain        on, 0.02, every window

**The alternation is the device.** The site is a cobalt hero that cuts to white. The film does that
four times, so the world turns on every junction and the picture is never still between beats.

## Beats

| # | t | ground | what is ON SCREEN | copy (exact) |
|---|---|---|---|---|
| 1 | 0.0-2.5 | **cobalt** | the wordmark, an eyebrow pill above it | wordmark `vawe` · eyebrow `deterministic motion-graphics engine` |
| 2 | 2.5-7.5 | white | the EDITOR: JSON left, rendered frame right, one value changing | `Write the scene as data.` |
| 3 | 7.5-11.5 | **cobalt** | the same scene rendering, frame counter running | `Frame by frame.` |
| 4 | 11.5-16.0 | white | the ARSENAL wall, 25 real rendered frames, mono captions | `566 effects. No templates.` |
| 5 | 16.0-20.0 | **cobalt** | end card | `One JSON, one video.` · `vawe.dev` |

## Layout, per beat

    1  centred, wordmark at 220px on the optical centre, eyebrow 26px above it
    2  split on the frame's own third: pane x=110 w=780, output x=960 w=850, both y=250 h=580
    3  full frame, the output alone, counter bottom-left in mono
    4  a 5x5 grid inset to the safe area, x=110 w=1700, y=210 h=660
    5  left aligned low, headline x=140 y=380, domain x=140 y=700

    coordinate band   x 110-1810, y 210-870          nothing outside it
    safe              destination "web", 16:9 1920x1080

## Motion personality

    entrances     rise and riseClip only. No fade as a primary entrance.
    anticipate    0.12 on the wordmark and the headline          (the new dial)
    overshoot     0.10 on the wordmark only
    stagger       0.05 within a group, 0.028 across the arsenal wall
    camera        one slowPush on beat 3, nothing else. The film is cut, not flown.
    shutter       180                                            (film standard)

## Cuts and sound

    cuts        4, all on the beat boundaries: 2.5 · 7.5 · 11.5 · 16.0
    styles      blur, riseBlur, blur, riseBlur         one family, soft
    bg windows  5, no from/to, bound to the joints by core/timeline/junctions.js
    spectacle   { at: 11.5, of: "arsenalWall", device: "ripple" }
    audio       tactile: true. It autoplays muted; the score is for whoever unmutes.

## Assets, all real, none invented

    assets/brands/vawe-site/sections/01-one-json-one-video.png    the editor, beat 2
    assets/brands/vawe-site/sections/05-no-templates-a-vocabulary.png   the arsenal, beat 4
    site/public/assets/effects/*.jpg                              real rendered frames for the wall
    the wordmark: inline svg from the site, never a font approximation

## Acceptance

    every gate blocking-half green · seam-check clean on all 4 junctions
    audit: zero HARD findings, including thin-hero (the headline at 60-80% of frame width)
    films-json: no orphan, no stale, no silent
    and the eyes: does beat 1 stop a scroll in two seconds with the sound off
