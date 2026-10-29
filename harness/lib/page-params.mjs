// Options a render verb hands to the page: `--param look=riso` reaches the page as `?look=riso`.
// bin/vawe turns the flag into VAWE_PARAMS for every step it runs; the loaders (preview-server, render-page) read it here, once.

export const PARAMS_ENV = 'VAWE_PARAMS';

/** The query string (no leading ?) for a list of `key=value` strings, sorted by key so one set of params is one string. Throws on a bad entry. Pure. */
export function paramsQuery(list) {
  const q = new URLSearchParams();
  for (const item of list ?? []) {
    const eq = String(item).indexOf('=');
    if (eq < 1) throw new Error(`--param needs key=value, got "${item}"`);
    q.append(item.slice(0, eq), item.slice(eq + 1));
  }
  q.sort();
  return q.toString();
}

/** `?a=b` for the params of this process, or '' when it has none. */
export function pageQuery(env = process.env) {
  return env[PARAMS_ENV] ? `?${env[PARAMS_ENV]}` : '';
}

/** A file-name part for the params of this process (`look-riso`), or '' when it has none. */
export function paramsSlug(env = process.env) {
  return [...new URLSearchParams(env[PARAMS_ENV] ?? '')].map(([k, v]) => `${k}-${v}`).join('_').replace(/[^A-Za-z0-9._-]+/g, '-');
}
