// harness/lib/ref-measure/error-table.mjs: the calibrated error of every ref-spec measure, written by
// harness/media/ref-calibrate.mjs to quality/baselines/ref-spec-error.json and read back by refSpec.
// A measure is { n, p50, p90, bias, mustDetect, ok }, in the unit its name says (Ms, Frac, DE); ok is false
// when p90 is larger than the smallest difference the measure has to detect.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ERROR_BASELINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../quality/baselines/ref-spec-error.json');

export function loadErrors(file = ERROR_BASELINE) {
  if (!fs.existsSync(file)) return { generated: null, measures: {}, accuracy: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const errOk = (err, key) => !err || !err.measures || !err.measures[key] || err.measures[key].ok;
