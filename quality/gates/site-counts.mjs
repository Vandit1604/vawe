// quality/gates/site-counts.mjs: assert every capability count written on the SITE still matches the
// registry it describes.  make check GATE=site-counts
//
// AMBIGUOUS NOUNS ARE SCOPED BY SURFACE, and that is the fix this file's own KNOWN LIMIT used to ask
// for and not do. "families" belongs to at least four registries (blocks, effects, cuts, fonts), and
// this gate compared every "<n> families" against the block count wherever the sentence sat, so a true
// statement about effect families read as a stale block count. Widening FILES into engine-doctrine/ turned that
// one known nuisance into twenty: "3 cut families", "48 effect families", "30 words across 3
// families". So the bare noun is gone from TRUTH. What is checked instead is the QUALIFIED form
// ("block families") plus the one sentence the product actually writes, "<n> blocks across <n>
// families", which pins both numbers to the same registry by construction.
//
// The same reasoning scopes four more bare nouns to the site. In marketing copy "26 looks" and "27
// cuts" are product claims; in engineering prose "8 looks" is a verb, "5 cuts" is the number of edits
// in a film, and "12 blocks" is a DSP window. Those are not stale numbers and a gate that says they
// are is one an author learns to skip, which is this file's lesson from the two guards further down.
// So SITE_ONLY holds them and the docs surfaces get only the unambiguous multi-word subjects.
//
// WHY THIS EXISTS: the marketing copy said "96 components", "96 blocks across 44 families" and
// "44 families" while the registry held 148 across 64; vawe-rules.md claimed 22 kinetic presets, 32
// stings, 16 backgrounds and 16 themes against real counts of 25/35/17/18, and listed names to match
// its own stale numbers. Nine wrong figures, all shipped, all in the <meta> description or the page
// body. None of it was carelessness at the time of writing: every one was correct when typed, and the
// registry moved underneath it. Hand-typed numbers about a growing registry go stale by default, so
// the only durable fix is a gate that reads both and compares.
//
// Deliberately NOT a rewriter. It reports file:line, the stated number and the real one, and leaves
// the wording to a human: a count often sits inside a sentence that needs rephrasing, not a substitution.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../../core/type/type.js';
import { LOOK_NAMES } from '../../core/looks/index.js';
import { PRESENTATIONS } from '../../core/cuts/index.js';
import { SHADER_FX } from '../../core/stings/index.js';
import { CANVAS_FX_NAMES } from '../../core/canvas/effects.js';
import { AMBIENT_FX } from '../../core/surfaces/shaders-ambient.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { validateAll } from '../../core/validate/validate.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const size = (o) => (Array.isArray(o) ? o.length : Object.keys(o).length);

// The grid is CATALOG minus full-frame overlays: the same set the site's /blocks page lists, so the
// number the copy quotes and the number the page renders are the same number by construction.
const MCP_TOOLS = JSON.parse(fs.readFileSync(path.join(root, 'site/lib/mcp-tools.json'), 'utf8'));
// Read the SAME way MCP_TOOLS is: from the generated file, not a second walk of the effect families.
// Kept OUT of TRUTH on purpose; see the film-copy check below for why.
const EFFECTS_TOTAL = JSON.parse(fs.readFileSync(path.join(root, 'site/lib/effects.json'), 'utf8')).total;
const grid = CATALOG.filter((e) => !e.overlay);

const TRUTH = {
  blocks: grid.length,
  components: grid.length,
  'block families': new Set(grid.map((e) => e.family)).size,
  looks: size(LOOK_NAMES),
  'composite looks': size(LOOK_NAMES),
  stings: size(SHADER_FX),
  'shader stings': size(SHADER_FX),
  'kinetic presets': size(PRESETS),
  cuts: size(PRESENTATIONS),
  'cut presentations': size(PRESENTATIONS),
  'ambient shader looks': size(AMBIENT_FX),
  // MCP TOOLS, added after docs-site/content/docs/mcp.mdx typed "11 tools" in the same sentence that
  // promised the number "cannot drift from the code". It could: this gate already walks docs-site
  // (see the comment above about layers.mdx claiming fourteen types), but `tools` was not a subject
  // it knew, so nothing compared the claim to anything. Three pages disagreed about this very count
  // earlier today, six against ten against four, over a server registering eleven.
  //
  // Read from the generated site/lib/mcp-tools.json rather than from mcp/server.mjs directly: that
  // file is the one owner of the count (scripts/site/mcp-tools.mjs), generated-check holds it
  // current, and a second reader of the same source is the duplicate-vocabulary shape this repo
  // keeps logging.
  // NOT a bare `tools` subject, which was tried and immediately invented four findings: "3 tools" in
  // aspect-ratios.mdx and "6 tools" in reading-your-film.mdx are about other things entirely. A
  // subject this gate matches has to be a phrase that can only mean one count.
  'mcp tools': MCP_TOOLS.count,
  'canvas fx': size(CANVAS_FX_NAMES),
  // The layer vocabulary is the one count a reader USES rather than admires: a docs page that names
  // fourteen types when the registry holds twenty-three does not merely misreport a size, it hides
  // nine primitives, and nothing on the page says it is partial. Read from the registry itself, the
  // same source `make check GATE=coverage` was fixed to use after it reported 14/14 while a 15th type existed.
  'layer types': size(LAYER_TYPES),
  // COUNT WHAT SHIPS, not what is on this disk. Three brand themes are deliberately untracked but
  // still present locally, so `readdirSync` says 38 here and a fresh clone has 35. A copy line reading
  // "38 themes" would therefore pass on the author's machine and fail for every contributor, the
  // stale-count failure this gate exists to prevent, inverted. The site describes the PUBLISHED
  // product, so the published set is the truth. (Same lesson as engine-doctrine/MISTAKES.md #443: grade the thing
  // that actually ships, never the copy sitting in the working tree.)
  themes: (() => {
    try {
      const tracked = execFileSync('git', ['ls-files', 'themes'], { cwd: root, encoding: 'utf8' });
      const n = tracked.split('\n').filter((f) => f.endsWith('.json')).length;
      if (n) return n;
    } catch { /* not a git checkout: fall back to disk */ }
    return fs.readdirSync(path.join(root, 'themes')).filter((f) => f.endsWith('.json')).length;
  })(),
};

// THE FILE LIST IS THE BLIND SPOT, NOT THE RULE. This gate's rule was always right and its FILES
// stopped at `site/`, so docs-site/content/docs/layers.mdx said "fourteen types" against a registry of
// twenty-three and then LISTED fourteen, putting nine primitives (video, beam, svg, composition,
// adjust, paint, raymarch, three, globe) out of a reader's reach with nothing on the page admitting it
// was partial. motion.mdx said 25 kinetic presets against 31; themes.mdx said fourteen themes. Same
// shape as docs-drift.mjs:26, which records the identical lesson from the other side of the fence.
// So every surface that states a count is DISCOVERED by walking, never listed: a hand-written list is
// the exact artefact that goes stale, and a gate whose subject list is stale is a gate that is quiet.
// engine-doctrine/MISTAKES.md QUOTES WRONG NUMBERS ON PURPOSE. It is the incident log, and half its entries are
// an account of a count that had decayed: "I found 96 components ... Real: 148 blocks, 63 families".
// Every one of those is a true sentence containing a false number, so the gate found forty findings in
// it and not one was actionable. An entry is a record of a past state and correcting it would destroy
// the record. Excluded as a FILE because the property is a file's, not a line's: waiving forty lines
// one at a time would be forty lies about having looked.
const EXCLUDED = new Set(['engine-doctrine/MISTAKES.md']);

const FILES = [
  'site/lib/features.ts',
  'site/public/vawe-rules.md',
  ...walk('site/app').filter((f) => /\.tsx?$/.test(f)),
  ...walk('docs-site/content/docs').filter((f) => f.endsWith('.mdx')),
  ...walk('engine-doctrine').filter((f) => f.endsWith('.md') && !EXCLUDED.has(f)),
  // THE TOOLS THEMSELVES ARE A SURFACE, and they were the last one nobody read. `make arsenal` derives
  // its own headline ("The ${all.length} named things were searched"), so it cannot go stale; every
  // other author-facing script types its number by hand. Three had: block-schema printed "154 of 155
  // blocks" over a registry of 185, doc-map advertised engine-doctrine/EFFECTS.md as "15 families" over 53, and
  // feature-audit told an author to vary an entrance because "21 presets" were available over 31. An
  // author is told to trust these, and a wrong number here is worse than a wrong number in the copy:
  // it is inside the fix instruction, which is the same failure `make sfx` was (lib-test:2929).
  ...walk('harness/author').filter((f) => f.endsWith('.mjs')),
  ...walk('quality/gates').filter((f) => f.endsWith('.mjs')),
];


function walk(rel) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(rel, e.name)) : [path.join(rel, e.name)]);
}

// `--files` prints the resolved surface list and stops. The list is now DISCOVERED, so the one thing
// a test cannot assert against is the glob that produced it: a walk that silently returns nothing
// looks exactly like a clean run, which is how this gate stayed quiet over docs-site/ in the first
// place. lib-test asserts on what comes out of here.
if (process.argv.includes('--files')) {
  console.log(FILES.join('\n'));
  process.exit(0);
}

// The bare nouns whose meaning is decided by the surface they sit on, not by the word. Checked in
// site/ (product copy about the product) and never in engine-doctrine/ (prose about films, frames and history).
const SITE_ONLY = new Set(['blocks', 'components', 'looks', 'cuts']);
const alt = (keys) => keys.sort((a, b) => b.length - a.length).join('|');
const ALL_SUBJECTS = alt(Object.keys(TRUTH));
const DOC_SUBJECTS = alt(Object.keys(TRUTH).filter((k) => !SITE_ONLY.has(k)));
const CODE_SUBJECTS = alt(Object.keys(TRUTH).filter((k) => k !== 'cuts'));
// Two shapes appear in the copy and both must be checked:
//   "148 blocks", "a 148-block library"   → number first
//   "## Kinetic presets (25)"             → heading with the count in parentheses
// ADJECTIVES ARE ALLOWED TO SIT BETWEEN THE NUMBER AND ITS NOUN, and until now they hid the claim.
// "148 vetted, deterministic, theme-aware components" slipped past this gate for as long as it took
// someone to read the page, because the pattern demanded the digit sit directly beside the word. A
// count is stale whether or not the author put three adjectives in front of the thing being counted.
// Bounded to a short run of word characters, commas and hyphens so it cannot leap across a sentence
// and pair a number with a noun that has nothing to do with it.
// Two guards on that run, and BOTH were added after the widening invented findings on its first run.
// Widening it to skip adjectives made it skip other things too:
//   * "155 blocks across 70 families" matched 155 -> families, leaping over the noun 155 belongs to.
//     So an intervening word may not itself be one of the subjects: the nearest noun wins.
//   * "154 of 155 blocks" matched 154 -> blocks, over the top of the number actually attached to it.
//     So the run may not contain a digit either: the nearest NUMBER wins.
// A gate change must never invent findings, and this one did until it was tested against real lines
// rather than against the case it was written for.
// A COUNT SPELLED IN WORDS IS STILL A COUNT, and both of the bugs that prompted this widening were
// spelled: "There are fourteen types" over a registry of 23, and "the repo ships fourteen" themes.
// A digits-only matcher was not merely quiet about them, it could not see them at all. The fear was
// that English numerals would drag in "the four canvas types" and "two guards" as claims about
// registries; measured over all 117 surfaces it dragged in exactly ONE line, and that line is waived
// where it sits. Twenty is the ceiling because prose stops spelling numbers there.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty'];
const numFirst = (subjects) => new RegExp(`\\b(\\d+|${WORDS.join('|')})[ \\u00a0-](?:(?!${subjects})[a-z-]+,?[ \\u00a0]){0,4}(${subjects})\\b`, 'gi');
const heading = (subjects) => new RegExp(`\\b(${subjects})\\s*\\((\\d+)\\)`, 'gi');
const PATTERNS = {
  site: [numFirst(ALL_SUBJECTS), heading(ALL_SUBJECTS)],
  // Source files get every subject EXCEPT `cuts`, and that exception is measured rather than guessed.
  // Over both script directories the bare nouns produced seven hits: five of them say "cuts" and mean
  // something else every time ("needs 2 cuts or seams" is a validator message, "Two cuts of the same
  // film" is the judging rubric, "no cuts by design" is a waiver reason, "26 cuts" is a string a
  // rewriter searches a scene for). The word is a film edit, a scene count and a registry in one
  // repo, so it is the one that has to go. `blocks` stays, because dropping it would have made this
  // check blind to the finding that prompted it: block-schema.mjs printed "154 of 155 blocks" inside
  // a fix instruction over a registry of 185. Its one honest collision ("two blocks keep their order",
  // about `<style>` elements) waives itself on the line, which is what the waiver is for.
  code: [numFirst(CODE_SUBJECTS), heading(ALL_SUBJECTS)],
  // The HEADING form keeps every subject on every surface. "## Cuts (26)" over a list of cut names is
  // a registry claim wherever it sits, and no false positive in the widening came from that shape: it
  // is prose that makes a bare noun ambiguous, never a heading that hands a count its own parentheses.
  docs: [numFirst(DOC_SUBJECTS), heading(ALL_SUBJECTS)],
};
// "148 blocks across 70 families" is the one sentence the product writes about itself in which a bare
// "families" is unambiguous: the noun it belongs to is standing right in front of it. Matched on every
// surface, because that is the shape the marketing copy, the docs page and the block sheet all use.
const ACROSS = /\b(\d+)[ \u00a0](?:blocks|components)[ \u00a0]across[ \u00a0](\d+)[ \u00a0]families\b/gi;

const bad = [];
const f = gateFindings();
for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  // COMMENTS ARE PROSE, AND A GATE THAT READS THEM ARGUES WITH PROSE THAT IS ALREADY CORRECT. Gate
  // files discuss stale counts at length in their own headers: this very file's comment block quotes
  // "22 kinetic presets, 32 stings, 16 backgrounds and 16 themes" as the numbers that WERE wrong, and
  // reporting them would be reporting the incident log. Same rule and same reason as the make-target
  // test in lib-test, and as doc-refs.mjs:145, which recorded reporting `make builds` as missing when
  // it was quoted inside a comment. Whole-line comments only, matching that precedent: a trailing
  // stripper eats the `//` in a URL inside a string, which is a claim going quiet rather than a false
  // one being reported. Line numbers are preserved so a finding still names the line a human opens.
  const isCode = rel.startsWith('scripts/') || rel.startsWith('harness/') || rel.startsWith('quality/');
  const text = !isCode ? lines
    : fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .split('\n').map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l));
  text.forEach((line, i) => {
    // The WAIVER is read off the raw line, never the stripped one: the marker lives in a comment, and
    // stripping comments before looking for it would delete every waiver a source file can write.
    const prev = i > 0 ? lines[i - 1] : '';
    // A NUMBER BESIDE A SUBJECT WORD IS NOT ALWAYS A COUNT OF IT. "Frame 412 looks the same whether it
    // renders first or last" is a sentence about frame 412, and `looks` there is a verb. The matcher
    // cannot tell a verb from a noun, and a gate arguing with correct prose is one an author learns to
    // skip, which is this file's own lesson from the two guards above. So a line may waive itself with
    // a reason it has to type, the same shape and the same enforcement as doc-refs-allow:
    //
    //   {/* site-counts-allow: "412 looks" is frame 412, not a count of looks */}
    //
    // On the line, or the line before it, since JSX and markdown both put a comment above the prose.
    // A marker with no reason after the colon does not count: it costs a sentence, so it is never the
    // cheap way out of a real stale number.
    // The lookahead is the markdown surface arriving: in `<!-- site-counts-allow: -->` the first
    // non-space after the colon is the comment CLOSER, so a bare marker in a .md file bought silence
    // for free and the "it costs a sentence" rule held only in JSX. Caught by lib-test, not by eye.
    const REASON = /site-counts-allow:\s*(?!-->)(?!\*\/)\S/;
    const waived = REASON.test(lines[i]) || REASON.test(prev);
    const check = (subject, stated) => {
      if (waived) return;
      const n = isNaN(+stated) ? WORDS.indexOf(String(stated).toLowerCase()) : +stated;
      const real = TRUTH[subject.toLowerCase()];
      if (real == null || n === real) return;
      bad.push({ rel, line: i + 1, subject: subject.toLowerCase(), stated: n, real, text: lines[i].trim().slice(0, 96) });
    };
    const [numeric, headed] = PATTERNS[isCode ? 'code' : rel.startsWith('site/') ? 'site' : 'docs'];
    for (const m of line.matchAll(numeric)) check(m[2], m[1]);
    for (const m of line.matchAll(headed)) check(m[1], m[2]);
    for (const m of line.matchAll(ACROSS)) { check('blocks', m[1]); check('block families', m[2]); }
  });
}


// ── THE EDITOR'S STARTER SCENE MUST ACTUALLY BOOT ────────────────────────────────────────────────
// /editor shipped for some time rendering a blank stage. The page loaded, the JSON showed, the
// scrubber showed, and the engine refused to boot inside the iframe because `bg` had become required
// and the starter predated it. The refusal was correct and it was LOUD, in `window.__engineError`
// inside a frame nothing was reading, so the only outward sign was an empty box.
//
// A default that does not render is worse than no default: it is the first thing anyone sees, and it
// says the engine is broken. This runs the starter through the same validator the engine calls at
// boot, which is the check that would have caught it on the day.
{
  const src = fs.readFileSync(path.join(root, 'site/app/editor/EditorClient.tsx'), 'utf8');
  const m = src.match(/const STARTER = `([\s\S]*?)`;/);
  const REL = 'site/app/editor/EditorClient.tsx';
  const fail = (text) => bad.push({ rel: REL, line: '-', stated: 'a starter that', subject: 'boots', real: 'a scene the engine refuses', text });
  if (!m) fail('could not find the STARTER scene');
  else {
    let scene = null;
    try { scene = JSON.parse(m[1]); } catch (e) { fail(`the STARTER scene is not valid JSON: ${e.message}`); }
    if (scene) {
      const schemaPath = path.join(root, 'films', scene.module || 'scene', 'schema.json');
      const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : null;
      for (const err of validateAll(schema, scene)) fail(err);
    }
  }
}

// ── FILM COPY CAN CLAIM A NUMBER ABOUT VAWE ITSELF, AND ONLY THAT NUMBER IS CHECKABLE ───────────────
// films/scene held one film that made a claim about the ENGINE rather than about a fictional product
// on screen: vawe-launch.json's own on-screen text read "566 effects. No templates." against a
// registry (site/lib/effects.json) that had since grown to 694. Nothing walked films/scene at all, so
// the flagship launch video shipped a false claim about the thing it was launching.
//
// EVERY OTHER NUMBER IN A FILM IS BRAND FICTION AND MUST NOT BE TOUCHED. plinth-ad's "12,400 agents",
// argus-launch's "-61%", preface-launch's "22 proposals": these are a fictional demo company's own
// figures, correct by construction because nobody but the film author decided them, and a registry
// has nothing to compare them against. So this does not reuse ALL_SUBJECTS/numFirst: `effects` is not
// a TRUTH key. Bare "effects" is checked nowhere else in this file for the same reason `families` and
// `tools` were scoped before it: engine-doctrine alone quotes at least half a dozen PAST effect counts
// as prose (558, 559, 566, 630, 639, 693 all appear in MISTAKES.md, AI-AGENT-BOOK.md, arsenal.mjs's
// own header, STUDIO-DESIGN.md), every one a true sentence about a moment the registry has since moved
// past. Widening the generic matcher to know the word "effects" would report all of them.
//
// So the phrase this matches has to be one that can only be a vawe claim, the same rule `mcp tools`
// was scoped by. "No templates" is vawe's own tagline (AGENTS.md: "No templates" is how this engine
// describes itself), and no fictional product's ad copy pairs an effects count with it: measured
// across every scene present in this checkout, the only line where "effects" and "template" share a
// line is the real defect. A count elsewhere in the same film about a fictional product's own effects
// ("Nine effects, costed by hand.", showcase-type-labour.json, about After Effects itself) has no
// "template" beside it and is left alone.
//
// films/scene/*.json is gitignored except the framework's own sample/schema/showcase set
// (.gitignore:84), so on a fresh checkout the brand-fiction films (plinth-ad, argus-launch, the actual
// vawe-launch.json among them) are simply not on disk. A directory with fewer files than the full
// library is not a check that failed to see: it is what git promised. This walks whatever files ARE
// present and says nothing about ones that are not, the same shape films-json.mjs's `blind` list uses.
const FILM_DIR = path.join(root, 'films/scene');
const filmFiles = fs.existsSync(FILM_DIR) ? fs.readdirSync(FILM_DIR).filter((f) => f.endsWith('.json')) : [];
const EFFECTS_CLAIM = new RegExp(`\\b(\\d+|${WORDS.join('|')})[ \\u00a0-]+effects?\\b`, 'i');
for (const name of filmFiles) {
  const rel = `films/scene/${name}`;
  const lines = fs.readFileSync(path.join(FILM_DIR, name), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const prev = i > 0 ? lines[i - 1] : '';
    if (/site-counts-allow:\s*(?!-->)(?!\*\/)\S/.test(line) || /site-counts-allow:\s*(?!-->)(?!\*\/)\S/.test(prev)) return;
    if (!/template/i.test(line)) return;
    const m = EFFECTS_CLAIM.exec(line);
    if (!m) return;
    const stated = isNaN(+m[1]) ? WORDS.indexOf(m[1].toLowerCase()) : +m[1];
    if (stated === EFFECTS_TOTAL) return;
    bad.push({ rel, line: i + 1, subject: 'effects', stated, real: EFFECTS_TOTAL, text: line.trim().slice(0, 96) });
  });
}

for (const b of bad) {
  const at = b.line === '-' ? b.rel : `${b.rel}:${b.line}`;
  if (b.subject === 'boots') f.fail('starter-refused', `${b.rel}: ${b.text}`, { at, fix: 'fix the STARTER scene so it passes the same validator the engine runs at boot' });
  else f.fail('stale-count', `${at}  says ${b.stated} ${b.subject}, registry has ${b.real}\n    ${b.text}`, { at });
}

if (!bad.length) {
  const summary = Object.entries(TRUTH).map(([k, v]) => `${k} ${v}`).join(' · ');
  console.log(`✓ site counts match the registries\n  ${summary}`);
  process.exit(0);
}
console.error(`✗ ${bad.length} stale count(s) on the site:\n`);
for (const b of bad) {
  console.error(`  ${b.rel}:${b.line}  says ${b.stated} ${b.subject}, registry has ${b.real}`);
  console.error(`    ${b.text}`);
}
console.error('\n  Update the copy (and any name list under it), or the number is a claim the product does not back.');
process.exit(1);
