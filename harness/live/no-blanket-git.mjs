#!/usr/bin/env node
import path from 'node:path';
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
  let cwd = '';
  try {
    const payload = JSON.parse(raw);
    cmd = (payload.tool_input || {}).command || '';
    cwd = payload.cwd || '';
  } catch (e) {
    process.stderr.write('BLOCKED: no-blanket-git could not parse the PreToolUse payload it was given, so '
      + `it cannot tell whether this command is one of the four it refuses. JSON.parse failed: ${e.message}.\n\n`
      + 'Retry the command; if this repeats, the tool call is sending no-blanket-git malformed stdin.\n');
    process.exit(2);
  }
  const parts = commandsIn(cmd);
  // The agent sandbox refuses a command that starts by cd-ing into the directory it already runs in.
  const cdTo = /^cd\s+(\S+)$/.exec(parts[0] || '');
  if (cdTo && cwd && path.resolve(cwd, cdTo[1].replace(/^['"]|['"]$/g, '')) === path.resolve(cwd) && parts.length > 1) {
    process.stderr.write(`BLOCKED: a cd into the directory you are already in (${cwd})\n\n`
      + 'Drop the `cd ...;` prefix and run the rest of the command as it is; use paths relative to that directory.\n');
    process.exit(2);
  }
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
