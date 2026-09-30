// The one wording for what a command advises and what stops it. An advice line never blocks, so its
// block says what ran on; an error line is the only thing that stops a command.

export const ADVICE_END = '(advice only: the render continued)';

/** Each line as `advice: <line>`, then the end line; nothing for no lines. */
export function adviceBlock(lines, end = ADVICE_END) {
  return lines.length ? [...lines.map((l) => `advice: ${l}`), end] : [];
}

export const errorLine = (msg) => `error: ${msg}`;
