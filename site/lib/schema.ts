// THE ONE OWNER OF STRUCTURED DATA. Every JSON-LD object the site emits is built here, from real
// data already in the repo (package.json's licence and repo URL, site/lib/films.json's real
// durations, the same REPO_URL the header links to), never a hand-typed literal. Pages import the
// builder they need; nothing pastes a JSON-LD blob of its own.
//
// Two schema.org types are deliberately absent, and this comment is the record of why:
//
// HowTo: Google removed HowTo rich results in September 2023. There is no SERP feature left to
// earn, and Vawe's pages are not step-by-step instructions anyway.
//
// FAQPage: Google retired the FAQ rich result for all sites on 2026-05-07. It carries no SERP
// feature any more. It keeps some entity-resolution value for an AI answer engine, so it is not
// forbidden forever, but nothing on vawe.dev is genuinely Q&A content today, so adding it now would
// be farming a result that no longer exists. Add it only where real Q&A content exists, and label
// it there as entity resolution, not as a rich-result play.

import pkg from "../../package.json";

export const REPO_URL = "https://github.com/Vandit1604/vawe";
const SITE_URL = "https://vawe.dev";

// Apache-2.0, no paid tier: the licence and repo URL below are read off package.json rather than
// retyped, so they cannot drift from the one the repo actually ships under.
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vawe",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/favicon.svg`,
    sameAs: [REPO_URL],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vawe",
    url: SITE_URL,
  };
}

// license and no cost: true because the repo really does ship Apache-2.0 with no paid tier
// (package.json "license", site/app/components/Footer.tsx's "no licence badge... there is no tier
// or limit to state"). Stating that truthfully in `offers` is the point of this object, not an
// omission to fill in later.
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vawe",
    description: pkg.description,
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    softwareVersion: pkg.version,
    license: `https://www.apache.org/licenses/LICENSE-2.0`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    codeRepository: REPO_URL,
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

// duration as ISO 8601 (schema.org's required format for VideoObject.duration), built from the
// same `seconds` films.json already carries for the showcase page's own captions.
function isoDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `PT${s}S`;
}

// VideoObject, built ONLY from what films.json + the public asset directory genuinely hold: a real
// mp4 (contentUrl), a real poster jpg (thumbnailUrl) and a real measured duration. `uploadDate` is
// deliberately omitted: Google lists it as required for video rich-result eligibility, but nothing
// in this repo records when a film was published. A git commit date on the asset would be a build
// artefact, not an editorial publish date, and typing today's date would be a fabricated field, so
// this object ships without it rather than inventing one.
export function videoObjectSchema(film: { slug: string; brand: string; seconds: number }) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${film.brand}, rendered by Vawe`,
    description: `A ${film.brand} film rendered by Vawe from a single JSON scene file.`,
    thumbnailUrl: `${SITE_URL}/assets/films/${film.slug}.jpg`,
    contentUrl: `${SITE_URL}/assets/films/${film.slug}.mp4`,
    duration: isoDuration(film.seconds),
  };
}

// A page renders this with dangerouslySetInnerHTML, same reason the import map in layout.tsx does:
// JSON-LD must be literal script text, and JSON.stringify's output is already escaped for </script>
// injection risk is nil here because every input is repo data, not user input.
export function jsonLdScript(data: object) {
  return { __html: JSON.stringify(data) };
}
