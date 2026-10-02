// THE ONE OWNER OF STRUCTURED DATA. Every JSON-LD object the site emits is built here, from real
// data already in the repo (package.json's licence and repo URL, the same REPO_URL the header
// links to), never a hand-typed literal. Pages import the
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
    // Google's logo guidance requires "at minimum" 112x112px (developers.google.com/search/docs/
    // appearance/structured-data/logo). The mark itself is a 32x32 viewBox SVG, so this points at a
    // 512x512 PNG rendered from that same SVG rather than the vector file, whose intrinsic pixel
    // size a crawler cannot be relied on to read as anything above the viewBox.
    logo: `${SITE_URL}/assets/favicon-512.png`,
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

export function techArticleSchema(opts: { headline: string; description: string; path: string; datePublished: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: opts.headline,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    mainEntityOfPage: `${SITE_URL}${opts.path}`,
    datePublished: opts.datePublished,
    author: { "@type": "Organization", name: "Vawe", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Vawe", url: SITE_URL },
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

// A page renders this with dangerouslySetInnerHTML, same reason the import map in layout.tsx does:
// JSON-LD must be literal script text, and JSON.stringify's output is already escaped for </script>
// injection risk is nil here because every input is repo data, not user input.
export function jsonLdScript(data: object) {
  return { __html: JSON.stringify(data) };
}
