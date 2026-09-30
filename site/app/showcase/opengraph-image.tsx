import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "showcase",
    title: "Vawe · showcase",
    description:
      "Films rendered by vawe, and one film rendered to three canvases.",
    path: "/showcase",
  });
}
