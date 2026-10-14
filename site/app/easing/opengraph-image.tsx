import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "easing",
    title: "Easing functions as CSS",
    description:
      "Hover a curve to preview it, copy its cubic-bezier() or linear(), or compare up to three side by side.",
    path: "/easing",
  });
}
