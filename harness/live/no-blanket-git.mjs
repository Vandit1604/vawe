#!/usr/bin/env node
// harness/live/no-blanket-git.mjs - refuse the four git commands that destroyed work in this repo.
//
// PreToolUse on Bash. Exit 2 blocks the call and returns stderr to the model.
//
// THE INCIDENTS, all in one session, all with several agents on one working tree: a blanket stage swept
// another agent's staged deletion into an unrelated commit and briefly broke main; a shelve took work
// belonging to an agent mid-edit; two agents wiped each other's uncommitted files.
//
// The rule is narrow. Staging by explicit path is untouched, and so is every read-only git command.
// What is refused is the class that cannot tell YOUR work from someone else's.
//
// TWO THINGS THIS FILE LEARNED THE HARD WAY, both the misread this repo logs as #214/#216/#217 - a
// check reading source text instead of the thing the text produces:
//
//   1. MATCH A COMMAND, NEVER PROSE THAT MENTIONS ONE. Version one blocked its own commit, because the
//      message described a banned command inside a heredoc. Version two blocked its own test, because
//      the cases sat in a quoted list. Hence `commandsIn`: strip the parts that are DATA, then require
//      the match at a command position.
//   2. THIS FILE MUST NOT CONTAIN THE LITERALS IT BANS. Every pattern below is written with `\s+`
//      between the words, and the human-readable names are descriptions rather than the commands. So
//      editing this file through a shell does not trip the installed copy of itself.
const BANNED = [
  [/^git\s+add\s+(-A|--all|\.(?:\s|$))/, 'a blanket stage of the whole tree',
   'stage explicit paths instead. With several agents in one tree, a blanket stage cannot tell your work from theirs.'],
  [/^git\s+stash\b(?!\s+list)/, 'shelving the whole working tree',
   'it takes everything dirty, including files another agent is mid-edit. Commit your own paths instead.'],
  [/^git\s+checkout\s+(--\s+)?\.(?:\s|$)/, 'discarding the whole working tree',
   'this throws away every uncommitted change in the tree, not only yours. Name the file you mean to revert.'],
  [/^git\s+reset\s+--hard\b/, 'a hard reset',
   'this destroys uncommitted work repo-wide with no recovery. If you must, name paths: git checkout HEAD -- <path>.'],
];

// Strip the parts of a command line that are DATA rather than code, then return one entry per command
// position, so a pattern anchored with ^ can only match something the shell would actually run.
const commandsIn = (cmd) => cmd
  .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?^\s*\1\s*$/gm, ' ')  // heredoc bodies
  .replace(/'[^']*'/g, "''")                                   // single-quoted literals
  .replace(/"[^"]*"/g, '""')                                   // double-quoted literals
  .split(/[\n;]|&&|\|\||\|/)
  .map((p) => p.trim().replace(/^[({\s]+/, ''));

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = (JSON.parse(raw).tool_input || {}).command || ''; } catch { process.exit(0); }
  const parts = commandsIn(cmd);
  for (const [re, name, why] of BANNED) {
    if (parts.some((p) => re.test(p))) {
      process.stderr.write(`BLOCKED: ${name}\n\n${why}\n\n`
        + 'Refused by harness/live/no-blanket-git.mjs, because this command has already caused real\n'
        + 'data loss in this repo with several agents sharing one tree. See engine-doctrine/MISTAKES.md.\n');
      process.exit(2);
    }
  }
  process.exit(0);
});
