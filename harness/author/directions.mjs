// Split out of concept.mjs: it was defined after that file's usage guard, so importing it without CLI
// args exited before this table existed. Ordered so the first N gives the widest spread: thread, pace
// band and preset dominance all change between adjacent entries, so `--n 2` is already a real choice.
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
