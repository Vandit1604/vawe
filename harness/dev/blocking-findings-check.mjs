import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GATES = path.join(ROOT, 'quality/gates');
const RATCHET = path.join(ROOT, 'harness/dev/blocking-findings-check-ratchet.json');

/** Walk source text from `start` (the '(' of a call) to its matching ')', string-literal aware. */
function matchParen(src, start) {
  let depth = 0, i = start, inStr = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i + 1; }
  }
  return src.length;
}

/** Every `<method>(...)` call in `src`, as the full text from the opening to the closing paren. */
function extractCalls(src, methodRe) {
  const calls = [];
  const re = new RegExp(methodRe, 'g');
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length - 1;
    const end = matchParen(src, start);
    calls.push(src.slice(start, end));
    re.lastIndex = end;
  }
  return calls;
}

/** Split a call's inner text on its top-level commas (depth-aware, string-literal aware). */
function splitTopArgs(inner) {
  const args = [];
  let depth = 0, cur = '', inStr = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      cur += c;
      if (c === '\\') { cur += inner[++i] ?? ''; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; cur += c; continue; }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) args.push(cur);
  return args;
}

const hasKey = (text, key) => new RegExp(`\\b${key}\\s*(?::|,|\\}|$)`).test(text);
const isWaived = (text) => /\bwaived\s*:\s*true\b/.test(text);

/** One entry per BLOCKING (non-waived) finding call this scan can see, with what it could tell. */
function blockingCalls(file, src) {
  const out = [];

  for (const call of extractCalls(src, '\\.fail\\(')) {
    const args = splitTopArgs(call.slice(1, -1));
    const extra = args[2]?.trim();
    if (extra && isWaived(extra)) continue; // a re-emitted waiver is not a block (author-check.mjs)
    const literal = extra?.startsWith('{');
    out.push({
      file, kind: 'fail',
      determinate: literal === true,
      hasAt: literal ? hasKey(extra, 'at') : false,
      hasFix: literal ? hasKey(extra, 'fix') : false,
      snippet: call.slice(0, 80).replace(/\s+/g, ' '),
    });
  }

  for (const call of extractCalls(src, '\\.finding\\(')) {
    const inner = call.slice(1, -1).trim();
    if (!inner.startsWith('{')) continue; // not the { code, severity, ... } long form
    if (!/\bseverity\s*:\s*['"]error['"]/.test(inner)) continue; // not literally 'error'
    if (isWaived(inner)) continue;
    out.push({
      file, kind: 'finding',
      determinate: true,
      hasAt: hasKey(inner, 'at'),
      hasFix: hasKey(inner, 'fix'),
      snippet: call.slice(0, 80).replace(/\s+/g, ' '),
    });
  }

  return out;
}

function census() {
  const files = fs.readdirSync(GATES).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs')).sort();
  const all = files.flatMap((file) => blockingCalls(file, fs.readFileSync(path.join(GATES, file), 'utf8')));
  const missing = all.filter((c) => !c.determinate || !(c.hasAt && c.hasFix));
  return { total: all.length, missing };
}

const { total, missing } = census();
const n = missing.length;

const f = gateFindings({ line: (r) => r.summary });
for (const m of missing) {
  f.warn('blocking-finding-not-actionable', `${m.file}: a blocking finding (${m.snippet}…) is missing 'at' and/or 'fix'`, {
    at: `quality/gates/${m.file}`,
    doc: 'harness/lib/findings.mjs',
  });
}

const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
console.error(`\n  BLOCKING FINDINGS · ${total} blocking finding call(s) found statically, ${n} missing 'at' and/or 'fix'\n`);

if (process.argv.includes('--stamp')) {
  fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
  fs.writeFileSync(RATCHET, `${JSON.stringify({ notActionable: n }, null, 1)}\n`);
  console.error(`  ✓ ratchet stamped at ${n}${prior ? `, ${n <= prior.notActionable ? 'down' : 'UP'} from ${prior.notActionable}` : ''}\n`);
} else if (prior && n > prior.notActionable) {
  console.error(`  ✗ ${n} blocking finding(s) lack 'at'/'fix', up from ${prior.notActionable}.`);
  console.error("    A BLOCKING finding must name what it saw (summary), where (at), and the one fix (fix).");
  console.error('    A doc pointer is not a fix; put the doc in the `doc` field. If this is deliberate, raise the');
  console.error('    bar on purpose: node harness/dev/blocking-findings-check.mjs --stamp\n');
} else if (prior && n < prior.notActionable) {
  console.error(`  ~ ${prior.notActionable - n} fewer than the ratchet allows. Lower it: node harness/dev/blocking-findings-check.mjs --stamp\n`);
} else if (!prior) {
  console.error('  (no ratchet stamped yet: node harness/dev/blocking-findings-check.mjs --stamp)\n');
} else {
  console.error(`  ✓ at the ratchet (${prior.notActionable})\n`);
}

f.emit();
if (prior && n > prior.notActionable) process.exit(1);
