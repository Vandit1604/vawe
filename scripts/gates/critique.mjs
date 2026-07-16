// scripts/critique.mjs — the VALUE GATE. Static critic over a scene JSON that fires on the failure
// modes a human otherwise catches per-scene: placeholder words, unbacked claims, static lists,
// illegible transitions, lonely low-value beats. Not taste-complete, but it makes the recurring
// mistakes un-shippable. Run: node scripts/critique.mjs <scene.json> [--strict]
//
// Modeled on another engine' per-frame red-flags + our docs/skill "every frame fights for its value".
import fs from 'node:fs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node scripts/critique.mjs <scene.json> [--strict]'); process.exit(2); }
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const layers = d.layers || [];
const findings = [];
const F = (sev, rule, msg, t) => findings.push({ sev, rule, msg, t });

const s0 = (l) => l.start ?? 0;
const s1 = (l) => s0(l) + (l.duration ?? 0);
const overlaps = (l, a, b) => s0(l) < b && s1(l) > a;

// ---- cluster layers into beats by start-time gaps ----
const starts = [...new Set(layers.map(s0))].sort((a, b) => a - b);
const beats = [];
let cur = null;
for (const t of starts) {
  if (!cur || t - cur.end > 1.4) { cur = { start: t, end: t }; beats.push(cur); }
  cur.end = Math.max(cur.end, t);
}
const beatOf = (t) => beats.find((b) => t >= b.start - 0.01 && t <= b.end + 3) || beats[beats.length - 1];

const PLACEHOLDER = new Set(['scene', 'rendered', 'output', 'preview', 'demo', 'result', 'example', 'content']);
const CLAIM = /\b(\d+)\s+(shader|shaders|cut|cuts|backdrop|backdrops|preset|presets|theme|themes|transition|transitions|effect|effects)\b/i;
const LOW_LEGIBILITY_STINGS = new Set(['blinds']);

// ---- 1. placeholder-word: a big text that is JUST a filler noun ----
for (const l of layers) {
  if (l.type !== 'text' || !l.text) continue;
  const w = l.text.replace(/<[^>]+>/g, '').trim().toLowerCase();
  if (PLACEHOLDER.has(w) && (l.size ?? 0) >= 48) {
    F('error', 'placeholder-word', `"${l.text}" (${l.size}px) is a filler label, not a real artifact — render the actual thing (a live mini-scene), not the word.`, s0(l));
  }
}

// ---- 2. unbacked-claim: "N <things>" copy where the N things aren't visibly demonstrated ----
for (const l of layers) {
  if (l.type !== 'text' || !l.text) continue;
  const m = l.text.match(CLAIM);
  if (m) {
    const noun = m[2].toLowerCase();
    const shaderish = /shader/.test(noun);
    const hasShaderLayer = layers.some((x) => x.type === 'shader');
    if (shaderish && !hasShaderLayer) {
      F('error', 'false-claim', `"${l.text}" claims ${m[1]} ${noun} but the scene has NO shader layers — remove the claim or add the effect.`, s0(l));
    } else {
      F('warn', 'unbacked-claim', `"${l.text}" — a count claim ("${m[1]} ${noun}"). Verify the ${noun} are actually shown in this beat, or cut the number.`, s0(l));
    }
  }
}

// ---- 3. static-list: a group of ≥4 text-only kids with no per-kid animation, held >2s ----
for (const l of layers) {
  if (l.type !== 'group' || !l.children) continue;
  const txt = l.children.filter((c) => c.type === 'text');
  if (txt.length >= 4 && txt.every((c) => !c.split && !c.preset) && (l.duration ?? 0) > 2 && !l.stagger) {
    F('warn', 'static-list', `a ${txt.length}-item text group held ${(l.duration).toFixed(1)}s with no live motion — a list reads as a spec sheet; animate the concept (reveal/pass/count).`, s0(l));
  }
}

// ---- 4. illegible transition ----
for (const s of d.stings || []) {
  if (LOW_LEGIBILITY_STINGS.has(s.fx)) F('warn', 'illegible-effect', `sting "${s.fx}" @${s.t}s is hard to perceive at cut scale — replace with a legible one (wipe/iris/push).`, s.t);
}

// ---- 5. lonely beat: a beat whose ONLY sizable content is a single centered text >3s ----
for (const b of beats) {
  const span = (b.end + 3) - b.start;
  if (span < 3) continue;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.5) && (l.type !== 'text' || (l.size ?? 0) >= 30));
  const artifacts = content.filter((l) => l.type !== 'text' || (l.children && l.children.length));
  const texts = content.filter((l) => l.type === 'text');
  if (texts.length && artifacts.length === 0 && content.length <= 2) {
    F('warn', 'lonely-beat', `beat @${b.start.toFixed(1)}s is text-only with no artifact — what does the viewer LOSE if cut? give it a demo/proof or fold it into a neighbour.`, b.start);
  }
}

// ---- 6. thin-beat: a content beat held >3s with <3 sizable elements = a slide, not a shot ----
//        (density doctrine — see docs/CRAFT/DENSITY.md). First & last beat exempt (hook / end card).
beats.forEach((b, bi) => {
  if (bi === 0 || bi === beats.length - 1) return;
  const span = (b.end + 3) - b.start;
  if (span < 3) return;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.3)
    && (l.type !== 'text' || (l.size ?? 0) >= 24));
  if (content.length && content.length < 3) {
    F('warn', 'thin-beat', `beat @${b.start.toFixed(1)}s has only ${content.length} sizable element(s) over ${span.toFixed(1)}s — reads as a slide. Add support (a demo/stat/chart) + metadata (a dim readout). See docs/CRAFT/DENSITY.md.`, b.start);
  }
});

// ---- 7. mis-centre tell: a big text with a WIDE box but no `align` left-aligns inside it (looks off-
//        centre). If you gave it `w` to centre it, set align:"center". (docs/MISTAKES.md #15.) ----
for (const l of layers) {
  if (l.type && l.type !== 'text') continue;
  if (!l.text || l.split) continue;
  if ((l.size ?? 0) >= 40 && (l.w ?? 0) >= 600 && !l.align) {
    F('warn', 'mis-centre', `"${String(l.text).replace(/<[^>]+>/g, '').slice(0, 28)}" (${l.size}px, w:${l.w}) has a wide box but no "align" — text left-aligns inside it and reads off-centre. Set align:"center"/"right", or use pin. See docs/MISTAKES.md #15.`, s0(l));
  }
}

// ---- 8. scattered-beat: a beat crammed with too many top-level content elements has no clear focal
//        (the "make judge" beat-4 class). Rough static proxy for the vision "no hierarchy" finding. ----
for (const b of beats) {
  const content = layers.filter((l) => (l.track ?? 9) > 2 && l.x != null && l.y != null
    && overlaps(l, b.start, b.end + 0.3) && (l.type !== 'text' || (l.size ?? 0) >= 18));
  if (content.length >= 8) {
    F('warn', 'scattered-beat', `beat @${b.start.toFixed(1)}s packs ${content.length} top-level elements — likely no clear focal (the eye can't land). Cut to a hero + 1-2 supports; run make judge to confirm.`, b.start);
  }
}

// ---- report ----
findings.sort((a, b) => a.t - b.t);
const errs = findings.filter((f) => f.sev === 'error');
console.log(`\n  critique · ${file} · ${beats.length} beats · ${findings.length} findings (${errs.length} errors)\n`);
for (const f of findings) {
  const tag = f.sev === 'error' ? '✗' : '⚠';
  console.log(`  ${tag} [${f.rule}] @${f.t.toFixed(1)}s`);
  console.log(`      ${f.msg}`);
}
if (!findings.length) console.log('  ✓ no value-gate violations — every beat carries an artifact.\n');
else console.log('');
process.exit((errs.length || (strict && findings.length)) ? 1 : 0);
