import { VERBS } from '../../cli/verbs.mjs';
import { RULES } from '../../live/verb-hint.mjs';

const VERB_NAMES = new Set(VERBS.map((v) => v.name));
const HELP = /(?:^|\s)(?:--help|-h)(?:\s|$)/;
const SEGMENT = /&&|\|\||;|\n|\|/;
const VERB_CALL = /^\s*(?:[A-Z_][A-Z0-9_]*=\S*\s+)*(?:(?:node|rtk)\s+)?(?:\S*\/)?vawe\s+([a-z0-9-]+)(.*)$/;
const FOOTER = /^vawe: ([a-z0-9-]+) (ok|FAILED)(?: \((.*)\))? in ([\d.]+)s$/gm;
const HEREDOC_BODY = /<<-?\s*(['"]?)(\w+)\1([^\n]*)(?:\n[\s\S]*?\n\s*\2(?=\n|$)|[\s\S]*$)/g;
const NEXT_LINE = /^next: (.*)$/gm;
const READER = /\b(cat|head|tail|sed|grep|rg|awk|less|bat)\b/;
const DOC = /(?:^|[\s'"=/])(AGENTS\.md|taste\/build\/DIGEST\.md|taste\/rules\/[\w.-]+\.md|taste\/craft\/[\w.-]+\.md|guides\/[\w.-]+\.md|skills\/[\w-]+\/SKILL\.md|prompts\/moves\/[\w.-]+\.md)/g;
const FILM_FILE = /films\/([a-z0-9][\w-]*)\/(page\.html|brief\.md|DESIGN\.md|kit\/)/;
const SHELL_WRITE = /(?:>|\btee\b|\bcp\b|\bmv\b)[^\n|;&]*films\/([a-z0-9][\w-]*)\/(page\.html)|sed -i[^\n]*films\/([a-z0-9][\w-]*)\/(page\.html|brief\.md)/;

export const RAW_TOOLS = {
  ffmpeg: /\bffmpeg\b/,
  ffprobe: /\bffprobe\b/,
  browser: /puppeteer|playwright|--headless|--screenshot/i,
  sleep: /\bsleep\s+\d/,
  psPoll: /\b(?:ps\s+(?:aux|-[a-zA-Z]+)|pgrep)\b/,
  curl: /\bcurl\b/,
};

export const BLOCKED = /^[✗!]? ?pre-(?:commit|push) blocked|hook (?:error|blocked)|blocked by (?:a |the )?hook|too complex to verify|Refusing to run|^make: \*\*\* \[[a-z-]+\] Error/im;
const BAN_LINES = {
  noTells: /No tells unless the brief asks|stock device \(sheen band/,
  attractors: /not an attractor|attractor list|Attractors:/i,
  slideshow: /slideshow/i,
  digest: /Taste digest/,
};

/** The text of a tool_result content, string or block list. */
export const textOf = (content) => (typeof content === 'string' ? content
  : Array.isArray(content) ? content.map((c) => c.text ?? '').join('\n') : '');

/** The vawe verbs a shell command calls, in order, as { verb, args }. Pure. */
export function commandVerbs(cmd) {
  const found = [];
  const script = String(cmd).replace(HEREDOC_BODY, '$3');
  if (/^\s*(?:git|gh)\s/.test(script)) return found;
  for (const segment of script.split(SEGMENT)) {
    const m = segment.match(VERB_CALL);
    if (m && VERB_NAMES.has(m[1])) found.push({ verb: m[1], args: m[2].trim(), help: HELP.test(m[2]) });
  }
  return found;
}

/** The raw tools a command uses: every verb-hint rule that matches, and the raw extras when the command calls no vawe verb. Pure. */
export function rawTools(cmd, hasVerb) {
  const ids = RULES.filter((r) => r.test.test(cmd)).map((r) => `hint:${r.id}`);
  if (!hasVerb) ids.push(...Object.entries(RAW_TOOLS).filter(([, re]) => re.test(cmd)).map(([id]) => id));
  return ids;
}

/** The footer lines of a verb result: { verb, ok, reason, secs }. Pure. */
export function footersOf(text) {
  return [...text.matchAll(FOOTER)].map((m) => ({ verb: m[1], ok: m[2] === 'ok', reason: m[3] ?? null, secs: Number(m[4]) }));
}

/** The verbs named by each `next:` line of a verb result, as arrays of verb names. Pure. */
export function nextNamed(text) {
  return [...text.matchAll(NEXT_LINE)].map((m) => namedVerbs(m[1]));
}

/** The vawe verbs a line of advice names, in order. Pure. */
export const namedVerbs = (line) => [...String(line).matchAll(/vawe ([a-z0-9-]+)/g)].map((m) => m[1]).filter((v) => VERB_NAMES.has(v));

/** The taste and guide docs a call reads, as keys like taste/build/DIGEST.md. Pure. */
export function docsRead(name, input = {}) {
  if (name === 'Skill' && input.skill) return [`skills/${input.skill}/SKILL.md`];
  const target = name === 'Read' ? String(input.file_path ?? '')
    : name === 'Bash' && READER.test(input.command ?? '') ? String(input.command) : '';
  return [...new Set([...target.matchAll(DOC)].map((m) => m[1]))];
}

const writtenText = (input) => String(input.content ?? input.new_string ?? '') + (input.edits ?? []).map((e) => e.new_string ?? '').join('\n');

/** The film files a call writes, as { film, what, text }: what is page, brief, design or kit. Pure. */
export function filmWrites(name, input = {}) {
  const asWhat = (file) => ({ 'page.html': 'page', 'brief.md': 'brief', 'DESIGN.md': 'design', 'kit/': 'kit' })[file];
  if (['Write', 'Edit', 'MultiEdit'].includes(name)) {
    const m = String(input.file_path ?? '').match(FILM_FILE);
    return m ? [{ film: m[1], what: asWhat(m[2]), text: writtenText(input) }] : [];
  }
  const m = name === 'Bash' ? String(input.command ?? '').match(SHELL_WRITE) : null;
  if (!m) return [];
  return [{ film: m[1] ?? m[3], what: asWhat(m[2] ?? m[4]), text: '' }];
}

/** The film a `vawe new` call starts, or null. Pure. */
export const newFilm = (verbs) => verbs.find((v) => v.verb === 'new' && !v.help)?.args.split(/\s+/).find((a) => /^[a-z0-9][\w-]*$/.test(a)) ?? null;

/** What a result says about the call: flags for each failure class and each ban line. Pure. */
export function resultFlags(text, isError) {
  const exitFail = isError === true || /^Exit code [1-9]/m.test(text);
  return {
    exitFail,
    hook: BLOCKED.test(text),
    glob: /(?:zsh|eval)[^\n]*no matches found:/.test(text),
    notFound: /command not found/.test(text),
    testFail: /^# fail [1-9]|^not ok /m.test(text),
    noApproval: /no approval for /.test(text),
    ban: Object.keys(BAN_LINES).filter((k) => BAN_LINES[k].test(text)),
  };
}
