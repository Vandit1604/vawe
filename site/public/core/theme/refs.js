// core/theme/refs.js: resolveTokenRefs(data, values), the load-time sugar for a video that references
// a theme token directly. A string written EXACTLY `"{path.to.token}"` anywhere in scene JSON (a layer
// prop, a nested object, an array entry) resolves to that token's value. Pure, node+browser safe: the
// same "resolve at load, so the render path only ever sees concrete values" rule expandScene already
// follows for block/beat/comp sugar (core/engine/expand.js's own header).
//
// SCOPE: only `tokens`, never a `roles` shortcut (an author who wants `{ground}` writes the token path
// it resolves to, e.g. `{color.night}`; `roles` is the engine's own adapter, not a second alias space
// for authors to learn). An unknown path throws: same fail-loud posture as every other sugar this
// engine expands (engine-doctrine/CRAFT/ENGINE-CHANGES.md "SUGAR MUST NEVER SILENTLY NO-OP").
//
// A STRICTER PATTERN THAN tokens.js's OWN `aliasPath`, ON PURPOSE. That one is for a `$value` inside
// the theme file itself, author-controlled and never natural language. This one walks EVERY string in a
// SCENE, including on-screen copy, and a loose `{anything with no other brace}` matched a literal
// caption this engine ships on itself (vawe-explainer.json's own illustrative
// `{ "module": "scene", "layers": [ ... ] }` line): plain English wrapped in one pair of braces, spaces
// and quotes and all. A real token path is a dotted identifier and nothing else, so only that shape is
// sugar; anything with a space, a quote or a colon inside the braces is copy, not a reference.
const TOKEN_REF_RE = /^\{([a-zA-Z0-9_$-]+(?:\.[a-zA-Z0-9_$-]+)+)\}$/;
const tokenRefPath = (s) => (typeof s === 'string' ? TOKEN_REF_RE.exec(s)?.[1] ?? null : null);

const isObj = (o) => o != null && typeof o === 'object';

export function resolveTokenRefs(data, values) {
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (isObj(node)) {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    const path = tokenRefPath(node);
    if (path == null) return node;
    if (!values.has(path)) throw new Error(`this scene references token "{${path}}", which does not exist in the theme`);
    return values.get(path);
  };
  return walk(data);
}
