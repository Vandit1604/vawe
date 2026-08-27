#!/usr/bin/env node
// Bring up BOTH dev servers: the marketing site (:3080) and the docs app (:3001).
//
// The site serves /docs by rewriting to the docs app (see site/next.config.mjs). With only the
// site running, /docs returns a 500 that looks like a code bug and is not one, it is just nothing
// listening on the other end. Rather than document that trap, remove it: one command, both apps.
//
//   npm --prefix site run dev:all
//
// No dependency on concurrently. This is a few lines of child_process and it keeps the site's
// install lean.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const APPS = [
  { name: "site", cwd: path.join(ROOT, "site"), args: ["next", "dev", "-p", "3080"], color: "\x1b[36m" },
  { name: "docs", cwd: path.join(ROOT, "docs-site"), args: ["next", "dev", "-p", "3001"], color: "\x1b[35m" },
];

const kids = [];
let shuttingDown = false;

for (const app of APPS) {
  const kid = spawn("npx", app.args, { cwd: app.cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  const tag = `${app.color}[${app.name}]\x1b[0m `;
  const pipe = (stream, to) =>
    stream.on("data", (d) =>
      String(d)
        .split("\n")
        .filter((l) => l.trim())
        .forEach((l) => to.write(tag + l + "\n")),
    );
  pipe(kid.stdout, process.stdout);
  pipe(kid.stderr, process.stderr);

  // If either app dies, the pair is broken (/docs would 500), so take both down rather than
  // leave a half-up stack that looks fine until someone clicks Docs.
  kid.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write(`\n${tag}exited (${code}); stopping the other app too.\n`);
    for (const k of kids) if (k !== kid) k.kill("SIGTERM");
    process.exit(code ?? 1);
  });
  kids.push(kid);
}

const bye = () => {
  shuttingDown = true;
  for (const k of kids) k.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", bye);
process.on("SIGTERM", bye);

process.stdout.write("\n  site → http://localhost:3080\n  docs → http://localhost:3080/docs\n\n");
