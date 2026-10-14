import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "roadmap",
    title: "Roadmap: now, next, later.",
    description:
      "The order of work on vawe. There are no dates: Now comes before Next, and Next before Later. Each item links to the problem it addresses.",
    path: "/roadmap",
  });
}
