// mcp/fetchers.mjs. Bring a real brand mark or an openly-licensed photo into a caller's uploads.
// Both go through safeFetch (SSRF-guarded) and land under the caller via uploads.save, which sniffs
// the bytes and refuses hostile SVG. So a logo or photo is exactly as safe as an upload, because it
// becomes one.
import { safeFetch } from './net.mjs';
import * as uploads from './uploads.mjs';

// simple-icons: a mark, nominative use (a trademark shown to identify the brand). Slug charset is
// locked so the path cannot be steered anywhere but the icon CDN's own namespace.
export async function logo(owner, slug, hex) {
  const clean = String(slug || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!clean) throw new Error('give a brand slug, e.g. "stripe" or "github"');
  const colour = /^[0-9a-f]{3,6}$/i.test(hex || '') ? '/' + hex : '';
  const buf = await safeFetch(`https://cdn.simpleicons.org/${clean}${colour}`);
  return uploads.saveBuffer(owner, buf); // reuses the upload sniffer + hostile-svg refusal
}

// Openverse: CC0 / public-domain photos only, so nothing here needs a credit line in the video and
// nothing triggers a content claim. The result's own image URL is fetched through the SAME guard,
// because Openverse hands back URLs on arbitrary third-party hosts.
export async function photo(owner, query, license = 'cc0,pdm') {
  const q = String(query || '').trim();
  if (!q) throw new Error('give a search, e.g. "marble bust" or "city skyline night"');
  const api = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}`
    + `&license=${encodeURIComponent(license)}&size=large&page_size=6`
    + `&fields=id,title,url,creator,license`;
  const meta = JSON.parse((await safeFetch(api)).toString('utf8'));
  const results = meta.results || [];
  for (const r of results) {
    try {
      const buf = await safeFetch(r.url);
      const saved = uploads.saveBuffer(owner, buf);
      return { ...saved, title: r.title, creator: r.creator, license: r.license };
    } catch { /* try the next result; a dead host is not a failure of the search */ }
  }
  throw new Error(`no openly-licensed image downloaded for "${q}" (${license})`);
}
