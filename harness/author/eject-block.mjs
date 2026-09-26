#!/usr/bin/env node
// harness/author/eject-block.mjs: `make dev-tool X=add BLOCK=<name> D=<film>` runs a block factory ONCE and writes
// its output straight into the film's own `layers[]`, in place of the `{type:"block"}` sugar layer, so
// the film owns and can restyle every property the factory returned. This is the escape hatch out of
// the shared factory: a film that wants a look no theme's `look.surface` covers stops asking the block
// for it and starts editing its own copy.
//
// WHY A SEPARATE SCRIPT, NOT `make expand`: `core/engine/expand.js`'s `expandScene` lowers the WHOLE
// film (every block/beat/comp instance) into a throwaway in-memory scene for gates and the renderer; it
// never writes back to disk, and it does not tell one instance from its siblings. Ejecting is a targeted,
// one-instance, ONE-TIME edit an author asks for by name, so it re-uses `expandBlock`'s own factory
// lookup (`blocks/index.mjs`'s `BLOCKS` map) but writes the result back into the source file, tagged
// with where it came from.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as B from '../../blocks/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function commitHash() {
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); }
  catch { return 'uncommitted'; }
}

// findBlockLayer(layers, block, id): the first `{type:"block", block}` layer at any depth (children of
// a group/comp instance included, since a block can sit inside one), optionally narrowed by `id` when
// a film carries more than one instance of the same block. Returns the ARRAY IT LIVES IN plus its index,
// so the caller can splice the expansion in at exactly that position.
function findBlockLayer(layers, block, id) {
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!l || typeof l !== 'object') continue;
    if (l.type === 'block' && l.block === block && (id == null || l.id === id)) return { parent: layers, i };
    if (Array.isArray(l.children)) {
      const found = findBlockLayer(l.children, block, id);
      if (found) return found;
    }
  }
  return null;
}

export function ejectBlock(filmPath, blockName, id = null) {
  const abs = path.isAbsolute(filmPath) ? filmPath : path.join(ROOT, filmPath);
  const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!Array.isArray(data.layers)) throw new Error(`${filmPath}: no top-level "layers" array`);

  const f = B.BLOCKS[blockName];
  if (!f) throw new Error(`unknown block "${blockName}". known: ${Object.keys(B.BLOCKS).join(', ')}`);

  const found = findBlockLayer(data.layers, blockName, id);
  if (!found) throw new Error(`no {type:"block", block:"${blockName}"} layer found in ${filmPath}${id ? ` with id "${id}"` : ''}`);
  const { parent, i } = found;
  const { type: _type, block: _block, ...opts } = parent[i];

  const ejectedFrom = { block: blockName, commit: commitHash() };
  const rawLayers = f(opts).map((layer) => ({ ...layer, ejectedFrom }));

  parent.splice(i, 1, ...rawLayers);
  fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n');
  return rawLayers.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const film = process.env.D;
  const block = process.env.BLOCK;
  const id = process.env.ID || null;
  if (!film || !block) {
    console.error('usage: make dev-tool X=add BLOCK=<name> D=<film.json> [ID=<layer id>]');
    process.exit(1);
  }
  const n = ejectBlock(film, block, id);
  console.log(`ejected "${block}" in ${film}: ${n} layer(s) written in place, tagged ejectedFrom`);
}
