#!/usr/bin/env node
// harness/author/draft-init.mjs: a brand-new film's FIRST scene, in one command, no storyboard.
//
// `make dev D=<new-film> DRAFT=1` calls this before rendering. It never overwrites a scene that
// already exists: this is a bootstrap for the "nothing on disk yet" case only, the twin of what
// HyperFrames gets for free from a blank component. A real plan still goes through the eight stages
// (AGENTS.md); this only removes the wall between naming a film and seeing a first frame of it.
import fs from 'node:fs';
import path from 'node:path';
import { filePaths, ROOT } from '../../quality/gates/stage.mjs';

function titleFrom(base, briefPath) {
  if (fs.existsSync(briefPath)) {
    const src = fs.readFileSync(briefPath, 'utf8');
    const subject = src.match(/^SUBJECT:\s*(.+)$/m);
    if (subject) return subject[1].trim().replace(/^./, (c) => c.toUpperCase());
    const h1 = src.match(/^#\s*Brief:\s*(.+)$/m);
    if (h1) return h1[1].trim();
  }
  return path.basename(base).replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** ensureDraftScene(arg) -> {created, scene, title}. Writes the minimal schema-valid scene.json a
 *  film with no scene yet needs: one bg window, one text layer carrying its title. Idempotent: a
 *  scene that already exists is left untouched and reported as such. */
export function ensureDraftScene(arg) {
  const p = filePaths(arg);
  if (fs.existsSync(p.scene)) return { created: false, scene: p.scene };
  const title = titleFrom(p.base, p.brief);
  const scene = {
    module: 'scene',
    theme: 'default',
    aspect: '9:16',
    duration: 4,
    bg: [{ preset: 'plain' }],
    layers: [{
      type: 'text', text: title, x: 100, y: 800, w: 880, size: 90, weight: 800,
      split: 'word', preset: 'up', stagger: 0.08, start: 0.2, duration: 3.5,
    }],
  };
  fs.mkdirSync(path.dirname(p.scene), { recursive: true });
  fs.writeFileSync(p.scene, JSON.stringify(scene, null, 1) + '\n');
  return { created: true, scene: p.scene, title };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node harness/author/draft-init.mjs <film>'); process.exit(1); }
  const r = ensureDraftScene(arg);
  console.log(r.created
    ? `  · drafted ${path.relative(ROOT, r.scene)}: "${r.title}" (no storyboard needed for a draft)`
    : `  · ${path.relative(ROOT, r.scene)} already exists, left as-is`);
}
