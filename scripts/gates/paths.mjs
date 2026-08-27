// scripts/gates/paths.mjs: ONE source of truth for where the scene format lives. Gates that enumerate
// or address the scene format import from here instead of each writing the `formats/scene` literal, so
// the module name exists in a single place. (Runtime code, core/boot.js etc., already derives its
// paths from data.module; this constant is only for the tooling that scans the format directory.)
export const SCENE_MODULE = 'scene';
export const SCENE_DIR = `formats/${SCENE_MODULE}`; // repo-relative directory of the scene format
