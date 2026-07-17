// Slice the rendered `make catalog` pages (out/_catalog-N.mp4) into one still per block
// → site/public/assets/blocks/<name>.png, in blocks.json (grid) order. The catalog lays out 6 blocks
// per page on a 3x2 grid (see scripts/blocks-catalog.mjs); we grab a settled frame and crop each cell.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { CATALOG } from "../../blocks/catalog.mjs";

// The grid MUST come from the same source blocks-catalog.mjs laid the pages out from, and in the same
// order: this script identifies each block purely by its cell index, so a grid that disagrees with the
// rendered video by one row crops every later block from the wrong cell and writes it under the right
// name. This used to read site/lib/blocks.json, a hand-kept copy that agreed by luck.
const grid = CATALOG.filter((e) => !e.overlay);
const OUT = "site/public/assets/blocks";
fs.mkdirSync(OUT, { recursive: true });

const PER = 6, COLS = 3, CELL_W = 600, CELL_H = 490, X0 = 70, Y0 = 132;
const pages = Math.ceil(grid.length / PER);
let done = 0, miss = 0;

for (let p = 1; p <= pages; p++) {
  const mp4 = `out/_catalog-${p}.mp4`;
  if (!fs.existsSync(mp4)) { console.error(`missing ${mp4}`); miss += PER; continue; }
  for (let i = 0; i < PER; i++) {
    const block = grid[(p - 1) * PER + i];
    if (!block) break;
    const col = i % COLS, row = (i / COLS) | 0;
    const x = Math.max(0, X0 + col * CELL_W - 12);
    const y = Math.max(0, Y0 + row * CELL_H - 50);
    const w = Math.min(600, 1920 - x), h = 470;
    const safe = block.name.replace(/[^a-z0-9.]/gi, "_");
    try {
      execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "4.5", "-i", mp4,
        "-vf", `crop=${w}:${h}:${x}:${y}`, "-frames:v", "1", "-q:v", "3", `${OUT}/${safe}.png`], { stdio: "pipe" });
      done++;
    } catch (e) { console.error(`fail ${block.name}: ${e.message.slice(0, 60)}`); miss++; }
  }
}
console.log(`blocks-stills: ${done} stills → ${OUT}, ${miss} missing`);
