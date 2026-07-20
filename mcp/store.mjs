// mcp/store.mjs — the video record. One JSON file per video under VAWE_DATA (default .vawe-data/).
//
// Deliberately a flat file store, not a database. A video's whole life is: a scene was submitted, a
// draft was rendered, maybe it was paid for, maybe a clean file exists. That is four fields and no
// relations. A file per video is inspectable with `cat`, survives a crash mid-write via the tmp+rename
// below, and can be swapped for Postgres the day two machines need to see the same record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Default INSIDE the repo, not process.cwd(). The renderer serves the scene to headless Chrome from
// a static file server rooted at the repo, so a scene written anywhere else is fetched as a Go 404
// page and the browser reports `Unexpected non-whitespace character after JSON at position 4` —
// which is JSON.parse("404 page not found"). Using cwd worked only when the server happened to be
// started from the repo, i.e. in every test and no real session.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = process.env.VAWE_DATA || path.join(repoRoot, '.vawe-data');
const dir = (sub) => { const d = path.join(ROOT, sub); fs.mkdirSync(d, { recursive: true }); return d; };

export const paths = {
  scenes: () => dir('scenes'),
  drafts: () => dir('drafts'),
  exports: () => dir('exports'),
  records: () => dir('records'),
  uploads: () => dir('uploads'),
};

export const newId = () => 'vid_' + crypto.randomBytes(8).toString('hex');

const recFile = (id) => path.join(paths.records(), `${id}.json`);

/** Atomic write: a half-written record read by the next call is worse than no record. */
function writeJSON(file, obj) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

export function get(id) {
  const f = recFile(id);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

export function save(rec) {
  writeJSON(recFile(rec.id), rec);
  return rec;
}

export function create({ owner, aspect }) {
  return save({
    id: newId(),
    owner: owner || 'anon',
    aspect: aspect || '16:9',
    status: 'created',
    paid: false,
    revisions: 0,
    createdAt: null,   // stamped by the caller: this module must stay clock-free for tests
    draft: null,       // { file, url, seconds }
    export: null,      // { file, url, seconds }
    lastGates: null,
  });
}

export function list(owner) {
  return fs.readdirSync(paths.records())
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(paths.records(), f), 'utf8')))
    .filter((r) => !owner || r.owner === owner);
}
