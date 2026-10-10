// After a failed step, name the doctor check that explains it: reads .vawe/doctor.json (written by
// `vawe doctor --quiet`, which npm install runs) and matches each failed check against the error text.
import fs from 'node:fs';
import path from 'node:path';

const WORDS = { chrome: /chrome|puppeteer/i, fonts: /fonts?\b/i };
const mentions = (id, text) => (WORDS[id] || new RegExp(`\\b${id}\\b`, 'i')).test(text);

export function doctorHint(errorText, checks) {
  const hit = checks.find((c) => !c.ok && mentions(c.tool, errorText));
  return hit ? `doctor found ${hit.tool} missing: ${hit.fix}` : null;
}

export function doctorHintFromFile(root, errorText) {
  try {
    return doctorHint(errorText, JSON.parse(fs.readFileSync(path.join(root, '.vawe', 'doctor.json'), 'utf8')));
  } catch { return null; }
}
