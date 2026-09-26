# Name the object, then run the anti-slop checks

## Name the object, then write its state at each beat

Do this before any JSON or copy exists. If you cannot fill this table, there is no film yet.

| | Answer |
|---|---|
| **The object** | one noun. The prompt box, the button, a token, a card, a row, a cursor. |
| **Why it** | it is the thing the user touches to get the value. |
| **State at t=0** | what it looks like before anything happens |
| **State at each cut** | what it has become |
| **State at the last frame** | the payoff, or the moment just before it |

Rules for picking the object:

- **Pick something the user acts on**, not something the product outputs. The higgsfield object
  is the generate button, not the generated image. The button is the verb.
- **It must survive a transform.** A logo cannot transform into anything, which is why a logo
  makes a terrible spine and a fine last frame.
- **One object, not two.** A second travelling element is a subplot. At 5 seconds there is no
  room for a subplot.
- **It may change category.** Button becomes dot becomes spinner is legal and is the best move in
  the reference film. Button cuts to an unrelated dashboard is not.

**The object-death test:** name a frame where your object is off screen. If one exists before the
final beat, the spine is broken. Go back to the table.

## Anti-slop: kill a bad plan before a frame renders

Run all seven against the beat table. Any failure is a rewrite of the plan, not a note for later.

1. **Reorder test.** Swap beats 2 and 3. If the film still parses, the beats are unrelated and
   you wrote a slideshow. A continuous action cannot be reordered.
2. **Object-death test.** Is there a frame before the last beat where the object is gone? Broken
   spine.
3. **Pixel-jump test.** At each seam, what is in the same place on both sides? No answer means a
   jump cut.
4. **Who-moved-it test.** For every moving element, name the in-world cause. More than one
   "the editor did" means the motion is decoration on a static frame.
5. **Logo end-card test.** If the last beat is a mark and a URL, the film ends where it should
   have started. At 5 seconds a logo is a watermark, not a beat.
6. **Unbacked-claim test.** For each on-screen line, name the UI visible in the same frame that
   proves it. No UI, cut the line.
7. **Payoff test.** Does the last frame answer the question, or sit one moment before the answer?
   Prefer the moment before. If you must show the result, show it for the final 0.6s and cut.

Then, and only then, write JSON.
