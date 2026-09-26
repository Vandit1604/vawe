// CLI: `node core/validate/validate.mjs [data.json ...]` (make check GATE=validate). No args → validate every
// authored film scene + every theme pack (see discoverTargets). Never imported by the browser: only
// validate.mjs's isMain branch reaches this module, and it does so with a dynamic import so the CLI's
// node:fs/node:path use never has to be resolvable in a browser bundle.
import { isObj } from './util.mjs';
import { lintData } from './lint-warnings.mjs';
import { sceneUnitWarnings } from './idle-scene-warnings.mjs';
import { seamMotionFreezeWarnings, dirWarnings } from './seam-warnings.mjs';
import { externalHtmlErrors } from './html-css.mjs';
import { themeFileErrors } from '../theme/roles.js';
import { parseColor, colorAlpha, contrastRatio } from '../color/engine.js';
import { TRANSITIONS } from '../transitions/catalog.js';
import { nearMisses } from '../registry/registry.js';
import { BG_NAMES } from '../backgrounds/index.js';
import { RASTER_TYPES, UNSAMPLABLE_TYPES } from '../raster/index.js';
import { beatGridPath } from '../beats/index.js';
import { lookErrors } from '../registry/theme-contract.js';

// `.animatic.json` and `.template.json` are never a scene to validate on their own, the same family
// quality/gates/audit-scenes.mjs already skips by name (its own `/\.(intent|animatic|template)\.json$/`).
// `.animatic.json` (harness/author/animatic.mjs) is a disposable pacing clock that embeds scratch VO
// paths under /tmp, regenerated every run and never a deliverable. `.template.json` carries
// unsubstituted `{{placeholders}}` as raw JSON text, some of them outside a string, so it is not valid
// JSON until harness/author/batch.mjs fills it in, by design, not a defect to repair. Other derivative
// suffixes (`.beatsync.`, `.captioned.`, `.directed.`) stay OUT of this list on purpose: those files
// still declare `module` and validate cleanly, so excluding them would just shrink coverage.
function scanFilmDir(fs, path, dir, targets) {
  for (const n of fs.readdirSync(dir)) {
    if (!n.endsWith('.json') || n === 'schema.json') continue;
    if (/\.(animatic|template)\.json$/.test(n)) continue;
    const fp = path.join(dir, n);
    // A parse failure here must still reach the per-target loop below, which reports "unreadable
    // JSON" loudly: silently excluding it from the default sweep would mean a corrupt scene never
    // gets validated by anyone who runs this with no args (the whole point of the default, below).
    let mod;
    try { mod = JSON.parse(fs.readFileSync(fp, 'utf8')).module; } catch { targets.push(fp); continue; }
    if (!mod) continue; // a films/ dir also holds planning artifacts (*.intent.json carries beats, not layers)
    targets.push(fp);
  }
}

// No args used to mean "films/*/sample.json", with one format, that is ONE file, while 60 authored
// scenes and every theme pack went unchecked. Default is now EVERY authored scene and EVERY theme,
// because a validator nobody points at the real files validates nothing (#48).
function discoverTargets(fs, path, root) {
  const targets = [];
  const fdir = path.join(root, 'films');
  for (const fmt of fs.readdirSync(fdir)) {
    const dir = path.join(fdir, fmt);
    if (!fs.statSync(dir).isDirectory()) continue;
    scanFilmDir(fs, path, dir, targets);
  }
  targets.sort();
  const tdir = path.join(root, 'themes');
  const themeTargets = fs.existsSync(tdir) ? fs.readdirSync(tdir).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(tdir, n)) : [];
  return { targets, themeTargets };
}

// Anti-rot guard: the cue enum in schema.json is DISCOVERABILITY only (so authors + MCP can see the
// valid names); CUES is the source of truth. If they drift, the schema lies, fail loudly to resync.
// Superset guard: every live CUE must be documented. The enum MAY also carry baked ALIASES
// (whoosh/reveal/click/pop, generators/media/audio-bake.mjs) that are not CUES keys, so only a CUE
// the enum OMITS is drift, extra alias names are legal.
function cueNameDriftFailed(ss, CUE_NAMES) {
  const el = ss?.fields?.audio?.fields?.cues?.item?.name?.enum || [];
  const missing = CUE_NAMES.filter((n) => !el.includes(n));
  if (!(el.length && missing.length)) return false;
  console.error(`✗ schema drift: films/scene/schema.json audio.cues enum omits live CUES (${missing.join(', ')}), add them.`);
  return true;
}

// Same guard for `voice`, the OTHER direction: unlike `name` (which may carry aliases onto a real
// cue, generators/media/audio-bake.mjs ROLES), a voice IS the CUES key it synthesizes from
// (generators/media/voice-cue.mjs), so every entry here must be a real one or the render-time resolve
// throws on a name nothing backs.
function cueVoiceDriftFailed(ss, CUE_NAMES) {
  const ve = ss?.fields?.audio?.fields?.cues?.item?.voice?.enum || [];
  const badVoices = ve.filter((v) => !CUE_NAMES.includes(v));
  if (!(ve.length && badVoices.length)) return false;
  console.error(`✗ schema drift: films/scene/schema.json audio.cues voice enum lists ${badVoices.join(', ')}, which core/audio/kit.mjs CUES does not implement. Fix the enum or add the voice.`);
  return true;
}

// films/scene/schema.json is repo-owned and required: a read/parse failure here is a real corruption,
// not an optional file, so let it fail loud rather than skip the anti-rot guard silently.
function checkCueSchemaDrift(readJSON, root, path, CUE_NAMES) {
  const ss = readJSON(path.join(root, 'films/scene/schema.json'));
  let failed = 0;
  if (cueNameDriftFailed(ss, CUE_NAMES)) failed++;
  if (cueVoiceDriftFailed(ss, CUE_NAMES)) failed++;
  return failed;
}

// The engine reads the props it knows and ignores the rest in silence, so `fill` instead of `bg`, or
// `colour` instead of `color`, renders a layer that is quietly wrong and gives the author nothing to
// search for. Two shipped scenes set `opacity` on a layer for months with no effect whatsoever.
// Silence is the worst failure (engine-doctrine/MISTAKES.md).
//
// Scoped deliberately:
//   · `block`/`comp` layers carry the BLOCK's props, which this schema does not describe and must not
//     police, blocks-audit owns those.
//   · `_`-prefixed keys are authoring scratch (`_card`, `_img`) and are conventionally ignored.
//   · group children are checked against the child schema PLUS the layer schema, because a child is
//     built by the same builder as a top-level layer (kit.buildLeaf).
function unknownPropErrors(L, where, isChild, tables, errors) {
  // The schema defines the child type enum and the ENGINE enforces it at boot, but nothing checked it
  // here: a `rect` child validated clean and then hard-failed the render with "not valid. Did you mean
  // 'text'?". Green validate followed by a boot crash is a worse experience than either outcome alone,
  // because the author trusts the first one.
  const { LI, CI, CHILD_TYPES } = tables;
  if (isChild && L.type != null && CHILD_TYPES.length && !CHILD_TYPES.includes(L.type)
    && L.type !== 'block' && L.type !== 'beat' && L.type !== 'comp') {
    errors.push(`${where} type "${L.type}" is not valid as a group child, one of: ${CHILD_TYPES.join(', ')}.`);
  }
  if (L.type === 'block' || L.type === 'beat' || L.type === 'comp') return;
  const known = isChild ? [...CI, ...LI] : LI;
  for (const k of Object.keys(L)) {
    if (k.startsWith('_') || known.includes(k)) continue;
    const near = known.filter((n) => n.toLowerCase() === k.toLowerCase()
      || (k.length > 3 && (n.startsWith(k.slice(0, 3)) || k.startsWith(n.slice(0, 3)))));
    errors.push(`${where} has unknown prop "${k}". The engine will ignore it silently.${near.length ? ' Did you mean: ' + near.slice(0, 3).join(' / ') + '?' : ''}`);
  }
}

function checkLayerTree(L, where, isChild, tables, errors) {
  if (!isObj(L)) return;
  unknownPropErrors(L, where, isChild, tables, errors);
  for (const key of ['children', 'layers']) {
    if (Array.isArray(L[key])) L[key].forEach((c, j) => checkLayerTree(c, `${where}.${key}[${j}]`, true, tables, errors));
  }
}

function unknownLayerPropErrors(data, schema) {
  const errors = [];
  if (!(schema && schema.fields && schema.fields.layers && schema.fields.layers.item)) return errors;
  const tables = {
    LI: Object.keys(schema.fields.layers.item),
    CI: Object.keys((schema.fields.layers.item.children || {}).item || {}),
    CHILD_TYPES: ((schema.fields.layers.item.children || {}).item || {}).type?.enum || [],
  };
  (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => checkLayerTree(L, `layer[${i}]`, false, tables, errors));
  return errors;
}

// `resample` reads a raster. A layer that owns one (image · paint · shader) is sampled live; every
// other type is BAKED out of the DOM once at boot (core/resample.js) and sampled as a still. The two
// that CANNOT go either way are refused by name: `raymarch` and `three` own their own WebGL context,
// and `video` a bitmap. None of the three serialises into the offscreen raster, so they would bake a
// hole. The engine throws at build time; catching it here names the file and index.
function resampleErrors(data) {
  const errors = [];
  (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
    if (!isObj(L) || !L.resample) return;
    if (UNSAMPLABLE_TYPES.includes(L.type))
      errors.push(`layer[${i}] has \`resample\` on a "${L.type}" layer. Its pixels live in a canvas or a video bitmap, which is not part of the DOM, so neither the live path nor the offscreen bake can read them. The pass would render nothing. Raster layers sample live (${RASTER_TYPES.join(' · ')}); every other type is baked from its built DOM.`);
    else if (L.type === 'image' && (!L.w || !L.h))
      errors.push(`layer[${i}] resample on an image needs explicit w and h (the GL buffer is sized at build time).`);
    // ken is a CSS transform on the <img>; the texture is the img's pixels, which the transform never
    // touches. Rendering both would silently drop the ken. Refuse instead.
    if (L.type === 'image' && L.ken)
      errors.push(`layer[${i}] combines \`ken\` with \`resample\`, ken is a CSS transform and does not reach the sampled pixels, so it would be silently ignored. Pick one.`);
  });
  return errors;
}

// CLIP AUDIO. `audio` on a video layer is the one prop the LAYER owns for sound (the mixer owns how it
// is heard): `true` or `{gain, duck}`. Anything else is caught here rather than at build time in the
// browser, so a bad value fails the author-check gate instead of a silent render.
function videoAudioErrors(data) {
  const errors = [];
  (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
    if (!isObj(L) || L.type !== 'video' || L.audio == null) return;
    const a = L.audio;
    if (a === true) return;
    if (!isObj(a) || Array.isArray(a)) {
      errors.push(`video-audio-invalid: layer[${i}] \`audio\` must be \`true\` or \`{gain, duck}\`, got ${JSON.stringify(a)}`);
      return;
    }
    for (const k of Object.keys(a)) {
      if (k !== 'gain' && k !== 'duck')
        errors.push(`video-audio-invalid: layer[${i}] \`audio\` has unknown key "${k}", only gain and duck are read`);
    }
    if (a.gain != null && (typeof a.gain !== 'number' || a.gain < 0))
      errors.push(`video-audio-invalid: layer[${i}] \`audio.gain\` must be a non-negative number, got ${JSON.stringify(a.gain)}`);
    if (a.duck != null && (typeof a.duck !== 'number' || a.duck < 0 || a.duck > 1))
      errors.push(`video-audio-invalid: layer[${i}] \`audio.duck\` must be a number between 0 and 1, got ${JSON.stringify(a.duck)}`);
  });
  return errors;
}

// named themes: the CLI can read the file, so completeness-check it here (boot re-checks).
function namedThemeErrors(data, fs, path, readJSON, root) {
  const errors = [];
  if (typeof data.theme !== 'string') return errors;
  const tp = path.join(root, 'themes', data.theme + '.json');
  if (!fs.existsSync(tp)) { errors.push(`theme "${data.theme}" not found (themes/${data.theme}.json)`); return errors; }
  try { errors.push(...themeFileErrors(readJSON(tp), { parseColor, colorAlpha, contrastRatio }).map((m) => `theme "${data.theme}" incomplete: ${m}`)); }
  catch (e) { errors.push(`theme "${data.theme}" unreadable: ${e.message}`); }
  return errors;
}

// FONT AXES, READ OFF THE @font-face RULES THAT ALREADY GOVERN WHAT RENDERS (core/tokens.css), never a
// second hand-kept table: `font-weight: 100 900;` (a RANGE) is a real wght axis, `font-weight: 400;` (one
// number) is a static instance with none. A family with two static `font-weight` rules (Space Grotesk
// 500 + 700) still has no axis: only a range ever proves one. Cached per process; tokens.css does not
// change mid-run.
let _fontAxesCache = null;
function fontAxesOf(fs, path, root) {
  if (_fontAxesCache) return _fontAxesCache;
  const map = new Map();
  let css = '';
  try { css = fs.readFileSync(path.join(root, 'core/tokens.css'), 'utf8'); } catch { return (_fontAxesCache = map); }
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = /font-family:\s*'([^']+)'/.exec(m[1]);
    if (!fam) continue;
    const entry = map.get(fam[1].toLowerCase()) || {};
    const wght = /font-weight:\s*([\d.]+)(?:\s+([\d.]+))?/.exec(m[1]);
    if (wght) entry.wght = wght[2] ? [Number(wght[1]), Number(wght[2])] : (entry.wght || false);
    map.set(fam[1].toLowerCase(), entry);
  }
  return (_fontAxesCache = map);
}

// AXIS ON A STATIC FONT IS A WARNING, NOT A REFUSAL (owner rule: safeguards adapt, not block). It never
// breaks a render, `axisStyle` still writes the plain `fontWeight` fallback, it just degrades a
// continuous ramp to the nearest static cut, silently, which is this repo's most-logged font bug shape
// (core/kinetic/presets.js). Only fires when BOTH the theme and the family's axes are known; an
// unresolved theme role or an unvendored family says nothing, per the same rule.
function axisFontWarnings(data, fs, path, readJSON, root) {
  const warns = [];
  if (typeof data.theme !== 'string') return warns;
  let theme;
  try { theme = readJSON(path.join(root, 'themes', data.theme + '.json')); } catch { return warns; }
  const roleFamily = (role) => theme?.tokens?.font?.[role]?.$value || null;
  const axes = fontAxesOf(fs, path, root);
  const visit = (L, at) => {
    if (!isObj(L)) return;
    const role = L.font === 'serif' || L.font === 'mono' || L.font === 'num' ? L.font : 'sans';
    const check = (axis, where) => {
      if (!isObj(axis)) return;
      const fam = roleFamily(role);
      if (!fam) return;
      const known = axes.get(fam.toLowerCase());
      if (!known) return;
      for (const tag of Object.keys(axis)) {
        if (known[tag] === false) warns.push(`${where}.axis.${tag} animates the '${tag}' axis on "${fam}", `
          + `a STATIC font instance for that axis (core/tokens.css): the variation channel is silently `
          + `ignored, only the plain fallback (for wght) will show, and the ramp degrades to the nearest cut.`);
      }
    };
    check(L.axis, at);
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
  };
  (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return warns;
}

function musicWarning(m, resolves, root, path, fs) {
  // music: a bed name or path must resolve or the bed drops to silence. A warning, not a failure: a
  // scene can name a bed baked on another machine. `music:"auto"` is resolved at authoring time
  // (`make audio-bed`), NOT at render, so an unresolved "auto" reaching the mixer = silence.
  if (m === 'auto') return 'audio.music:"auto" is unresolved, run `make audio-bed D=… WRITE=1` to bake the profile\'s bed in, or the mixer falls back to SILENCE.';
  if (typeof m !== 'string') return null;
  // `auto` is the auto-SOUND-DESIGN flag (derives SFX cues); it has NOTHING to do with music
  // resolution. Skipping the music check when auto:true is how vawe-identity's bare "tense" bed
  // shipped SILENT for so long (engine-doctrine/MISTAKES.md #132). The mixer now resolves a bare bed
  // name to assets/music/<name>.wav, so mirror EXACTLY that here, the two must agree.
  const ok = resolves(m) || (!/[\\/]/.test(m) && !path.extname(m) && fs.existsSync(path.join(root, 'assets/music', m + '.wav')));
  return ok ? null : `audio.music "${m}" will not resolve to a file. The mixer falls back to SILENCE. Use "auto", a real .wav path, or a bed name that exists under assets/music/ (run make audio / make music-pack).`;
}

// A CUE IDENTIFIES ITS SOUND EXACTLY ONE WAY. Since a cue may now be a synthesised `voice` instead of
// a baked `name`, `name` is no longer unconditionally required in the schema, and a schema cannot say
// "one of these two". So the rule lives here: neither is a cue that plays nothing, and both is a cue
// whose author disagrees with themselves about which sound it is.
function cueErrors(cues, VOICES, VOICE_PARAM_KEYS) {
  const errors = [];
  for (const [i, c] of (Array.isArray(cues) ? cues : []).entries()) {
    if (!isObj(c)) continue;
    const hasName = typeof c.name === 'string' && c.name.trim();
    const hasVoice = typeof c.voice === 'string' && c.voice.trim();
    if (!hasName && !hasVoice)
      errors.push(`audio.cues[${i}] names no sound: give it a baked \`name\`, or a synthesised \`voice\` (${VOICES.join(', ')}).`);
    if (hasName && hasVoice)
      errors.push(`audio.cues[${i}] sets BOTH \`name\` ("${c.name}") and \`voice\` ("${c.voice}"). One cue is one sound: drop whichever you did not mean.`);
    if (hasVoice && VOICES.length && !VOICES.includes(c.voice))
      errors.push(`audio.cues[${i}].voice "${c.voice}" is not a voice the synth knows: ${VOICES.join(', ')}.`);
    if (c.params != null && (!isObj(c.params) || Object.values(c.params).some((v) => typeof v !== 'number')))
      errors.push(`audio.cues[${i}].params must be an object of NUMBERS; the synth reads them as numbers and a string would be dropped silently.`);
    else if (isObj(c.params)) {
      // The exact param keys generators/media/voice-cue.mjs reads. An unknown key used to fail nothing
      // and hear nothing: the synth reads five names off the object and ignores the rest, so a typo'd
      // "freqency" baked byte-identical to no params at all.
      const badKeys = Object.keys(c.params).filter((k) => !VOICE_PARAM_KEYS.includes(k));
      if (badKeys.length) errors.push(`audio.cues[${i}].params has unknown key(s) ${badKeys.join(', ')}; the synth would silently ignore them. Known: ${VOICE_PARAM_KEYS.join(', ')}.`);
    }
  }
  return errors;
}

// Sound bridges (J/L-cuts). The SPAN is resolved in the browser, where the junctions live, and throws
// there. Nothing is duplicated here, because a second copy of that arithmetic would drift. What is
// checked here is the half the browser cannot see: whether the texture is on disk. The mixer fails the
// render on a missing one, so this is an error, not a warning.
function bridgeErrors(bridges, resolves, root, path, fs) {
  const errors = [];
  for (const [i, b] of (Array.isArray(bridges) ? bridges : []).entries()) {
    const s = b?.sound;
    if (typeof s !== 'string' || !s.trim()) { errors.push(`audio.bridges[${i}].sound must name a bed, a cue, or a .wav path.`); continue; }
    const bare = !/[\\/]/.test(s) && !path.extname(s);
    const ok = resolves(s) || (bare && ['music', 'sfx'].some((d) => fs.existsSync(path.join(root, 'assets', d, s + '.wav'))));
    if (!ok) errors.push(`audio.bridges[${i}].sound "${s}" is not on disk (looked as a path, assets/music/${s}.wav, assets/sfx/${s}.wav). The render fails rather than dropping the bridge. Run make audio / make music-pack.`);
    if (!/^[a-z]+@\d+$/.test(String(b?.at ?? ''))) errors.push(`audio.bridges[${i}].at must be "<kind>@<index>" (cut@1 · seam@0 · sting@2 · junction@3), got ${JSON.stringify(b?.at)}.`);
  }
  return errors;
}

// (b2) BEAT GRID. `audio.beatSync` moves real cut times at boot, and boot THROWS when the grid it
// names will not load, so catching it here turns a failed render into a named error at author time.
// Same posture as the sidecar check below: an error, never a warning.
function beatGridErrors(data, resolves) {
  const errors = [];
  try {
    const gp = beatGridPath(data);
    if (gp && !resolves(gp)) errors.push(`audio.beatSync names a beat grid that is not on disk: ${gp}, run \`make beatmap MUSIC=<the track>.wav\` to write it. The render fails rather than leaving the film unmatched.`);
  } catch (e) { errors.push(e.message); }
  return errors;
}

// (c) VO + sidecars named but absent → the mixer skips them without a word. Fail instead.
function sidecarErrors(A, resolves, root, path, file) {
  const errors = [];
  for (const k of ['vo', 'voWords', 'spectrum']) {
    if (typeof A[k] === 'string' && !resolves(A[k]))
      errors.push(`audio.${k} "${A[k]}" not found (looked in ${path.relative(root, path.dirname(file)) || '.'}/ and repo root). The mixer would silently drop it.`);
  }
  return errors;
}

// AUDIO. The Go mixer resolves music/vo/sfx at bake time and silently DROPS anything it cannot find or
// does not know (a typo'd cue, a missing VO). Silence is the worst failure, so name each problem here.
// Cue names + numeric ranges are enforced declaratively by the schema (its cue enum is held in sync
// with the live CUES registry by the drift guard above); this covers the one thing the schema cannot:
// files that must exist on disk.
async function audioBlockErrors(data, schema, file, root, path, fs) {
  const errors = [], warns = [];
  if (!isObj(data.audio)) return { errors, warns };
  const A = data.audio;
  const bases = [path.dirname(file), root];
  const resolves = (p) => !!p && bases.some((b) => fs.existsSync(path.isAbsolute(p) ? p : path.join(b, p)));
  const musicWarn = musicWarning(A.music, resolves, root, path, fs);
  if (musicWarn) warns.push(musicWarn);
  const VOICES = schema?.fields?.audio?.fields?.cues?.item?.voice?.enum || [];
  const { VOICE_PARAM_KEYS } = await import('../../generators/media/voice-cue.mjs');
  errors.push(...cueErrors(A.cues, VOICES, VOICE_PARAM_KEYS));
  errors.push(...bridgeErrors(A.bridges, resolves, root, path, fs));
  errors.push(...beatGridErrors(data, resolves));
  errors.push(...sidecarErrors(A, resolves, root, path, file));
  return { errors, warns };
}

// HTML the scene names but does not carry: `src` fragments and captured components. Node-only,
// because it opens files; the browser's boot-time validate simply never reaches this branch.
function readRefFactory(fs, path, file, root) {
  return (p) => {
    for (const b of [null, path.dirname(file), root]) {
      const abs = b == null ? (path.isAbsolute(p) ? p : null) : path.join(b, p.replace(/^\/+/, ''));
      try { if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return fs.readFileSync(abs, 'utf8'); } catch {} // this base didn't resolve; the next base (or the null return below) is the real answer
    }
    return null;
  };
}

async function validateOneFile(file, ctx) {
  const { fs, path, readJSON, root, validateAll } = ctx;
  let data, schema;
  try { data = readJSON(file); } catch (e) { return { unreadable: `✗ ${file}: unreadable JSON, ${e.message}` }; }
  const mod = data.module;
  const schemaPath = mod && path.join(root, 'films', mod, 'schema.json');
  try { schema = schemaPath && fs.existsSync(schemaPath) ? readJSON(schemaPath) : null; } catch { schema = null; }
  const errors = validateAll(schema, data);
  errors.push(...unknownLayerPropErrors(data, schema));
  errors.push(...resampleErrors(data));
  errors.push(...videoAudioErrors(data));
  errors.push(...namedThemeErrors(data, fs, path, readJSON, root));
  const readRef = readRefFactory(fs, path, file, root);
  const htmlFileWarns = [];
  for (const f of externalHtmlErrors(data, readRef)) (f.level === 'error' ? errors : htmlFileWarns).push(f.msg);
  const audio = await audioBlockErrors(data, schema, file, root, path, fs);
  errors.push(...audio.errors);
  const warns = [...lintData(data), ...audio.warns, ...htmlFileWarns, ...sceneUnitWarnings(data),
    ...seamMotionFreezeWarnings(data), ...dirWarnings(data), ...axisFontWarnings(data, fs, path, readJSON, root)];
  return { mod, errors, warns };
}

function printFileResult(file, root, path, result, strict) {
  let failed = 0;
  if (result.unreadable) { console.error(result.unreadable); return 1; }
  const { mod, errors, warns } = result;
  if (errors.length) {
    failed++;
    console.error(`✗ ${path.relative(root, file)} (${mod || 'no module'})`);
    for (const e of errors) console.error(`    • ${e}`);
  } else {
    console.log(`✓ ${path.relative(root, file)} (${mod})`);
  }
  if (warns.length) {
    if (strict) failed++;
    for (const w of warns) console.error(`    ⚠ ${w}`);
  }
  return failed;
}

async function validateSceneTargets(targets, ctx, strict) {
  let failed = 0;
  for (const file of targets) {
    const result = await validateOneFile(file, ctx);
    failed += printFileResult(file, ctx.root, ctx.path, result, strict);
  }
  return failed;
}

// Themes are checked directly, not only via a scene that happens to name one. A pack sitting in
// themes/ half-written is a landmine for whoever authors the next video against that brand.
function validateThemeTargets(themeTargets, ctx) {
  const { readJSON, root, path } = ctx;
  const transitionNames = TRANSITIONS.map((t) => t.name);
  let themeFailed = 0;
  for (const tf of themeTargets) {
    let errs;
    try {
      const t = readJSON(tf);
      errs = [
        ...themeFileErrors(t, { parseColor, colorAlpha, contrastRatio }),
        ...themeLookErrors(t.look, transitionNames),
      ];
    } catch (e) { errs = [`unreadable: ${e.message}`]; }
    if (errs.length) { themeFailed++; console.error(`✗ ${path.relative(root, tf)}`); for (const e of errs) console.error(`    • ${e}`); }
  }
  if (themeTargets.length) console.log(`themes: ${themeTargets.length - themeFailed} ok, ${themeFailed} incomplete`);
  return themeFailed;
}

// validateTheme (validate.mjs) already runs lookErrors on an inline theme; the CLI needs the same call
// against a theme FILE it just read off disk. Named locally so validateThemeTargets reads as "check
// completeness, then check the look", not an inline import used once.
function themeLookErrors(look, transitionNames) {
  return lookErrors(look, { bgNames: BG_NAMES, transitionNames, nearMisses });
}

// validateAll is passed in rather than imported: cli.mjs is loaded with a dynamic import from
// validate.mjs's own isMain branch, at the tail of that module's top-level evaluation. A static
// `import from './validate.mjs'` here would close a circular ES module graph across a live top-level
// await and deadlock node's loader instead of erroring, so the dependency is threaded through the call
// instead of re-imported.
export async function runCli(validateAll) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

  const strict = process.argv.includes('--strict'); // treat lint warnings as failures
  const argTargets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const discovered = argTargets.length === 0 ? discoverTargets(fs, path, root) : { targets: argTargets, themeTargets: [] };
  const { targets, themeTargets } = discovered;

  // AUDIO registries, loaded live so the checks below cannot rot against the synth engine. CUES is the
  // ONLY valid cue-name set (core/audio/kit.mjs). audio-kit imports node:fs, so this dynamic import
  // stays in the CLI branch and never reaches the browser.
  const { CUES } = await import('../audio/kit.mjs');
  const CUE_NAMES = Object.keys(CUES);
  let failed = checkCueSchemaDrift(readJSON, root, path, CUE_NAMES);

  const ctx = { fs, path, readJSON, root, validateAll };
  failed += await validateSceneTargets(targets, ctx, strict);
  const themeFailed = validateThemeTargets(themeTargets, ctx);
  failed += themeFailed;

  console.log(`\nvalidate: ${targets.length - (failed - themeFailed)} ok, ${failed} ${strict ? 'failed (incl. lint --strict)' : 'failed'}`);
  process.exit(failed ? 1 : 0);
}
