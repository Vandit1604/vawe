// scripts/brand/intent-from-storyboard.mjs: export a STORYBOARD.md's whys into a `.intent.json` sidecar,
// so `inspect` (quality/gates/inspect.mjs) VERIFIES the render delivers what each beat promised. The
// storyboard already names, per beat, the on-screen cue + the WHY (the artifact that earns the frame); this
// turns that plan into a machine-checkable contract instead of doctrine. Closes the "a beat occupies time
// without earning it" gap: after rendering, author-check's inspect step confirms each beat's mustShow text
// is on screen and (if mustAnimate) something is moving.
//
//   make intent SB=<storyboard.md> [D=formats/scene/<topic>.json]   → writes <topic>.intent.json (or prints)
// It reads the storyboard's beat time ranges for `at` + `span`, the quoted copy in `onscreen:` for
// `mustShow`, and `why:` for the artifact note. A beat whose onscreen is still a <fill:…> placeholder is
// emitted WITHOUT mustShow (nothing to verify yet) and flagged, sharpen the storyboard first for a real
// contract.
//
// THE SPINE. A storyboard teaches three things: which OBJECT persists, which TRANSFORMATION happens at
// each junction (`becomes:`), and WHY the beat lands. Only the third used to survive into the intent, so
// the contract could be satisfied by nine unrelated islands. The top-level `spine` and the per-beat
// `object` / `becomes` carry the other two across the bridge. They are RECORDED, not machine-checked.
// See the honesty note in quality/gates/inspect.mjs.
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';

const SB = process.env.SB || process.argv[2];
if (!SB || !fs.existsSync(SB)) { console.error('usage: make intent SB=<storyboard.md> [D=<scene.json>]'); process.exit(2); }
const src = fs.readFileSync(SB, 'utf8');
const D = process.env.D || null;

// pull quoted phrases ("…" or '…') and <b>…</b> inner text from an on-screen cue → the verifiable copy.
const quotes = (s) => {
  const out = [];
  for (const m of s.matchAll(/"([^"]{2,})"|'([^']{2,})'/g)) out.push((m[1] || m[2]).trim());
  // The needle this GENERATES is matched by inspect.mjs with onScreenText, so it has to be built with
  // onScreenText. Two halves of one feature disagreeing about markup is #313.
  for (const m of s.matchAll(/<b>(.*?)<\/b>|<em>(.*?)<\/em>/gi)) out.push(onScreenText(m[1] || m[2]));
  return [...new Set(out.filter(Boolean))];
};
const fieldIn = (block, k) => { const m = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'i').exec(block); return m ? m[1].trim() : null; };

const unquote = (s) => s.replace(/^["']|["']$/g, '').trim();

// frontmatter (everything above the first `## ` heading) names the film's spine: the object that persists,
// where it stands at t0, and what it is at the end.
const front = src.split(/^##\s+/m)[0] || '';
const spine = {};
for (const k of ['object', 'object_t0', 'object_states', 'object_last']) {
  const v = fieldIn(front, k);
  if (v) spine[k] = unquote(v);
}

const blocks = src.split(/^##\s+/m).slice(1);
const beats = [], warns = [];
for (const b of blocks) {
  const head = b.split('\n')[0].trim();
  // time range "(0s–2.3s)" / "(0s-2.3s)"; at = its midpoint. No range → skip (can't place the check).
  const tr = /\(([\d.]+)\s*s\s*[–: -]\s*([\d.]+)\s*s\)/.exec(head);
  const name = head.replace(/^Beat\s+\d+\s*[: :-]\s*/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!tr) { warns.push(`beat "${name}": no (start s–end s) range in the heading, skipped (add one so intent can place the check).`); continue; }
  const at = +(( +tr[1] + +tr[2]) / 2).toFixed(2);
  const span = [+(+tr[1]).toFixed(2), +(+tr[2]).toFixed(2)];
  const onscreen = fieldIn(b, 'onscreen') || '';
  const why = fieldIn(b, 'why') || '';
  const type = fieldIn(b, 'type') || '';
  const blueprint = fieldIn(b, 'blueprint') || fieldIn(b, 'mechanism') || '';
  const placeholder = /<fill[:\s]/i.test(onscreen);
  const mustShow = placeholder ? [] : quotes(onscreen);
  if (placeholder) warns.push(`beat "${name}": onscreen is still a <fill:…> placeholder, emitted without mustShow. Fill the real copy for a verifiable contract.`);
  else if (!mustShow.length && onscreen) warns.push(`beat "${name}": no quoted copy in onscreen, inspect can't verify text here. Put the exact on-screen words in quotes.`);
  // a directed beat moves; only a beat that literally says static/freeze opts out.
  const mustAnimate = !/\b(static|freeze|frozen|still hold)\b/i.test(type + ' ' + onscreen + ' ' + blueprint);
  const artifact = (why && !/<fill[:\s]/i.test(why)) ? why : [type, blueprint].filter(Boolean).join(' · ') || 'the beat\'s earning artifact';
  // the spine, per beat: where the continuous object stands here, and what it turns into at this junction.
  // `becomes:` is newer than most storyboards, so both keys are omitted rather than emitted empty.
  const object = fieldIn(b, 'object');
  const becomes = fieldIn(b, 'becomes');
  if (!becomes) warns.push(`beat "${name}": no becomes: line. The transformation at this junction is not recorded. Name what this beat's object turns into.`);
  beats.push({
    at, span, name, mustShow, mustAnimate, artifact,
    ...(object ? { object: unquote(object) } : {}),
    ...(becomes ? { becomes: unquote(becomes) } : {}),
  });
}

if (!beats.length) { console.error('✗ no beats with a time range found, is this a storyboard from make storyboard-draft / STORYBOARD-TEMPLATE.md?'); process.exit(1); }
if (!spine.object) warns.push('frontmatter has no `object:` key, so the intent records no spine and nothing states what the film is about.');
const out = JSON.stringify({ ...(Object.keys(spine).length ? { spine } : {}), beats }, null, 2) + '\n';

let dest = process.env.OUT || null;
if (!dest && D) dest = D.replace(/\.json$/, '') + '.intent.json';
for (const w of warns) console.log(`  ~ ${w}`);
if (dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
  console.log(`\n✓ wrote ${dest}: ${beats.length} beat(s), ${beats.filter((b) => b.mustShow.length).length} with verifiable copy.`);
  console.log(`  Align the \`at\` times + mustShow to the final scene, then \`make author-check D=${D || '<scene>.json'}\` runs inspect against it.`);
} else {
  console.log(out);
  console.log(`  (no D=<scene.json> given: printed only. Pass D= to write <scene>.intent.json next to it.)`);
}
