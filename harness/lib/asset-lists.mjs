// One line per free font face and per synth voice, so an agent never lists a directory.
const titleCase = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ').replace('Jetbrains', 'JetBrains');

/** Free faces as [file, family, weight] from fonts.lock.json `faces`; OG-only .woff instances are left out. */
export function freeFaces(faces) {
  return Object.entries(faces)
    .filter(([file]) => file.endsWith('.woff2'))
    .map(([file, f]) => {
      const family = titleCase(f.pkg.split('/')[1]);
      const static_ = /-(\d00)-/.exec(f.file);
      const italic = f.file.includes('italic') ? ' italic' : '';
      return [file, family, static_ ? `${static_[1]}${italic}` : 'variable 100-900'];
    })
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
}

export function fontLines(faces) {
  return [
    'free faces (OFL). Copy the file into films/<name>/assets/, then src: url("assets/<file>") format("woff2"):',
    ...freeFaces(faces).map(([file, family, weight]) => `${family} | ${weight} | assets/fonts/${file}`),
    'if a listed file is not in assets/fonts, fetch it: node generators/media/fonts.mjs',
  ];
}

export function soundLines(cues, gains, lengthOf) {
  return [
    'synth voices for <audio data-synth="NAME" data-at="s">; gain is the default dB, length is the tail in s:',
    ...Object.keys(cues).map((name) => `${name} | ${gains[name]} dB | ${lengthOf(cues[name]).toFixed(2)} s`),
  ];
}
