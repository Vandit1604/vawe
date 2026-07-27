// scripts/gates/storyboard-check.mjs — the STORYBOARD-AS-PROPOSAL gate (another engine Step 3, adapted).
// A great video is planned on paper and approved BEFORE the JSON. This gate enforces that the plan is a
// real proposal, not a vibe: a one-sentence MESSAGE + audience + arc up front, and per beat a type, the
// on-screen cues, and a WHY (its narrative role / persuasion). A beat with no "why" is decoration; a video
// with no one-sentence message has no spine. It does not judge taste — it enforces that the decisions that
// make a video good were actually made and written down.
//
// Under ~15s it also enforces the OBJECT SPINE (`vawe-continuous-action`): the frontmatter must name
// the one object that survives every cut, and every beat must say what that object has become. A short
// film planned as independent beats is a slideshow on paper, and the scene gate can only find that out
// after the JSON exists.
//
//   node scripts/gates/storyboard-check.mjs path/to/STORYBOARD.md   ·   make storyboard-check SB=<file>
//   Template: docs/CRAFT/STORYBOARD-TEMPLATE.md
import fs from 'node:fs';

const f = process.argv[2];
if (!f || !fs.existsSync(f)) { console.error('usage: storyboard-check <STORYBOARD.md>  (template: docs/CRAFT/STORYBOARD-TEMPLATE.md)'); process.exit(2); }
const src = fs.readFileSync(f, 'utf8');

const errs = [], warns = [];
// ── frontmatter: the video's spine ──────────────────────────────────────────────────────────────
const fm = /^---\n([\s\S]*?)\n---/.exec(src);
const head = fm ? fm[1] : '';
const field = (k) => { const m = new RegExp(`^${k}\\s*:\\s*(.+)$`, 'mi').exec(head); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
if (!fm) errs.push('no frontmatter block — the spine (message · audience · arc · format · duration) goes in a leading --- … --- block');
const message = field('message');
if (!message) errs.push('missing `message:` — the ONE sentence this video communicates. Without it the video has no spine.');
else if (message.split(/\s+/).length > 20) warns.push(`message is ${message.split(/\s+/).length} words — a proposal message should be ONE tight sentence (≤ ~18 words).`);
for (const k of ['audience', 'arc', 'format', 'duration']) if (!field(k)) warns.push(`missing \`${k}:\` in frontmatter`);

// ── the OBJECT SPINE: required on short films ─────────────────────────────────────────────────────
// A film under ~15s has no room for chapters. If no object survives the cuts, the plan is a slideshow
// before a frame exists, and no amount of per-beat polish rescues it. The shape below is the one the
// `vawe-continuous-action` skill emits: object · object_t0 · object_states · object_last in the
// frontmatter (anything under a `##` heading is parsed as a beat), plus an `object:` line per beat.
const SPINE_MAX_S = 15;
const durRaw = field('duration');
const durSec = (() => {
  if (!durRaw) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|m|min|mins|minutes)?\s*$/i.exec(durRaw);
  if (!m) return null;
  return /^m/i.test(m[2] || 's') ? parseFloat(m[1]) * 60 : parseFloat(m[1]);
})();
const shortFilm = durSec != null && durSec < SPINE_MAX_S;
if (shortFilm && !field('object')) {
  errs.push(`this is a ${durRaw} film and the frontmatter names no \`object:\` — NAME THE OBJECT FIRST. One noun the viewer acts on (the button, the prompt box, the row, the token) that stays on screen across every cut and transforms at each one. Add \`object:\`, \`object_t0:\`, \`object_states:\`, \`object_last:\` before storyboarding a single beat. Under ${SPINE_MAX_S}s there is no room for chapters: a film whose beats are islands is a slideshow. See .claude/skills/vawe-continuous-action/SKILL.md.`);
}
if (shortFilm) for (const k of ['object_t0', 'object_states', 'object_last']) {
  if (!field(k)) warns.push(`missing \`${k}:\` — the spine needs the object's state at t=0, at each cut, and at the last frame (the payoff, or the moment before it).`);
}

// ── beats: each must state its job ────────────────────────────────────────────────────────────────
const beats = [...src.matchAll(/^##\s+(?:Beat\s+)?(\d+|[A-Za-z].*?)\s*[—:-].*$/gmi)];
const blocks = src.split(/^##\s+/m).slice(1);
if (blocks.length < 2) errs.push('fewer than 2 beats — a video is a sequence of beats; storyboard each one as `## Beat N — title`.');
const REQ = ['type', 'onscreen', 'why'];
let n = 0;
for (const b of blocks) {
  n++;
  const title = b.split('\n')[0].trim();
  const has = (k) => new RegExp(`(^|\\n)\\s*[-*]?\\s*${k}\\s*:`, 'i').test(b);
  // On a short film every beat must say where the object IS. A beat with no object line is an island,
  // and a film of islands is a slideshow no matter how good each island looks.
  if (shortFilm && !has('object')) errs.push(`beat "${title}" is missing \`object:\` — say what the ${field('object') ? `"${field('object')}"` : 'spine object'} has become in this beat (or where it is, if it is not born yet). Every cut must read "the X becomes the Y".`);
  const missing = REQ.filter((k) => !has(k));
  if (missing.length) errs.push(`beat "${title}" is missing: ${missing.map((m) => `\`${m}\``).join(', ')} (every beat needs a type, its on-screen cues, and a WHY).`);
  if (!/(^|\n)\s*[-*]?\s*(blueprint|mechanism)\s*:/i.test(b)) warns.push(`beat "${title}": no \`blueprint:\` or \`mechanism:\` — name the shot shape / motion so the JSON transcribes it (make blueprints · docs/EFFECTS.md).`);
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`  storyboard-check · ${f} · ${blocks.length} beat(s)`);
if (message) console.log(`  message: "${message}"`);
for (const e of errs) console.error(`    ✗ ${e}`);
for (const w of warns) console.log(`    ~ ${w}`);
if (errs.length) { console.error(`\n✗ storyboard incomplete — ${errs.length} blocker(s). Fill them, then present the proposal for approval before authoring JSON.`); process.exit(1); }
console.log(`\n✓ storyboard is a complete proposal — present it ("This video tells <audience> that <message>") and get sign-off before the JSON.`);
