# Transition library: provenance

Every unit in `units.js` records its `author`, `license`, and `source`. Units marked `source: 'vawe'`
are original to this engine (`license: 'internal'`). Units whose `source` is `gl-transitions/<name>` are
adapted from the canonical open GLSL transition library, https://github.com/gl-transitions/gl-transitions,
into this engine's two-sampler seam runner (a mechanical rename: `getFromColor`→`getFrom`,
`getToColor`→`getTo`, `progress`→`u_p`, `ratio`→aspect). **Only permissive licenses (MIT / CC0 /
public domain) are vendored.** Each carries its original author and license below.

| unit | source | author | license |
|---|---|---|---|
| crossWarp | gl-transitions/crosswarp | Eke Péter | MIT |
| push | gl-transitions/directional | Fernando Kuteken | MIT |

gl-transitions is itself MIT-licensed as a collection; individual transitions carry their own
`// Author:` / `// License:` header, which is the authority reproduced here. When adding a unit sourced
from gl-transitions, copy its header's author + license into `units.js` and add a row here.
