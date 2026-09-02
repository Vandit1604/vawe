// scripts/site/effects-json.mjs: derive the site's effects index from the SAME family list that
// generates docs/EFFECTS.md, plus one playable scene per previewable effect.
//
//   node scripts/site/effects-json.mjs [--check]   ·   make effects-json
//
// Writes:
//   site/lib/effects.json                       the index the /showcase/effects page renders
//   site/public/assets/effects/<slug>.json      one scene per previewable effect, played live
//
// WHY IT IMPORTS effects-catalog.mjs RATHER THAN THE REGISTRIES. Both would be "derived", but two
// derivations is two family lists, and the moment they disagree the site shows a name the docs do
// not (or the other way round) with both files still valid. That is the blocks.json failure recorded
// in scripts/site/blocks-json.mjs, one layer up. `sections` is exported there; this reads it.
//
// THE JSON SNIPPET IS NOT INVENTED. Every family already documents its own authoring form in the
// intro string effects-catalog.mjs renders above its table. USAGE below carries that form, one per
// family, with the name substituted. A family with no USAGE entry FAILS this script rather than
// rendering an empty code block, for the same reason a family with a gap in its blurb map fails
// effects-catalog.mjs: a catalog that silently renders a blank is how blanks get shipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, d, USAGE_KIT } from './effects-catalog.mjs';
import { FEEL, DURATION, CAMERA_WORDS } from '../../core/vocab.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');
const INDEX = path.join(root, 'site/lib/effects.json');
const SCENES = path.join(root, 'site/public/assets/effects');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// The registry blurbs are written for a markdown doc and lean on the em-dash. No em-dash reaches a
// user-facing surface here (CLAUDE.md, hard rules), and the blurbs live in core/ where this script
// has no business editing them, so the dash is normalised on the way out. The middle dot is the
// sanctioned replacement and it is what the rest of the site already uses.
// A colon or an en dash becomes the site's separator, and NOTHING ELSE DOES. The class used to read
// `[: –]` with a literal SPACE inside it, so it matched every whitespace run and the site received
// every intro with each word separated: "a · first-party · vector, · when · no · real · logo". The
// markdown was fine, which is why it survived: the two renderers read the same intro and only one of
// them was looked at.
// CODE SPANS ARE LEFT ALONE, which is the half the first fix missed. An intro carries the JSON an
// author writes (`{ "move": "diveIn" }`), and rewriting the colon inside it published a snippet that
// cannot be pasted: `{ "move" · "diveIn" }`. Split on backticks and transform only the odd, non-code
// pieces, so punctuation between sentences becomes the separator and punctuation inside an example
// stays punctuation.
const prose = (s) => String(s).split('`')
  .map((part, i) => (i % 2 ? part : part.replace(/\s*[:–]\s*/g, ' · ')))
  .join('`');
const { j } = USAGE_KIT;

// ── the JSON an author writes, per family ───────────────────────────────────────────────────────
// Each returns the snippet shown in the drawer. The shape comes from that family's own intro in
// effects-catalog.mjs (or, where the intro names no form, from formats/scene/schema.json).
//
// THIS TABLE IS NOW THE MINORITY CASE. A registry carries its own `usage` at the definition site
// (core/registry.js), and effects-catalog hands it the same three helpers this table uses. What is
// left here is the 16 families with no registry behind them, so there is no definition site to write
// on. A key here that matches no section id is DEAD: the id is a slug of the TITLE, so renaming a
// section used to orphan its usage and its preview in silence, and the loop below now says so.
const { text, full } = USAGE_KIT;

const USAGE = {
  // A motion voice is placed by the DERIVATION, not usually by hand, but it can be named directly and
  // an author reading the catalogue needs to see how.
  'motion-voices-tactile-sound': (n) => j({ audio: { cues: [{ t: 1.2, name: n }] } }),
  // Two pseudo-names ("beam:border (border-beam)"), so the form is picked off the mode in the name.
  'per-frame-accent-layers': (n) => j({ type: 'beam', mode: n.includes('shine') ? 'shine' : 'border', x: 300, y: 430, w: 1320, h: 220, radius: 22, thickness: 3, speed: 0.5, start: 0, duration: 6 }),
  'vector-layer-logos-icons': (n) => (n.includes('morph')
    ? j({ type: 'svg', d: 'M60 8 L112 100 L8 100 Z', morph: { to: 'M60 8 L112 56 L60 104 L8 56 Z', spin: 6.28 }, x: 840, y: 420, w: 240 })
    : j({ type: 'svg', d: 'M60 8 L112 100 L8 100 Z', stroke: '#fff', strokeWidth: 6, x: 840, y: 420, w: 240, start: 0, duration: 6 })),
  'blend-modes': (n) => text({ mixBlend: n }),
  easings: (n) => j({ motion: [{ t: 0, x: 160 }, { t: 1.2, x: 460, ease: n }] }),
  // One slot each, and which slot depends on which registry the word came from.
  'plain-words-feel-duration-camera': (n) => (n in FEEL ? j({ ease: n })
    : n in DURATION ? j({ enterDur: n })
    : j({ cameraMove: { move: n } })),
  'ransom-faces': (n) => text({ split: 'char', ransom: { faces: [n] } }),
  'output-targets': (n) => j({ module: 'scene', aspect: n }),
};

// ── the scene a previewable effect plays ────────────────────────────────────────────────────────
// A preview is the REAL engine rendering a real scene, the same way /blocks plays a block. So a
// family is previewable when one small scene can honestly demonstrate it with nothing but the name
// substituted. Where that is not true the family says so on the page instead of faking it.
const base = (o) => ({ module: 'scene', aspect: '16:9', theme: 'vawe', duration: 6, audio: { silent: true }, bg: [{ preset: 'plain', from: 0, to: 6 }], ...o });
const HERO = { type: 'text', text: 'Deterministic', x: 160, y: 430, w: 1600, size: 150, weight: 800, align: 'center', start: 0.3, duration: 5.4 };
const TWO = (t) => [
  { ...HERO, text: 'Before the cut', start: 0, duration: 2.4, anim: 'rise', out: 'fade' },
  { ...HERO, text: 'After the cut', start: t, duration: 6 - t, anim: 'rise', color: '#ffd23d' },
];
const OVER = { ...HERO, text: '', size: 96, y: 860, start: 0.4, duration: 5.2, anim: 'fade' };

const PREVIEW = {
  'per-frame-accent-layers': (n) => base({ layers: [
    { type: 'text', text: 'border-beam', x: 460, y: 480, w: 1000, align: 'center', size: 72, weight: 700, font: 'mono', bg: 'rgba(255,255,255,0.04)', pad: '44px', radius: 22, start: 0.3, duration: 5.4 },
    { type: 'beam', mode: n.includes('shine') ? 'shine' : 'border', x: 460, y: 470, w: 1000, h: 170, radius: 22, thickness: 3, tail: 90, speed: 0.5, glow: 0.6, start: 0.5, duration: 5.2 },
  ] }),
};

// Two effects are registered, are listed, and do not boot. Neither is a mistake in this file, and
// neither is hidden: the page names the effect and the reason. Both were found by booting all 229
// preview scenes in a real browser (the sweep is the check, and it is the only thing that can be:
// nothing in node can start the engine). Re-run it after adding a preview family.
//   `shapes` is exported by BG_NAMES and rejected by formats/scene/schema.json, so docs/EFFECTS.md
//   lists a background a scene may not use. That drift is a real bug, reported upstream, not ours.
//   `extrudeText` needs a 3D typeface baked by `make glyphs`, and the site ships no 3D fonts.
const UNPLAYABLE = {
  'backgrounds--shapes': 'the engine rejects it: `shapes` is a registered background name that the scene schema does not accept. The name is real, the preset is not reachable from JSON.',
  'three-js-scenes-real-geometry--extrudetext': 'it needs a 3D typeface baked by `make glyphs`, and the site ships no 3D fonts.',
};

// Why a family cannot be played here. Stated on the page, per family, in the author's own terms.
const NO_PREVIEW = {
  // A SOUND has no still and no moving preview. The site could play it, but the arsenal's preview slot
  // renders a scene to frames, and frames cannot show a thud. Listed with its reason rather than left
  // as a gap, which is what this table is for.
  'motion-voices-tactile-sound': 'a sound has no visual preview: these are heard, not seen. `make audio` bakes them to assets/sfx and any film with `audio:{tactile:true}` plays them.',
  'vector-layer-logos-icons': 'a draw-on or a morph is only itself with real path data. Yours, not a placeholder triangle.',
  'blend-modes': 'a blend mode is a relationship with what is underneath, and the index has no underneath.',
  easings: 'a curve is a feeling over time. Read the table in docs/MOTION-CRAFT.md, then feel it in the editor.',
  'plain-words-feel-duration-camera': 'each word is an alias onto a value listed elsewhere on this page. Preview the thing it resolves to.',
  'ransom-faces': 'a typeface is judged by looking. The ransom clip on /showcase sets all eight.',
  'output-targets': 'an aspect is a property of the canvas, not something that animates. Render at it, or `make audit M=<file> ASPECT=all`.',
};

// ── build ───────────────────────────────────────────────────────────────────────────────────────
// WHERE A FAMILY'S FORMS COME FROM, resolved once so the three passes below (the index, the snippet
// bodies, the preview scenes) cannot answer the question differently. A registry answers it itself,
// through the `catalog` block at its definition; the tables above answer for the rest. The scene kit
// is passed in for the same reason the usage kit is: core/ ships to the browser and must not import a
// documentation swatch.
const SCENE_KIT = { base, HERO, TWO, OVER };
const gaps = [];
const forms = new Map();
for (const [title, , , , meta] of sections) {
  const id = slug(title);
  const usage = meta && meta.usage ? (n) => meta.usage(n, USAGE_KIT) : USAGE[id];
  const preview = meta && meta.preview ? (n) => meta.preview(n, SCENE_KIT) : PREVIEW[id];
  const noPreview = (meta && meta.noPreview) || NO_PREVIEW[id] || null;
  if (!usage) gaps.push(`${title} (id ${id}): no USAGE form`);
  if (!preview && !noPreview) gaps.push(`${title} (id ${id}): neither a PREVIEW scene nor a reason it has none`);
  forms.set(id, { usage: usage || (() => ''), preview: preview || null, noPreview });
}
// A table entry keyed by an id no section has is DEAD, and dead is how a renamed section loses its
// usage without anything saying so: the survivor sits there looking maintained.
for (const [table, name] of [[USAGE, 'USAGE'], [PREVIEW, 'PREVIEW'], [NO_PREVIEW, 'NO_PREVIEW']]) {
  for (const id of Object.keys(table)) if (!forms.has(id)) gaps.push(`${name}["${id}"]: no section has that id, so nothing reads it`);
}

const families = sections.map(([title, intro, list, tag, meta]) => {
  const id = slug(title);
  const { preview } = forms.get(id);
  return {
    id,
    title,
    tag,
    intro: prose(intro),
    // `meta.skip` is the catalog's own decision that a family is self-describing (an easing named by
    // its curve, a blend mode defined by the CSS spec). Those are the families the reference system
    // collapses: one paragraph and one line of names, not 41 rows of near-identical description.
    // So the collapse is READ OFF the data rather than being a second judgement kept by hand.
    mode: meta && meta.skip ? 'chips' : 'table',
    note: (meta && meta.skip) ? prose(meta.skip) : null,
    noPreview: preview ? null : forms.get(id).noPreview,
    count: list.length,
    undescribed: list.filter((n) => d(n, meta) === '\u2014').length,
    entries: list.map((name) => ({
      name,
      // The canonical id for this effect's own page (site/app/showcase/effects/[stem]/page.tsx) and
      // its preview scene. Generated once here rather than re-slugged in three places (the index
      // page, the effect page, generateStaticParams): one wrong re-implementation of `slug()` and a
      // page 404s on a name with a character the copy missed.
      stem: `${id}--${slug(name)}`,
      // `d()` returns an em-dash when a family keeps no blurb for a name. That is a GAP, not a
      // description, so it becomes empty here and the family counts it out loud below.
      desc: d(name, meta) === '\u2014' ? '' : prose(d(name, meta)),
      scene: preview && !UNPLAYABLE[`${id}--${slug(name)}`] ? `/assets/effects/${id}--${slug(name)}.json` : null,
      // A family reason, unless this one name has its own.
      noPreview: UNPLAYABLE[`${id}--${slug(name)}`] || null,
    })),
  };
});

if (gaps.length) {
  console.error('✗ effects-json: a family is not described:');
  for (const g of gaps) console.error(`    ${g}`);
  console.error('  A registry writes its own: the `catalog` block on its defineRegistry call carries usage');
  console.error('  and either preview or noPreview. Everything else adds a row to the tables in this file.');
  process.exit(1);
}

// `--check`: the gap check above and nothing else, so a GATE can run it without regenerating 255
// preview scenes. It exists because this file failed correctly and far too late. Three families were
// added with no rows and the fault sat there until somebody happened to type `make effects`, which
// nothing in the ladder does, so the whole catalogue could not rebuild and no run said so. A check
// that only fires when a human invokes the build is not fail-early, it is fail-eventually.
// lib-test spawns this, so the run that ADDS a vocabulary is the run that goes red.
if (process.argv.includes('--check')) {
  console.log(`✓ effects-json: ${families.length} families, every one has a usage form and a preview or a reason`);
  process.exit(0);
}

const tags = [...families.reduce((m, f) => m.set(f.tag, (m.get(f.tag) ?? 0) + f.count), new Map())]
  .sort((a, z) => a[0].localeCompare(z[0]));
const total = families.reduce((n, f) => n + f.count, 0);
// Counted from the ENTRIES, not the families: two effects in previewable families do not boot.
const previewed = families.reduce((n, f) => n + f.entries.filter((e) => e.scene).length, 0);
const index = { total, previewed, families: families.length, tags, list: families };
// The three numbers on their own. /showcase quotes them in one link and must not import 189KB of
// index to do it: a JSON module bundles whole, and a marketing page paying for the whole arsenal is
// how a page gets slow for a reason nobody can see in the source.
const counts = { total, previewed, families: families.length };
const COUNTS = path.join(root, 'site/lib/effects-counts.json');

// The authoring snippet, keyed by `stem`, for EVERY effect (not just the 227 previewable ones, a
// family with no live preview still gets a page that shows the JSON that uses it). This is what used
// to be the `json` field on each index entry: 59KB of the 166KB the index shipped in the first byte,
// for text that /showcase/effects (the list) never renders. It moves here because
// site/app/showcase/effects/[stem]/page.tsx is a SERVER component, reading it there puts the text
// straight into that one effect's static HTML and never into the client bundle the list page ships.
const BODY = path.join(root, 'site/lib/effects-body.json');
const bodies = Object.fromEntries(
  sections.flatMap(([title, , list]) => {
    const id = slug(title);
    const { usage } = forms.get(id);
    return list.map((name) => [`${id}--${slug(name)}`, usage(name)]);
  }),
);

// The scenes. Written on change only: they are committed, so an unchanged effect must not churn git.
const want = new Map();
for (const [title, , list, , ] of sections) {
  const id = slug(title);
  const { preview } = forms.get(id);
  if (!preview) continue;
  for (const name of list) {
    if (UNPLAYABLE[`${id}--${slug(name)}`]) continue;
    want.set(`${id}--${slug(name)}.json`, j(preview(name)) + '\n');
  }
}

if (CHECK) {
  const cur = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  const curCounts = fs.existsSync(COUNTS) ? fs.readFileSync(COUNTS, 'utf8') : '';
  const curBody = fs.existsSync(BODY) ? fs.readFileSync(BODY, 'utf8') : '';
  const stale = cur.trim() !== (j(index) + '\n').trim()
    || curCounts.trim() !== (j(counts) + '\n').trim()
    || curBody.trim() !== (j(bodies) + '\n').trim()
    || [...want].some(([f, body]) => !fs.existsSync(path.join(SCENES, f)) || fs.readFileSync(path.join(SCENES, f), 'utf8') !== body);
  if (stale) { console.error('✗ site/lib/effects.json is stale, run `make effects-json`.'); process.exit(1); }
  console.log(`✓ effects index in sync: ${total} effects, ${previewed} previewable`);
  process.exit(0);
}

fs.mkdirSync(SCENES, { recursive: true });
let wrote = 0;
for (const [file, body] of want) {
  const p = path.join(SCENES, file);
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body) { fs.writeFileSync(p, body); wrote++; }
}
// A scene left behind by a renamed or deleted effect would keep serving a name the registry dropped.
let gone = 0;
for (const f of fs.existsSync(SCENES) ? fs.readdirSync(SCENES) : []) {
  if (f.endsWith('.json') && !want.has(f)) { fs.unlinkSync(path.join(SCENES, f)); gone++; }
}
fs.writeFileSync(INDEX, j(index) + '\n');
fs.writeFileSync(COUNTS, j(counts) + '\n');
fs.writeFileSync(BODY, j(bodies) + '\n');
console.log(`✓ site/lib/effects.json: ${total} effects across ${families.length} families, ${previewed} previewable`
  + `\n✓ site/lib/effects-body.json: ${Object.keys(bodies).length} authoring snippets, read only by the per-effect pages`
  + `\n✓ site/public/assets/effects: ${want.size} scenes (${wrote} written, ${gone} removed)`);
