// The tricks that turn a check green without making the film better, as the fresh judge is told them, and the owner decisions it must respect.
// A trick counts only with a cited second and what the judge saw there. Pure.

/** Each known trick: id, what to look for on the frames, and the axes it games. */
export const TRICKS = [
  { id: 'camera-drift', look: 'a slow push, pull or drift of the whole frame or a stage root through a hold, with no element moving by itself', axes: ['motion', 'pace'] },
  { id: 'ground-drift', look: 'a background blob or layer drifting only to give a held frame the look of life', axes: ['motion', 'pace'] },
  { id: 'overlay-ground', look: 'a full-frame grain, faint gradient or glow laid over a flat ground, so the ground differs from its neighbour in name only', axes: ['colour', 'expensive'] },
  { id: 'drone-bed', look: 'a constant drone, pad or hum under the film instead of cues on actions (final stage)', axes: ['sound'] },
  { id: 'hidden-text', look: 'copy that carries the message set tiny, faint or marked as texture so it escapes the size and contrast checks', axes: ['type'] },
  { id: 'padded-world', look: 'words added to a beat, or one beat cut into two worlds with the same content, only to stretch or reset the world limit', axes: ['scenes', 'pace'] },
  { id: 'moved-spectacle', look: 'a spectacle second set on a moment that is not the film\'s strongest move, or with no quiet before it', axes: ['motion', 'hook'] },
  { id: 'formula-motion', look: 'the same dip, nudge or overshoot applied to every element on a formula, so no arrival is chosen', axes: ['motion'] },
  { id: 'uniform-gain', look: 'every cue shifted by the same gain so the level passes while the balance of the cues is unchanged (final stage)', axes: ['sound'] },
];

const OWNER_RULES = [
  'The film\'s DESIGN.md and brief are the owner\'s decisions for this film. Judge whether the film follows its own DESIGN.md, never a house style.',
  'Do not ask for a particular typeface (no house face such as Anybody), for bigger elements, or for a camera push or drift: a camera push is never a reward and never a fix.',
  'Do not ask the author to move the spectacle second or to raise any number only to reach a score. Your verdict is read by a person; it is not a target for the author.',
];

/** The rubric block: the owner decisions, and for a film the list of tricks with the rule to cite a second. */
export function tricksPrompt({ stage }) {
  const owner = `Owner decisions (they win over your taste):\n${OWNER_RULES.map((r) => `- ${r}`).join('\n')}`;
  if (stage === 'stills') return owner;
  const list = TRICKS.map((t) => `- ${t.id}: ${t.look} (games: ${t.axes.join(', ')})`).join('\n');
  return `${owner}

Known tricks. Look for each one. Name a trick only with the second you saw it at and what you saw there; a trick named with no second does not count, and neither does a guess from the page's code. A trick you cite caps the axes it games at 7. If you see none, return "tricks":[].
${list}`;
}

/** The tricks of a judge reply that count: a known id, a finite second and some evidence. The rest are dropped. */
export function readTricks(raw) {
  const ids = new Set(TRICKS.map((t) => t.id));
  return (Array.isArray(raw?.tricks) ? raw.tricks : []).filter((t) => t && ids.has(String(t.trick)) && Number.isFinite(parseFloat(t.at)) && String(t.evidence ?? '').trim().length >= 10)
    .map((t) => ({ trick: String(t.trick), at: parseFloat(t.at), evidence: String(t.evidence).trim() }));
}

/** The scores with every axis a cited trick games held to 7 at most. */
export function capByTricks(scores, tricks) {
  const capped = new Set(tricks.flatMap((c) => TRICKS.find((t) => t.id === c.trick)?.axes ?? []));
  return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, capped.has(k) ? Math.min(v, 7) : v]));
}

/** One report line per cited trick. */
export const trickLines = (tricks = []) => tricks.map((t) => `trick ${t.trick} at ${t.at} s: ${t.evidence}`);
