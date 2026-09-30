// Each id is a rendered film at public/assets/films/<id>.mp4 with its still at <id>.jpg; that folder is
// allowlisted by id in the repo .gitignore. One list: the landing hero and the film grids read it.
export const FILMS: { id: string; title: string }[] = [
  { id: "argus-launch", title: "Argus launch" },
  { id: "threadcite-open", title: "Threadcite open" },
  { id: "saas-hero-launch", title: "SaaS hero launch" },
  { id: "product-feature-tour", title: "Product feature tour" },
  { id: "preface-launch", title: "Preface launch" },
];

export const filmSrc = (id: string) => `/assets/films/${id}.mp4`;
export const filmPoster = (id: string) => `/assets/films/${id}.jpg`;
