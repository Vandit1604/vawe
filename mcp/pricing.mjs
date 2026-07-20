// mcp/pricing.mjs — what a finished video costs, and whether this one is paid for.
//
// PRICED BY DURATION, NOT PER VIDEO. A 12-second launch clip and a 60-second brand film are not the
// same product: the film costs several times the render and is worth several times more. A flat fee
// overcharges the clip, undercharges the film, and pushes everyone toward the long one.
//
// DRAFTS ARE FREE ON PURPOSE. Authoring a good video takes many renders — the reference film in this
// repo took about ten, and each pass fixed something real. Charging per render taxes the loop that
// makes videos good, and people ship their third attempt instead of their tenth. So: iterate free
// with a watermark, pay once at the moment of value, which is the clean file.
export const TIERS = [
  { maxSeconds: 15, cents: 900, label: 'up to 15s' },
  { maxSeconds: 30, cents: 1900, label: 'up to 30s' },
  { maxSeconds: 60, cents: 3900, label: 'up to 60s' },
  { maxSeconds: Infinity, cents: 7900, label: 'over 60s' },
];

export function quote(seconds) {
  const t = TIERS.find((x) => seconds <= x.maxSeconds);
  return { cents: t.cents, label: t.label, usd: (t.cents / 100).toFixed(2) };
}

// ---- entitlement -------------------------------------------------------------------------------
// One function, one question: may this video be exported clean? Everything payment-shaped hides
// behind it, so wiring Stripe or Polar later is an edit to THIS file and nothing else.
//
// VAWE_BILLING=off (the default) grants everything, which is what you want while building and for a
// self-hosted licensee who already paid for the engine. Turn it on and the checkout hook below is the
// only thing that needs a real implementation.
export function billingEnabled() {
  return process.env.VAWE_BILLING === 'on';
}

export async function isPaid(record) {
  if (!billingEnabled()) return true;
  return Boolean(record.paid);
}

/**
 * Returns a checkout URL for this video. Stubbed deliberately: the provider choice (Stripe, Polar,
 * Paddle) changes the merchant of record and the tax handling, and that is a business decision, not
 * a code one. Everything above this line already works without it.
 */
export async function checkoutUrl(record, seconds) {
  const base = process.env.VAWE_CHECKOUT_URL;
  const { cents } = quote(seconds);
  if (!base) {
    throw new Error(
      'billing is on but VAWE_CHECKOUT_URL is unset. Point it at a checkout that takes '
      + '?video=<id>&amount=<cents> and marks the record paid on webhook.');
  }
  return `${base}?video=${encodeURIComponent(record.id)}&amount=${cents}`;
}
