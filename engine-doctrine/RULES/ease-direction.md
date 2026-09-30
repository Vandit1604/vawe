---
name: ease-direction
when: choosing an ease for an entrance, an exit, or a move between two positions
holds: eye
answers: "which easing family belongs on an entrance, an exit, and a handover, and why an ease-out on a handover is wrong"
group: look
---
# Entrances ease out, exits ease in, a handover eases in-out

An entrance is a landing: it decelerates (ease-out, or a spring). An exit is a launch: it
accelerates (ease-in). A move between two positions the viewer already sees is neither arriving nor
departing: it travels, so it eases at both ends (ease-in-out). A strong ease-out (expo, quint) on a
handover decelerates through the whole travel, so the object seems to teleport in fast and crawl the
rest of the way, which reads as two objects, not one that moved.

| move | ease family |
|---|---|
| entrance | ease-out, or a spring (`core/motion/springs.js`) |
| exit | ease-in, and shorter than the entrance |
| handover, travel between two seen positions | ease-in-out |

In CSS: `cubic-bezier(0.16, 1, 0.3, 1)` lands soft, `cubic-bezier(0.7, 0, 0.84, 0)` launches,
`cubic-bezier(0.65, 0, 0.35, 1)` travels.
