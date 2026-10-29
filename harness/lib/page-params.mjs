// Options a render verb hands to the page: `--param look=riso` reaches the page as `?look=riso`.
// bin/vawe turns the flag into VAWE_PARAMS for every step it runs. The loaders and every per-film file name read it through this file.

export const PARAMS_ENV = 'VAWE_PARAMS';

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
  return [...new URLSearchParams(env[PARAMS_ENV] ?? '')].map(([k, v]) => `${k}-${v}`).join('_').replace(/[^A-Za-z0-9._-]+/g, '-');
}

/** The name every per-film file under out/ is built from: the film, then the params, so two looks of one page never share a file. */
export function paramsFilm(film, env = process.env) {
  const slug = paramsSlug(env);
  return slug ? `${film}-${slug}` : film;
}

/** The `--param k=v` words that put these params back on a printed command, or ''. */
export function paramsFlags(env = process.env) {
  return [...new URLSearchParams(env[PARAMS_ENV] ?? '')].map(([k, v]) => ` --param ${k}=${v}`).join('');
}
