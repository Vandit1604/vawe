/** The content of `<meta name="<name>">` in page html, or null. Pure. */
export function metaOf(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (new RegExp(`\\bname\\s*=\\s*["']${name}["']`, 'i').test(tag)) {
      const m = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      if (m) return m[1];
    }
  }
  return null;
}
