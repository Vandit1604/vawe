// A film's signature: six dials a page chooses once, in <meta name="signature" content="band=professional; ease=land; stagger=45; ...">.
// The presets read band, ease and stagger as their defaults; `bin/vawe dev` reads all six.
export const DIALS = ['band', 'ease', 'stagger', 'seam', 'palette', 'thread'];

/** { dial: value } from a meta content string: only known dials with a value; an empty `dial=` is unchosen. Pure. */
export function parseSignature(content) {
  const chosen = {};
  for (const part of String(content ?? '').split(';')) {
    const [key, ...rest] = part.split('=');
    const value = rest.join('=').trim();
    if (DIALS.includes(key.trim()) && value) chosen[key.trim()] = value;
  }
  return chosen;
}

/** The signature of the document the presets run in; {} outside a page. */
export function readSignature(doc = globalThis.document) {
  return parseSignature(doc?.querySelector?.('meta[name="signature"]')?.content);
}
