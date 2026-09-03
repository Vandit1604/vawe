#!/usr/bin/env node
// scripts/gates/discovery.mjs · can an author still FIND what this engine can do?
//
// WHY THIS IS ITS OWN GATE. Discovery broke three separate ways in one week, and each break was
// invisible until somebody went looking:
//
//   · 131 registry entries carried no blurb, so `make arsenal` could only find them by exact name.
//     An author who already knows the name does not need to search.
//   · 95 of 95 BLOCK families were not in the search corpus at all. `Q="a terminal window"` answered
//     "assume the engine does not have it" about a block that has existed for months. The website's
//     /arsenal had indexed them the whole time, so two indexes over one library disagreed by 185
//     entries, and the poorer one is the one CLAUDE.md tells you to run before inventing anything.
//   · 33 entries reached the corpus from the CATALOGUE rather than from a registry, so the load-time
//     blurb refusal in core/registry.js could not see them. It reported zero and was telling the
//     truth about registries while a third of a hundred things stayed unfindable.
//
// The last one is the argument for a gate rather than more load-time checks. `checkCovered` guards
// the write site and cannot be reached by a source that has no write site. This reads the CORPUS,
// which is what the search actually answers from, so it sees every source at once and cannot be
// fooled by one of them being clean.
//
// WHAT IT DOES NOT DO. It does not judge whether a blurb is GOOD. scripts/gates/lib-test.mjs owns
// that: the blurb self-retrieval floor, the PRESENT/ABSENT confidence calibration, and the plain
// English question set. Two owners for one question is how they drift apart. This gate owns
// presence: is the thing in the index, does it have words, and is its family asked for (check 5).
//
// WHEN IS DISCOVERY "DONE". When four things hold and none can regress in silence: every entry has a
// blurb (checkBlurb, at load), the corpus has no bare entry (check 2, ratchet at 0), every searchable
// family is asked for by the eval (check 5), and the confidence threshold stays between the PRESENT and
// ABSENT sets (lib-test). The paraphrase gap is closed with `aka` synonyms and the labeled eval, not
// with semantic/vector retrieval: that was decided NO on purpose, because embeddings add a model, an
// index to rebuild on every registry edit, drift, and softer abstention, to buy recall the deterministic
// pieces already buy. Revisit only if the corpus stops fitting in memory or starts changing at query time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from '../author/arsenal.mjs';
import { registries } from '../../core/registry.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RATCHET = path.join(ROOT, 'verify/discovery-ratchet.json');
const stamp = process.argv.includes('--stamp');
// The printed line is rendered FROM the record (docs/MISTAKES.md #401): each record's `summary`
// already carries the full multi-line advice a human reads, so the custom renderer prints it verbatim,
// and it is printed once, at f.emit(), rather than scattered across the five checks below.
const f = gateFindings({ line: (r) => r.summary });

const corpus = await collect();
console.log(`\n  DISCOVERY · ${corpus.length} entries across ${new Set(corpus.map((e) => e.kind)).size} kinds`);

// ---- 1. REGISTRIES: zero tolerance, because the write site refuses it ----------------------------
// core/registry.js throws at load for an entry with no blurb, and there is no opt-out any more. So a
// non-zero count here means the refusal has been weakened, not that somebody forgot.
{
  const bare = [];
  for (const reg of registries()) {
    const b = reg.blurbs || {};
    for (const n of Object.keys(reg.entries || {})) if (!b[n]) bare.push(`${reg.kind}:${n}`);
  }
  if (bare.length) f.fail('registry-bare',
    `\n  ✗ ${bare.length} REGISTRY entr(ies) have no blurb: ${bare.slice(0, 6).join(' ')} ` +
    `\n    core/registry.js refuses this at load, so it cannot happen by forgetting. ` +
    `\n    Something has weakened checkCovered. Restore it rather than adding one here.`);
  else console.log(`  ✓ every registry entry carries a blurb`);
}

// ---- 2. THE WHOLE CORPUS: a ratchet, because one source has no write site to refuse at ------------
// The catalogue (docs/EFFECTS.md) is the corpus's second source and nothing refuses on its behalf, so
// this backstops the corpus the way checkCovered backstops the registries.
// THE RATCHET IS AT ZERO. Every entry the search can name now carries a blurb, so any new bare entry
// blocks. The last four (`beam:border`, `beam:shine`, `svg:draw`, `svg:morph`, pseudo-names for a MODE
// of a layer type) reached the corpus with an empty blurb because their descriptions sat in the flat
// DESC map that only docs/EFFECTS.md reads, not in the section's own `blurbs` map that the search
// reads; scripts/site/effects-catalog.mjs now scopes them (BEAM_BLURBS / SVG_BLURBS) so both see them.
// The ransom faces (8) and the aspect ratios (5) that once sat here each earned a registry instead
// (core/ransom.js, core/safe.js), and "a handwriting face" reaches Caveat, "vertical for a phone"
// reaches 9:16. That is the standing answer for a real vocabulary that turns up bare: give it a
// registry (which buys the load-time refusal too), not a permanent seat in this ratchet.
// The number may fall and may never rise.
{
  const bare = corpus.filter((e) => !e.blurb || !e.blurb.trim());
  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  const kinds = {};
  for (const e of bare) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const summary = Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(' ');
  if (stamp) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ unfindable: bare.length, kinds }, null, 1)}\n`);
    console.log(`  ✓ ratchet stamped at ${bare.length} unfindable${prior ? `, down from ${prior.unfindable}` : ''}`);
  } else if (prior && bare.length > prior.unfindable) {
    const known = new Set(Object.keys(prior.kinds || {}));
    const fresh = [...new Set(bare.map((e) => e.kind))].filter((k) => !known.has(k));
    f.fail('corpus-bare',
      `\n  ✗ ${bare.length} entr(ies) in the search have no blurb, up from ${prior.unfindable}. ` +
      `\n    by kind: ${summary} ` +
      (fresh.length ? `\n    NEW kind(s) with no blurb: ${fresh.join(' ')} ` : '') +
      `\n    An entry with no blurb is findable only by someone who already knows its name, which is` +
      `\n    the definition of undiscoverable. Give it a blurb where it is written. If its vocabulary` +
      `\n    is not a registry yet, making it one is the real fix: it buys the load-time refusal too.` +
      `\n    Lower the bar deliberately only with: node scripts/gates/discovery.mjs --stamp\n`);
  } else if (prior && bare.length < prior.unfindable) {
    console.log(`  ~ ${prior.unfindable - bare.length} fewer unfindable than the ratchet allows. Lower it: --stamp`);
  } else console.log(`  ✓ ${bare.length} entr(ies) without a blurb, at the ratchet (${summary})`);
}

// ---- 3. BLOCKS: every family the catalog declares must be in the search --------------------------
// This is the one that was 95 of 95 missing. Hard zero: blocks/catalog.mjs is the single owner of a
// block's name, and blocks/index.mjs throws at load for a factory with no row there, so there is no
// legitimate reason for a family to exist and be unsearchable.
// IT READ THE WRONG FIELD AND PASSED OVER ITS OWN SUBJECT. This built its family set from `r.name`
// filtered to bare names, which is not the set of families: it is the set of families that HAPPEN to
// have a bare row. Five did not (`pricingCard` exists only as `card.pricing`, `lowerThird` only as
// `lowerThird.bild` and ten siblings), so the check ran over 95 of 100 and reported all clear about
// exactly the rows it exists to catch. `make arsenal Q="a pricing plan card"` answered ABSENT the
// whole time. The family lives in `r.family`; the name is what a scene writes.
{
  const found = new Set(corpus.filter((e) => e.kind === 'block').map((e) => e.name));
  const familyOf = new Map(CATALOG.map((r) => [r.name, r.family]));
  const families = [...new Set(CATALOG.map((r) => r.family))];
  const represented = new Set([...found].map((n) => familyOf.get(n)).filter(Boolean));
  const missing = families.filter((fam) => !represented.has(fam));
  if (missing.length) f.fail('block-unsearchable',
    `\n  ✗ ${missing.length} block famil(ies) are not in the search: ${missing.slice(0, 8).join(' ')} ` +
    `\n    scripts/author/arsenal.mjs reads blocks/catalog.mjs. If a family is missing, that read broke.`);
  else console.log(`  ✓ all ${families.length} block families are searchable`);
}

// ---- 4. THE TWO INDEXES MUST AGREE, or differ only where somebody decided they should -------------
// The website's /arsenal and the CLI's `make arsenal` index one library. They disagreed by 185 for
// months. They differ by exactly one declared thing now: the namespaced `family.variant` block rows,
// left out of the CLI on purpose and on evidence, because a variant and its family split their shared
// words and the blurb self-retrieval floor fell from 97% to 95% with them in. Any OTHER difference is
// a regression: it means the site can show a capability the tool will tell you does not exist.
{
  const sitePath = path.join(ROOT, 'site/lib/arsenal.json');
  let items = [];
  try {
    const raw = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
    items = Array.isArray(raw) ? raw : (raw.items || []);
  } catch { console.log('  ~ site/lib/arsenal.json unreadable, index parity not checked'); }
  if (items.length) {
    const cli = new Set(corpus.map((e) => e.name));
    const missing = items.map((i) => i.n || i.name).filter((n) => n && !cli.has(n));
    const variants = missing.filter((n) => n.includes('.'));
    const unexplained = missing.filter((n) => !n.includes('.'));
    if (unexplained.length) f.fail('index-parity',
      `\n  ✗ ${unexplained.length} thing(s) the WEBSITE lists that the CLI cannot find: ` +
      `\n    ${unexplained.slice(0, 8).join(' ')} ` +
      `\n    The site would show these and \`make arsenal\` would answer "assume the engine does not` +
      `\n    have it". Add them to the corpus in scripts/author/arsenal.mjs, beside the blocks.`);
    else console.log(`  ✓ the two indexes agree, apart from ${variants.length} namespaced variants left out on purpose`);
  }
}

// ---- 5. EVERY SEARCHABLE FAMILY IS ASKED FOR, or discovery is only HALF measured ------------------
// Checks 1-4 prove a thing is IN the index. They cannot prove the index answers the words a person
// types: that is the labeled eval in lib-test.mjs (PRESENT + PLAIN), and its blind spot is a whole
// FAMILY nobody wrote a query for. This closes it the way checkBlurb closes a bare entry: a searchable
// family with no author-phrased golden query FAILS, so a new vocabulary cannot land undiscoverable-in-
// -practice and pass in silence. Families reached by mechanism (an easing, a blend mode, a keyframe
// handle) are exempt and named in scripts/dev/family-coverage.mjs; they are still covered per-entry by
// blurb self-retrieval. This owns no list of its own: it reads that module, which reads the live eval.
{
  const { familyCoverage } = await import('../dev/family-coverage.mjs');
  const { uncovered, covered, wantCount } = await familyCoverage();
  if (!wantCount) f.fail('family-uncovered',
    '\n  ✗ read ZERO queries from lib-test.mjs: the PRESENT/PLAIN parse in family-coverage.mjs has rotted.');
  else if (uncovered.length) f.fail('family-uncovered',
    `\n  ✗ ${uncovered.length} searchable famil(ies) have no author-phrased query in the eval: ` +
    `\n    ${uncovered.map((u) => u.family).slice(0, 8).join(', ')} ` +
    `\n    An author who cannot phrase a family in plain English cannot find it, whatever its blurbs say.` +
    `\n    Add one query per family to PRESENT/PLAIN in scripts/gates/lib-test.mjs that resolves to it,` +
    `\n    and close any miss with \`aka\` at the write site. Worklist: node scripts/dev/family-coverage.mjs` +
    `\n    If a family is genuinely reached only by mechanism, exempt it in scripts/dev/family-coverage.mjs.`);
  else console.log(`  ✓ all ${covered.size} searchable families are asked for by the eval`);
}

f.emit();
const bad = f.records.filter((r) => r.severity === 'error').length;
if (bad) { console.error(`\n  discovery: ${bad} finding(s)\n`); process.exit(1); }
console.log('  ✓ discovery: an author can find what the engine can do\n');
process.exit(0);
