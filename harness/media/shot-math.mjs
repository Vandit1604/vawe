// Pure parts of `vawe shot`. No I/O and no heavy imports: harness/cli/verbs.mjs loads this file to check the arguments.
import path from 'node:path';

export const DEFAULT_WIDTHS = [1440, 390];
export const DEFAULT_BASE = 'http://localhost:3080';
const USAGE = 'usage: bin/vawe shot <route|url|page.html>[,more] [--w 1440,390] [--full] [--base http://localhost:3080]';

/** The widths of `--w`, in order, or null when the text is not a comma list of widths from 200 to 4000. Pure. */
export function parseWidths(text) {
  const list = String(text).split(',').map((s) => Number(s.trim()));
  return list.length && list.every((w) => Number.isInteger(w) && w >= 200 && w <= 4000) ? list : null;
}

/** The targets of the positional argument: a comma list of routes, urls and html files. Pure. */
export const parseTargets = (text) => String(text || '').split(',').map((s) => s.trim()).filter(Boolean);

/** The first problem in the arguments of shot, or null. Pure. */
export function shotProblem({ targets, w, base }) {
  if (!targets.length) return `missing <route|url|page.html>; ${USAGE}`;
  if (w !== undefined && !parseWidths(w)) return `--w is not a comma list of widths from 200 to 4000: "${w}"`;
  if (base !== undefined && !/^https?:\/\//.test(base)) return `--base is not an http(s) url: "${base}"`;
  const bare = targets.find((t) => !/^https?:\/\//.test(t) && !t.startsWith('/') && !t.endsWith('.html'));
  if (bare) return `"${bare}" is not a route (/blog), a url (https://...) or a .html file; ${USAGE}`;
  return null;
}

/** What a target opens: { kind: 'file', file } for an html file, else { kind: 'url', url } joined onto the base. Pure. */
export function resolveTarget(target, base) {
  if (/^https?:\/\//.test(target)) return { kind: 'url', url: target };
  if (target.endsWith('.html')) return { kind: 'file', file: target };
  return { kind: 'url', url: new URL(target, base).href };
}

/** The PNG name for one target at one width: /blog/x at 390 is blog-x-390.png, / is home-390.png, /blog?view=list is blog-view-list-390.png. Pure. */
export function shotName(target, width) {
  const t = resolveTarget(target, 'http://x');
  const raw = t.kind === 'file' ? path.basename(path.dirname(path.resolve(t.file))) + '-' + path.basename(t.file, '.html') : (({ pathname, search }) => pathname + search)(new URL(t.url));
  const slug = raw.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
  return `${slug}-${width}.png`;
}

/** A phone width gets a phone-height viewport. Pure. */
export const viewportHeight = (width) => (width <= 500 ? 844 : 900);
