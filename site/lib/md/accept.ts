// Edge-safe and import-free. vawe-hq/vawe-docs vendors this file byte for byte (.github/workflows/sync-docs-vendor.yml).
//
// Markdown wins only when the client names text/markdown with a higher q than text/html. A wildcard
// never selects it: curl, link previews and browsers send */* or nothing and must get HTML.
export function prefersMarkdown(accept: string | null) {
  if (!accept) return false;
  const q = new Map<string, number>();
  for (const part of accept.split(",")) {
    const [type, ...params] = part.trim().toLowerCase().split(";");
    const given = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const value = given ? Number(given.slice(2)) : 1;
    q.set(type.trim(), Number.isNaN(value) ? 0 : value);
  }
  const markdown = q.get("text/markdown") ?? 0;
  const html = q.get("text/html") ?? q.get("text/*") ?? q.get("*/*") ?? 0;
  return markdown > html;
}
