// blocks/social.mjs: extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, HAIR, r2, onColor, onInk, initialsOf,
  R, TYPE, SPACE, E, cardChrome, avatarHtml,
  tint, TINT,
} from './kit.mjs';

// THE SOCIAL FAMILY IS THE PERSON-FACING REGISTER, so every card here is `R.soft`, the radius scale
// reserves it for surfaces a human reads as an OBJECT (a post, a profile, a player, a listing)
// rather than as a panel.
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Social';

const T = TOKENS;

// HTML-FIRST FAMILY. Design Read: soft person-facing cards (`R.soft`), a hairline or accent-fill
// envelope carried as a layer prop, one accent hue at two weights for readings (a fill and a rating),
// mono for handles/counts/timestamps and sans for names/sentences, never a gradient or a nested card.
// VARIANCE low (these are proof/identity chrome, not a film's loud moment); MOTION is the envelope's
// own `anim` for a single-card family, `parts` where a card's own pieces arrive in more than one beat
// (a CTA chip after the identity, a stack of avatars landing in order, a chat thread by side).
// engine-doctrine/CRAFT/HTML-FRAGMENTS.md.

// AVATAR INITIALS ARE THE SAME CASE, and the default is in the kit. `avatarHtml` falls back to
// `{ bg: accentSoft, color: accentInk }`, the accent as TEXT on a tint of itself, the lowest-contrast
// pairing available (2.6:1 on linear). Every call site here passes the corrected ink instead.
const AV_INK = { color: onInk(T.accent) };

// THE OVERLAP, ONCE, because two blocks need it. 25% is where a real facepile sits: `avatarHtml` sets
// initials at 0.4 of the disc, so two capitals run about 0.48 of it and, centred, end at 0.74 of the
// way across. A step of 0.65 parks the next disc on the last fifth of the glyphs and cuts them; 0.75
// clears them by a point.
const AV_STEP = 0.75;

// ─────────────────────────────────────────────────────────────────────────────
// chatBubble: a message thread; `me:true` bubbles right in accent, others left in a hairline card.
export function chatBubble({ x, y, w = 480, messages = [], start = 0, dur = 4 } = {}) {
  const bubble = (m, i) => `<div data-i="${i}" style="display:flex;justify-content:${m.me ? 'flex-end' : 'flex-start'}">`
    + `<span style="display:inline-block;max-width:80%;box-sizing:border-box;font:500 ${TYPE.base}px var(--font-sans);`
    + `color:${m.me ? onColor(T.accent) : T.ink};background:${m.me ? T.accent : T.card};`
    + `${m.me ? '' : `border:${HAIR};`}border-radius:${R.soft}px;padding:${SPACE.sm}px ${SPACE.md}px">${m.text}</span></div>`;
  const html = `<div style="display:flex;flex-direction:column;gap:${SPACE.xs}px;width:${w}px">`
    + messages.map(bubble).join('') + '</div>';
  // BUBBLES ARRIVE IN SEQUENCE, each from its own side. One `parts` rule per message, selected by its
  // own index rather than a shared selector, because the direction (and so the entrance) differs by
  // `m.me` and one `parts` rule can only carry one `anim`. Each still gets the paired exit `out` gives
  // it: the house rule (enter from a side, leave the same way) applied per bubble, not to the card.
  return [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    parts: messages.map((m, i) => ({ select: `[data-i="${i}"]`, anim: m.me ? 'slide-right' : 'slide-left',
      each: 0.35, delay: r2(0.2 + i * 0.42), out: true })) }];
}

// avatarStack: overlapping avatar circles (initials or images) + an optional "+N" overflow.
//
// TOP-LEVEL LAYERS, ONE PER DISC, not one `parts` fragment: each disc is its own opaque `html` layer
// with `bg`/`radius`/`border` as LAYER PROPS (the ring that cuts one disc out of the next needs a real
// `border`, which is chrome, not markup) and only the initials/image as its interior. `avatarHtml`
// cannot express the overlap ring (it never took a border), so this writes its own interior markup
// rather than duplicating avatarHtml's fallback rule; the fallback itself (explicit initials, else
// derived from name) still lives in `initialsOf`, so the two cannot drift apart.
export function avatarStack({ x, y, avatars = [], extra = 0, size = 48, start = 0, dur = 4 } = {}) {
  const step = size * AV_STEP;
  const common = (i) => ({ x: r2(x + i * step), y, w: size, h: size, radius: R.pill,
    border: `2px solid ${T.card}`, start: r2(start + i * 0.14), duration: r2(dur - i * 0.14),
    anim: 'pop', enterDur: 0.3 });
  // THE AVATARS LAND ONE AFTER ANOTHER, each dropping onto the edge of the last, a team assembling.
  const out = avatars.map((a, i) => {
    const src = typeof a === 'string' ? a : a.avatar;
    if (src) return { type: 'html', ...common(i), bg: T.card, html: `<img src="${src}" style="width:100%;height:100%;object-fit:cover">` };
    // no `bg` override when the caller names no colour: `a.color` is the one override, the opaque
    // accent-on-card fallback is what every other circle gets.
    const bg = (typeof a === 'object' && a.color) || 'color-mix(in srgb, var(--accent) 14%, var(--card))';
    const glyph = (typeof a === 'object' && a.initials) || initialsOf(typeof a === 'object' ? a.name : '');
    return { type: 'html', ...common(i), bg,
      html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;`
        + `font:700 ${Math.round(size * 0.4)}px var(--font-sans);color:${T.accent}">${glyph}</div>` };
  });
  if (extra > 0) out.push({ type: 'html', ...common(avatars.length), bg: T.surface,
    // the overflow count floors at TYPE.body: at 0.3 of a small stack it drops under the readable floor.
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;`
      + `font:600 ${Math.max(TYPE.body, Math.round(size * 0.3))}px var(--font-sans);color:${T.sub}">+${extra}</div>` });
  return out;
}

// socialProof: the avatar stack AND the line that says what it proves.
//
// `avatarStack` renders circles and a `+N` and stops there, so on its own it asserts nothing: every
// scene that used it hand-placed a text layer beside it at coordinates derived from the stack's own
// step arithmetic, which the block already knows and the author had to re-derive. Two callers, two
// different offsets, and neither one is wrong in a way the author can see. The stack's width is the
// stack's business; this block owns both halves and puts the caption where the stack actually ends.
//
// NO FIGURE IS INVENTED: `caption` and `sub` default to nothing, and the `+N` comes from `extra`,
// which the caller supplies. A social-proof block that ships a number is the exact defect this
// registry has already shipped twice.
export function socialProof({ x, y, avatars = [], extra = 0, size = 44, caption = '', sub = '',
  gap = 18, start = 0, dur = 4 } = {}) {
  const step = size * AV_STEP;
  const cells = avatars.length + (extra > 0 ? 1 : 0);
  const stackW = cells > 0 ? r2((cells - 1) * step + size) : 0;
  // the caption arrives AFTER the last avatar lands: the stack assembles, then it is named.
  const said = r2(start + cells * 0.14 + 0.12);
  const html = (caption || sub) ? `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">`
    + (caption ? `<span style="font:600 ${TYPE.base}px var(--font-sans);color:${T.ink}">${caption}</span>` : '')
    // The sub line is a PHRASE ("from 40 engineering teams"), so it is sans, not the standing inversion.
    + (sub ? `<span style="font:400 ${TYPE.body}px var(--font-sans);color:${T.sub}">${sub}</span>` : '') + '</div>' : '';
  return [
    ...avatarStack({ x, y, avatars, extra, size, start, dur }),
    ...(html ? [{
      type: 'html', x: r2(x + stackW + gap), y, h: size, html,
      start: said, duration: r2(start + dur - said), anim: 'slide-left', enterDur: 0.35, exitDur: 0.3,
    }] : []),
  ];
}

// reactionBar: a row of reaction count-pills; `mine:true` highlights the one you picked.
export function reactionBar({ x, y, reactions = [], start = 0, dur = 4 } = {}) {
  // An unpicked chip carries a HAIRLINE too, not only a fill, so the picked chip differs from its
  // neighbours in COLOUR alone (fill, ink, border all follow the state) rather than in three ways at
  // once, which is what read as one lit object beside some grey holes.
  const chip = (r) => `<div data-part style="display:inline-flex;align-items:center;gap:${SPACE.tight}px;`
    + `padding:${SPACE.snug}px ${SPACE.sm}px;border-radius:${R.pill}px;background:${r.mine ? T.accentSoft : T.surface};`
    + `border:${r.mine ? `1px solid ${T.accent}` : HAIR}">`
    + `<span style="font:500 ${TYPE.base}px var(--font-sans)">${r.emoji}</span>`
    + `<span style="font:600 ${TYPE.body}px var(--font-num);color:${r.mine ? T.accentInk : T.sub}">${r.count}</span></div>`;
  const html = `<div style="display:flex;gap:${SPACE.xs}px;align-items:center">` + reactions.map(chip).join('') + '</div>';
  return [{ type: 'html', x, y, html, start, duration: dur, anim: 'none', enterDur: 0,
    parts: [{ anim: 'popIn', each: 0.3, stagger: 0.1, delay: 0.15 }] }];
}

// nowPlaying. A music-player card: square artwork (accent fill + initials if no art), title over
// artist, a progress bar, transport glyphs. `progress` is 0..1 of the track.
export function nowPlaying({ x, y, w = 380, name = '', track = '', sub = '', artist = '', avatar = '', art = '',
  initials = '', progress = 0.4, start = 0, dur = 4 } = {}) {
  const p = Math.max(0, Math.min(1, progress));
  const PAD = 22, innerW = w - 2 * PAD;
  const title = name || track, by = sub || artist;
  // THE TILE IS THE ACCENT ITSELF, and its ink is the `--on-accent` token core/boot.js computes per
  // theme (25 of 38 themes cannot carry white on their accent; higgsfield's lime measured 1.2:1).
  const artHtml = (avatar || art)
    ? `<img src="${avatar || art}" style="width:72px;height:72px;border-radius:${R.tight}px;object-fit:cover;flex:none">`
    : `<div style="width:72px;height:72px;border-radius:${R.tight}px;background:${T.accent};flex:none;`
      + `display:flex;align-items:center;justify-content:center;font:700 29px var(--font-sans);color:${onColor(T.accent)}">${initials || initialsOf(title)}</div>`;
  // THE TRACK IS A TINT OF THE FILL, not `--surface-2`: the part still to play is the rest of the
  // reading, so it belongs to the fill's own hue at the lighter weight, the correction every meter in
  // the data family got. The fill is drawn at its FINAL width and revealed by `parts:'widen'` (scales
  // its own left edge from 0), the same wipe-in the native version got from a clip mask.
  const html = `<div style="display:flex;flex-direction:column;gap:${SPACE.md}px;padding:${PAD}px;`
    + `box-sizing:border-box;width:${w}px">`
    + `<div style="display:flex;align-items:center;gap:${SPACE.md}px">` + artHtml
    + `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start;flex:1;min-width:0">`
    + `<span style="font:700 ${TYPE.lead}px var(--font-sans);color:${T.ink}">${title}</span>`
    + `<span style="font:500 ${TYPE.body}px var(--font-sans);color:${T.sub}">${by}</span></div></div>`
    + `<div style="position:relative;width:${innerW}px;height:5px;border-radius:${R.pill}px;`
    + `background:${tint(T.accent, TINT.track)};overflow:hidden">`
    + `<div data-part="bar" style="position:absolute;left:0;top:0;height:5px;border-radius:${R.pill}px;`
    + `background:${T.accent};width:${r2(innerW * p)}px"></div></div>`
    + `<div data-part="transport" style="display:flex;align-items:center;justify-content:center;gap:${SPACE.xl}px">`
    + `<span style="font:600 ${TYPE.lead}px var(--font-sans);color:${T.sub}">◁</span>`
    + `<div style="width:48px;height:48px;border-radius:100%;background:${T.ink};display:flex;`
    + `align-items:center;justify-content:center"><span style="font:700 ${TYPE.base}px var(--font-sans);color:${T.paper}">▷</span></div>`
    + `<span style="font:600 ${TYPE.lead}px var(--font-sans);color:${T.sub}">▷|</span></div></div>`;
  return [{ type: 'html', x, y, w, ...cardChrome({ radius: R.soft, elevation: E.card }), html,
    start, duration: dur, enterDur: 0.5, exitDur: 0.35,
    parts: [{ select: '[data-part="bar"]', anim: 'widen', each: 0.4, delay: 0.15 },
            { select: '[data-part="transport"]', anim: 'fadeUp', each: 0.35, delay: 0.25 }] }];
}

// videoLowerThird, creator identifier: avatar circle · channel over subscriber count · a CTA chip.
//
// THE CHIP IS THE ACCENT, and `onColor` resolves its ink from the per-theme `--on-accent` token: a
// subscribe button is not the failure state `--down` is reserved for.
export function videoLowerThird({ x, y, w = 520, name = '', channel = '', sub = '', subscribers = '',
  avatar = '', initials = '', cta = 'Subscribe', start = 0, dur = 4 } = {}) {
  const who = name || channel, count = sub || subscribers;
  const html = `<div style="display:flex;align-items:center;gap:${SPACE.md}px;padding:${SPACE.md}px;`
    + `box-sizing:border-box;width:${w}px">`
    + avatarHtml({ avatar, initials, name: who, size: 56, ...AV_INK })
    + `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start;flex:1;min-width:0">`
    + `<span style="font:700 ${TYPE.lead}px var(--font-sans);color:${T.ink}">${who}</span>`
    // A subscriber count is a FIGURE, so it keeps mono. `--dim` fails `make audit` HARD at 2.6:1.
    + (count ? `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${count}</span>` : '') + '</div>'
    + `<div data-part style="background:${T.accent};border-radius:${R.pill}px;padding:${SPACE.xs}px ${SPACE.lg}px;flex:none">`
    + `<span style="font:700 ${TYPE.body}px var(--font-sans);color:${onColor(T.accent)}">${cta}</span></div></div>`;
  return [{ type: 'html', x, y, w, ...cardChrome({ radius: R.soft, elevation: E.card, anim: 'wipe' }), html,
    start, duration: dur, enterDur: 0.45, exitDur: 0.3,
    parts: [{ anim: 'fadeUp', each: 0.35, delay: 0.2 }] }];
}

// followCard, name over @handle, a pill CTA on the right. The pill is ink-on-paper inverted (not
// accent) so it reads as THE button of the card, not another tinted chip.
// It speaks the shared identity surface, so it can now carry an avatar. It only draws one when the
// caller supplies `avatar` or `initials`: a card designed without a portrait must not sprout an
// invented circle just because it learned the vocabulary.
export function followCard({ x, y, w = 360, handle = '', name = '', avatar = '', initials = '', cta = 'Follow', start = 0, dur = 4 } = {}) {
  const html = `<div style="display:flex;align-items:center;gap:${SPACE.sm}px;padding:${SPACE.md}px ${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">`
    + (avatar || initials ? avatarHtml({ avatar, initials, name, size: 44, ...AV_INK }) : '')
    + `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start;flex:1;min-width:0">`
    + `<span style="font:700 ${TYPE.base}px var(--font-sans);color:${T.ink}">${name}</span>`
    + `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">@${handle}</span></div>`
    + `<div data-part style="background:${T.ink};border-radius:${R.pill}px;padding:${SPACE.xs}px ${SPACE.md}px;flex:none">`
    + `<span style="font:700 ${TYPE.body}px var(--font-sans);color:${T.paper}">${cta}</span></div></div>`;
  return [{ type: 'html', x, y, w, ...cardChrome({ radius: R.soft }), html,
    start, duration: dur, enterDur: 0.45, exitDur: 0.3,
    parts: [{ anim: 'fadeUp', each: 0.3, delay: 0.18 }] }];
}

// installCard. The app-store listing row: icon tile · name over category · a star rating that FILLS
// · the rating count · the install button.
//
// Built on followCard's conventions (identity on the left, a pill CTA on the right, one hairline
// card) because that is the shape it is a sibling of, and a second layout for the same silhouette is
// how a library stops looking like one library.
//
// THE STARS FILL, they are not printed. A rating drawn at its final value is a claim; a rating that
// sweeps to it is the block showing its own reading. The lit copy sits over an unlit one and is
// revealed by `parts:'widen'`, scaling its own left edge from 0 to its clipped final width
// (`rate / 5`), so a 4.6 lands mid-glyph on the fifth star with nothing redrawn per value.
//
// EVERY FIGURE IS A PROP AND EVERY DEFAULT IS EMPTY: `rating` 0 draws no stars, `ratings` 0 draws no
// count, `cta` empty draws no button. This block cannot ship a number nobody stood behind.
// a count is FORMATTED from a number, never accepted as prose: a caller that has 1200 ratings should
// not have to decide how to write it, and the block should not be able to be handed a sentence.
function ratingsCountText(ratings) {
  if (ratings <= 0) return '';
  if (ratings >= 1e6) return r2(ratings / 1e6) + 'M';
  if (ratings >= 1e3) return r2(ratings / 1e3) + 'K';
  return String(Math.round(ratings));
}

// THE STARS ARE THE ACCENT, the same reading hue as the icon tile and the CTA on this very card:
// a rating is a READING, not a caution state, so `--warn` never belongs here.
function installCardStars(rate) {
  const STARS = '★★★★★';
  if (rate <= 0) return '';
  return `<div style="position:relative;font:500 ${TYPE.body}px var(--font-sans);letter-spacing:0.06em">`
    + `<span style="color:${tint(T.accent, TINT.track)}">${STARS}</span>`
    + `<div data-part="stars" style="position:absolute;left:0;top:0;overflow:hidden;width:${r2(rate / 5 * 100)}%">`
    + `<span style="color:${onInk(T.accent)};white-space:nowrap">${STARS}</span></div></div>`;
}

function installCardMeta(stars, countText) {
  if (!stars && !countText) return '';
  return `<div style="display:flex;align-items:center;gap:${SPACE.xs}px">` + stars
    + (countText ? `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${countText}</span>` : '') + '</div>';
}

export function installCard({ x, y, w = 400, icon = '', name = '', sub = '', rating = 0, ratings = 0,
  cta = '', start = 0, dur = 4 } = {}) {
  const rate = Math.min(5, Math.max(0, +rating || 0));
  const countText = ratingsCountText(ratings);
  const stars = installCardStars(rate);
  const meta = installCardMeta(stars, countText);
  // The icon tile is ONE radius step under the card it sits in (R.tight inside R.soft), which is what
  // keeps a nested corner from reading as squarer than its container. The glyph is `onInk`, the same
  // 2.6:1 accent-on-a-tint-of-itself pairing `avatarHtml`'s own default carries.
  const html = `<div style="display:flex;align-items:center;gap:${SPACE.md}px;padding:${SPACE.md}px;`
    + `box-sizing:border-box;width:${w}px">`
    + `<div style="width:62px;height:62px;flex:none;border-radius:${R.tight}px;background:${T.accentSoft};`
    + `display:flex;align-items:center;justify-content:center;font:700 28px var(--font-sans);color:${onInk(T.accent)}">${icon}</div>`
    + `<div style="display:flex;flex-direction:column;gap:${SPACE.tight}px;flex:1;align-items:flex-start;min-width:0">`
    + `<span style="font:700 ${TYPE.base}px var(--font-sans);color:${T.ink}">${name}</span>`
    + (sub ? `<span style="font:500 ${TYPE.body}px var(--font-sans);color:${T.sub}">${sub}</span>` : '') + meta + '</div>'
    + (cta ? `<div data-part="cta" style="background:${T.accent};border-radius:${R.pill}px;padding:${SPACE.xs}px ${SPACE.lg}px;flex:none">`
      + `<span style="font:700 ${TYPE.body}px var(--font-sans);color:${onColor(T.accent)}">${cta}</span></div>` : '')
    + '</div>';
  return [{ type: 'html', x, y, w, ...cardChrome({ radius: R.soft }), html,
    start, duration: dur, enterDur: 0.45, exitDur: 0.3,
    parts: [
      ...(stars ? [{ select: '[data-part="stars"]', anim: 'widen', each: 0.8, delay: 0.35 }] : []),
      ...(cta ? [{ select: '[data-part="cta"]', anim: 'popIn', each: 0.3, delay: 0.22 }] : []),
    ] }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
//
// The five identity blocks speak ONE surface: {name, handle?, sub?, avatar, initials}. Each block's
// older word for a slot is kept as an alias and declared as one, because a shared vocabulary is worth
// nothing if adopting it breaks the callers.
export const SOCIAL_SCHEMAS = {
  chatBubble: {
    w: { kind: 'int', min: 160, max: 1080, def: 480 },
    messages: { kind: 'list', of: { kind: 'row', fields: {
      text: { kind: 'str', max: 200 },
      // Mine: right, in accent. Theirs: left, in a hairline card.
      me: { kind: 'bool' },
    } }, def: [] },
  },

  avatarStack: {
    avatars: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: {
        avatar: { kind: 'str', max: 200 },
        initials: { kind: 'str', max: 3 },
        name: { kind: 'str', max: 60 },
        color: { kind: 'color' },
      } },
    ] }, def: [] },
    // The "+N" overflow. Zero draws no overflow cell.
    extra: { kind: 'int', min: 0, max: 9999, def: 0 },
    // One circle's diameter. The overlap step is 0.75 of it, so the stack's width follows from this.
    size: { kind: 'int', min: 16, max: 300, def: 48 },
  },

  socialProof: {
    avatars: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: {
        avatar: { kind: 'str', max: 200 },
        initials: { kind: 'str', max: 3 },
        name: { kind: 'str', max: 60 },
        color: { kind: 'color' },
      } },
    ] }, def: [] },
    extra: { kind: 'int', min: 0, max: 9999, def: 0 },
    size: { kind: 'int', min: 16, max: 300, def: 44 },
    // Empty by default: a social-proof block that ships a line nobody stood behind is the defect
    // this registry has already shipped twice.
    caption: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 80, def: '' },
    // Between the stack's real end and the caption. The stack's width is the block's own arithmetic.
    gap: { kind: 'int', min: 0, max: 200, def: 18 },
  },

  reactionBar: {
    reactions: { kind: 'list', of: { kind: 'row', fields: {
      emoji: { kind: 'str', max: 8 },
      count: { kind: 'num', min: 0, max: 1e9 },
      // The one you picked: accent fill and an accent border.
      mine: { kind: 'bool' },
    } }, def: [] },
  },

  nowPlaying: {
    w: { kind: 'int', min: 200, max: 1080, def: 380 },
    name: { kind: 'str', max: 60, def: '' },
    track: { kind: 'str', max: 60, def: '' },        // alias of name
    sub: { kind: 'str', max: 60, def: '' },
    artist: { kind: 'str', max: 60, def: '' },       // alias of sub
    avatar: { kind: 'str', max: 200, def: '' },
    art: { kind: 'str', max: 200, def: '' },         // alias of avatar
    initials: { kind: 'str', max: 3, def: '' },
    // How far through the track, clamped to 0..1 inside the factory. The fill's width IS this.
    progress: { kind: 'unit', def: 0.4 },
  },

  videoLowerThird: {
    w: { kind: 'int', min: 200, max: 1920, def: 520 },
    name: { kind: 'str', max: 60, def: '' },
    channel: { kind: 'str', max: 60, def: '' },      // alias of name
    sub: { kind: 'str', max: 60, def: '' },
    subscribers: { kind: 'str', max: 60, def: '' },  // alias of sub
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    cta: { kind: 'str', max: 24, def: 'Subscribe' },
  },

  followCard: {
    w: { kind: 'int', min: 160, max: 1080, def: 360 },
    handle: { kind: 'str', max: 40, def: '' },
    name: { kind: 'str', max: 60, def: '' },
    // No portrait is drawn unless one is given: a card designed without one must not sprout an
    // invented circle just because it learned the vocabulary.
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    cta: { kind: 'str', max: 24, def: 'Follow' },
  },

  installCard: {
    w: { kind: 'int', min: 200, max: 1080, def: 400 },
    icon: { kind: 'str', max: 4, def: '' },
    name: { kind: 'str', max: 40, def: '' },
    sub: { kind: 'str', max: 40, def: '' },
    // Out of five, clamped to 0..5 inside the factory. Zero draws no stars at all.
    rating: { kind: 'num', min: 0, max: 5, def: 0 },
    // The count of ratings, FORMATTED by the block (1204 becomes "1.2K"). Zero draws no count.
    ratings: { kind: 'int', min: 0, max: 1e9, def: 0 },
    cta: { kind: 'str', max: 24, def: '' },
  },
};
