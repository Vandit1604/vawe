---
when: adding, changing, or looking up one of the ~120 gates a scene or the repo itself is checked
  against
answers: "what quality/ is: every gate script (gates/), its fixtures (fixtures/), ratchet baselines (baselines/), and recorded runs (runs/), plus the audit entry point"
group: engine
---

# quality/

`gates/` holds every checker (~120 scripts) run by a `make <target>`: validators, ratchets, the judge
loop's supporting checks, doc-honesty gates like `doc-refs.mjs` and `craft-coverage.mjs`. `fixtures/`
are small inputs the gates test against. `baselines/` are ratchet files a gate compares today's count
to, so a metric can only get better, never silently worse. `runs/` holds recorded gate output.
`audit.mjs` is the entry point `make audit` calls.

Read by: `make <gate-name>` and CI; an agent about to touch a gate should read the one it's changing
before writing to it.

The one doc: none single; each `gates/*.mjs` carries its own header comment explaining why it exists.
Checked by: `make audit` runs the full set; `quality/baselines/gate-census.json` tracks how many exist.

Look first: `quality/gates/` for the check itself, `quality/baselines/` if it fails on a ratchet.
