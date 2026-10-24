export const NOTE_CLASSES = ['taste', 'readability', 'motion', 'process', 'engine'];

const KEYWORDS = [
  ['engine', /\b(bug|crash\w*|render (?:crash\w*|fail\w*)|slow render)\b/i],
  ['readability', /\b(crisp\w*|blur\w*|small\w*|read(?:s|able|ability|ing)?|text size)\b/i],
  ['motion', /\b(fast\w*|slow(?!\s+render)\w*|eas(?:e|es|ed|ing)|overshoot\w*|cuts?|timing)\b/i],
  ['taste', /\b(gr[ae]y\w*|ugly|premium|generic|looks? (?:bad|ugly|cheap|flat|off|wrong|generic))\b/i],
  ['process', /\b(skills?|plans?|research\w*|review\w*)\b/i],
];

const TAG = /^(?:The coordinator sent a message[^:]*:\s*)?\[class:\s*(\w+)\s*\]/i;

/** The classes of one owner or coordinator note: its leading [class: x] tag alone, else every keyword group that matches (a note holds several points), else ['other']. Pure. */
export function classesOf(text) {
  const tag = TAG.exec(text.trim())?.[1].toLowerCase();
  if (NOTE_CLASSES.includes(tag)) return [tag];
  const hits = KEYWORDS.filter(([, re]) => re.test(text)).map(([c]) => c);
  return hits.length ? hits : ['other'];
}

/** The owner notes of one agent: every round after the first request, with its classes. Pure. */
export function ownerNotes(rounds) {
  return rounds.filter((r) => r.index > 1).map((r) => ({ round: r.index, classes: classesOf(r.note), text: r.note }));
}

/** Per class the notes of one agent, in class order, only classes with a note. Pure. */
export function notesByClass(notes) {
  return [...NOTE_CLASSES, 'other'].map((c) => ({ class: c, notes: notes.filter((n) => n.classes.includes(c)) })).filter((g) => g.notes.length);
}

/** Per class across agents: the notes, the agents that got one, and `repeats` when two or more agents did. Pure. */
export function noteAggregate(agents) {
  const by = new Map();
  agents.forEach((a, i) => {
    for (const n of a.ownerNotes ?? []) {
      for (const c of n.classes) {
        const entry = by.get(c) ?? { class: c, count: 0, agents: new Set(), notes: [] };
        entry.count += 1;
        entry.agents.add(a.label ?? a.agent ?? a.file ?? i);
        entry.notes.push(n.text);
        by.set(c, entry);
      }
    }
  });
  return [...by.values()].map((e) => ({ class: e.class, count: e.count, agents: e.agents.size, repeats: e.agents.size > 1, notes: e.notes }))
    .sort((a, b) => b.count - a.count || a.class.localeCompare(b.class));
}
