---
id: named-eases
step: motion
principle: Take every curve from the EASE names (exact linear()), not from a CSS keyword and not from a hand-fitted cubic-bezier. The CSS keywords ease, ease-out and ease-in-out are not a default for everything.
limit: a move longer than 0.3 s is not on linear or on a bare CSS keyword with no curve of its own
range: EASE.land, landSoft, settle, swap, glide, carry, leave, launch, pop; sampled springs with 8 or more stops
break-when: linear is allowed on the interior legs of a multi-key camera path (keys()), where constant speed is the point; a scripted page is not measured by the lint
instead: EASE.* in element.animate; easeFn(name) inside window.seek and vawe.onFrame. The /easing pages may show the nearest bezier as a reference only.
check: linear-move, default-ease
judge: Is any move on a bare keyword or a hand-fitted bezier? Does frame 1 jump?
prevents: feedback: "CSS curves must be smooth (never approximate an exponential with cubic-bezier)". A hand-fitted bezier starts too hard and stops too early. doc banned-defaults: ease-out on everything is the stock-template tell.
dial: ease
status: active
scored: yes
numbers: {"linear_move_limit_s":0.3}
print-motion: take curves from EASE names (or a sampled spring), not a CSS keyword or a hand-fitted cubic-bezier
digest: Curves come from EASE names or sampled springs, not CSS keywords or a hand-fitted cubic-bezier.
craft: motion-standards
---

## Example

easing: EASE.land. Wrong: easing: "ease-out" on every element.

Why and sources: [motion-standards](../craft/motion-standards.md).
