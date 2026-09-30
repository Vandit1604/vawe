---
when: you are writing or changing a command that reports something (a gate, a check, an audit)
answers: the one output contract every reporting command follows, tight prose by default and --json for structure
group: crosscutting
---

# Command output: one contract, two renderings

A reporting command builds a finding as a record first and renders prose from it. It never prints
ad-hoc text. The contract lives in `harness/lib/findings.mjs`.

1. **A finding is a record**: `{code, severity, summary, at?, fix?, doc?}`. Build the record, not a sentence.
2. **Prose is rendered from the record**, one tight line per finding. There is one place that states the
   fact, so prose and JSON cannot drift.
3. **`--json` emits the records and nothing else on stdout.** Headers, counts and advice go to stderr.
   The exit code is the same in both modes. (`engine-doctrine/MISTAKES.md` #401: a human line printed
   after the JSON made it unparseable.)
4. **The rationale lives in a code comment, not in runtime output.** At runtime a reader wants what is
   wrong, where (`at`), how to fix it (`fix`) and the one doc that settles it (`doc`).

Use `gateFindings()` to record and render, and `emitJson()` to print a payload of your own under
`--json`: it is the one door to stdout. `bin/vawe check <gate> --json` forwards the flag. A gate can
also write its records to the file named by `VAWE_FINDINGS_OUT`.

Test runners tally pass and fail and are not finding-shaped: they stay prose.
