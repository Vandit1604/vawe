---
when: setting up or navigating a reference film for a recreation
answers: what lives in quality/refs/<name>/, which files are tracked, and which tools read them
group: process
---

# quality/refs: reference films

A reference is an in-house film a recreation must match. Its footage stays local; only the record of
what was measured is tracked.

```
quality/refs/<ref-name>/
  source.url    the reference's URL or a one-line note on where it came from
  beats.md      time windows and technique names, measured (see below)
  source.mp4    the film itself (gitignored)
  study/ drafts/ grid/   generated (gitignored)
```

Write `beats.md` from a measured cut list, never from a contact sheet:
`node harness/dev/ref-cutlist.mjs REF=<ref-name>` finds the cuts and writes one `## Beat <n>` heading
per window, each with a `- window: <start>-<end>s` line. Fill the label and the technique by looking
at the stills it saves.

The loop that uses a reference is in `skills/vawe-reference/SKILL.md`: `bin/vawe spec` measures it,
`bin/vawe compare` and `bin/vawe coverage` check the rebuild against it, and
`node harness/media/match.mjs <ref.mp4> <render.mp4>` ranks the beats worst first.
