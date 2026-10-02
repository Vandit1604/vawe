// JSON-LD for the pages that read data (the moves and the home FAQ). The builders that need only
// package.json live in schema.ts, which quality/gates/seo-surface.mjs runs standalone.
import { clip } from "./clip";
import { MOVES, groupLabel, type Move } from "./moves";
import { moveSeoDescription } from "./move-seo";
import { FAQ, faqText } from "./faq";
import { breadcrumbSchema } from "./schema";

const SITE_URL = "https://vawe.dev";

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: faqText(item) },
    })),
  };
}

const absolute = (url: string) => `${SITE_URL}${url.split("?")[0]}`;
const publisher = { "@type": "Organization", name: "Vawe", url: SITE_URL };

// ISO 8601 duration from seconds, for a clip of a few seconds: 2 -> PT2S, 2.5 -> PT2.5S.
const isoDuration = (seconds: number) => `PT${Number(seconds.toFixed(2))}S`;

export function videoObjectSchema(m: Move) {
  const files = clip(m);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${m.title}: motion graphics move`,
    description: moveSeoDescription(m),
    thumbnailUrl: [absolute(files.posterHd)],
    contentUrl: absolute(files.mp4),
    uploadDate: m.clipDate ?? m.published,
    ...(m.duration ? { duration: isoDuration(m.duration) } : {}),
    isFamilyFriendly: true,
    inLanguage: "en",
    publisher,
  };
}

export function techArticleSchema(m: Move) {
  const url = `${SITE_URL}/moves/${m.name}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: m.title,
    description: moveSeoDescription(m),
    url,
    mainEntityOfPage: url,
    image: absolute(clip(m).posterHd),
    datePublished: m.published,
    dateModified: m.modified,
    articleSection: groupLabel(m.group),
    inLanguage: "en",
    author: publisher,
    publisher,
  };
}

export function moveBreadcrumbSchema(m: Move) {
  return breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Moves", url: "/moves" },
    { name: groupLabel(m.group), url: `/moves?group=${m.group}` },
    { name: m.title, url: `/moves/${m.name}` },
  ]);
}

export function movesItemListSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${MOVES.length} CSS motion graphics moves for video`,
    url: `${SITE_URL}/moves`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: MOVES.length,
      itemListElement: MOVES.map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/moves/${m.name}`,
        name: m.title,
      })),
    },
  };
}
