// harness/lib/findings.mjs: a gate returns a typed RESULT, never a paragraph the caller re-reads.
//
// WHY THIS EXISTS. quality/gates/author-check.mjs is the aggregator over this repo's gates. It ran each
// one as a subprocess and then decided whether a rule had fired by SCRAPING ITS PROSE:
//
//     new RegExp(`[✗~]\\s*\\[${code}\\]`).test(out)
//
// Forty of the gates can fail, and every one of them was one reformat away from becoming invisible to
// that regex. Nothing would error. The step would print its findings in full, the aggregator would read
// none of them, and the film would pass. The failure is silent by construction, which is the worst
// property a check can have.
//
// THE CLASS HAS ALREADY BITTEN, AND IT IS RECORDED. docs/MISTAKES.md #401: motion-audit --json printed
// its human verdict line to stdout AFTER the JSON, so the documented machine-readable output was never
// machine-readable. A sweep over the library reported all 154 scenes as CRASHED and the number was
// believed until somebody read the parse error instead of the count.
//
// So the contract is inverted. A finding is a RECORD first. The printed line is RENDERED from that
// record, here, and is the only way to print one. There is no second place to state the fact, so a gate
// cannot reformat itself out of being heard: changing the wording changes `summary`, and the aggregator
// reads `code`.
//
// THE RULE #401 PAID FOR, IN ONE LINE: under --json, NOTHING but JSON may reach stdout. Every other
// sentence a gate prints, headers, counts, verdicts, advice, goes to stderr. The exit code does not move
// in either mode: a caller that only wants the verdict keeps working.
//
// HOW THE AGGREGATOR GETS THE RECORDS. Not by asking for --json: author-check STREAMS each gate's prose
// to the person watching, and running every gate twice to get the same answer in two shapes would double
// the ladder's cost and invite the two runs to disagree. Instead the caller names a file in
// VAWE_FINDINGS_OUT and the gate writes its records there while printing prose to stdout exactly as
// before. One run, both shapes, and the prose is untouched.
import fs from 'node:fs';

const GLYPH = { error: '✗', warn: '~', info: '·' };
const SEVERITIES = new Set(Object.keys(GLYPH));

const jsonMode = process.argv.includes('--json');
// Bind the real stdout BEFORE anything is allowed to redirect it, then redirect. This runs at import
// time, ahead of the gate's first header, because #401 was not a gate that printed prose deliberately:
// it was a gate that printed one line in the wrong order and nobody could see it from the outside.
const realStdout = process.stdout.write.bind(process.stdout);
if (jsonMode) process.stdout.write = process.stderr.write.bind(process.stderr);

/**
 * gateFindings({ scene, indent, line }) -> an emitter. Named for the caller rather than the fact
 * because half the gates already hold a local `findings` array of their own raw hits, and shadowing
 * that on import is the kind of collision a reader has to untangle at the wrong moment.
 *   .fail / .warn / .note (code, summary, extra?)  record one finding
 *   .finding({ code, severity, scene, at, summary, fix, doc })  the long form
 *   .records                                        what has been recorded
 *   .emit()                                         render: prose to stdout, or JSON under --json
 *
 * `line(record, glyph)` renders ONE record and may return several lines. It exists because the gates
 * do not all print alike and their output must not move; it consumes the record, so the record is still
 * the only statement of the fact.
 */
// A gate speaks ONCE, whatever it prints in however many places. plan-vs-render reports its planned
// beats in one block and asks its spectacle question in another, so two emitters exist in one process
// and each would otherwise overwrite the other's side-channel file. The records therefore accumulate
// module-wide and the payload is every finding the gate made; only the RENDERING is per-emitter,
// because that is the part the gates genuinely do differently.
const ALL = [];
let emitted = false;
const allRecords = () => ALL.flat();

const flush = () => {
  const payload = JSON.stringify(allRecords(), null, 2);
  if (jsonMode) realStdout(payload + '\n');
  const out = process.env.VAWE_FINDINGS_OUT;
  if (out) { try { fs.writeFileSync(out, payload); } catch { /* a side channel must never fail a gate */ } }
};

// A gate that finds nothing exits early and never reaches its report block. Under --json that would
// print no JSON at all, which is the same unparseable stdout #401 shipped, only emptier; and the caller
// could not tell "this gate found nothing" from "this gate does not speak records yet". So the empty
// result is still a result, and it is flushed on the way out.
process.on('exit', () => { if (!emitted) flush(); });

export function gateFindings(opts = {}) {
  const { scene = null, indent = '  ', line = null } = opts;
  const records = [];
  ALL.push(records);

  const add = (severity, code, summary, extra = {}) => {
    if (!SEVERITIES.has(severity)) throw new Error(`findings: unknown severity "${severity}"`);
    if (!code) throw new Error('findings: a finding with no code cannot be routed, waived or ratcheted');
    // Field order is the documented shape, not insertion order: a record a person reads in a --json
    // dump should lead with what fired and where, not with whatever the gate happened to pass last.
    const { at, fix, doc, waived, ...rest } = extra;
    const rec = {
      code, severity,
      ...(scene ? { scene } : {}),
      ...(at ? { at } : {}),
      summary: String(summary),
      ...(fix ? { fix } : {}),
      ...(doc ? { doc } : {}),
      ...(waived ? { waived: true } : {}),
      ...rest,
    };
    records.push(rec);
    return rec;
  };

  const glyphFor = (r) => (r.waived ? '○' : GLYPH[r.severity]);
  const render = (r) => (line ? line(r, glyphFor(r)) : `${indent}${glyphFor(r)} [${r.code}] ${r.summary}`);

  return {
    records,
    get count() { return records.length; },
    finding: (rec) => add(rec.severity || 'warn', rec.code, rec.summary, (({ code, severity, summary, ...rest }) => rest)(rec)),
    fail: (code, summary, extra) => add('error', code, summary, extra),
    warn: (code, summary, extra) => add('warn', code, summary, extra),
    note: (code, summary, extra) => add('info', code, summary, extra),
    render,
    emit() {
      emitted = true;
      if (!jsonMode) for (const r of records) console.log(render(r));
      flush();
    },
  };
}

/**
 * A gate that already owned `--json` before this module existed keeps its own payload, and prints it
 * through here. eye-trace is the one: its --json is a whole eye-trace report (junctions, debt, the
 * findings inside it), documented and read by people, and replacing it with a bare finding array would
 * be a silent loss dressed up as a contract. What it must NOT do is print that object with console.log,
 * because this module has already pointed stdout at stderr; and it must claim the payload, or the exit
 * flush would append a second document to the same stream. That is exactly the two-writers-one-stdout
 * shape of docs/MISTAKES.md #401, so there is one door and this is it.
 */
export function emitJson(value) {
  emitted = true;
  realStdout(JSON.stringify(value, null, 2) + '\n');
}

/** Read back what a gate wrote to VAWE_FINDINGS_OUT. Returns null when the gate wrote nothing. */
export function readFindings(file) {
  try {
    const recs = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(recs) ? recs : null;
  } catch { return null; }
}
