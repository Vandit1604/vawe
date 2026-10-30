// Options a render verb hands to the page: `--param look=riso` reaches the page as `?look=riso`.
// `--aspect 1200:630` overrides the page's aspect meta; it is not a page option, but it is part of the render key and of the file names like one.
// bin/vawe turns the flags into VAWE_PARAMS and VAWE_ASPECT for every step it runs. The loaders and every per-film file name read them through this file.

export const PARAMS_ENV = 'VAWE_PARAMS';
export const ASPECT_ENV = 'VAWE_ASPECT';

/** The VAWE_ASPECT value for a `--aspect` flag: '' for none or `all` (render-page.mjs loops over the named aspects itself). Throws on anything but a W:H integer ratio. */
export function aspectValue(flag) {
  if (flag === undefined || flag === 'all') return '';
  if (!/^[1-9]\d*:[1-9]\d*$/.test(flag)) throw new Error(`--aspect needs W:H whole numbers such as 16:9 or 1200:630, got "${flag}"`);
  return flag;
}

/** The env the flags set for a step; a flag left out sets nothing, so the caller's own env stays. */
export function renderEnv({ param, aspect }) {
  const env = { [PARAMS_ENV]: paramsQuery(param), [ASPECT_ENV]: aspectValue(aspect) };
  return Object.fromEntries(Object.entries(env).filter(([, v]) => v));
}

/** The aspect `--aspect` set for this process, or ''. */
export const aspectOverride = (env = process.env) => env[ASPECT_ENV] ?? '';

// A repeated key is refused: the page reads one value per key, so the second would be dropped without a word.
export function paramsQuery(list) {
  const q = new URLSearchParams();
  for (const item of list ?? []) {
    const eq = String(item).indexOf('=');
    if (eq < 1) throw new Error(`--param needs key=value, got "${item}"`);
    const key = item.slice(0, eq);
    if (q.has(key)) throw new Error(`--param ${key} is given twice: a page reads one value per key`);
    q.append(key, item.slice(eq + 1));
  }
  q.sort();
  return q.toString();
}

export function pageQuery(env = process.env) {
  return env[PARAMS_ENV] ? `?${env[PARAMS_ENV]}` : '';
}

export function paramsSlug(env = process.env) {
  const params = [...new URLSearchParams(env[PARAMS_ENV] ?? '')].map(([k, v]) => `${k}-${v}`).join('_').replace(/[^A-Za-z0-9._-]+/g, '-');
  return [params, aspectOverride(env).replace(':', 'x')].filter(Boolean).join('_');
}

/** The name every per-film file under out/ is built from: the film, then the params and the aspect override, so two looks or two aspects of one page never share a file. */
export function paramsFilm(film, env = process.env) {
  const slug = paramsSlug(env);
  return slug ? `${film}-${slug}` : film;
}

/** The `--param k=v` and `--aspect W:H` words that put these options back on a printed command, or ''. */
export function paramsFlags(env = process.env) {
  const aspect = aspectOverride(env);
  return [...new URLSearchParams(env[PARAMS_ENV] ?? '')].map(([k, v]) => ` --param ${k}=${v}`).join('') + (aspect ? ` --aspect ${aspect}` : '');
}
