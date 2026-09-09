// harness/author/script.mjs: the WORDS, as a two-column AV script, checked before a picture exists.
//
// Stage 3 of the studio pipeline. A script is written and approved before storyboarding because words
// are the cheapest thing to change: a line rewritten costs a minute, the same line rewritten after it
// has been animated costs a day.
//
// This does NOT introduce a new file to keep in sync. The storyboard already carries `narration:` and
// `onscreen:`, so this reads those and lays them out the way the trade does, AUDIO beside VISUAL,
// because the layout is the point. Two columns side by side make one specific failure impossible to
// miss, and it is the failure this repo's own doctrine names:
//
//   "visual and copy channels must carry a beat SIMULTANEOUSLY, not sequentially"
//
// If the narration says what the screen already says, the film has one channel and a redundant echo,
// not two channels. On paper that reads as thoroughness. In two columns it reads as waste.
//
// TIMING HERE IS AN ESTIMATE ON PURPOSE. 150wpm, instant, no synthesis, this is the artefact you
// iterate on while writing, and waiting on TTS for every draft would stop you writing. `make animatic`
// owns the measured clock. This owns the words.
//
//   node harness/author/script.mjs <STORYBOARD.md> [--strict]
//   make script SB=<storyboard.md>
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';
import { parseStoryboard } from './storyboard-parse.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const STRICT = args.includes('--strict');
if (!SB || !fs.existsSync(SB)) { console.error('usage: script <STORYBOARD.md> [--strict]'); process.exit(2); }

const sb = parseStoryboard(fs.readFileSync(SB, 'utf8'));
if (!sb.beats.length) { console.error(`✗ no beats in ${SB}`); process.exit(1); }

const SPEAK_WPM = 150;   // the trade's standard for explainer narration
const CARD_MAX = 8;      // words on a text card before it stops being a card and becomes a paragraph
const CARD_SEC = 2.2;    // a card needs this long on screen to be comfortably read

const strip = onScreenText;
const words = (s) => strip(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

// STOPWORDS OUT BEFORE COMPARING. "One file in, one video out" against "One file." overlaps on `one`
// whatever you do, and counting that as duplication would flag every well-written pair in the library.
// What matters is whether the CONTENT words repeat.
const STOP = new Set(('a an the and or but of to in on at is are was were be been it its this that these those '
  + 'for with as by from your you we our us they them he she i not no so if then than can will just').split(' '));
const content = (s) => words(s).filter((w) => !STOP.has(w) && w.length > 2);

const rows = sb.beats.map((b) => {
  const nar = strip(b.narration);
  const cards = b.onscreen.map(strip).filter(Boolean);
  const onAll = cards.join(' ');
  const nw = words(nar).length;
  const speak = nw / (SPEAK_WPM / 60);
  const read = cards.length * CARD_SEC;
  const planned = b.duration ?? (b.end != null && b.start != null ? b.end - b.start : null);

  // redundancy: what share of the narration's content words are already on the screen
  const cn = content(nar), co = new Set(content(onAll));
  const shared = cn.filter((w) => co.has(w));
  const echo = cn.length ? shared.length / cn.length : 0;

  return { b, nar, cards, nw, speak, read, planned, echo,
    longCards: cards.filter((c) => words(c).length > CARD_MAX) };
});

// ── the script, laid out the way the trade lays it out ─────────────────────────────────────────────
const W1 = 46, W2 = 44;
const wrap = (s, w) => {
  const out = []; let line = '';
  for (const word of String(s).split(/\s+/)) {
    if (!word) continue;
    if ((line + ' ' + word).trim().length > w) { out.push(line); line = word; } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  return out.length ? out : [''];
};

console.log(`\n  SCRIPT · ${path.basename(SB)}${sb.message ? `\n  message: ${sb.message}` : ''}`);
console.log(`\n  ${'AUDIO (spoken)'.padEnd(W1)}  ${'VISUAL (on screen)'.padEnd(W2)}  TIME`);
console.log(`  ${'─'.repeat(W1)}  ${'─'.repeat(W2)}  ─────`);
for (const r of rows) {
  const a = wrap(r.nar || '(silent)', W1);
  const v = wrap(r.cards.length ? r.cards.join('  /  ') : '(no on-screen copy)', W2);
  const need = Math.max(r.speak, r.read);
  const meta = [`${r.b.i + 1}. ${r.b.name}`];
  const lines = Math.max(a.length, v.length);
  for (let i = 0; i < lines; i++) {
    const t = i === 0 ? (need > 0 ? `${need.toFixed(1)}s` : '-') : '';
    console.log(`  ${(a[i] || '').padEnd(W1)}  ${(v[i] || '').padEnd(W2)}  ${t}`);
  }
  console.log(`  ${('· ' + meta[0]).padEnd(W1)}  ${('· ' + (r.b.picture || 'NO PICTURE NAMED')).slice(0, W2).padEnd(W2)}`);
  console.log();
}

// ── the checks ─────────────────────────────────────────────────────────────────────────────────────
const fail = [], warn = [];

// KINETIC TYPOGRAPHY IS NOT AN ECHO. `channels-echo` assumes the two channels do different jobs: the
// narration explains, the card labels. In a kinetic-type film the card IS the read, deliberately, and
// the whole craft is in how the spoken line lands on screen. Firing per beat flagged 4 of 5 beats of a
// film whose form was the point.
//
// The distinction is frequency, and it is the same one a human makes. ONE beat whose narration repeats
// its card is a beat that forgot to say something; EVERY beat doing it is a form. So: if most beats are
// near-identical, this is kinetic type, and the question changes. It is no longer "do the two word
// channels differ" (they are one channel on purpose) but "does the PICTURE carry anything the words do
// not", which is the show-don't-tell question, asked where it still costs nothing to answer.
const ECHOING = rows.filter((r) => r.nar && r.cards.length && r.echo >= 0.7);
const KINETIC = rows.length >= 3 && ECHOING.length / rows.filter((r) => r.nar && r.cards.length).length >= 0.6;
if (KINETIC) {
  console.log(`  · kinetic type: ${ECHOING.length}/${rows.length} beats speak their card verbatim. Treating the\n`
    + '    type AS the read, so channels-echo is not the question; whether the PICTURE adds anything is.\n');
  for (const r of rows) {
    const pic = strip(r.b.picture);
    if (!pic) { fail.push(`[picture-missing] beat ${r.b.i + 1} "${r.b.name}": the words are the read, so the picture is the only other channel this film has, and this beat does not name one.`); continue; }
    const pw = new Set(content(pic));
    const words_ = content(r.nar + ' ' + r.cards.join(' '));
    const shared = words_.filter((w) => pw.has(w)).length;
    if (words_.length >= 2 && shared / words_.length >= 0.6) {
      fail.push(`[picture-restates-words] beat ${r.b.i + 1} "${r.b.name}": the picture is a drawing of the sentence (${Math.round(shared / words_.length * 100)}% of the words appear in it). When the type carries the read, the picture is the only channel left, so it has to show what the words cannot.`);
    }
  }
}

for (const r of rows) {
  // THE ONE THIS FILE EXISTS FOR. A narration that restates the card is the dual-channel rule broken in
  // the only place it can still be fixed cheaply.
  if (!KINETIC && r.nar && r.cards.length && r.echo >= 0.7 && content(r.nar).length >= 2) {
    fail.push(`[channels-echo] beat ${r.b.i + 1} "${r.b.name}": the narration restates the screen (${Math.round(r.echo * 100)}% of its content words are already on the card). Two channels carrying one message is one channel and an echo. Say what the picture cannot show, or drop the line.`);
  }
  for (const c of r.longCards) {
    warn.push(`[card-too-long] beat ${r.b.i + 1}: "${c}" is ${words(c).length} words. A text card is ${CARD_MAX} or fewer; past that it is a paragraph and the viewer reads instead of watching.`);
  }
  if (r.planned != null) {
    const need = Math.max(r.speak, r.read);
    if (need > r.planned + 0.4) warn.push(`[no-room] beat ${r.b.i + 1} "${r.b.name}": needs ~${need.toFixed(1)}s of words, planned ${r.planned.toFixed(1)}s.`);
  }
  if (!r.nar && !r.cards.length) warn.push(`[no-words] beat ${r.b.i + 1} "${r.b.name}": neither spoken nor on-screen copy. Deliberate silence is a real choice; say so in \`why:\`.`);
}

const spoken = rows.reduce((s, r) => s + r.speak, 0);
const total = rows.reduce((s, r) => s + Math.max(r.speak, r.read), 0);
console.log(`  ${rows.length} beats · ${rows.reduce((s, r) => s + r.nw, 0)} spoken words (~${spoken.toFixed(1)}s at ${SPEAK_WPM}wpm) · ${rows.reduce((s, r) => s + r.cards.length, 0)} text cards`);
console.log(`  estimated ${total.toFixed(1)}s of words${sb.duration ? ` against a ${sb.duration}s film` : ''}.  Measured clock: make animatic SB=${SB}\n`);

for (const f of fail) console.log(`  ✗ ${f}`);
for (const w of warn) console.log(`  ~ ${w}`);
if (!fail.length && !warn.length) console.log('  ✓ the two channels carry different things, and every card is readable.\n');
else console.log();

process.exit(fail.length || (STRICT && warn.length) ? 1 : 0);
