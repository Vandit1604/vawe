import { absoluteUrl } from "../site";

export type Link = { text: string; path: string };

// A link label sits between brackets, so a bracket in it would end the label early.
export const esc = (text: string) => text.replace(/[[\]]/g, "\\$&");

export const link = (text: string, path: string) => `[${esc(text)}](${path.startsWith("http") ? path : absoluteUrl(path)})`;

export const item = (text: string, path: string, note?: string) => `- ${link(text, path)}${note ? `: ${note}` : ""}`;

export const heading = (level: 2 | 3, text: string) => `${"#".repeat(level)} ${text}`;

// A table cell is one line: a pipe or a newline would break the row.
const cell = (v: string | number) => String(v).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export function table(head: string[], rows: (string | number)[][]) {
  return [`| ${head.map(cell).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

export const codeBlock = (code: string, lang = "") => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

// Root-relative links and images become absolute, because the file is read away from the page.
export const absolutize = (md: string) => md.replace(/\]\(\//g, `](${absoluteUrl("/")}`).replace(/\b(src|href|poster)="\//g, `$1="${absoluteUrl("/")}`);

export const bareTitle = (title: string) => title.replace(/ \| vawe$/, "");

export const prettyDate = (iso: string) => iso.slice(0, 10);

export type PageParts = {
  title: string;
  description: string;
  path: string;
  updated?: string;
  body: string;
  related?: Link[];
};

export function markdownPage({ title, description, path, updated, body, related }: PageParts) {
  const head = [`# ${bareTitle(title)}`, `> ${description}`, [`Canonical: ${absoluteUrl(path)}`, updated ? `Last updated: ${prettyDate(updated)}` : ""].filter(Boolean).join("\n")];
  const tail = related?.length ? [heading(2, "Related"), related.map((r) => item(r.text, r.path)).join("\n")] : [];
  return `${[...head, body.trim(), ...tail].join("\n\n")}\n`;
}
