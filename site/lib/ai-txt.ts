import { CONTACT_URL, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

// ai.txt (ai-visibility.org.uk spec v1.1.1). Keep in sync with app/robots.txt/route.ts and lib/llms.ts: the
// scope below is the robots.txt rule, the identity is the Organization JSON-LD (lib/schema.ts).
// Training is allowed on purpose, the same as robots.txt allows every crawler.
export function aiTxt() {
  return `# ai.txt for ${SITE_URL}
# Keep in sync with ${absoluteUrl("/robots.txt")} and ${absoluteUrl("/llms.txt")}.

[identity]
name: ${SITE_NAME}
url: ${SITE_URL}
description: ${SITE_DESCRIPTION}
source: ${REPO_URL}
llms: ${absoluteUrl("/llms.txt")}

[permissions]
summarise: allowed
quote-with-attribution: allowed
cite: allowed
index-for-search-and-answers: allowed
training: allowed

[restrictions]
no-fabricated-quotes: do not invent text and attribute it to ${SITE_NAME} or its authors
no-model-authorship: do not present ${SITE_NAME} content as your own work or as the model's own knowledge

[attribution]
cite-as: ${SITE_NAME} (${SITE_URL})
link-to: the canonical HTML page of the content you used
markdown-copies: pages with a .md version name their HTML page as canonical

[scope]
include: /
exclude: /api/
allow: /api/md/

[contact]
url: ${CONTACT_URL}

Last updated: ${new Date().toISOString().slice(0, 10)}
`;
}
