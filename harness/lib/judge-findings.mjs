// The findings half of the fresh judge prompt and its parse: the card questions by step, the declared
// choices (signature, waivers, message), the sameness and template questions, and the notes that come
// back, each tied to a rule id. Scores and the PASS rule stay in harness/media/judge-fresh.mjs.
// Pure; judge-fresh feeds it the files it read.

export const SAMENESS = 'sameness';
export const TEMPLATE = 'template';
export const WAIVERS_TO_NAME = 2;

export const SAMENESS_QUESTION = 'Does this film look like a sibling of any of the sibling films above (same palette, face, hero shape, layout or signature move)? Name which and what is shared.';
export const TEMPLATE_QUESTION = 'Does any frame read as a template or AI-made (a stock layout, a library default, a generated tell)? Name the frame second and why.';

/** [{ step, id, question }] from the text of taste/build/CARD.md: each `### id` that has a `- Judge:` line, under its `## step`. */
export function cardQuestions(card) {
  const out = [];
  let step = null;
  let id = null;
  for (const line of String(card).split('\n')) {
    if (line.startsWith('## ')) { step = line.slice(3).trim(); id = null; } else if (line.startsWith('### ')) id = line.slice(4).trim();
    else if (id && line.startsWith('- Judge: ')) { out.push({ step, id, question: line.slice(9).trim() }); id = null; }
  }
  return out;
}

/** The question list, one block per step. */
export function questionLines(questions) {
  const steps = [...new Set(questions.map((q) => q.step))];
  return [
    'Card questions. Answer each one from the frames. Answer "unknown" when you cannot see it in the frames or the measured facts. A value inside the declared signature range is never a fault; judge whether the declared choices serve the idea and are carried out the same way throughout.',
    ...steps.flatMap((s) => [`${s}:`, ...questions.filter((q) => q.step === s).map((q) => `- ${q.id}: ${q.question}`)]),
  ];
}

/** The declared choices: the six signature dials, each waiver with its reason, the message. `waivers` is [{ code, why }]. */
export function declaredLines({ signature = {}, waivers = [], message = null }) {
  const dials = Object.entries(signature).map(([k, v]) => `${k}=${v}`);
  const lines = [
    `Declared signature (the author chose these values on purpose; do not mark a value down for being what it is, judge whether it serves the idea and is used the same way throughout): ${dials.length ? dials.join('; ') : 'none declared'}`,
    `The film's message: ${message || 'none declared'}`,
  ];
  if (!waivers.length) return [...lines, 'Waivers: none.'];
  return [...lines, 'Waivers (rules the author broke on purpose, each with the reason given). For each one, say if the break is earned: does it serve the idea?',
    ...waivers.map((w) => `- ${w.code}: ${w.why || 'no reason given'}`),
    ...(waivers.length > WAIVERS_TO_NAME ? [`The film has ${waivers.length} waivers, more than ${WAIVERS_TO_NAME}: name every one of them in your report.`] : [])];
}

/** The sibling block: the thumbnails (files already extracted) and the sameness question. `siblings` is [{ name, file }]. */
export function siblingLines(siblings) {
  if (!siblings.length) return ['Sameness: no earlier judged film to compare with; answer sameness with "sibling":false.'];
  return ['Sibling films, newest first (one thumbnail each, small: use them for palette, face, hero shape and layout only):',
    ...siblings.map((s) => `- ${s.name}: ${s.file}`), `Sameness question: ${SAMENESS_QUESTION}`];
}

/** The JSON keys the findings add to the rubric object. */
export function findingsFormat() {
  return `Name a rule in every fix and every note. A "rule" is one id from the Card questions above, or "${SAMENESS}", or "${TEMPLATE}". Add "rule":"<id>" to each entry of "fixes".
Add these keys to the same JSON object:
"notes":[{"rule":"<id>","t":seconds,"verdict":"fail or unknown","note":"one short line"}]: one entry for every card question you answer with a fault or with "unknown"; none for a question that passes.
"waivers":[{"code":"<waiver code>","earned":true or false,"why":"one short line"}]: one entry for each waiver listed, none when the film has none.
"sameness":{"sibling":true or false,"films":["names of the sibling films"],"shared":"what is shared, or null"}
"template":{"tell":true or false,"t":seconds or null,"why":"one short line, or null"}`;
}

/** The whole findings block of the judge prompt. `card` is the text of the taste card, `declared` is { signature, waivers, message }. */
export function findingsPrompt({ card, declared, siblings }) {
  const parts = [declaredLines(declared), questionLines(cardQuestions(card)), siblingLines(siblings), [`Template and AI-tell question: ${TEMPLATE_QUESTION}`], [findingsFormat()]];
  return parts.map((p) => p.join('\n')).join('\n\n');
}

const asRule = (v, ids) => (ids.includes(String(v)) || [SAMENESS, TEMPLATE].includes(String(v)) ? String(v) : null);
const asSeconds = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

/** The rule id of a judge entry, or null when it names none that exists. */
export const ruleOf = (entry, ids) => asRule(entry?.rule, ids);

/** { notes, waivers, sameness, template } from the judge's JSON; missing parts come back empty, never invented. */
export function readFindings(raw, ids) {
  const notes = (Array.isArray(raw.notes) ? raw.notes : []).filter((n) => n && typeof n === 'object').map((n) => ({
    rule: asRule(n.rule, ids), t: asSeconds(n.t), verdict: n.verdict === 'unknown' ? 'unknown' : 'fail', note: String(n.note ?? ''),
  }));
  const waivers = (Array.isArray(raw.waivers) ? raw.waivers : []).filter((w) => w && w.code).map((w) => ({ code: String(w.code), earned: w.earned === true, why: String(w.why ?? '') }));
  const sameness = raw.sameness ? { sibling: raw.sameness.sibling === true, films: [].concat(raw.sameness.films ?? []).map(String), shared: raw.sameness.shared ?? null } : null;
  const template = raw.template ? { tell: raw.template.tell === true, t: asSeconds(raw.template.t), why: raw.template.why ?? null } : null;
  return { notes, waivers, sameness, template };
}

/** The share of a result's fixes and notes that carry a rule id: { total, ruled }. */
export function ruleCoverage(result) {
  const all = [...(result.fixes || []), ...(result.notes || [])];
  return { total: all.length, ruled: all.filter((x) => x.rule).length };
}

/** What the run log keeps of the findings: the notes as { rule, t, verdict }, the waiver verdicts as { code, earned }, plus the sameness and template answers. */
export function findingsEvent(result) {
  return {
    notes: (result.notes || []).map(({ rule, t, verdict }) => ({ rule, t, verdict })),
    waivers: (result.waivers || []).map(({ code, earned }) => ({ code, earned })),
    sameness: result.sameness ? { sibling: result.sameness.sibling, films: result.sameness.films, shared: result.sameness.shared } : null,
    template: result.template ? { tell: result.template.tell, t: result.template.t } : null,
  };
}
