# Framework task template

Paste this block at the top of a task for a framework agent, then fill the three blanks. Nothing
else is needed: `AGENTS.md` and `engine-doctrine/CRAFT/ENGINE-CHANGES.md` hold the rest.

```
RULES (read first):
1. Create and change files with the Write and Edit tools only. No `cat > file <<EOF`, no python or
   node one-liners that write files, no `for` loops, no `$(...)`, no `sed -i` (macOS sed needs
   `-i ''` and fails otherwise), and no `cd` at all: use repo-relative or absolute paths. Read a
   file over 500 lines with `grep -n`, then Read with offset and limit; never read it whole twice.
   Plan every change to a file first, then apply them in the fewest Edit calls: each call re-sends
   your whole context.
2. Stage explicit paths (`git add a.mjs b.mjs`). `git add -A` and `git add .` are blocked. Plain
   `git`, never `git -C`. First command: `git branch -m <topic-name>`. If a hook fails on missing
   node_modules, run `sh harness/dev/link-shared.sh`.
3. You own ONLY: <files or folders>. Do not touch <files another agent owns>.
4. Commits: plain message, one logical step each, no AI attribution, no Co-Authored-By, never
   --no-verify, no em dash (U+2014) anywhere. Comments only for facts the code cannot show.
5. Scratch files go ONLY in your own /tmp/claude-501/<your-topic>/, never the session scratchpad or another agent's folder; draft renders take --out out/<your-topic>-*.mp4 when two agents render one film. Return the report as text. Never write it to
   FINDINGS.md or REPORT.md.

CONTEXT: <one paragraph: what the task changes and why>

STATIC CHECKS before each commit: `node --check <each changed .mjs>`,
`node quality/gates/doc-refs.mjs <each changed .md>`, `node harness/dev/no-emdash.mjs`.

ALLOWED TEST COMMANDS: `node harness/dev/e2e.mjs` (about 4 s: page tests plus half-size drafts),
`node --test tests/<one file>`, `bin/vawe dev <page>`. No full `bin/vawe test` unless the task says so.

REPORT (text, under 400 words): commits, what changed, what you left undone and why.
```

## Film task (one agent per beat or chapter)

Measured on the first film: a small range, a starting context under 10 files and the loop below
cut a polish pass from 14.6 to 2.3 minutes and from 24.6 M to 3.1 M input tokens.

```
Keep rules 1, 3 and 5 above. You own ONLY films/<name>/<your chapter or beat file>; never git add
a private film (films/recreations/). Read GUIDE.md first; the font, palette and shared assets are
fixed there before you start.
LOOP: `bin/vawe compare --page films/<name>/page.html --ref <ref.mp4> --at <3-5 s> --out
/tmp/claude-501/<topic>/c.png`, Read that ONE sheet, list every difference, fix them all in the
fewest edits, repeat. Never render a range to look at frames. At most 6 loops.
DONE: every row of the guide's text list for your seconds is on screen at its time.
REPORT (under 200 words): what changed, what still differs, every tool problem with its time cost.
```
