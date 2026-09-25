// The films the site can play live. Each id is a scene under public/scenes/ that the in-browser engine
// renders, so a film here can never drift from its source. One list: the landing hero and the /editor
// picker both read it.
export const FILMS: { id: string; title: string }[] = [
  { id: "argus-launch", title: "Argus launch" },
  { id: "threadcite-open", title: "Threadcite open" },
  { id: "saas-hero-launch", title: "SaaS hero launch" },
  { id: "product-feature-tour", title: "Product feature tour" },
  { id: "preface-launch", title: "Preface launch" },
];
