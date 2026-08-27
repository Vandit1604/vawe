// scripts/brand/storyboard-draft.mjs: turn a captured `sections.json` into a STORYBOARD.md SKELETON:
// one beat per real section, in the site's order, pre-wired with a type + on-screen cues + a ready
// `make capture` command + a suggested blueprint. It writes the STRUCTURE (the slow, mechanical part);
// the author sharpens each `why:` and the `message:` before presenting for sign-off. This is the
// "auto-draft the storyboard from the capture" step. The human still owns the spine and the approval.
//
//   make storyboard-draft NAME=<brand> [MSG="one sentence"] [DUR=30] [FORMAT=landscape|portrait] [OUT=<path>]
// Reads assets/brands/<brand>/sections/sections.json (from `make sections`). Output passes
// storyboard-check structurally; it is a DRAFT, not an approved proposal.
import fs from 'node:fs';
import path from 'node:path';

const NAME = process.env.NAME || process.argv[2];
if (!NAME) { console.error('usage: make storyboard-draft NAME=<brand> [MSG=… DUR=30 FORMAT=landscape]'); process.exit(2); }
const secPath = `assets/brands/${NAME}/sections/sections.json`;
if (!fs.existsSync(secPath)) { console.error(`✗ ${secPath} not found, run \`make sections URL=… NAME=${NAME}\` first.`); process.exit(1); }

const doc = JSON.parse(fs.readFileSync(secPath, 'utf8'));
const sections = Array.isArray(doc) ? doc : (doc.sections || []);
if (!sections.length) { console.error(`✗ ${secPath} has no sections.`); process.exit(1); }

const DUR = +(process.env.DUR || 30);
const FORMAT = process.env.FORMAT || 'landscape';
const MSG = process.env.MSG || `<fill: the ONE sentence ${NAME} should land, the spine, not a feature list>`;
// Answer-driven frontmatter, each defaulting to exactly what this file wrote before. `make quiz-apply`
// fills them from the brief; a bare `make storyboard-draft` is unchanged.
// THREADS matters most: storyboard-check hard-ERRORS on a film under 15s that names neither `threads:`
// nor `object:`, and this writer emitted neither. Its own default DUR of 30 hid that, drop the duration
// to a 12s timeline cut and the draft it produced could not pass the gate it claims to pass.
const AUDIENCE = process.env.AUDIENCE || `<fill: who this is for, the visitor ${NAME} wants to convert>`;
const ARC = process.env.ARC || 'hook → build → proof → payoff → CTA';
const THREADS = process.env.THREADS || '';
const FRAMEWORK = process.env.FRAMEWORK || '';
const nice = (label) => String(label || 'section').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

// Budget the WHOLE duration across the beats. The `+ 1` here used to reserve a slot for a CTA that no
// beat was ever emitted for, so every draft ended DUR/(n+1) short and storyboard-check blocked it with
// `timeline-hole`. This writer's header claimed its output "passes storyboard-check structurally" and it
// never has, at any duration.
// The 2s floor stays, because a beat under two seconds does not read. When the sections cannot fit inside
// the duration at that floor the answer is not to silently overrun: say so, with the arithmetic.
const per = Math.max(2, +(DUR / sections.length).toFixed(1));
if (per * sections.length > DUR + 0.05) {
  console.warn(`  ⚠ ${sections.length} sections × the ${per}s floor is ${(per * sections.length).toFixed(1)}s, longer than the ${DUR}s you asked for.`);
  console.warn(`    Cut to ${Math.floor(DUR / 2)} sections, or raise DUR to ${Math.ceil(per * sections.length)}. The draft below overruns until you do.`);
}
let t = 0;
const beats = sections.map((s, i) => {
  const first = i === 0, last = i === sections.length - 1;
  const start = t; t = +(t + per).toFixed(1);
  // suggest a shot shape by POSITION + the section's capture kind (canvas => clipped image + ken).
  const blueprint = first ? 'kineticHook' : last ? 'ctaEnd' : (s.kind === 'canvas' ? 'screenDive (clipped image + ken)' : 'component capture (live UI) + a re-typed headline');
  const type = first ? 'text (kinetic hook)' : last ? 'text + logo (end card)' : (s.kind === 'canvas' ? 'image (clipped section screenshot) + ken' : 'component (make capture) + text');
  const cap = s.capture ? s.capture.split('\n').pop().trim() : `make capture URL=${doc.url || '<url>'} SEL='${s.sel || '<selector>'}' OUT=assets/brands/${NAME}/caps/${String(i + 1).padStart(2, '0')}.json`;
  return { i: i + 1, label: s.label, title: s.title, start, dur: per, blueprint, type, shot: s.shot, sel: s.sel, kind: s.kind, cap, first, last };
});

const L = [];
L.push('---');
L.push(`message: ${MSG}`);
L.push(`audience: ${AUDIENCE}`);
L.push(`arc: ${ARC}`);
if (THREADS) L.push(`threads: ${THREADS}`);
if (FRAMEWORK) L.push(`framework: ${FRAMEWORK}`);
L.push(`format: ${FORMAT}`);
L.push(`duration: ${DUR}s`);
L.push(`brand: ${NAME}  ·  sections: ${sections.length}  ·  source: ${doc.url || '(unknown url)'}`);
L.push('---');
L.push('');
L.push(`# ${nice(NAME)}: storyboard DRAFT (auto-generated from sections.json)`);
L.push('');
L.push('> One beat per real section, in the site\'s order. This is a SKELETON: sharpen every `why:` and the');
L.push('> `message:` above, then present it for sign-off before authoring the JSON. Blueprints: `make blueprints`.');
L.push('');
for (const b of beats) {
  // `title` is the site's own heading; `label` is its 28-char filename slug. Titling a beat from the slug
  // put "Built For The Future Availab" on the panels sheet. A truncation shown to whoever approves the
  // plan. Falls back to the slug for studies captured before `title` existed.
  L.push(`## Beat ${b.i}: ${b.title || nice(b.label)}  (${b.start}s–${(b.start + b.dur).toFixed(1)}s)`);
  L.push('');
  L.push(`- type: ${b.type}`);
  L.push(`- onscreen: ${b.first ? '<fill: the ≤12-word hook, front-load the strong word>' : b.last ? `<fill: the exact CTA + ${NAME} logo + url>` : `the real "${b.title || nice(b.label)}" section. Capture it, re-type any headline with a \`type\` layer`}`);
  L.push(`- why: <fill: what this beat PROVES or teaches that no other beat does, cut it and what is lost?>`);
  L.push(`- blueprint: ${b.blueprint}`);
  // `becomes:` is a BLOCKER on any film under 15s and this writer emitted it never, so every short draft
  // it produced failed the gate on every beat at once. It is the author's sentence to write, not this
  // file's to guess, but the field has to be THERE, or the draft cannot be checked at all.
  L.push(`- becomes: <fill: the change at this junction, as "the X becomes the Y">`);
  if (b.shot) L.push(`- shot: ${b.shot}`);
  if (!b.first && !b.last) L.push(`- capture: \`${b.cap}\``);
  L.push('');
}
L.push('---');
L.push('_Draft. Fill the `<…>` fields, then `make storyboard-check SB=<this file>` and present for sign-off._');
const out = L.join('\n') + '\n';

const dest = process.env.OUT || `assets/brands/${NAME}/STORYBOARD.md`;
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log(`✓ wrote ${dest}: ${beats.length} beat(s) from ${sections.length} section(s).`);
console.log(`  Next: fill the <…> fields (message + each why), then \`make storyboard-check SB=${dest}\` and get sign-off.`);
