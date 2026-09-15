---
when: you are writing or changing a command that reports something (a gate, a check, an audit)
answers: the one output contract every reporting command follows, tight prose by default and --json for structure
group: crosscutting
codes: ad-hoc-output
---

# Command output: one contract, two renderings

## AGENT SUMMARY

- Any reporting command (gate, check, audit) must build a finding as a record `{code, severity, summary, at?, fix?, doc?}` first, then render prose from it, never print ad-hoc text.
- `--json` emits ONLY the records on stdout, everything else (header, verdict, advice) goes to stderr, same exit code both modes.
- `[gated: ad-hoc-output]` `quality/gates/output-contract.mjs` ratchets non-compliant reporting gates down; a new one that prints ad-hoc prose is refused.

A reporting command (a gate, a check, an audit) must not invent its own print style. It follows the
house contract in `harness/lib/findings.mjs`, which `engine-doctrine/MISTAKES.md #401` paid for.

## The rule

1. **A finding is a RECORD first**: `{code, severity, summary, at?, fix?, doc?}`. Build the record,
   never a sentence.
2. **Prose is RENDERED from the record.** The default human output is a tight line per finding. There is
   no second place to state the fact, so prose and JSON cannot drift.
3. **`--json` emits the records and NOTHING else on stdout.** Every header, count, verdict, and piece of
   advice goes to stderr. The exit code is identical in both modes. (The #401 failure was a human line
   printed to stdout AFTER the JSON, which made the JSON unparseable.)
4. **Rationale lives in code comments, not runtime output.** The WHY a check exists is for whoever reads
   the source. At runtime a reader wants: what is wrong, where (`at`), how to fix (`fix`), and the one
   doc that settles it (`doc`). No walls of teaching text in the output.

## How

Use `gateFindings()` to render and `emitJson()` under `--json` (see the 14 gates that already do, e.g.
`quality/gates/discovery.mjs`). The aggregator reads records via `VAWE_FINDINGS_OUT`, so a gate writes
its records there while printing prose to stdout exactly as before.

## Reaching JSON from a command

Every reporting gate honours `--json`. A `make` target forwards it with `JSON=1`:

```bash
make discovery JSON=1        # JSON-only on stdout, same exit code as prose
```

## What is NOT in scope

- Test runners (`lib-test`) tally pass/fail; they are not finding-shaped and stay prose.
- Pure libraries and non-printing helpers report nothing, so they have nothing to render.
Both are exempt in `quality/gates/output-contract.mjs`, named rather than silently skipped.

## The gate

`quality/gates/output-contract.mjs` counts reporting gates not yet on this contract and ratchets the
number down (`quality/baselines/output-contract-ratchet.json`, falls but never rises). A new reporting gate that
prints ad-hoc prose raises the count and is refused. Migrate one, lower the ratchet with `--stamp`.
