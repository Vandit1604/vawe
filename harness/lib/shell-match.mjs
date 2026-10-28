// What a shell command does, read from its text: shared by the trace reader and the live verb-hint hook, so both agree on what a poll is.
const HEREDOC_BODY = /<<-?\s*(['"]?)(\w+)\1([^\n]*)(?:\n[\s\S]*?\n\s*\2(?=\n|$)|[\s\S]*$)/g;

export const withoutHeredocs = (cmd) => String(cmd).replace(HEREDOC_BODY, '$3');

/** The command without heredoc bodies and quoted strings, so a tool named inside a grep pattern, a message or a file being written does not count. Pure. */
export const bare = (cmd) => withoutHeredocs(cmd).replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, 'Q');

/** A regex for `name` at command position: after a separator, `do`, `then`, `else` or `!`, past env assignments and a path. */
export const atCommand = (name, after = '\\s') => new RegExp(`(?:^|[\\n;&|(\`]\\s*(?:!\\s*)?|\\$\\(|\\b(?:do|then|else)\\s+)(?:[A-Z_]+=\\S+\\s+)*(?:\\S*/)?${name}${after}`);

export const SLEEP = atCommand('sleep', '\\s+\\d');
export const PS_POLL = atCommand('(?:ps\\s+(?:aux|-[a-zA-Z]+)|pgrep)', '\\b');

/** A command that polls for a job: sleep, ps or pgrep at command position. Has `test` so it works as a rule matcher. */
export const POLL = { test: (cmd) => SLEEP.test(bare(cmd)) || PS_POLL.test(bare(cmd)) };
