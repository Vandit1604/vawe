import fs from "node:fs";
import path from "node:path";

export const AGENTS_TITLE = "AI agent video generation: HTML to video with vawe";
export const AGENTS_DESCRIPTION =
  "An agent writes a Vawe film as one HTML page, in the web platform it already knows, and one command renders, checks and ships it. A fresh session judges the result, never the one that wrote it.";

export const agentGuide = () => fs.readFileSync(path.join(process.cwd(), "content/agent-guide.md"), "utf8");
