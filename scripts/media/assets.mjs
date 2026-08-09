// scripts/media/assets.mjs — make integrating images easy. Given a data JSON, fill every item that has a
// name but no real image: country → flag (flagcdn, public domain), brand → logo (simple-icons, free),
// else → a generated topic card (scripts/cards.mjs). Rewrites the icon paths in place.
//   node scripts/media/assets.mjs formats/scene/video.json            (dry run — prints the plan)
//   node scripts/media/assets.mjs formats/scene/video.json --write    (fetch/generate + save JSON)
//   flags:  --no-fetch (skip network, cards only) · --replace-emoji (also replace emoji icons)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { card, slugify } from './cards.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dataPath = args.find((a) => !a.startsWith('--'));
const WRITE = args.includes('--write'), NOFETCH = args.includes('--no-fetch'), REPL = args.includes('--replace-emoji');
if (!dataPath) { console.error('usage: node scripts/media/assets.mjs <data.json> [--write] [--no-fetch] [--replace-emoji]'); process.exit(1); }

const isImg = (v) => typeof v === 'string' && (/\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^(assets\/|\/|https?:)/.test(v));
const fmtDir = path.dirname(path.resolve(dataPath));            // formats/<fmt>
const cardsDir = path.join(fmtDir, 'assets', 'cards');         // per-format generated cards

// common country → ISO2 (flagcdn). Extend as needed; unknown names fall through to a card.
const COUNTRY = { 'united states': 'us', usa: 'us', america: 'us', 'united kingdom': 'gb', uk: 'gb', britain: 'gb', china: 'cn', india: 'in', japan: 'jp', germany: 'de', france: 'fr', italy: 'it', spain: 'es', russia: 'ru', brazil: 'br', canada: 'ca', australia: 'au', mexico: 'mx', indonesia: 'id', 'south korea': 'kr', korea: 'kr', turkey: 'tr', 'saudi arabia': 'sa', iran: 'ir', egypt: 'eg', nigeria: 'ng', ethiopia: 'et', pakistan: 'pk', bangladesh: 'bd', vietnam: 'vn', philippines: 'ph', greenland: 'gl', antarctica: 'aq', 'congo': 'cd', netherlands: 'nl', sweden: 'se', norway: 'no', poland: 'pl', argentina: 'ar', 'south africa': 'za', thailand: 'th', ukraine: 'ua', switzerland: 'ch', ireland: 'ie', portugal: 'pt', greece: 'gr', israel: 'il', uae: 'ae', singapore: 'sg', 'new zealand': 'nz' };

// collect "slots": (object holding the icon, the name string, the icon field key)
function slots(o, acc = []) {
  if (!o || typeof o !== 'object') return acc;
  if (Array.isArray(o)) { for (const v of o) slots(v, acc); return acc; }
  if (typeof o.name === 'string' && ('icon' in o || o.name)) acc.push({ obj: o, name: o.name, key: 'icon' });
  if (typeof o.a === 'string' && ('iconA' in o || true)) acc.push({ obj: o, name: o.a, key: 'iconA' });
  if (typeof o.b === 'string' && ('iconB' in o || true)) acc.push({ obj: o, name: o.b, key: 'iconB' });
  for (const v of Object.values(o)) if (v && typeof v === 'object') slots(v, acc);
  return acc;
}

async function tryFetch(url, dest) {
  if (NOFETCH) return false;
  try {
    const r = await fetch(url); if (!r.ok) return false;
    const body = Buffer.from(await r.arrayBuffer());
    if (body.length < 60 || !body.toString('utf8', 0, 200).includes('<svg')) return false; // guard 404/placeholder
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, body); return true;
  } catch { return false; }
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const all = slots(data);
const plan = [];
const done = new Map(); // name → resolved icon path (dedup)

for (const s of all) {
  const cur = s.obj[s.key];
  const needs = !cur || (!isImg(cur) && (REPL || cur === undefined || cur === ''));
  if (!needs) continue;
  if (done.has(s.name)) { plan.push({ ...s, to: done.get(s.name), how: 'dedup' }); continue; }
  const slug = slugify(s.name), key = s.name.toLowerCase().trim();
  let to = null, how = '';
  const iso = COUNTRY[key];
  if (iso) { const dest = path.join(repoRoot, 'assets/flags', iso + '.svg');
    if (fs.existsSync(dest) || await tryFetch(`https://flagcdn.com/${iso}.svg`, dest)) { to = `/assets/flags/${iso}.svg`; how = 'flag'; } }
  if (!to) { const dest = path.join(repoRoot, 'assets/icons', slug + '.svg');
    if (fs.existsSync(dest) || await tryFetch(`https://cdn.simpleicons.org/${slug}`, dest)) { to = `/assets/icons/${slug}.svg`; how = 'logo'; } }
  if (!to) { const dest = path.join(cardsDir, slug + '.svg'); fs.mkdirSync(cardsDir, { recursive: true });
    fs.writeFileSync(dest, card({ title: s.name })); to = path.relative(fmtDir, dest); how = 'card'; }
  done.set(s.name, to); plan.push({ ...s, to, how });
}

if (!plan.length) { console.log('✓ every item already has a real image — nothing to do.'); process.exit(0); }
console.log(`\n${WRITE ? 'WROTE' : 'PLAN (dry run — pass --write to apply)'} · ${dataPath}`);
for (const p of plan) console.log(`  ${p.how.padEnd(6)} ${p.name}  →  ${p.to}`);
const byHow = plan.reduce((m, p) => ((m[p.how] = (m[p.how] || 0) + 1), m), {});
console.log(`  (${Object.entries(byHow).map(([k, v]) => `${v} ${k}`).join(', ')})`);

if (WRITE) {
  for (const p of plan) p.obj[p.key] = p.to;
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n✓ updated ${dataPath} — render with:  ./bin/vawe ${path.relative(repoRoot, path.resolve(dataPath))}`);
} else {
  console.log('\n(dry run) re-run with --write to fetch/generate + update the JSON.');
}
