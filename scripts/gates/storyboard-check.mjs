// scripts/gates/storyboard-check.mjs — the STORYBOARD-AS-PROPOSAL gate (another engine Step 3, adapted).
// A great video is planned on paper and approved BEFORE the JSON. This gate enforces that the plan is a
// real proposal, not a vibe: a one-sentence MESSAGE + audience + arc up front, and per beat a type, the
// on-screen cues, and a WHY (its narrative role / persuasion). A beat with no "why" is decoration; a video
// with no one-sentence message has no spine. It does not judge taste — it enforces that the decisions that
// make a video good were actually made and written down.
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
