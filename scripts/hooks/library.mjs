// Static hook-copy library — no AI, no network, nothing at runtime.
// Every line below is hand-written. A template is:
//   { pattern, framework, slot, fill(ctx) -> string }
//     pattern   the human-readable template (shown so you can see the shape)
//     framework one of FRAMEWORKS
//     slot      'hook' | 'title' | 'description' | 'comment'
//     fill      builds the final string from ctx
//   ctx = { count, niche, niches, topic, subject, rival, twist, pct, missPct, pair }
//         pulled from the data JSON by scripts/hooks.mjs (see buildCtx there).
//
// Hard rules (enforced by validate() below, NOT by vibes):
//   hook  <= 12 words · title <= 100 chars · <= 1 emoji · no weak filler opener.
// Templates whose filled string breaks a rule are dropped by the CLI.

export const FRAMEWORKS = ['whatif', 'contrarian', 'curiosity', 'callout', 'stakes', 'specific', 'pov'];

export const TEMPLATES = [
  // ── "What if…" ──────────────────────────────────────────────────────────
  { pattern: 'What if the #1 {niche} isn\'t the one you think?', framework: 'whatif', slot: 'hook',
    fill: c => `What if the #1 ${c.niche} isn't the one you think?` },
  { pattern: 'What if you\'re wrong about all {count} of these?', framework: 'whatif', slot: 'hook',
    fill: c => `What if you're wrong about all ${c.count} of these?` },
  { pattern: 'What if {subject} never actually died?', framework: 'whatif', slot: 'hook',
    fill: c => `What if ${c.subject} never actually died?` },
  { pattern: 'What if the {niche} you swear by isn\'t even close?', framework: 'whatif', slot: 'hook',
    fill: c => `What if the ${c.niche} you swear by isn't even close?` },

  // ── Negative / contrarian ───────────────────────────────────────────────
  { pattern: 'No — you don\'t know which {niche} actually wins.', framework: 'contrarian', slot: 'hook',
    fill: c => `No — you don't know which ${c.niche} actually wins.` },
  { pattern: 'No, {subject} isn\'t dead — it\'s still #1.', framework: 'contrarian', slot: 'hook',
    fill: c => `No, ${c.subject} isn't dead — it's still #1.` },
  { pattern: 'Stop assuming you\'d score {count}/{count}. You wouldn\'t.', framework: 'contrarian', slot: 'hook',
    fill: c => `Stop assuming you'd score ${c.count}/${c.count}. You wouldn't.` },
  { pattern: 'Wrong — the {niche} you picked isn\'t the biggest.', framework: 'contrarian', slot: 'hook',
    fill: c => `Wrong — the ${c.niche} you picked isn't the biggest.` },

  // ── Curiosity gap / open loop ───────────────────────────────────────────
  { pattern: '{count} {niches} you open daily. The last one breaks everyone.', framework: 'curiosity', slot: 'hook',
    fill: c => `${c.count} ${c.niches} you open daily. The last breaks everyone.` },
  { pattern: 'The real #1 {niche} isn\'t the obvious one.', framework: 'curiosity', slot: 'hook',
    fill: c => `The real #1 ${c.niche} isn't the obvious one.` },
  { pattern: 'Everyone misses the same round. Watch which.', framework: 'curiosity', slot: 'hook',
    fill: () => `Everyone misses the same round. Watch which one.` },
  { pattern: 'One of these {count} answers feels impossible.', framework: 'curiosity', slot: 'hook',
    fill: c => `One of these ${c.count} answers feels impossible.` },

  // ── Callout / identity ──────────────────────────────────────────────────
  { pattern: 'If you think {subject} is dead, watch this.', framework: 'callout', slot: 'hook',
    fill: c => `If you think ${c.subject} is dead, watch this.` },
  { pattern: 'If you use {niches} every day, you\'ll still fail.', framework: 'callout', slot: 'hook',
    fill: c => `If you use ${c.niches} every day, you'll still fail this.` },
  { pattern: '{niche} addicts — bet you can\'t go {count}/{count}.', framework: 'callout', slot: 'hook',
    fill: c => `${cap(c.niche)} addicts — bet you can't go ${c.count}/${c.count}.` },
  { pattern: 'Think you know {niches}? Prove it.', framework: 'callout', slot: 'hook',
    fill: c => `Think you know ${c.niches}? Prove it.` },

  // ── Stakes / bet / loss aversion ────────────────────────────────────────
  { pattern: 'Bet you can\'t score {count}/{count}.', framework: 'stakes', slot: 'hook',
    fill: c => `Bet you can't score ${c.count}/${c.count}.` },
  { pattern: 'Most people miss {count}. Don\'t be most people.', framework: 'stakes', slot: 'hook',
    fill: c => `Most people miss these. Don't be most people.` },
  { pattern: 'Score under {count}/{count} and you don\'t know {niches}.', framework: 'stakes', slot: 'hook',
    fill: c => `Score under ${c.count}/${c.count} and you don't know ${c.niches}.` },
  { pattern: 'You\'ll lose this bet about your own {niches}.', framework: 'stakes', slot: 'hook',
    fill: c => `You'll lose this bet about your own ${c.niches}.` },

  // ── Specific number / result ────────────────────────────────────────────
  { pattern: 'I ranked {count} {niches} by users. #1 shocked me.', framework: 'specific', slot: 'hook',
    fill: c => `I ranked ${c.count} ${c.niches} by users. #1 shocked me.` },
  { pattern: 'Only {pct}% get this last one right.', framework: 'specific', slot: 'hook',
    fill: c => `Only ${c.pct}% get this last one right.` },
  { pattern: 'Round {count} breaks {missPct}% of people.', framework: 'specific', slot: 'hook',
    fill: c => `Round ${c.count} breaks ${c.missPct}% of people.` },
  { pattern: '{count} {niches}, billions of users, one shock ending.', framework: 'specific', slot: 'hook',
    fill: c => `${c.count} ${c.niches}, billions of users, one shock ending.` },

  // ── POV / relatability ──────────────────────────────────────────────────
  { pattern: 'POV: you swear you know which {niche} wins…', framework: 'pov', slot: 'hook',
    fill: c => `POV: you swear you know which ${c.niche} wins…` },
  { pattern: 'POV: round {count} just humbled you.', framework: 'pov', slot: 'hook',
    fill: c => `POV: round ${c.count} just humbled you.` },
  { pattern: 'POV: you got 4 right, then saw {subject}.', framework: 'pov', slot: 'hook',
    fill: c => `POV: you got 4 right, then saw ${c.subject}.` },
  { pattern: 'That moment you realize {subject} never left.', framework: 'pov', slot: 'hook',
    fill: c => `That moment you realize ${c.subject} never left.` },

  // ── Titles (<= 100 chars) ───────────────────────────────────────────────
  { pattern: 'The #1 {niche} isn\'t the one you think — {pct}% guess wrong', framework: 'curiosity', slot: 'title',
    fill: c => `The #1 ${c.niche} isn't the one you think — ${c.pct}% guess wrong` },
  { pattern: 'If you think {subject} is dead, you\'re wrong', framework: 'contrarian', slot: 'title',
    fill: c => `If you think ${c.subject} is dead, you're wrong` },
  { pattern: 'Can you score {count}/{count}? Most people can\'t', framework: 'stakes', slot: 'title',
    fill: c => `Can you score ${c.count}/${c.count}? Most people can't` },
  { pattern: 'I ranked {count} {niches} by users — the ending shocked me', framework: 'specific', slot: 'title',
    fill: c => `I ranked ${c.count} ${c.niches} by users — the ending shocked me` },

  // ── Descriptions ────────────────────────────────────────────────────────
  { pattern: '{count} {niches}, {count} guesses — the last one breaks everyone. Go {count}/{count}?', framework: 'curiosity', slot: 'description',
    fill: c => `${c.count} ${c.niches}, ${c.count} guesses — and the last one breaks everyone. Can you go ${c.count}/${c.count}?` },
  { pattern: 'Most people miss the final round. Can you beat the average?', framework: 'stakes', slot: 'description',
    fill: () => `Most people miss the final round. Can you beat the average?` },

  // ── First comments (CTA) ────────────────────────────────────────────────
  { pattern: 'Which one did you miss? Bet it was the last 👇', framework: 'callout', slot: 'comment',
    fill: () => `Which one did you miss? Bet it was the last 👇` },
  { pattern: 'Drop your score — {count}/{count} or be honest 👇', framework: 'stakes', slot: 'comment',
    fill: c => `Drop your score — ${c.count}/${c.count} or be honest 👇` },
];

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

// ── validator ──────────────────────────────────────────────────────────────
const EMOJI = /\p{Extended_Pictographic}/gu;
// weak openers only — fillers that bury the hook. Articles / "If" / "No" are fine.
const WEAK_OPENERS = new Set(['just', 'so', 'well', 'basically', 'actually', 'really', 'very', 'maybe', 'um', 'like', 'kinda', 'sorta']);
const LIMITS = { hook: { words: 12 }, title: { chars: 100 } };

export function validate(text, slot = 'hook') {
  const t = String(text).trim();
  const emojis = (t.match(EMOJI) || []).length;
  const words = t.replace(EMOJI, '').trim().split(/\s+/).filter(Boolean);
  const first = (words[0] || '').toLowerCase().replace(/[^a-z0-9#']/g, '');
  const fails = [];
  if (emojis > 1) fails.push('emoji>1');
  if (WEAK_OPENERS.has(first)) fails.push('weak-opener');
  if (LIMITS[slot]?.words && words.length > LIMITS[slot].words) fails.push(`>${LIMITS[slot].words}w`);
  if (LIMITS[slot]?.chars && t.length > LIMITS[slot].chars) fails.push(`>${LIMITS[slot].chars}c`);
  return { ok: fails.length === 0, fails, words: words.length, chars: t.length, emojis };
}
