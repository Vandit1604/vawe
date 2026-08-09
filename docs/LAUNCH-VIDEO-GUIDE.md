---
when: "making a product-launch film for a real brand or website"
answers: the launch workflow end to end · what to crawl · the references it is built from
group: process
---

# LAUNCH-VIDEO-GUIDE — making a product-launch video for a brand/website

There are no launch "formats" anymore. A launch video is a **`scene` JSON** composed from
primitives, reflecting the real site. The old `demo`/`brandfilm` templates were removed (no templates).

## The workflow

```bash
make brandkit URL=https://site.com NAME=<brand>   # colours pack (themes/<brand>.json) + fonts + favicon
make sections URL=https://site.com NAME=<brand>   # inventory every real section → sections/*.png + sections.json
```

1. **Study + inventory.** Read the section shots. Name the site's design language in words (typography,
   density, shape, motion). Pull copy from the site's own words. Use **ONLY** the site's colours and
   respect dominance (white-first vs dark).
2. **Storyboard = one beat per real section, in the site's order** (hook → suspense → payoff overall).
3. **Reflect each section with its real assets:**
   - `make capture URL=… SEL='<selector>' NAME=<brand> LABEL=<x>` → a crisp, animatable `component`
     (target the UI cluster, e.g. `[class*=illustration]`, to avoid a duplicate headline).
   - Only a true `<canvas>`/WebGL section can't DOM-capture → use the section screenshot as a clipped
     `image` layer with `ken`. Both keep the real logos/gradients/copy.
   - Stage each as a layer with a window / cut / camera push. Re-type copy by overlaying a `type`
     layer, never by editing captured glyphs.
4. **Hand-write HTML only for connective tissue** — the hook, the CTA, number counters. Preview every
   hand fragment before rendering: `make preview HTML=frag.html THEME=<brand>` → `/tmp/preview.png`.
5. **Verify:** `make beats D=<file> VS=<brand>` (fidelity vs source) → render → `make audit` →
   `make motion` → `make ledger`. See `CLAUDE.md` for the full loop.

## References
- Primitive vocabulary: **`docs/PRIMITIVES.md`**  ·  Motion rules: **`docs/MOTION-CRAFT.md`**
- Design knowledge (backgrounds, transitions, plain-vs-busy): **`docs/DESIGN-DATABASE.md`**
- Worked example: `formats/scene/linear-30.json` (reflects linear.app section-by-section).
- Landscape 1920×1080 for launch videos (`"orientation": "landscape"`).
