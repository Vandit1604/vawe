---
id: screen-designed
step: look
principle: A product screen in a film is designed for the video, never a plain mock. A capture of the real product beats a mock.
limit: no text under 28 px at 1920 wide on a built screen
range: one focal element per screen; the subject fills most of the frame; real images whole at the source aspect ratio; colour from theme tokens with one accent
break-when: never
instead: build the screen as a real interface first (the builder skill of the ladder, real-looking data, never placeholder bars), then place it in the frame under the density budget: a fragment for the shot with large type, few elements, real imagery. Set each cell to the source's own aspect ratio so object-fit: cover neither crops nor letterboxes. A dark capture goes on a dark surface.
check: none
judge: Does the screen look designed for the film, and is every claim in its copy true? Does the product UI read as a designed interface, or as placeholder bars?
prevents: doc SCREENS.md and CONTENT.md: a hand-written mock defaults to a grey window, small type and a sparse grid. Reference acts measured fill 0.71 against a first mock's 0.17.
status: active
scored: no
numbers: {"screen_text_px_min_1920":28}
craft: screens
---

## Example

A results grid with 6 whole images and 48 px titles.

Why and sources: [screens](../craft/screens.md).
