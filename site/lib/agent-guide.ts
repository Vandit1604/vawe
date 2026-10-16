import fs from "node:fs";
import path from "node:path";
import { llmsText } from "./llms";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

export const agentGuide = () => read("content/agent-guide.md");

// llms-full.txt is the guide plus everything llms.txt links to by name: the site map and the moves list.
export function llmsFull() {
  const llms = llmsText();
  const start = llms.indexOf("## Site\n");
  return `${agentGuide().trimEnd()}\n\n---\n\n# Site map and moves (same content as https://vawe.dev/llms.txt)\n\n${llms.slice(start >= 0 ? start : 0)}`;
}
