// scripts/author/directions.mjs — THE CREATIVE DIRECTIONS a brief can be taken in.
//
// A direction commits to three things at once: the THREAD that holds the film across its cuts
// (docs/CRAFT/FILM-STRUCTURE.md), the PACE (median beat length, which decides the beat count for a fixed
// duration), and the LOOK (one of the design systems in presets/). `make concept` generates N of these
// from one storyboard and MEASURES their divergence with scripts/gates/similarity.mjs.
//
// It lives in its own file for the same reason PROFILES does: it was defined inside concept.mjs AFTER
// that file's usage guard, so importing it without CLI arguments exited before the table existed. A
// vocabulary no second reader can reach is a private table.
//
// Each `why` is already written as a forced choice WITH ITS CONSEQUENCE — "buys total visual freedom …
// at a cut rate that leaves no room for a slow entrance" — which is exactly the register a question
// needs. Anything asking a person to pick a direction should render these, not restate them.
// ── the directions ─────────────────────────────────────────────────────────────────────────────────
// Ordered so that taking the first N gives the widest spread available: thread, pace band and preset
// dominance all change between adjacent entries, so `--n 2` is already a real choice rather than two
// neighbours. Each `why` is the argument FOR that direction, and it is what the treatment stage later
// records as the road not taken.
export const DIRECTIONS = [
  { slug: 'held-object', thread: 'transforming object', pace: 3.4, preset: 'editorial',
    why: 'One prop carries the whole film and changes shape at each junction. Slow enough to read, and the most legible option: the viewer always knows what they are looking at.' },
  { slug: 'fast-sentence', thread: 'unfinished sentence', pace: 1.4, preset: 'technical',
    why: 'One sentence, a clause per shot, none of them finishing. Buys total visual freedom (every beat can be a new world) at a cut rate that leaves no room for a slow entrance.' },
  { slug: 'travelled', thread: 'camera travel', pace: 2.2, preset: 'bold',
    why: 'One continuous space the camera moves through, so the cuts are positions rather than subjects. Needs the beats to share a world, which constrains the props.' },
  { slug: 'counted', thread: 'counter or progress', pace: 2.0, preset: 'mono',
    why: 'A number or a list accumulates across every cut. The cheapest continuity to hold and the easiest to make feel mechanical; it lives or dies on what the number means.' },
  { slug: 'rhymed', thread: 'match cut', pace: 1.8, preset: 'warm',
    why: 'Each cut rhymes on a shape or a direction of travel. The most cinematic option and the most brittle: two frames that do not actually rhyme read as a mistake.' },
  { slug: 'asked', thread: 'open question', pace: 2.6, preset: 'glass',
    why: 'An unanswered question holds the film open and the payoff closes it. Strongest hook of the set, and it fails hardest if the ending does not genuinely answer.' },
  { slug: 'pulsed', thread: 'rhythm', pace: 1.2, preset: 'mesh',
    why: 'Cuts land on a fixed pulse and the content fits the grid. Reads as confident and edited; demands the most material, because a fast grid eats beats.' },
];

export const DIRECTION_SLUGS = DIRECTIONS.map((d) => d.slug);
