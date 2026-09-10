// core/audio-select.js: pick a music bed by FEELING, not by filename.
//
// WHY THIS EXISTS. `docs/CRAFT/SOUND.md` maps each reference profile to a bed mood, but an author
// still had to know which .wav that mood baked to. This lets a scene say `audio.music:"auto"` and
// get the right bed from its `profile`. Pure + deterministic: same profile -> same bed, no clock,
// no randomness, no I/O (the CLI at the bottom only reads+prints).
//
// The synthesized beds (calm/warm/tense) are NO LONGER auto-selected, stacked oscillators read as a
// drone/buzz, so nothing here points at them. A music mood now maps to a REAL royalty-free loop from
// the curated pack (`make music-pack` → assets/music/{lofi,chill,beat}.wav; provenance in
// credits.json). Silence stays the engine default (internal/audio/audio.go), so an unmapped/absent
// profile (and every "space IS the score" profile below) renders silent. If the pack hasn't been
// fetched the mixer simply finds no file and plays silence: a real loop is always an opt-in asset.
//
// Gains are on the `musicGain` scale (0..1 mix level; engine default 0.6), NOT the internal
// synthesis gain. A bed sits UNDER the type, so these stay below the 0.6 default, quietest for
// premium-calm, loudest for the energetic drop.

const FADE = { in: 1.0, out: 1.5 }; // a short lift in / longer settle out, never a hard cut

// Profile -> real loop, with the SOUND.md rationale inline. `bed:null` means silence.
export const PROFILE_BED = {
  // "silence or a warm sparse pad" (§5). Restraint is the point, silence, not a loop under the type.
  apple:     { bed: null },
  // "silence or a cold pulse; no bed under text" (§5). Silence, the type carries a technical read.
  linear:    { bed: null },
  vercel:    { bed: null },
  // "soft electronic bed, forward but calm" (§2, mid energy). The jazzy lo-fi loop gives body, calm.
  stripe:    { bed: 'assets/music/lofi.wav',  gain: 0.42, fade: FADE },
  // "a driving bed with a drop, cuts on the beat" (§5). The hip-hop loop has real drums -> loudest.
  nike:      { bed: 'assets/music/beat.wav',  gain: 0.55, fade: FADE },
  // "silence is the score; maybe one drone" (§5). Silence, a bed cheapens the tension.
  a24:       { bed: null },
  // "no bed or a tick pulse; functional" (§2). Silence, the data, not a mood, does the work.
  bloomberg: { bed: null },
  // "bright bouncy bed, major-key" (§2, high/sunny). The chillout loop reads sunniest of the pack.
  duolingo:  { bed: 'assets/music/chill.wav', gain: 0.5,  fade: FADE },
};

// selectBed(profile) -> {bed, gain, fade} for a real bed, or {bed:null} for silence.
// Absent or unknown profile -> silence, honoring the engine default.
export function selectBed(profile) {
  const pick = profile && PROFILE_BED[profile];
  if (!pick || !pick.bed) return { bed: null };
  return { bed: pick.bed, gain: pick.gain, fade: pick.fade };
}

// resolveAudio(scene) -> a NEW audio block (never mutates the scene).
// `audio.music === "auto"` is resolved, same as always. NEW: a scene that names no `music` at all but
// DOES declare `profile` defaults to "auto" too, so a bed gets picked from the taste mapping instead
// of shipping silent purely because nobody typed the word "auto". A scene with no profile is left
// alone: picking a bed with no input is choosing taste with nothing to go on, the same mistake
// `bg` injection made for backgrounds (docs/MISTAKES.md #159), so it stays silent, the engine default.
// Any OTHER explicit `music` value (a real path, or absent-with-no-profile) is returned untouched.
export function resolveAudio(scene) {
  const audio = (scene && scene.audio) || {};
  // The default fires only when the author left `music` UNSAID. `silent:true` is already a decision
  // (`audio-check`'s `silent-without-a-reason` even makes it cost a sentence), so it is never
  // second-guessed by a bed the author never asked for.
  const noOpinion = audio.music === undefined && audio.silent !== true;
  const defaulted = noOpinion && scene && scene.profile ? 'auto' : audio.music;
  if (defaulted !== 'auto') return { ...audio };

  const rest = { ...audio };
  delete rest.music; // drop the (real or defaulted) "auto" sentinel either way
  const chosen = selectBed(scene && scene.profile);
  if (!chosen.bed) return { ...rest, silent: true };
  return {
    ...rest,
    music: chosen.bed,
    musicGain: chosen.gain,
    musicFade: { ...chosen.fade },
  };
}

// ── CLI: `node core/audio/select.js <scene.json> [--write]`. Prints the resolved audio block;
//    --write bakes it back INTO the scene (in place), turning `music:"auto"` into a concrete bed so
//    the render path (a Go binary with no JS pre-pass) never sees the "auto" sentinel. `make audio-bed`.
// Both node: imports below are dynamic and load only inside this CLI-only branch, so core/ (fetched
// and evaluated by a browser) never carries a static node:* import.
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const write = args.includes('--write');
  if (!file) {
    console.error('usage: node core/audio/select.js <scene.json> [--write]');
    process.exit(1);
  }
  const scene = JSON.parse(readFileSync(file, 'utf8'));
  const resolved = resolveAudio(scene);
  if (write) {
    if (scene.audio?.music !== 'auto') { console.log(`  · ${file}: audio.music is not "auto", nothing to resolve.`); }
    else { scene.audio = resolved; writeFileSync(file, JSON.stringify(scene, null, 2) + '\n'); console.log(`  ✓ ${file}: resolved audio.music "auto" → ${JSON.stringify(resolved.music ?? '(silent)')}`); }
  } else {
    console.log(JSON.stringify(resolved, null, 2));
  }
  }
}
