// A short card of a measured reference, from its spec.json: what an agent should know before it reads the frames.
// Pure: `refCard(spec)` returns lines. `vawe refs frames <id>` and `vawe refs list <id>` print them.

const FLASH_MAX_S = 0.3;
const FLASH_LIGHT = 0.6;
const SHOTS_PER_LINE = 3;
const MAX_LENGTHS = 12;

const secs = (x) => x.toFixed(2);
const pct = (x) => `${Math.round(x * 100)}%`;
const luma = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/** The shots that read as a flash: shorter than 0.3 s with a light dominant colour. Derived from the shot palette, not from frame luma. */
export function flashShots(shots) {
  return shots.filter((s) => s.t1 - s.t0 <= FLASH_MAX_S && s.palette?.[0] && luma(s.palette[0].hex) >= FLASH_LIGHT);
}

function cameraLine(shots) {
  const moving = shots.filter((s) => s.camera?.big);
  if (!moving.length) return 'camera: no shot moves the camera by a large amount';
  const zooms = moving.map((s) => s.camera.zoomTotal);
  const peak = moving.reduce((a, s) => (s.camera.peakPanPxPerFrame > a.camera.peakPanPxPerFrame ? s : a));
  return `camera: ${moving.length} of ${shots.length} shots move it a lot (shots ${moving.map((s) => s.index).join(', ')}); zoom ${Math.min(...zooms)} to ${Math.max(...zooms)}; fastest pan ${Math.round(peak.camera.peakPanPxPerFrame)} px per frame in shot ${peak.index}`;
}

/** The card as lines (about 14 for a 17-shot film). `spec` is the parsed spec.json; `id` names the film; `specFolder` holds its SPEC.md. */
export function refCard(spec, id, specFolder) {
  const shots = spec.shots ?? [];
  if (!shots.length) return [`${id}: spec.json has no shots; run bin/vawe spec first`];
  const lengths = shots.map((s) => s.t1 - s.t0);
  const shown = lengths.slice(0, MAX_LENGTHS).map(secs).join(' ');
  const flashes = flashShots(shots);
  const dark = spec.colour?.shareDark;
  const light = spec.colour?.shareLight;
  const luminance = dark == null || light == null ? null : `luma: ${pct(dark)} of pixels below L 20, ${pct(1 - dark - light)} between, ${pct(light)} above L 85`;
  const palettes = shots.map((s) => `${s.index}: ${(s.palette ?? []).slice(0, 2).map((p) => `${p.hex} ${pct(p.share)}`).join(' ')}`);
  const palRows = [];
  for (let i = 0; i < palettes.length; i += SHOTS_PER_LINE) palRows.push(`  ${palettes.slice(i, i + SHOTS_PER_LINE).join('   ')}`);
  return [
    `card ${id}: ${secs(spec.duration)} s, ${shots.length} shots, ${spec.cuts?.length ?? 0} cuts`,
    `shot lengths (s): ${shown}${lengths.length > MAX_LENGTHS ? ' ...' : ''}; median ${secs(median(lengths))}, shortest ${secs(Math.min(...lengths))}, longest ${secs(Math.max(...lengths))}`,
    flashes.length
      ? `flashes (light shots up to ${FLASH_MAX_S} s): ${flashes.length}, at ${flashes.map((s) => `${secs(s.t0)} s for ${secs(s.t1 - s.t0)} s`).join(', ')}`
      : `flashes (light shots up to ${FLASH_MAX_S} s): none`,
    ...(luminance ? [luminance] : []),
    cameraLine(shots),
    'palette per shot, two top colours:',
    ...palRows,
    `full numbers: ${specFolder}/SPEC.md and spec.json`,
  ];
}
