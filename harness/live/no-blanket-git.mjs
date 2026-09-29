#!/usr/bin/env node
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

const SHELL_FORMS = [
  [/^(for|while|until)\b/, 'a shell loop',
   'run the commands one per call, or write a small .mjs in your scratch folder and run it.'],
  [/^sed\s+(?:\S+\s+)*?(?:-[A-Za-z]*i\S*|--in-place\S*)(?:\s|$)/, 'sed -i',
   'use the Edit tool; macOS sed and GNU sed disagree on -i.'],
];

const commandsIn =(cmd) => cmd
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
  // The agent sandbox refuses a multi-part command that starts with cd; a lone cd stays allowed.
  if (/^cd(\s|$)/.test(parts[0] || '') && parts.length > 1) {
    process.stderr.write(`BLOCKED: a command that starts with cd (${cwd || 'cwd unknown'})\n\n`
      + 'Drop the `cd ...;` prefix and use absolute or repo-relative paths.\n');
    process.exit(2);
  }
  for (const [re, name, fix] of SHELL_FORMS) {
    if (parts.some((p) => re.test(p))) {
      process.stderr.write(`BLOCKED: ${name}\n\n${fix}\n`);
      process.exit(2);
    }
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
