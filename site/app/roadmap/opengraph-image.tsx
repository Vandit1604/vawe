import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "roadmap",
    title: "vawe · roadmap",
    description: "What vawe works on now, next and later. Every item links to the problem it addresses.",
    path: "/roadmap",
  });
}
