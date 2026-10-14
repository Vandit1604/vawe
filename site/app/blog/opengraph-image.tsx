import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "blog",
    title: "Notes from building vawe, with the numbers.",
    description:
      "An agent writes one HTML page and the renderer turns it into a film.",
    path: "/blog",
  });
}
