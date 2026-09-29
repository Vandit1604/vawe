# Framework task template

Paste this block at the top of a task for a framework agent, then fill the three blanks. Nothing
else is needed: `AGENTS.md` and `engine-doctrine/CRAFT/ENGINE-CHANGES.md` hold the rest.

```
RULES (read first):
1. Create and change files with the Write and Edit tools only. No `cat > file <<EOF`, no python or
   node one-liners that write files, no `for` loops, no `$(...)`, no long `cd ... && ...` chains:
   the sandbox refuses them. Never prefix a command with `cd <your worktree>;` (you are already
   there). Read a file over 500 lines with `grep -n`, then Read with offset and limit; never read
   it whole twice.
2. Stage explicit paths (`git add a.mjs b.mjs`). `git add -A` and `git add .` are blocked. Plain
   `git`, never `git -C`. First command: `git branch -m <topic-name>`. If a hook fails on missing
   node_modules, run `sh harness/dev/link-shared.sh`.
3. You own ONLY: <files or folders>. Do not touch <files another agent owns>.
4. Commits: plain message, one logical step each, no AI attribution, no Co-Authored-By, never
   --no-verify, no em dash (U+2014) anywhere. Comments only for facts the code cannot show.
5. Scratch files go in /tmp/claude-501/<topic>/. Return the report as text. Never write it to
   FINDINGS.md or REPORT.md.

CONTEXT: <one paragraph: what the task changes and why>

STATIC CHECKS before each commit: `node --check <each changed .mjs>`,
`node quality/gates/doc-refs.mjs <each changed .md>`, `node harness/dev/no-emdash.mjs`.

ALLOWED TEST COMMANDS: `node harness/dev/e2e.mjs` (about 4 s: page tests plus half-size drafts),
`node --test tests/<one file>`, `bin/vawe dev <page>`. No full `bin/vawe test` unless the task says so.

REPORT (text, under 400 words): commits, what changed, what you left undone and why.
```
