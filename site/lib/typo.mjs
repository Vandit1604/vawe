// The one typographic transform (Butterick, "Practical Typography"; site/DESIGN.md "Typography rules").
// Curly quotes and apostrophes, a real ellipsis, en dashes in number ranges, a nonbreaking space between
// a number and its unit, and "x" between two numbers as a multiplication sign. It never writes an em dash
// (house rule). Text only: never inside a tag, <code>, <pre> or a bare URL. Used by the blog renderer, the
// generators in scripts/site and the pages that set copy from data.

const NBSP = "\u00a0";
export const UNIT = "s|ms|fps|px|MB|KB|GB|TB|dB|LUFS|Hz|kHz|kbps|Mbps|min|seconds?|minutes?|frames?|hours?";
const NUMBER_UNIT = new RegExp(`(\\d) (${UNIT})(?![\\w])`, "g");
const OPEN_BEFORE = /[\s([{\u2018\u201c/-]/;

export function smartText(text, before = "") {
  if (/https?:\/\/|www\./.test(text)) return text;
  const t = text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\.\.\./g, "\u2026")
    // 1-16, not a date (2026-10-11) and not a word (10-bit)
    .replace(/(^|[^\d-])(\d+)-(\d+)(?![\d-])/g, "$1$2\u2013$3")
    .replace(NUMBER_UNIT, `$1${NBSP}$2`)
    .replace(/(\d) x (\d)/g, `$1${NBSP}\u00d7${NBSP}$2`);
  let out = "";
  let prev = before;
  for (const ch of t) {
    if (ch === '"') out += !prev || OPEN_BEFORE.test(prev) ? "\u201c" : "\u201d";
    else if (ch === "'") out += !prev || OPEN_BEFORE.test(prev) ? "\u2018" : "\u2019";
    else out += ch;
    prev = ch;
  }
  return out;
}

export const smart = (text) => smartText(text, "");

export function smartHtml(html) {
  let skip = 0;
  let last = "";
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) {
      const m = /^<(\/?)(code|pre|script|style)\b/i.exec(part);
      if (m) skip += m[1] ? -1 : 1;
      return part;
    }
    if (skip > 0 || !part) {
      if (part) last = part.slice(-1);
      return part;
    }
    const done = smartText(part, last);
    last = part.slice(-1);
    return done;
  }).join("");
}
