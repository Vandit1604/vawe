// make approve STAGE=<stage> D=<file>: SIGN OFF a stage for this exact file. Records a content
// hash, so editing the file silently withdraws its own approval; an approval that outlives what
// it approved is worse than none, because it reads as verified. Stages: beats · concept ·
// treatment · draft.
import { writeReceipt } from '../lib/receipt.mjs';

const [stage, subject] = process.argv.slice(2);
const r = writeReceipt(stage, subject, { by: 'make approve' });
console.log(r ? `  ✓ ${stage} approved for ${subject}` : `  ✗ could not read ${subject}`);
