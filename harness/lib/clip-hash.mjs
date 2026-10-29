import crypto from 'node:crypto';
import fs from 'node:fs';

/** The 12-character sha1 that names a rendered clip in clips.lock.json and site/lib/moves.json. */
export const clipHash = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
