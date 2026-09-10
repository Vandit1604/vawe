// quality/gates/no-judge.mjs: has the eye actually looked at every film that shipped a render?
//
// `make judge` is doctrine's own word for "the only step that SEES" (AGENTS.md), and AGENTS.md calls
// it MANDATORY post-render. Nothing enforced that: a film can render, ship, and reach the ledger having
// never been looked at, and until judge.mjs started writing a receipt (`quality/baselines/approved/judge/`,
// harness/lib/receipt.mjs) there was no artefact anywhere recording whether the eye ever ran. The
// strongest check in the repo was also the easiest one to skip, silently.
//
// WHAT COUNTS AS "LOOKED AT". A valid receipt: exists, is not stale against the CURRENT scene JSON
// (receipt.mjs hashes the subject's bytes + any html fragment it names), and its `renderHash` matches
// a fresh sha256 of the mp4 sitting in `out/` right now. That last part is deliberate and is the
// difference from every mtime-based check in this repo (tile.mjs's `gradeable`, on purpose, uses mtime
// because a hash was judged not worth the cost there): a receipt is a claim about bytes someone looked
// at, and a claim that survives a changed video regardless of its own timestamp is exactly the
// stale-artefact-read-as-fresh mistake this repo has logged more than once. `renderHash` makes a
// re-render (same name, different bytes, whatever the mtime says) invalidate the receipt outright.
// Any verdict (PASS or FIX) counts as "looked at": this ratchet asks whether the eye ran, not whether
// it liked what it saw.
//
// A RATCHET, same shape as discovery.mjs's corpus check and arsenal-check's blurb count: the number is
// almost certainly high today (the receipt mechanism is new), so blocking on it would stop everyone's
// loop. `--stamp` records the current count as the new ceiling; without it, an INCREASE fails and a
// decrease is reported but not required. It never blocks a run other than its own.
//
// DELIBERATELY NOT in quality/gates/author-check.mjs, `make ship`, or CI (.github/workflows/gates.yml):
// author-check.mjs is owned by other work in flight right now, and both formats/scene/*.json content and
// out/*.mp4 renders are gitignored (.gitignore:2,21), so a CI checkout or a small local clone would
// report a number that says nothing about the real library, the same reason doc-refs stays out of CI
// (see the comment at the top of gates.yml). It runs on demand, like `make discovery`, and in
// .githooks/pre-push once an author actually wants it enforced there.
//
//   node quality/gates/no-judge.mjs [--stamp] [--json]
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { population, ROOT } from '../../harness/lib/census.mjs';
import { readReceipt } from '../../harness/lib/receipt.mjs';
import { renderOf } from './tile.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const RATCHET = path.join(ROOT, 'quality/baselines/no-judge-ratchet.json');

const isScene = (name, dir = path.join(ROOT, 'formats/scene')) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')).module === 'scene'; }
  catch { return false; }
};

export const hashFile = (p) => { try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } };

/** Has the eye looked at THIS scene's THIS render? False for "never judged" and for "judged a render
 *  that is no longer the one on disk" alike; the ratchet below does not need to tell them apart, and
 *  neither does a caller deciding whether to trust a PASS. */
export function isJudged(scenePath, mp4 = renderOf(scenePath)) {
  const r = readReceipt('judge', scenePath);
  if (!r.exists || r.stale || !r.receipt.verdict) return false;
  return r.receipt.renderHash === hashFile(mp4);
}

// The CLI body only runs when this file is the entry point, so tests can import hashFile/isJudged
// without triggering a repo-wide scan.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stamp = process.argv.includes('--stamp');
  const f = gateFindings();

  const { names } = population('no-judge', { filter: (n) => n !== 'schema.json' && !n.startsWith('_') && isScene(n) });

  const rendered = [];
  for (const name of names) {
    const scenePath = path.join('formats/scene', name);
    const mp4 = renderOf(scenePath);
    if (!fs.existsSync(mp4)) continue; // never rendered: not this ratchet's question
    rendered.push({ scenePath, mp4 });
  }

  const unjudged = rendered.filter(({ scenePath, mp4 }) => !isJudged(scenePath, mp4));

  console.log(`  ${rendered.length} rendered film(s), ${unjudged.length} with no valid judge receipt`);

  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  if (stamp) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ noJudge: unjudged.length }, null, 1)}\n`);
    console.log(`  ✓ ratchet stamped at ${unjudged.length}${prior ? `, was ${prior.noJudge}` : ''}`);
  } else if (prior && unjudged.length > prior.noJudge) {
    f.fail('no-judge', `\n  ✗ ${unjudged.length} rendered film(s) have no valid judge receipt, up from ${prior.noJudge}:` +
      `\n    ${unjudged.slice(0, 6).map((u) => u.scenePath).join(', ')}${unjudged.length > 6 ? ', …' : ''}` +
      `\n    \`make judge D=<file>\` then \`node quality/gates/judge.mjs <file> --verdict PASS|FIX\` records that the` +
      `\n    eye actually ran on THIS render. Lower the bar deliberately only with: node quality/gates/no-judge.mjs --stamp\n`);
  } else if (prior && unjudged.length < prior.noJudge) {
    console.log(`  ~ ${prior.noJudge - unjudged.length} fewer un-judged than the ratchet allows. Lower it: --stamp`);
  } else if (!prior) {
    console.log(`  (no ratchet stamped yet: node quality/gates/no-judge.mjs --stamp)`);
  } else {
    console.log(`  ✓ at the ratchet (${prior.noJudge})`);
  }

  f.emit();
  if (f.records.some((r) => r.severity === 'error')) process.exit(1);
}
